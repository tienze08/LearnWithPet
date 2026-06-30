package com.vocabpet.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.StudyCardRe.ReviewRequest;
import com.vocabpet.backend.dto.StudyCardRe.ReviewResponse;
import com.vocabpet.backend.dto.StudyCardRe.StudyCardResponse;
import com.vocabpet.backend.entity.StudyReview;
import com.vocabpet.backend.entity.StudySession;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.Vocabulary;
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
    private final VocabularyRepository vocabularyRepository;
    private final FsrsService fsrsService;

    private final DeckRepository deckRepository;
    private final CurrentUserService currentUserService;

    @Override
    public StudySession startSession(Long deckId) {

        User user = currentUserService.getCurrentUser();

        StudySession session = StudySession.builder()
                .user(user)
                .deck(deckRepository.getReferenceById(deckId))
                .startedAt(LocalDateTime.now())
                .build();

        return sessionRepository.save(session);

    }

    @Override
    public StudyCardResponse getNextCard(Long sessionId) {

        User user = currentUserService.getCurrentUser();

        StudySession session = sessionRepository.findById(sessionId)
                .filter(s -> s.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Unauthorized session access"));

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
                .orElseThrow();

        Long userId = session.getUser().getId();

        UserVocabularyProgress progress = progressRepository.findByUserIdAndVocabularyId(
                userId,
                request.getVocabularyId())
                .orElseGet(() -> UserVocabularyProgress.builder()
                        .user(session.getUser())
                        .vocabulary(
                                vocabularyRepository.getReferenceById(
                                        request.getVocabularyId()))
                        .build());

        // FSRS UPDATE
        fsrsService.review(progress, request.getRating());

        progressRepository.save(progress);

        // SAVE HISTORY
        reviewRepository.save(
                StudyReview.builder()
                        .session(session)
                        .user(session.getUser())
                        .vocabulary(progress.getVocabulary())
                        .rating(request.getRating())
                        .reviewedAt(LocalDateTime.now())
                        .build());

        session.setTotalReviews(session.getTotalReviews() + 1);
        sessionRepository.save(session);

        return ReviewResponse.builder()
                .nextReviewTime(progress.getNextReviewTime())
                .build();
    }

    @Override
    public void finishSession(Long sessionId) {

        StudySession session = sessionRepository.findById(sessionId)
                .filter(s -> s.getUser().getId().equals(currentUserService.getCurrentUser().getId()))
                .orElseThrow();

        session.setFinishedAt(LocalDateTime.now());

        sessionRepository.save(session);
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
