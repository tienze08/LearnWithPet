package com.vocabpet.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.vocabpet.backend.entity.Deck;
import com.vocabpet.backend.entity.TangoLesson;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.LearningSource;
import com.vocabpet.backend.entity.enums.Role;
import com.vocabpet.backend.repository.DeckRepository;
import com.vocabpet.backend.repository.TangoLessonRepository;
import com.vocabpet.backend.repository.TangoLessonVocabularyRepository;
import com.vocabpet.backend.repository.UserRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;
import com.vocabpet.backend.repository.VocabularyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Lesson to flashcard deck: idempotent copy, per-user decks, Tango fields on cards, FLASHCARD source on attempts. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@WithMockUser(username = "tango-deck@example.com")
class TangoDeckFlowTest {

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
    private DeckRepository deckRepository;
    @Autowired
    private VocabularyRepository vocabularyRepository;
    @Autowired
    private UserVocabularyProgressRepository progressRepository;

    private TangoLesson lesson1;
    private User user;

    @BeforeEach
    void setUp() {
        user = userRepository.findByEmail("tango-deck@example.com").orElseGet(() -> userRepository.save(
                User.builder().email("tango-deck@example.com").password("not-used").role(Role.USER).name("Deck").build()));
        lesson1 = lessonRepository.findByJlptLevelAndLessonNumber(JlptLevel.N5, 1).orElseThrow();
    }

    @Test
    void toDeckCreatesAllWordsOnceAndIsIdempotent() throws Exception {
        int wordCount = lessonVocabularyRepository.findByLessonIdOrderByPositionAsc(lesson1.getId()).size();
        String path = BASE + "/lessons/" + lesson1.getId() + "/to-deck";

        MvcResult first = mockMvc.perform(post(path))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deckName").value("Tango N5"))
                .andExpect(jsonPath("$.added").value(wordCount))
                .andExpect(jsonPath("$.skipped").value(0))
                .andReturn();
        long deckId = ((Number) JsonPath.read(first.getResponse().getContentAsString(), "$.deckId")).longValue();

        mockMvc.perform(post(path))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deckId").value(deckId))
                .andExpect(jsonPath("$.added").value(0))
                .andExpect(jsonPath("$.skipped").value(wordCount));

        assertThat(vocabularyRepository.findByDeckId(deckId)).hasSize(wordCount);
        assertThat(deckRepository.findByUser(user).stream().filter(d -> d.getName().equals("Tango N5"))).hasSize(1);
    }

    @Test
    void otherUserDoesNotSeeTheDeck() throws Exception {
        mockMvc.perform(post(BASE + "/lessons/" + lesson1.getId() + "/to-deck")).andExpect(status().isOk());
        User other = userRepository.save(User.builder().email("tango-deck-other@example.com").password("not-used")
                .role(Role.USER).name("Other").build());
        assertThat(deckRepository.findByUser(other)).extracting(Deck::getName).doesNotContain("Tango N5");
    }

    @Test
    void studySessionReviewRecordsFlashcardSourceAndCardHasTangoFields() throws Exception {
        MvcResult res = mockMvc.perform(post(BASE + "/lessons/" + lesson1.getId() + "/to-deck")).andReturn();
        long deckId = ((Number) JsonPath.read(res.getResponse().getContentAsString(), "$.deckId")).longValue();

        MvcResult session = mockMvc.perform(post("/api/study-sessions/start").contentType(MediaType.APPLICATION_JSON)
                .content("{\"deckId\":" + deckId + "}")).andExpect(status().isOk()).andReturn();
        long sessionId = ((Number) JsonPath.read(session.getResponse().getContentAsString(), "$.sessionId")).longValue();

        MvcResult card = mockMvc.perform(get("/api/study-sessions/" + sessionId + "/next-card"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kana").isNotEmpty())
                .andExpect(jsonPath("$.romaji").isNotEmpty())
                .andExpect(jsonPath("$.lessonNumber").value(1))
                .andExpect(jsonPath("$.jlptLevel").value("N5"))
                .andReturn();
        long vocabularyId = ((Number) JsonPath.read(card.getResponse().getContentAsString(), "$.vocabularyId")).longValue();

        mockMvc.perform(post("/api/study-sessions/" + sessionId + "/review").contentType(MediaType.APPLICATION_JSON)
                .content("{\"vocabularyId\":" + vocabularyId + ",\"rating\":\"GOOD\"}")).andExpect(status().isOk());

        UserVocabularyProgress p = progressRepository.findByUserIdAndVocabularyId(user.getId(), vocabularyId).orElseThrow();
        assertThat(p.getLastSource()).isEqualTo(LearningSource.FLASHCARD);
        assertThat(p.getTangoVocabulary()).isNotNull();
    }

    @Test
    void deckCardsCarryTangoFieldsAndAttemptsRecordFlashcardSource() throws Exception {
        MvcResult res = mockMvc.perform(post(BASE + "/lessons/" + lesson1.getId() + "/to-deck")).andReturn();
        long deckId = ((Number) JsonPath.read(res.getResponse().getContentAsString(), "$.deckId")).longValue();

        MvcResult cards = mockMvc.perform(get("/api/decks/" + deckId + "/vocabularies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].kana").isNotEmpty())
                .andExpect(jsonPath("$[0].lessonNumber").value(1))
                .andExpect(jsonPath("$[0].jlptLevel").value("N5"))
                .andReturn();
        long vocabularyId = ((Number) JsonPath.read(cards.getResponse().getContentAsString(), "$[0].id")).longValue();

        mockMvc.perform(post("/api/learning/attempts").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyId\":" + vocabularyId + ",\"rating\":\"GOOD\",\"source\":\"FLASHCARD\"}"))
                .andExpect(status().isOk());

        UserVocabularyProgress p = progressRepository.findByUserIdAndVocabularyId(user.getId(), vocabularyId).orElseThrow();
        assertThat(p.getLastSource()).isEqualTo(LearningSource.FLASHCARD);
        assertThat(p.getTangoVocabulary()).isNotNull();

        mockMvc.perform(post("/api/learning/attempts").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vocabularyId\":" + vocabularyId + ",\"rating\":\"GOOD\"}"))
                .andExpect(status().isOk());
        assertThat(progressRepository.findByUserIdAndVocabularyId(user.getId(), vocabularyId).orElseThrow().getLastSource())
                .isEqualTo(LearningSource.REVIEW);
    }
}
