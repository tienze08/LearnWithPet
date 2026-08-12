package com.vocabpet.backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.dto.QuizRe.QuizAnswerRequest;
import com.vocabpet.backend.dto.QuizRe.QuizAnswerResponse;
import com.vocabpet.backend.dto.QuizRe.QuizQuestionResponse;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.entity.StudyReview;
import com.vocabpet.backend.entity.StudySession;
import com.vocabpet.backend.entity.enums.PetAction;
import com.vocabpet.backend.entity.enums.PetMood;
import com.vocabpet.backend.entity.enums.Rating;
import com.vocabpet.backend.repository.StudyReviewRepository;
import com.vocabpet.backend.repository.StudySessionRepository;
import com.vocabpet.backend.repository.UserRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;
import com.vocabpet.backend.repository.VocabularyRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class QuizServiceImpl implements QuizService {

    private static final int QUIZ_XP = 10;
    private static final int QUIZ_COIN = 2;

    private final CurrentUserService currentUserService;
    private final VocabularyRepository vocabularyRepository;
    private final UserRepository userRepository;
    private final UserVocabularyProgressRepository progressRepository;
    private final StudySessionRepository studySessionRepository;
    private final StudyReviewRepository studyReviewRepository;
    private final FsrsService fsrsService;

    private final RewardService rewardService;
    private final MissionService missionService;
    private final StreakService streakService;
    private final AchievementService achievementService;
    private final CompanionService companionService;

    @Override
    public QuizQuestionResponse randomQuestion() {
        return randomQuestion(null);
    }

    @Override
    public QuizQuestionResponse randomQuestion(Long deckId) {
        User user = currentUserService.getCurrentUser();

        // Companion quizzes reinforce real FSRS work. The oldest due card is
        // selected first, then an unseen card. Practice remains available even
        // when every card is scheduled for the future.
        List<UserVocabularyProgress> dueCards = deckId == null
                ? progressRepository.findDueCardsForQuiz(user.getId(), LocalDateTime.now())
                : progressRepository.findDueCardsForQuizAndDeck(user.getId(), deckId, LocalDateTime.now());
        Vocabulary vocabulary = dueCards
                .stream()
                // This second ownership check protects users from legacy progress
                // rows that may have been created before quizzes were user-scoped.
                .filter(progress -> progress.getVocabulary() != null
                        && progress.getVocabulary().getDeck() != null
                        && progress.getVocabulary().getDeck().getUser() != null
                        && user.getId().equals(progress.getVocabulary().getDeck().getUser().getId()))
                .map(UserVocabularyProgress::getVocabulary)
                .findFirst()
                .orElseGet(() -> (deckId == null
                        ? progressRepository.findNewCardsForQuiz(user.getId())
                        : progressRepository.findNewCards(user.getId(), deckId))
                        .stream().findFirst()
                        .orElseGet(() -> practiceVocabularyFor(user, deckId)));

        return QuizQuestionResponse.builder()
                .vocabularyId(vocabulary.getId())
                .word(vocabulary.getWord())
                .partOfSpeech(vocabulary.getPartOfSpeech().name())
                .options(buildOptions(vocabulary, user.getId()))
                .build();
    }

    private Vocabulary practiceVocabularyFor(User user, Long deckId) {
        List<Vocabulary> vocabulary = deckId == null
                ? vocabularyRepository.findByDeckUserId(user.getId())
                : vocabularyRepository.findByDeckIdAndDeckUserId(deckId, user.getId());
        return vocabulary.stream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Add a word to one of your decks before starting a quiz."));
    }

    @Override
    @Transactional
    public QuizAnswerResponse answer(QuizAnswerRequest request) {

        User user = currentUserService.getCurrentUser();
        if (request == null || request.getVocabularyId() == null || request.getAnswer() == null
                || request.getAnswer().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A quiz card and answer are required");
        }

        Vocabulary vocabulary = vocabularyRepository.findByIdAndDeckUserId(request.getVocabularyId(), user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "This quiz card is no longer available. Please get a new question."));

        boolean correct = vocabulary.getMeaning()
                .trim()
                .equalsIgnoreCase(request.getAnswer().trim());

        // Desktop companion quizzes are real study attempts as well. Persisting them
        // keeps the dashboard's learning count and accuracy in sync with the quiz UI.
        recordQuizAttempt(user, vocabulary, correct ? Rating.GOOD : Rating.AGAIN);

        int xp = 0;
        int coin = 0;

        PetBehaviorResponse petBehavior;

        // A wrong answer is still a study attempt. Keep the streak, daily
        // review count and achievement history truthful for every answer;
        // rewards remain conditional on correctness.
        user.setLastStudyAt(LocalDateTime.now());
        userRepository.save(user);
        streakService.updateMyStreak();
        missionService.trackReview(user.getId());
        missionService.trackQuiz(user.getId());
        achievementService.recordQuizReview(user);

        if (correct) {

            xp = QUIZ_XP;
            coin = QUIZ_COIN;

            rewardService.grantReward(user.getId(), xp, coin);

            petBehavior = companionService.recordQuizOutcome(user, vocabulary, true);

        } else {

            petBehavior = companionService.recordQuizOutcome(user, vocabulary, false);
        }

        return QuizAnswerResponse.builder()
                .correct(correct)
                .correctAnswer(correct ? null : vocabulary.getMeaning())
                .xp(xp)
                .coin(coin)
                .petBehavior(petBehavior)
                .build();
    }

    @SuppressWarnings("unused")
    private PetBehaviorResponse fallbackQuizReaction(boolean correct) {
        return PetBehaviorResponse.builder()
                .mood(correct ? PetMood.HAPPY : PetMood.SAD)
                .action(correct ? PetAction.HAPPY : PetAction.SAD)
                .message(correct ? "Great job!" : "No worries — we'll learn it together.")
                .priority(correct ? 2 : 1)
                .duration(3)
                .build();
    }

    private List<String> buildOptions(Vocabulary correctVocabulary, Long userId) {

        List<String> options = new ArrayList<>();

        options.add(correctVocabulary.getMeaning());

        for (Vocabulary vocabulary : vocabularyRepository.findByDeckUserId(userId)) {
            if (!vocabulary.getId().equals(correctVocabulary.getId())
                    && !options.contains(vocabulary.getMeaning())) {
                options.add(vocabulary.getMeaning());
            }
        }

        Collections.shuffle(options);
        return options.stream().limit(4).toList();
    }

    private void recordQuizAttempt(User user, Vocabulary vocabulary, Rating rating) {
        UserVocabularyProgress progress = progressRepository
                .findByUserIdAndVocabularyId(user.getId(), vocabulary.getId())
                .orElseGet(() -> UserVocabularyProgress.builder()
                        .user(user)
                        .vocabulary(vocabulary)
                        .build());
        fsrsService.review(progress, rating);
        progressRepository.save(progress);

        LocalDateTime now = LocalDateTime.now();
        StudySession quizSession = studySessionRepository.save(StudySession.builder()
                .user(user)
                .deck(vocabulary.getDeck())
                .startedAt(now)
                .finishedAt(now)
                .totalReviews(1)
                .uniqueCards(1)
                .build());

        studyReviewRepository.save(StudyReview.builder()
                .session(quizSession)
                .user(user)
                .vocabulary(vocabulary)
                .rating(rating)
                .reviewedAt(now)
                .build());
    }
}
