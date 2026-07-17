package com.vocabpet.backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.dto.QuizRe.QuizAnswerRequest;
import com.vocabpet.backend.dto.QuizRe.QuizAnswerResponse;
import com.vocabpet.backend.dto.QuizRe.QuizQuestionResponse;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.entity.enums.PetEvent;
import com.vocabpet.backend.repository.UserRepository;
import com.vocabpet.backend.repository.VocabularyRepository;
import com.vocabpet.backend.service.behavior.PetBehaviorService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class QuizServiceImpl implements QuizService {

    private static final int QUIZ_XP = 10;
    private static final int QUIZ_COIN = 2;

    private final CurrentUserService currentUserService;
    private final VocabularyRepository vocabularyRepository;
    private final UserRepository userRepository;

    private final RewardService rewardService;
    private final MissionService missionService;
    private final StreakService streakService;
    private final PetBehaviorService petBehaviorService;

    @Override
    public QuizQuestionResponse randomQuestion() {

        Vocabulary vocabulary = vocabularyRepository.findRandomVocabulary()
                .orElseThrow(() -> new RuntimeException("No vocabulary available"));

        return QuizQuestionResponse.builder()
                .vocabularyId(vocabulary.getId())
                .word(vocabulary.getWord())
                .partOfSpeech(vocabulary.getPartOfSpeech().name())
                .options(buildOptions(vocabulary))
                .build();
    }

    @Override
    public QuizAnswerResponse answer(QuizAnswerRequest request) {

        User user = currentUserService.getCurrentUser();

        Vocabulary vocabulary = vocabularyRepository.findById(request.getVocabularyId())
                .orElseThrow(() -> new RuntimeException("Vocabulary not found"));

        boolean correct = vocabulary.getMeaning()
                .trim()
                .equalsIgnoreCase(request.getAnswer().trim());

        int xp = 0;
        int coin = 0;

        PetBehaviorResponse petBehavior;

        if (correct) {

            xp = QUIZ_XP;
            coin = QUIZ_COIN;

            rewardService.grantReward(user.getId(), xp, coin);

            user.setLastStudyAt(LocalDateTime.now());
            userRepository.save(user);

            streakService.updateMyStreak();

            missionService.trackReview(user.getId());

            petBehavior = petBehaviorService.triggerEvent(
                    PetEvent.CORRECT_ANSWER);

        } else {

            petBehavior = petBehaviorService.triggerEvent(
                    PetEvent.WRONG_ANSWER);
        }

        return QuizAnswerResponse.builder()
                .correct(correct)
                .correctAnswer(correct ? null : vocabulary.getMeaning())
                .xp(xp)
                .coin(coin)
                .petBehavior(petBehavior)
                .build();
    }

    private List<String> buildOptions(Vocabulary correctVocabulary) {

        List<String> options = new ArrayList<>();

        options.add(correctVocabulary.getMeaning());

        List<Vocabulary> wrongAnswers = vocabularyRepository.findRandomWrongOptions(
                correctVocabulary.getId());

        for (Vocabulary vocabulary : wrongAnswers) {
            options.add(vocabulary.getMeaning());
        }

        Collections.shuffle(options);

        return options;
    }
}