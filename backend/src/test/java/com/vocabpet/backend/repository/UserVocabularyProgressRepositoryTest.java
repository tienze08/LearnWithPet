package com.vocabpet.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import com.vocabpet.backend.entity.Deck;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.Vocabulary;

@DataJpaTest
@ActiveProfiles("test")
class UserVocabularyProgressRepositoryTest {
    @Autowired private UserRepository userRepository;
    @Autowired private DeckRepository deckRepository;
    @Autowired private VocabularyRepository vocabularyRepository;
    @Autowired private UserVocabularyProgressRepository progressRepository;

    @Test
    void dueQuizCardsNeverCrossUserOwnershipBoundary() {
        User owner = userRepository.save(User.builder().email("owner@example.com").password("x").build());
        User other = userRepository.save(User.builder().email("other@example.com").password("x").build());
        Deck ownerDeck = deckRepository.save(deck(owner, "Owner deck"));
        Deck otherDeck = deckRepository.save(deck(other, "Other deck"));
        Vocabulary ownerWord = vocabularyRepository.save(Vocabulary.builder().deck(ownerDeck)
                .word("owner").meaning("belongs to owner").build());
        Vocabulary otherWord = vocabularyRepository.save(Vocabulary.builder().deck(otherDeck)
                .word("other").meaning("belongs to other user").build());
        progressRepository.save(UserVocabularyProgress.builder().user(owner).vocabulary(ownerWord)
                .nextReviewTime(LocalDateTime.now().minusMinutes(1)).build());
        progressRepository.save(UserVocabularyProgress.builder().user(other).vocabulary(otherWord)
                .nextReviewTime(LocalDateTime.now().minusMinutes(1)).build());

        List<UserVocabularyProgress> due = progressRepository.findDueCardsForQuiz(owner.getId(), LocalDateTime.now());

        assertEquals(1, due.size());
        assertEquals(ownerWord.getId(), due.getFirst().getVocabulary().getId());
    }

    private Deck deck(User user, String name) {
        return Deck.builder().user(user).name(name).emoji("📚").color("blue").build();
    }
}
