package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.QuizRe.QuizAnswerRequest;
import com.vocabpet.backend.dto.QuizRe.QuizAnswerResponse;
import com.vocabpet.backend.dto.QuizRe.QuizQuestionResponse;

public interface QuizService {

    QuizQuestionResponse randomQuestion();

    QuizAnswerResponse answer(QuizAnswerRequest request);

}
