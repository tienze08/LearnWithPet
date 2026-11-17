package com.vocabpet.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.vocabpet.backend.entity.TangoLesson;
import com.vocabpet.backend.entity.TangoLessonVocabulary;
import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.Role;
import com.vocabpet.backend.repository.TangoLessonRepository;
import com.vocabpet.backend.repository.TangoLessonVocabularyRepository;
import com.vocabpet.backend.repository.TangoVocabularyRepository;
import com.vocabpet.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end learning flow on lesson 1. Runs in a transaction that is rolled back after each test,
 * so the seeded content and other tests are not affected.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@WithMockUser(username = "tango-flow@example.com")
class TangoLearningFlowTest {

    private static final String BASE = "/api/japanese/tango";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TangoLessonRepository lessonRepository;
    @Autowired
    private TangoLessonVocabularyRepository lessonVocabularyRepository;
    @Autowired
    private TangoVocabularyRepository vocabularyRepository;

    private TangoLesson lesson1;

    @BeforeEach
    void setUp() {
        if (!userRepository.existsByEmail("tango-flow@example.com")) {
            userRepository.save(User.builder().email("tango-flow@example.com").password("not-used")
                    .role(Role.USER).name("Flow").build());
        }
        lesson1 = lessonRepository.findByJlptLevelAndLessonNumber(JlptLevel.N5, 1).orElseThrow();
    }

    @Test
    void fullFlowFromStartToCompletionWithBackendGrading() throws Exception {
        String lessonPath = BASE + "/lessons/" + lesson1.getId();

        mockMvc.perform(post(lessonPath + "/start"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.created").value(true))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        mockMvc.perform(post(lessonPath + "/start"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created").value(false));

        List<TangoLessonVocabulary> links = lessonVocabularyRepository.findByLessonIdOrderByPositionAsc(lesson1.getId());
        List<Long> allIds = links.stream().map(lv -> lv.getVocabulary().getId()).toList();

        mockMvc.perform(post(lessonPath + "/study-progress").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyIds\":[" + allIds.get(0) + "," + allIds.get(1) + "]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newlyViewed").value(2));
        mockMvc.perform(post(lessonPath + "/study-progress").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyIds\":[" + allIds.get(0) + "]}"))
                .andExpect(jsonPath("$.newlyViewed").value(0));

        // Words from another lesson are rejected.
        Long otherLessonWord = otherLessonVocabularyId();
        mockMvc.perform(post(lessonPath + "/study-progress").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyIds\":[" + otherLessonWord + "]}"))
                .andExpect(status().isBadRequest());

        // View every required word so the lesson can complete after a passing quiz.
        String allIdsJson = allIds.toString();
        mockMvc.perform(post(lessonPath + "/study-progress").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyIds\":" + allIdsJson + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewedCount").value(39))
                .andExpect(jsonPath("$.requiredCount").value(39))
                .andExpect(jsonPath("$.lessonStatus").value("IN_PROGRESS"));

        MvcResult quizResult = mockMvc.perform(get(lessonPath + "/quiz").param("mode", "MIXED").param("scope", "ALL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalQuestions").value(39))
                .andReturn();
        String quizJson = quizResult.getResponse().getContentAsString();
        assertThat(quizJson).doesNotContain("\"answer\"").doesNotContain("correctAnswers");

        List<Map<String, Object>> questions = JsonPath.read(quizJson, "$.questions");
        List<Map<String, Object>> answers = new ArrayList<>();
        for (int i = 0; i < questions.size(); i++) {
            Map<String, Object> q = questions.get(i);
            long vocabularyId = ((Number) q.get("vocabularyId")).longValue();
            String mode = (String) q.get("mode");
            String answer = mode.equals("VI_TO_JP") ? correctJapanese(vocabularyId) : correctMeaning(vocabularyId);
            // One deliberately wrong answer, with a client-sent isCorrect that the backend must ignore.
            if (i == 0) {
                answer = "wrong answer";
            }
            Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("vocabularyId", vocabularyId);
            entry.put("mode", mode);
            entry.put("answer", answer);
            if (i == 0) entry.put("isCorrect", true);
            answers.add(entry);
        }

        String attemptBody = toJson(Map.of(
                "clientAttemptId", "attempt-flow-1",
                "mode", "MIXED",
                "scope", "ALL",
                "answers", answers));
        // Quiz was MIXED: answers must be per-question modes, so the attempt uses MIXED as the quiz mode.
        mockMvc.perform(post(lessonPath + "/attempts").contentType(MediaType.APPLICATION_JSON).content(attemptBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.replayed").value(false))
                .andExpect(jsonPath("$.totalQuestions").value(39))
                .andExpect(jsonPath("$.correctCount").value(38))
                .andExpect(jsonPath("$.incorrectCount").value(1))
                .andExpect(jsonPath("$.accuracy").value(0.9744))
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.lessonStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.results[0].isCorrect").value(false));

        // Same clientAttemptId returns the stored result and creates nothing new.
        mockMvc.perform(post(lessonPath + "/attempts").contentType(MediaType.APPLICATION_JSON).content(attemptBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayed").value(true))
                .andExpect(jsonPath("$.correctCount").value(38));

        // The single wrong word becomes NEED_REVIEW and shows up in the mistakes quiz.
        mockMvc.perform(get(lessonPath + "/quiz").param("scope", "MISTAKES"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalQuestions").value(1));
    }

    @Test
    void attemptRejectsWordsOutsideLessonAndMismatchedModes() throws Exception {
        String lessonPath = BASE + "/lessons/" + lesson1.getId();
        Long otherLessonWord = otherLessonVocabularyId();

        mockMvc.perform(post(lessonPath + "/attempts").contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("clientAttemptId", "x-1", "mode", "MIXED", "scope", "ALL",
                                "answers", List.of(Map.of("vocabularyId", otherLessonWord,
                                        "mode", "JP_TO_MEANING", "answer", "trường học"))))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("ANSWER_NOT_IN_LESSON")));

        Long insideWord = lessonVocabularyRepository.findByLessonIdOrderByPositionAsc(lesson1.getId())
                .get(0).getVocabulary().getId();
        mockMvc.perform(post(lessonPath + "/attempts").contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("clientAttemptId", "x-2", "mode", "JP_TO_MEANING", "scope", "ALL",
                                "answers", List.of(Map.of("vocabularyId", insideWord,
                                        "mode", "VI_TO_JP", "answer", "わたし"))))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void attemptValidationRejectsMissingIdAndEmptyAnswers() throws Exception {
        String lessonPath = BASE + "/lessons/" + lesson1.getId();
        mockMvc.perform(post(lessonPath + "/attempts").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"MIXED\",\"scope\":\"ALL\",\"answers\":[{\"vocabularyId\":1,\"mode\":\"VI_TO_JP\",\"answer\":\"x\"}]}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post(lessonPath + "/attempts").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clientAttemptId\":\"x-3\",\"mode\":\"MIXED\",\"scope\":\"ALL\",\"answers\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void quizForUnknownLessonIsNotFoundAndBadModeIsBadRequest() throws Exception {
        mockMvc.perform(get(BASE + "/lessons/999999/quiz")).andExpect(status().isNotFound());
        mockMvc.perform(get(BASE + "/lessons/" + lesson1.getId() + "/quiz").param("mode", "FOO"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void favoritesSearchAndProgressOverview() throws Exception {
        Long wordId = lessonVocabularyRepository.findByLessonIdOrderByPositionAsc(lesson1.getId())
                .get(0).getVocabulary().getId();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put(BASE + "/vocabularies/" + wordId + "/favorite"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorite").value(true));
        mockMvc.perform(get(BASE + "/favorites"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].vocabularyId").value(wordId));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete(BASE + "/vocabularies/" + wordId + "/favorite"))
                .andExpect(jsonPath("$.favorite").value(false));
        mockMvc.perform(get(BASE + "/favorites")).andExpect(jsonPath("$.total").value(0));

        mockMvc.perform(get(BASE + "/search").param("q", "わたし"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vocabularies[0].kana").value("わたし"));
        mockMvc.perform(get(BASE + "/search").param("q", "   "))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get(BASE + "/search").param("q", "ワタシ"))
                .andExpect(jsonPath("$.vocabularies[0].kana").value("わたし"));

        mockMvc.perform(get(BASE + "/progress").param("level", "N5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.words.total").value(195))
                .andExpect(jsonPath("$.words.new").value(195))
                .andExpect(jsonPath("$.lessons.notStarted").value(5))
                .andExpect(jsonPath("$.continueLearning").doesNotExist());
        mockMvc.perform(get(BASE + "/progress/weak"))
                .andExpect(jsonPath("$.items.length()").value(0));
        mockMvc.perform(get(BASE + "/progress/weak").param("limit", "0"))
                .andExpect(status().isBadRequest());
    }

    private Long otherLessonVocabularyId() {
        TangoLesson lesson5 = lessonRepository.findByJlptLevelAndLessonNumber(JlptLevel.N5, 5).orElseThrow();
        return lessonVocabularyRepository.findByLessonIdOrderByPositionAsc(lesson5.getId()).get(0)
                .getVocabulary().getId();
    }

    private String correctMeaning(long vocabularyId) {
        TangoVocabulary v = vocabularyRepository.findById(vocabularyId).orElseThrow();
        return v.getMeanings().get(0).getMeaning();
    }

    private String correctJapanese(long vocabularyId) {
        TangoVocabulary v = vocabularyRepository.findById(vocabularyId).orElseThrow();
        return v.getKana();
    }

    private static String toJson(Object value) {
        return tools.jackson.databind.json.JsonMapper.builder().build().writeValueAsString(value);
    }
}
