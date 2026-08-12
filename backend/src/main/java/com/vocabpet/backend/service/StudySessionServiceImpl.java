package com.vocabpet.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.vocabpet.backend.dto.StudyCardRe.ReviewRequest;
import com.vocabpet.backend.dto.StudyCardRe.ReviewResponse;
import com.vocabpet.backend.dto.StudyCardRe.RecentReviewResponse;
import com.vocabpet.backend.dto.StudyCardRe.StreakUpdateResult;
import com.vocabpet.backend.dto.StudyCardRe.StudyCardResponse;
import com.vocabpet.backend.dto.StudyCardRe.StudyDashboardResponse;
import com.vocabpet.backend.dto.companion.CompanionEventRequest;
import com.vocabpet.backend.entity.StudyReview;
import com.vocabpet.backend.entity.StudySession;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.entity.enums.CompanionEventType;
import com.vocabpet.backend.exception.NoMoreCardsException;
import com.vocabpet.backend.repository.DeckRepository;
import com.vocabpet.backend.repository.StudyReviewRepository;
import com.vocabpet.backend.repository.StudySessionRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;
import com.vocabpet.backend.repository.VocabularyRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StudySessionServiceImpl implements StudySessionService {

        private final StudySessionRepository sessionRepository;
        private final UserVocabularyProgressRepository progressRepository;
        private final StudyReviewRepository reviewRepository;
        private final AchievementService achievementService;
        private final VocabularyRepository vocabularyRepository;
        private final FsrsService fsrsService;
        private final StreakService streakService;
        private final MissionService missionService;
        private final CompanionService companionService;

        private final DeckRepository deckRepository;
        private final CurrentUserService currentUserService;

        @Override
        public StudySession startSession(Long deckId) {

                User user = currentUserService.getCurrentUser();

                if (deckId == null) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "A deck is required to start a study session");
                }
                var deck = deckRepository.findByIdAndUser(deckId, user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "This deck is not available for your account"));

                StudySession session = StudySession.builder()
                                .user(user)
                                .deck(deck)
                                .startedAt(LocalDateTime.now())
                                .build();

                return sessionRepository.save(session);

        }

        @Override
        public StudyCardResponse getNextCard(Long sessionId) {

                User user = currentUserService.getCurrentUser();

                StudySession session = sessionRepository.findById(sessionId)
                                .filter(s -> s.getUser().getId().equals(user.getId()))
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "This study session is not available for your account"));

                Long userId = session.getUser().getId();
                Long deckId = session.getDeck().getId();

                // 1. DUE CARDS
                List<UserVocabularyProgress> due = progressRepository.findDueCards(
                                userId,
                                deckId,
                                LocalDateTime.now());

                if (!due.isEmpty()) {
                        UserVocabularyProgress p = due.get(0);
                        Vocabulary v = p.getVocabulary();
                        return map(p, v);
                }

                // 2. NEW CARDS
                List<Vocabulary> news = progressRepository.findNewCards(userId, deckId);

                if (!news.isEmpty()) {
                        Vocabulary v = news.get(0);

                        return StudyCardResponse.builder()
                                        .progressId(null)
                                        .vocabularyId(v.getId())
                                        .word(v.getWord())
                                        .meaning(v.getMeaning())
                                        .example(v.getExample())
                                        .difficulty(v.getDifficulty())
                                        .partOfSpeech(v.getPartOfSpeech())
                                        .build();
                }

                throw new NoMoreCardsException("No more cards in this session");
        }

        @Override
        @Transactional
        public ReviewResponse review(Long sessionId, ReviewRequest request) {

                StudySession session = sessionRepository.findById(sessionId)
                                .filter(s -> s.getUser().getId().equals(currentUserService.getCurrentUser().getId()))
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "This study session is not available for your account"));

                if (session.getFinishedAt() != null) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                        "This study session has already finished");
                }

                Long userId = session.getUser().getId();

                if (request == null || request.getVocabularyId() == null || request.getRating() == null) {
                        throw new IllegalArgumentException("A vocabulary and rating are required");
                }

                Vocabulary vocabulary = vocabularyRepository.findByDeckIdAndDeckUserId(
                                session.getDeck().getId(), userId).stream()
                                .filter(candidate -> candidate.getId().equals(request.getVocabularyId()))
                                .findFirst()
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                                "This vocabulary is not in the current study deck"));

                var progressOptional = progressRepository.findByUserIdAndVocabularyId(
                                userId,
                                request.getVocabularyId());

                boolean isNewCard = progressOptional.isEmpty();

                UserVocabularyProgress progress = progressOptional.orElseGet(() -> UserVocabularyProgress.builder()
                                .user(session.getUser())
                                .vocabulary(vocabulary)
                                .build());

                // FSRS UPDATE
                fsrsService.review(progress, request.getRating());

                progressRepository.save(progress);

                // SAVE HISTORY
                boolean firstReviewOfCardInSession = !reviewRepository.existsBySessionIdAndVocabularyId(
                                session.getId(), vocabulary.getId());
                reviewRepository.save(
                                StudyReview.builder()
                                                .session(session)
                                                .user(session.getUser())
                                                .vocabulary(progress.getVocabulary())
                                                .rating(request.getRating())
                                                .reviewedAt(LocalDateTime.now())
                                                .build());

                session.setTotalReviews(session.getTotalReviews() + 1);
                if (firstReviewOfCardInSession) {
                        session.setUniqueCards(session.getUniqueCards() + 1);
                }
                sessionRepository.save(session);

                session.getUser().setLastStudyAt(LocalDateTime.now());

                missionService.trackReview(userId);

                if (isNewCard) {
                        missionService.trackLearnWord(userId);
                }

                StreakUpdateResult streakResult = streakService.updateMyStreak();
                achievementService.checkForUser(session.getUser());

                boolean correct = request.getRating() != com.vocabpet.backend.entity.enums.Rating.AGAIN;

                return ReviewResponse.builder()
                                .nextReviewTime(progress.getNextReviewTime())
                                .streakUpdated(streakResult.isUpdated())
                                .currentStreak(streakResult.getCurrentStreak())
                                .longestStreak(streakResult.getLongestStreak())
                                .companionReaction(companionService.recordReviewOutcome(session.getUser(), vocabulary, correct))
                                .build();
        }

        @Override
        public void finishSession(Long sessionId) {

                StudySession session = sessionRepository.findById(sessionId)
                                .filter(s -> s.getUser().getId().equals(currentUserService.getCurrentUser().getId()))
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "This study session is not available for your account"));

                // Browsers can retry a POST. Completion must be idempotent so
                // missions and companion memory are never counted twice.
                if (session.getFinishedAt() != null) {
                        return;
                }

                session.setFinishedAt(LocalDateTime.now());

                missionService.trackSessionCompleted(session.getUser().getId());
                CompanionEventRequest companionEvent = new CompanionEventRequest();
                companionEvent.setEvent(CompanionEventType.SESSION_COMPLETED);
                companionService.recordEvent(companionEvent);

                sessionRepository.save(session);
        }

        @Override
        @Transactional
        public List<RecentReviewResponse> getRecentReviews() {
                Long userId = currentUserService.getCurrentUser().getId();

                return reviewRepository.findTop6ByUserIdOrderByReviewedAtDesc(userId).stream()
                                .map(review -> RecentReviewResponse.builder()
                                                .vocabularyId(review.getVocabulary().getId())
                                                .word(review.getVocabulary().getWord())
                                                .meaning(review.getVocabulary().getMeaning())
                                                .rating(review.getRating())
                                                .reviewedAt(review.getReviewedAt())
                                                .build())
                                .toList();
        }

        @Override
        @Transactional
        public StudyDashboardResponse getDashboardStats() {
                Long userId = currentUserService.getCurrentUser().getId();
                var recentReviews = reviewRepository.findTop20ByUserIdOrderByReviewedAtDesc(userId);
                long correct = recentReviews.stream()
                                .filter(review -> review.getRating() != com.vocabpet.backend.entity.enums.Rating.AGAIN)
                                .count();

                return StudyDashboardResponse.builder()
                                .learningWords(progressRepository.countByUserIdAndRepetitionsBetween(userId, 1, 3))
                                .masteredWords(progressRepository.countByUserIdAndRepetitionsGreaterThanEqual(userId, 4))
                                .recentCorrect(correct)
                                .recentReviews(recentReviews.size())
                                .build();
        }

        private StudyCardResponse map(UserVocabularyProgress p, Vocabulary v) {

                return StudyCardResponse.builder()
                                .progressId(p.getId())
                                .vocabularyId(v.getId())
                                .word(v.getWord())
                                .meaning(v.getMeaning())
                                .example(v.getExample())
                                .difficulty(v.getDifficulty())
                                .partOfSpeech(v.getPartOfSpeech())
                                .build();
        }
}
