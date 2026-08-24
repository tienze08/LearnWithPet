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
import com.vocabpet.backend.dto.StudyCardRe.ActiveStudySessionResponse;
import com.vocabpet.backend.dto.StudyCardRe.StudyAnalyticsResponse;
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

        private static final int REVIEW_XP = 5;
        private static final int REVIEW_COIN = 1;

        private final StudySessionRepository sessionRepository;
        private final UserVocabularyProgressRepository progressRepository;
        private final StudyReviewRepository reviewRepository;
        private final AchievementService achievementService;
        private final VocabularyRepository vocabularyRepository;
        private final FsrsService fsrsService;
        private final StreakService streakService;
        private final MissionService missionService;
        private final RewardService rewardService;
        private final CompanionService companionService;

        private final DeckRepository deckRepository;
        private final CurrentUserService currentUserService;

        /** Standard full session retained for existing callers and tests. */
        public StudySession startSession(Long deckId) {
                return startSession(deckId, null);
        }

        @Override
        public StudySession startSession(Long deckId, Integer reviewLimit) {

                User user = currentUserService.getCurrentUser();

                if (deckId == null) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "A deck is required to start a study session");
                }
                if (reviewLimit != null && (reviewLimit < 1 || reviewLimit > 50)) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "A recovery session must contain between 1 and 50 review attempts");
                }
                var deck = deckRepository.findByIdAndUser(deckId, user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "This deck is not available for your account"));

                StudySession session = StudySession.builder()
                                .user(user)
                                .deck(deck)
                                .startedAt(LocalDateTime.now())
                                .lastActiveAt(LocalDateTime.now())
                                .reviewLimit(reviewLimit)
                                .build();

                return sessionRepository.save(session);

        }

        @Override
        @Transactional
        public StudyCardResponse getNextCard(Long sessionId) {

                User user = currentUserService.getCurrentUser();

                StudySession session = sessionRepository.findById(sessionId)
                                .filter(s -> s.getUser().getId().equals(user.getId()))
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "This study session is not available for your account"));

                Long userId = session.getUser().getId();
                Long deckId = session.getDeck().getId();

                // Recovery sessions intentionally stop after their planned
                // number of attempts. The ratings are still persisted via the
                // same FSRS review path as every full study session.
                if (session.getReviewLimit() != null && session.getTotalReviews() >= session.getReviewLimit()) {
                        throw new NoMoreCardsException("This focused recovery session is complete");
                }

                // 1. DUE CARDS
                List<UserVocabularyProgress> due = progressRepository.findDueCards(
                                userId,
                                deckId,
                                LocalDateTime.now());

                if (!due.isEmpty()) {
                        UserVocabularyProgress p = due.get(0);
                        Vocabulary v = p.getVocabulary();
                        return present(session, map(p, v));
                }

                // 2. NEW CARDS
                List<Vocabulary> news = progressRepository.findNewCards(userId, deckId);

                if (!news.isEmpty()) {
                        Vocabulary v = news.get(0);

                        return present(session, StudyCardResponse.builder()
                                        .progressId(null)
                                        .vocabularyId(v.getId())
                                        .word(v.getWord())
                                        .meaning(v.getMeaning())
                                        .example(v.getExample())
                                        .difficulty(v.getDifficulty())
                                        .partOfSpeech(v.getPartOfSpeech())
                                        .build());
                }

                // Finish the session only after the learner has met every
                // card marked Again once more. FSRS still schedules the next
                // long-term review in 10 minutes; this is the short in-session
                // relearning pass promised by the study UI.
                List<Vocabulary> relearning = reviewRepository.findCardsToRelearnInSession(session.getId());
                if (!relearning.isEmpty()) {
                        Vocabulary v = relearning.getFirst();
                        UserVocabularyProgress progress = progressRepository
                                        .findByUserIdAndVocabularyId(userId, v.getId())
                                        .orElse(null);
                        return present(session, progress == null ? mapNewCard(v) : map(progress, v));
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
                session.setCurrentVocabularyId(null);
                session.setLastActiveAt(LocalDateTime.now());
                sessionRepository.save(session);

                session.getUser().setLastStudyAt(LocalDateTime.now());

                missionService.trackReview(userId);

                if (isNewCard) {
                        missionService.trackLearnWord(userId);
                }

                StreakUpdateResult streakResult = streakService.updateMyStreak();
                achievementService.checkForUser(session.getUser());

                boolean correct = request.getRating() != com.vocabpet.backend.entity.enums.Rating.AGAIN;
                int xp = correct ? REVIEW_XP : 0;
                int coin = correct ? REVIEW_COIN : 0;
                if (correct) {
                        rewardService.grantReward(userId, xp, coin);
                }

                return ReviewResponse.builder()
                                .nextReviewTime(progress.getNextReviewTime())
                                .streakUpdated(streakResult.isUpdated())
                                .currentStreak(streakResult.getCurrentStreak())
                                .longestStreak(streakResult.getLongestStreak())
                                .xp(xp)
                                .coin(coin)
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
                session.setCurrentVocabularyId(null);
                session.setLastActiveAt(LocalDateTime.now());

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
        public StudyAnalyticsResponse getAnalytics(int days) {
                int range = Math.max(7, Math.min(30, days));
                User user = currentUserService.getCurrentUser();
                LocalDate today = LocalDate.now();
                LocalDateTime from = today.minusDays(range - 1L).atStartOfDay();
                List<StudyReview> reviews = reviewRepository.findOwnedReviewsBetween(user.getId(), from, today.plusDays(1).atStartOfDay());
                Map<LocalDate, List<StudyReview>> byDay = new java.util.HashMap<>();
                for (StudyReview review : reviews) byDay.computeIfAbsent(review.getReviewedAt().toLocalDate(), key -> new ArrayList<>()).add(review);
                List<StudyAnalyticsResponse.DailyAccuracy> accuracy = new ArrayList<>();
                for (int offset = range - 1; offset >= 0; offset--) {
                        LocalDate date = today.minusDays(offset);
                        List<StudyReview> day = byDay.getOrDefault(date, List.of());
                        long correct = day.stream().filter(r -> r.getRating() != com.vocabpet.backend.entity.enums.Rating.AGAIN).count();
                        accuracy.add(StudyAnalyticsResponse.DailyAccuracy.builder().date(date).reviewed(day.size()).correct(correct).build());
                }
                List<StudyAnalyticsResponse.DeckAccuracy> decks = reviewRepository.findTopicPerformanceByUserId(user.getId()).stream()
                        .map(row -> StudyAnalyticsResponse.DeckAccuracy.builder().deckId(((Number) row[0]).longValue()).deckName((String) row[1])
                                .correct(((Number) row[2]).longValue()).reviewed(((Number) row[3]).longValue()).build()).toList();
                long weekMinutes = sessionRepository.findByUserId(user.getId()).stream()
                        .filter(s -> s.getFinishedAt() != null && !s.getFinishedAt().isBefore(today.minusDays(6).atStartOfDay()))
                        .mapToLong(s -> s.getDurationSeconds() / 60).sum();
                return StudyAnalyticsResponse.builder()
                        .learningWords(progressRepository.countByUserIdAndRepetitionsBetween(user.getId(), 1, 3))
                        .learnedWords(progressRepository.countOwnedByUserId(user.getId()))
                        .masteredWords(progressRepository.countByUserIdAndRepetitionsGreaterThanEqual(user.getId(), 4))
                        .weekMinutes(weekMinutes).accuracy(accuracy).decks(decks).activeDays(new ArrayList<>(byDay.keySet())).build();
        }

        @Override
        @Transactional
        public StudyPlanResponse getTodayPlan() {
                User user = currentUserService.getCurrentUser();
                LocalDateTime now = LocalDateTime.now();
                List<UserVocabularyProgress> due = progressRepository.findDueCardsForQuiz(user.getId(), now);
                List<UserVocabularyProgress> upcoming = progressRepository.findUpcomingCards(user.getId(), now);
                LocalDateTime tomorrowStart = LocalDate.now().plusDays(1).atStartOfDay();
                List<UserVocabularyProgress> tomorrow = progressRepository.findUpcomingCardsBetween(
                                user.getId(), tomorrowStart, tomorrowStart.plusDays(1));

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
                                .dailyGoal(user.getDailyGoal())
                                .streak(user.getStreak())
                                .suggestedDeckId(suggested == null ? null : suggested.getVocabulary().getDeck().getId())
                                .suggestedDeckName(suggested == null ? null : suggested.getVocabulary().getDeck().getName())
                                .dueReasons(reasons)
                                .upcomingCards(upcoming.stream().limit(10).map(progress -> StudyPlanResponse.UpcomingCard
                                                .builder().vocabularyId(progress.getVocabulary().getId())
                                                .word(progress.getVocabulary().getWord())
                                                .deckName(progress.getVocabulary().getDeck().getName())
                                                .dueAt(progress.getNextReviewTime()).build()).toList())
                                .tomorrowPreview(StudyPlanResponse.TomorrowPreview.builder()
                                                .cardCount(tomorrow.size())
                                                .estimatedMinutes(estimateMinutes(tomorrow.size()))
                                                .words(tomorrow.stream().limit(4)
                                                                .map(progress -> progress.getVocabulary().getWord()).toList())
                                                .build())
                                .build();
        }

        @Override
        @Transactional
        public java.util.Optional<ActiveStudySessionResponse> getActiveSession() {
                Long userId = currentUserService.getCurrentUser().getId();
                return sessionRepository.findFirstByUserIdAndFinishedAtIsNullOrderByLastActiveAtDesc(userId)
                                .map(session -> {
                                        List<StudyReview> reviews = reviewRepository.findBySessionId(session.getId());
                                        long correct = reviews.stream()
                                                        .filter(review -> review.getRating() != com.vocabpet.backend.entity.enums.Rating.AGAIN)
                                                        .count();
                                        Vocabulary current = session.getCurrentVocabularyId() == null ? null
                                                        : vocabularyRepository.findById(session.getCurrentVocabularyId()).orElse(null);
                                        return ActiveStudySessionResponse.builder()
                                                        .sessionId(session.getId())
                                                        .deckId(session.getDeck().getId())
                                                        .deckName(session.getDeck().getName())
                                                        .startedAt(session.getStartedAt())
                                                        .lastActiveAt(session.getLastActiveAt())
                                                        .currentVocabularyId(session.getCurrentVocabularyId())
                                                        .currentWord(current == null ? null : current.getWord())
                                                        .reviewed(session.getTotalReviews())
                                                        .uniqueCards(session.getUniqueCards())
                                                        .correct((int) correct)
                                                        .build();
                                });
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

        private StudyCardResponse present(StudySession session, StudyCardResponse card) {
                session.setCurrentVocabularyId(card.getVocabularyId());
                session.setLastActiveAt(LocalDateTime.now());
                sessionRepository.save(session);
                return card;
        }

        private StudyCardResponse mapNewCard(Vocabulary v) {
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
}
