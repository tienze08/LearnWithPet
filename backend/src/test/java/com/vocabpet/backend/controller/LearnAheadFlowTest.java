package com.vocabpet.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.Role;
import com.vocabpet.backend.repository.KanaItemProgressRepository;
import com.vocabpet.backend.repository.UserRepository;

/** Adaptive pace: continue learning, learn ahead, pace modes. Same seeded content as LearningPathFlowTest. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = {"app.learning-path.enabled=false", "app.learning-path.allowlist=ahead-flow@example.com"})
@WithMockUser(username = "ahead-flow@example.com")
class LearnAheadFlowTest {

    private static final String BASE = "/api/learning-path";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private KanaItemProgressRepository kanaRepository;

    @BeforeEach
    void users() {
        for (String email : List.of("ahead-flow@example.com", "not-listed@example.com"))
            if (!userRepository.existsByEmail(email))
                userRepository.save(User.builder().email(email).password("not-used").role(Role.USER).name("Path").build());
    }

    private String profileJson(String level, int minutes) {
        LocalDate target = LocalDate.now(ZoneId.of("Asia/Bangkok")).plusDays(90);
        return """
                {"currentLevel":"%s","goal":"PASS_JLPT","minutesPerDay":%d,"daysPerWeek":7,
                 "targetDate":"%s","timezone":"Asia/Bangkok"}""".formatted(level, minutes, target);
    }

    private String send(String path, String body) throws Exception {
        return mockMvc.perform(post(BASE + path).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString();
    }

    private String today() throws Exception {
        return mockMvc.perform(get(BASE + "/today")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private static List<Map<String, Object>> items(String today, String phase) {
        List<List<Map<String, Object>>> found = JsonPath.read(today, "$.phases[?(@.phase=='" + phase + "')].items");
        return found.get(0);
    }

    private void answerAll(List<Map<String, Object>> items, String phase, boolean correct) throws Exception {
        for (Map<String, Object> i : items)
            send("/answers", "{\"itemType\":\"%s\",\"itemId\":\"%s\",\"correct\":%s,\"review\":false,\"questionKind\":\"t\",\"phase\":\"%s\"}"
                    .formatted(i.get("itemType"), i.get("itemId"), correct, phase));
    }

    private void finishToday() throws Exception {
        String t = today();
        answerAll(items(t, "LEARN"), "LEARN", true);
        t = today();
        answerAll(items(t, "PRACTICE"), "PRACTICE", true);
        t = today();
        List<Map<String, Object>> test = items(t, "TEST");
        String all = String.join(",", test.stream().map(i -> "{\"itemType\":\"KANA\",\"itemId\":\"%s\",\"correct\":true}".formatted(i.get("itemId"))).toList());
        send("/tests", "{\"attempt\":1,\"answers\":[" + all + "]}");
        assertThat((Boolean) JsonPath.read(today(), "$.completed")).isTrue();
    }

    private String nextUp() throws Exception {
        return mockMvc.perform(get(BASE + "/next-up")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private void setUp(String pace) throws Exception {
        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content(profileJson("BEGINNER", 30))).andExpect(status().isOk());
        if (pace != null)
            mockMvc.perform(put(BASE + "/pace").contentType(MediaType.APPLICATION_JSON).content("{\"pace\":\"" + pace + "\"}")).andExpect(status().isOk());
    }

    @Test
    void todaysLessonIsOfferedFirstThenTheNextOne() throws Exception {
        setUp(null);
        assertThat((Boolean) JsonPath.read(nextUp(), "$.lessons[0].inToday")).isTrue(); // the schedule never hides what is open
        assertThat((String) JsonPath.read(today(), "$.profile.pace")).isEqualTo("FLEXIBLE");
        List<String> todays = items(today(), "LEARN").stream().map(i -> (String) i.get("itemId")).toList();
        finishToday();

        String n = nextUp();
        assertThat((List<Object>) JsonPath.read(n, "$.lessons")).hasSize(1); // Flexible suggests one
        List<String> ids = JsonPath.read(n, "$.lessons[0].items[*].itemId");
        assertThat(ids).isNotEmpty().doesNotContainAnyElementsOf(todays);
        assertThat((String) JsonPath.read(n, "$.lessons[0].scheduledFor")).isNotNull();
    }

    @Test
    void learningAheadIsRecordedOnceKeepsTheDayDoneAndIsNotPlannedAgain() throws Exception {
        setUp(null);
        finishToday();
        String n = nextUp();
        List<Map<String, Object>> ahead = JsonPath.read(n, "$.lessons[0].items");
        String title = JsonPath.read(n, "$.lessons[0].title");
        String scheduled = JsonPath.read(n, "$.lessons[0].scheduledFor");
        int introducedBefore = JsonPath.read(today(), "$.itemsIntroduced");

        answerAll(ahead, "LEARN", true);
        answerAll(ahead, "LEARN", true); // a second question for the same items must not change how they are recorded

        String t = today();
        assertThat((Boolean) JsonPath.read(t, "$.completed")).isTrue(); // today's plan is untouched
        assertThat((Integer) JsonPath.read(t, "$.itemsIntroduced")).isEqualTo(introducedBefore + ahead.size());
        assertThat((Integer) JsonPath.read(t, "$.daysCompleted")).isEqualTo(1); // no completed day appeared
        assertThat((List<Object>) JsonPath.read(t, "$.learnedAhead")).hasSize(1);
        assertThat((String) JsonPath.read(t, "$.learnedAhead[0].scheduledFor")).isEqualTo(scheduled);

        // The unit shows as learned ahead on the roadmap, and the next suggestion is a different lesson.
        String road = mockMvc.perform(get(BASE + "/roadmap")).andReturn().getResponse().getContentAsString();
        assertThat((List<Object>) JsonPath.read(road, "$.chapters[*].units[?(@.ahead==true)]")).hasSize(1);
        String n2 = nextUp();
        assertThat((String) JsonPath.read(n2, "$.lessons[0].title")).isNotEqualTo(title);

        // SRS: the item was scheduled for review from the real answer time.
        String[] k = ((String) ahead.get(0).get("itemId")).split(":");
        var kp = kanaRepository.findByUserIdAndScriptAndKana(userRepository.findByEmail("ahead-flow@example.com").orElseThrow().getId(), k[0], k[1]).orElseThrow();
        assertThat(kp.getNextReviewAt()).isNotNull();
        assertThat(kp.getCorrectCount()).isEqualTo(2);
    }

    @Test
    void aLockedLessonCannotBeLearnedAhead() throws Exception {
        setUp(null);
        mockMvc.perform(post(BASE + "/answers").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemType\":\"KANA\",\"itemId\":\"katakana:ア\",\"correct\":true,\"review\":false,\"questionKind\":\"t\",\"phase\":\"LEARN\"}"))
                .andExpect(status().isBadRequest());
        assertThat((List<Object>) JsonPath.read(today(), "$.learnedAhead")).isEmpty();
    }

    @Test
    void paceDecidesHowMuchIsOfferedButNeverLocksAnOpenLesson() throws Exception {
        setUp("FAST_TRACK");
        finishToday();
        assertThat((List<Object>) JsonPath.read(nextUp(), "$.lessons")).hasSize(3); // Fast Track suggests three
        mockMvc.perform(put(BASE + "/pace").contentType(MediaType.APPLICATION_JSON).content("{\"pace\":\"RELAXED\"}")).andExpect(status().isOk());
        String n = nextUp();
        assertThat((Integer) JsonPath.read(n, "$.aheadCap")).isEqualTo(1);
        answerAll(JsonPath.read(n, "$.lessons[0].items"), "LEARN", true);
        String after = nextUp(); // the pace's daily amount is a suggestion: open lessons stay available
        assertThat((Integer) JsonPath.read(after, "$.aheadUnitsToday")).isEqualTo(1);
        assertThat((List<Object>) JsonPath.read(after, "$.lessons")).hasSize(1);
    }

    @Test
    void extraPracticeOfAKnownItemIsNotCountedAsLearningAhead() throws Exception {
        setUp(null);
        finishToday();
        List<Map<String, Object>> known = items(today(), "LEARN");
        answerAll(known.subList(0, 1), "LEARN", true);
        assertThat((List<Object>) JsonPath.read(today(), "$.learnedAhead")).isEmpty();
    }
}
