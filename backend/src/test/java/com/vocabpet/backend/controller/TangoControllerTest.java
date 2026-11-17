package com.vocabpet.backend.controller;

import com.vocabpet.backend.entity.TangoLesson;
import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.Role;
import com.vocabpet.backend.repository.TangoLessonRepository;
import com.vocabpet.backend.repository.TangoVocabularyRepository;
import com.vocabpet.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "tango-reader@example.com")
class TangoControllerTest {

    private static final String BASE = "/api/japanese/tango";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TangoLessonRepository lessonRepository;
    @Autowired
    private TangoVocabularyRepository vocabularyRepository;

    @BeforeEach
    void ensureUser() {
        if (!userRepository.existsByEmail("tango-reader@example.com")) {
            userRepository.save(User.builder()
                    .email("tango-reader@example.com")
                    .password("not-used")
                    .role(Role.USER)
                    .name("Tango Reader")
                    .build());
        }
    }

    @Test
    void levelsReturnsSeededCountsAndZeroForEmptyLevels() throws Exception {
        mockMvc.perform(get(BASE + "/levels"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.levels[?(@.level=='N5')].lessonCount").value(5))
                .andExpect(jsonPath("$.levels[?(@.level=='N5')].vocabularyCount").value(195))
                .andExpect(jsonPath("$.levels[0].level").value("N5"))
                .andExpect(jsonPath("$.levels[0].userSummary.new").value(195))
                .andExpect(jsonPath("$.levels[0].userSummary.learning").value(0))
                .andExpect(jsonPath("$.levels[?(@.level=='N1')].lessonCount").value(0))
                .andExpect(jsonPath("$.levels[?(@.level=='N1')].vocabularyCount").value(0));
    }

    @Test
    void lessonsForLevelAreOrderedAndNotStarted() throws Exception {
        mockMvc.perform(get(BASE + "/lessons").param("level", "N5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.level").value("N5"))
                .andExpect(jsonPath("$.lessons.length()").value(5))
                .andExpect(jsonPath("$.lessons[0].lessonNumber").value(1))
                .andExpect(jsonPath("$.lessons[0].requiredCount").value(39))
                .andExpect(jsonPath("$.lessons[0].status").value("NOT_STARTED"))
                .andExpect(jsonPath("$.lessons[0].progressPercent").value(0));
    }

    @Test
    void lessonsForLevelWithoutContentIsEmptyNotError() throws Exception {
        mockMvc.perform(get(BASE + "/lessons").param("level", "N1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lessons.length()").value(0));
    }

    @Test
    void lessonsWithMissingOrInvalidLevelReturnsBadRequest() throws Exception {
        mockMvc.perform(get(BASE + "/lessons"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(BASE + "/lessons").param("level", "N9"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void lessonDetailReturnsCountsForSeededLesson() throws Exception {
        TangoLesson lesson5 = lessonFor(5);
        mockMvc.perform(get(BASE + "/lessons/" + lesson5.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jlptLevel").value("N5"))
                .andExpect(jsonPath("$.lessonNumber").value(5))
                .andExpect(jsonPath("$.vocabularyCount").value(40))
                .andExpect(jsonPath("$.status").value("NOT_STARTED"))
                .andExpect(jsonPath("$.quizPassed").value(false));
    }

    @Test
    void lessonDetailUnknownIdReturnsNotFound() throws Exception {
        mockMvc.perform(get(BASE + "/lessons/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Lesson not found"));
    }

    @Test
    void lessonVocabulariesAreOrderedByPosition() throws Exception {
        TangoLesson lesson5 = lessonFor(5);
        mockMvc.perform(get(BASE + "/lessons/" + lesson5.getId() + "/vocabularies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lessonId").value(lesson5.getId()))
                .andExpect(jsonPath("$.vocabularies.length()").value(40))
                .andExpect(jsonPath("$.vocabularies[0].position").value(1))
                .andExpect(jsonPath("$.vocabularies[0].kana").value("いきます"))
                .andExpect(jsonPath("$.vocabularies[0].status").value("NEW"))
                .andExpect(jsonPath("$.vocabularies[0].viewed").value(false))
                .andExpect(jsonPath("$.vocabularies[0].favorite").value(false));
    }

    @Test
    void vocabularyDetailShowsSharedWordInTwoLessons() throws Exception {
        TangoVocabulary sochira = vocabularyRepository.findByKanaAndExpressionKey("そちら", "").orElseThrow();
        mockMvc.perform(get(BASE + "/vocabularies/" + sochira.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kana").value("そちら"))
                .andExpect(jsonPath("$.lessons.length()").value(2))
                .andExpect(jsonPath("$.meanings[0].isPrimary").value(true))
                .andExpect(jsonPath("$.progress").doesNotExist())
                .andExpect(jsonPath("$.favorite").value(false));
    }

    @Test
    void vocabularyDetailUnknownIdReturnsNotFound() throws Exception {
        mockMvc.perform(get(BASE + "/vocabularies/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Vocabulary not found"));
    }

    private TangoLesson lessonFor(int number) {
        return lessonRepository.findByJlptLevelAndLessonNumber(JlptLevel.N5, number).orElseThrow();
    }
}
