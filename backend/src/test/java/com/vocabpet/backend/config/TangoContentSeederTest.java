package com.vocabpet.backend.config;

import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.repository.TangoLessonRepository;
import com.vocabpet.backend.repository.TangoLessonVocabularyRepository;
import com.vocabpet.backend.repository.TangoVocabularyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class TangoContentSeederTest {

    @Autowired
    private TangoContentSeeder seeder;
    @Autowired
    private TangoLessonRepository lessonRepository;
    @Autowired
    private TangoVocabularyRepository vocabularyRepository;
    @Autowired
    private TangoLessonVocabularyRepository lessonVocabularyRepository;

    @Test
    @Transactional
    void seedingTwiceDoesNotDuplicateRows() throws Exception {
        // The context already ran the seeder once at startup; run it again to check idempotency.
        seeder.run(null);

        assertThat(lessonRepository.count()).isEqualTo(5);
        assertThat(vocabularyRepository.count()).isEqualTo(195);
        assertThat(lessonVocabularyRepository.count()).isEqualTo(196);
    }

    @Test
    @Transactional
    void sharedWordIsStoredOnceAndLinkedToBothLessons() {
        TangoVocabulary sochira = vocabularyRepository
                .findByKanaAndExpressionKey("そちら", "")
                .orElseThrow();

        long links = lessonVocabularyRepository.findAll().stream()
                .filter(link -> link.getVocabulary().getId().equals(sochira.getId()))
                .count();
        assertThat(links).isEqualTo(2);
    }

    @Test
    @Transactional
    void kanaOnlyWordStoresEmptyExpressionKey() {
        TangoVocabulary hai = vocabularyRepository
                .findByKanaAndExpressionKey("はい", "")
                .orElseThrow();

        assertThat(hai.getExpression()).isNull();
        assertThat(hai.getExpressionKey()).isEmpty();
        assertThat(hai.getMeanings()).hasSize(1);
    }
}
