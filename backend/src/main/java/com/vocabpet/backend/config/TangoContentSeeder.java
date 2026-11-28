package com.vocabpet.backend.config;

import com.vocabpet.backend.entity.TangoLesson;
import com.vocabpet.backend.entity.TangoLessonVocabulary;
import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.TangoVocabularyExample;
import com.vocabpet.backend.entity.TangoVocabularyMeaning;
import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.TangoPartOfSpeech;
import com.vocabpet.backend.repository.TangoLessonRepository;
import com.vocabpet.backend.repository.TangoLessonVocabularyRepository;
import com.vocabpet.backend.repository.TangoVocabularyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Imports Tango lesson content from a JSON file at startup.
 * shortcut: a lesson that already exists is skipped entirely, so content edits need a manual DB change;
 * upgrade to a versioned import once content starts changing.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TangoContentSeeder implements ApplicationRunner {

    private final TangoProperties properties;
    private final ObjectMapper objectMapper;
    private final TangoLessonRepository lessonRepository;
    private final TangoVocabularyRepository vocabularyRepository;
    private final TangoLessonVocabularyRepository lessonVocabularyRepository;
    private final TransactionTemplate transactionTemplate;

    @Value("${app.tango.seed.location:classpath:tango/minna-n5-bai-1-5.json}")
    private Resource source;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!properties.seed().enabled()) return;

        SeedFile file;
        try (InputStream in = source.getInputStream()) {
            file = objectMapper.readValue(in, SeedFile.class);
        }
        for (SeedLesson seedLesson : file.lessons()) {
            transactionTemplate.executeWithoutResult(status -> importLesson(file.jlptLevel(), seedLesson));
        }
    }

    void importLesson(JlptLevel level, SeedLesson seedLesson) {
        if (lessonRepository.findByJlptLevelAndLessonNumber(level, seedLesson.lessonNumber()).isPresent()) {
            log.debug("Tango lesson {} {} already exists, skipping", level, seedLesson.lessonNumber());
            return;
        }

        TangoLesson lesson = lessonRepository.save(TangoLesson.builder()
                .jlptLevel(level)
                .lessonNumber(seedLesson.lessonNumber())
                .title(seedLesson.title())
                .description(seedLesson.description())
                .sortOrder(seedLesson.lessonNumber())
                .published(true)
                .build());

        Set<Long> seenVocabularyIds = new HashSet<>();
        int position = 1;
        for (SeedWord word : seedLesson.words()) {
            TangoVocabulary vocabulary = vocabularyRepository
                    .findByKanaAndExpressionKey(word.kana(), TangoVocabulary.keyFor(word.expression()))
                    .orElseGet(() -> createVocabulary(word));

            if (!seenVocabularyIds.add(vocabulary.getId())) {
                throw new IllegalStateException("Duplicate word " + word.kana() + " in lesson " + seedLesson.lessonNumber());
            }

            lessonVocabularyRepository.save(TangoLessonVocabulary.builder()
                    .lesson(lesson)
                    .vocabulary(vocabulary)
                    .position(position++)
                    .required(true)
                    .build());
        }
        log.info("Imported Tango lesson {} {} with {} words", level, seedLesson.lessonNumber(), seedLesson.words().size());
    }

    private TangoVocabulary createVocabulary(SeedWord word) {
        TangoVocabulary vocabulary = TangoVocabulary.builder()
                .expression(word.expression())
                .kana(word.kana())
                .romaji(word.romaji())
                .partOfSpeech(word.partOfSpeech())
                .build();

        List<String> meanings = word.meanings();
        for (int i = 0; i < meanings.size(); i++) {
            vocabulary.getMeanings().add(TangoVocabularyMeaning.builder()
                    .vocabulary(vocabulary)
                    .meaning(meanings.get(i))
                    .primaryMeaning(i == 0)
                    .sortOrder(i + 1)
                    .build());
        }

        List<SeedExample> examples = word.examples() == null ? List.of() : word.examples();
        for (int i = 0; i < examples.size(); i++) {
            SeedExample example = examples.get(i);
            vocabulary.getExamples().add(TangoVocabularyExample.builder()
                    .vocabulary(vocabulary)
                    .japanese(example.japanese())
                    .reading(example.reading())
                    .vietnamese(example.vietnamese())
                    .sortOrder(i + 1)
                    .build());
        }

        return vocabularyRepository.save(vocabulary);
    }

    record SeedFile(JlptLevel jlptLevel, List<SeedLesson> lessons) {}

    record SeedLesson(int lessonNumber, String title, String description, List<SeedWord> words) {}

    record SeedWord(String expression, String kana, String romaji, TangoPartOfSpeech partOfSpeech,
                    List<String> meanings, List<SeedExample> examples) {}

    record SeedExample(String japanese, String reading, String vietnamese) {}
}
