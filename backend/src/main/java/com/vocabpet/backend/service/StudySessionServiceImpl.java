package com.vocabpet.backend.service;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.vocabpet.backend.dto.StudyCardRe.ReviewRequest;
import com.vocabpet.backend.dto.StudyCardRe.ReviewResponse;
import com.vocabpet.backend.dto.StudyCardRe.RecentReviewResponse;
import com.vocabpet.backend.dto.StudyCardRe.StreakUpdateResult;
import com.vocabpet.backend.dto.StudyCardRe.StudyCardResponse;
import com.vocabpet.backend.dto.StudyCardRe.StudyDashboardResponse;
import com.vocabpet.backend.dto.StudyCardRe.StudyPlanResponse;
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
                companionService.recordSessionCompleted(session.getUser(), session);

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

        @Override
        @Transactional
        public StudyPlanResponse getTodayPlan() {
                User user = currentUserService.getCurrentUser();
                LocalDateTime now = LocalDateTime.now();
                List<UserVocabularyProgress> due = progressRepository.findDueCardsForQuiz(user.getId(), now);
                List<UserVocabularyProgress> upcoming = progressRepository.findUpcomingCards(user.getId(), now);

                Map<String, List<UserVocabularyProgress>> groups = new LinkedHashMap<>();
                for (UserVocabularyProgress progress : due) {
                        String groupKey = reasonCode(progress, now) + "|" + progress.getVocabulary().getDeck().getId();
                        groups.computeIfAbsent(groupKey, ignored -> new ArrayList<>()).add(progress);
                }

                List<StudyPlanResponse.DueReason> reasons = groups.entrySet().stream()
                                .map(entry -> mapReason(entry.getKey(), entry.getValue()))
                                .toList();
                UserVocabularyProgress suggested = due.isEmpty() ? null : due.getFirst();
                LocalDateTime start = LocalDate.now().atStartOfDay();

                return StudyPlanResponse.builder()
                                .dueCards(due.size())
                                .estimatedMinutes(estimateMinutes(due.size()))
                                .reviewsToday(reviewRepository.countByUserIdAndReviewedAtBetween(user.getId(), start,
                                                start.plusDays(1)))
                                .dailyGoal(10)
                                .streak(user.getStreak())
                                .suggestedDeckId(suggested == null ? null : suggested.getVocabulary().getDeck().getId())
                                .suggestedDeckName(suggested == null ? null : suggested.getVocabulary().getDeck().getName())
                                .dueReasons(reasons)
                                .upcomingCards(upcoming.stream().limit(10).map(progress -> StudyPlanResponse.UpcomingCard
                                                .builder().vocabularyId(progress.getVocabulary().getId())
                                                .word(progress.getVocabulary().getWord())
                                                .deckName(progress.getVocabulary().getDeck().getName())
                                                .dueAt(progress.getNextReviewTime()).build()).toList())
                                .build();
        }

        private String reasonCode(UserVocabularyProgress progress, LocalDateTime now) {
                if (progress.getLapses() > 0 && progress.getStatus() == com.vocabpet.backend.entity.enums.Status.LEARNING)
                        return "RELEARNING";
                if (progress.getNextReviewTime().isBefore(now.minusDays(1)))
                        return "OVERDUE";
                return "SCHEDULED";
        }

        private StudyPlanResponse.DueReason mapReason(String groupKey, List<UserVocabularyProgress> progress) {
                String code = groupKey.substring(0, groupKey.indexOf('|'));
                UserVocabularyProgress first = progress.getFirst();
                String label;
                String detail;
                if ("RELEARNING".equals(code)) {
                        label = "Needs a quick refresher";
                        detail = "You chose Again before, so FSRS brought these words back sooner.";
                } else if ("OVERDUE".equals(code)) {
                        label = "Past the planned review date";
                        detail = "A short review now helps protect these memories.";
                } else {
                        label = "Scheduled for today";
                        detail = "FSRS calculated that today is the right time to strengthen recall.";
                }
                return StudyPlanResponse.DueReason.builder().code(code).label(label).detail(detail)
                                .count(progress.size()).deckId(first.getVocabulary().getDeck().getId())
                                .deckName(first.getVocabulary().getDeck().getName())
                                .words(progress.stream().limit(8).map(item -> item.getVocabulary().getWord()).toList())
                                .build();
        }

        private int estimateMinutes(long cards) {
                return cards == 0 ? 0 : Math.max(1, (int) Math.ceil(cards * 0.5));
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
