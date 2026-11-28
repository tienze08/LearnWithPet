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

/** Learning Path API end to end on the seeded content (kana + Minna 1–5). Rolled back after each test. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = {"app.learning-path.enabled=false", "app.learning-path.allowlist=path-flow@example.com"})
@WithMockUser(username = "path-flow@example.com")
class LearningPathFlowTest {

    private static final String BASE = "/api/learning-path";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private KanaItemProgressRepository kanaRepository;

    @BeforeEach
    void users() {
        for (String email : List.of("path-flow@example.com", "not-listed@example.com"))
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

    @Test
    void beginnerDayGoesThroughFourPhasesAndATestWithRetake() throws Exception {
        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content(profileJson("BEGINNER", 30)))
                .andExpect(status().isOk());

        String t = today();
        assertThat((String) JsonPath.read(t, "$.kind")).isEqualTo("LESSON");
        assertThat((String) JsonPath.read(t, "$.title")).startsWith("Ngày 1 – Hiragana: năm nguyên âm");
        assertThat(JsonPath.<List<String>>read(t, "$.phases[*].phase")).containsExactly("REVIEW", "LEARN", "PRACTICE", "TEST");
        assertThat((String) JsonPath.read(t, "$.nextPhase")).isEqualTo("LEARN"); // nothing to review on day 1
        assertThat(JsonPath.<List<Object>>read(t, "$.week")).hasSize(7);
        assertThat(JsonPath.<List<String>>read(t, "$.skills[*].skill")).contains("HIRAGANA", "KATAKANA", "GRAMMAR");

        List<Map<String, Object>> learn = items(t, "LEARN");
        assertThat(learn).isNotEmpty().allMatch(i -> "KANA".equals(i.get("itemType")));
        // Answering in LEARN does not complete PRACTICE: each phase needs its own activity.
        answerAll(learn, "LEARN", true);
        t = today();
        assertThat((String) JsonPath.read(t, "$.nextPhase")).isEqualTo("PRACTICE");
        answerAll(items(t, "PRACTICE"), "PRACTICE", true);
        assertThat((String) JsonPath.read(today(), "$.nextPhase")).isEqualTo("TEST");

        // Test: attempt 1 below 80% → retake offered; wrong items become weak (mastery label "Yếu").
        List<Map<String, Object>> test = items(t, "TEST");
        List<String> answers = new ArrayList<>();
        for (int i = 0; i < test.size(); i++)
            answers.add("{\"itemType\":\"KANA\",\"itemId\":\"%s\",\"correct\":%s}".formatted(test.get(i).get("itemId"), i >= test.size() / 2));
        String r1 = send("/tests", "{\"attempt\":1,\"answers\":[" + String.join(",", answers) + "]}");
        assertThat((Boolean) JsonPath.read(r1, "$.canRetake")).isTrue();
        assertThat((Double) JsonPath.read(r1, "$.finalScore")).isNull();
        String wrongId = (String) test.get(0).get("itemId");
        String[] kana = wrongId.split(":");
        assertThat(kanaRepository.findByUserIdAndScriptAndKana(userRepository.findByEmail("path-flow@example.com").orElseThrow().getId(), kana[0], kana[1])
                .orElseThrow().isWeak()).isTrue();
        assertThat((String) JsonPath.read(today(), "$.nextPhase")).isEqualTo("TEST");

        String all = String.join(",", test.stream().map(i -> "{\"itemType\":\"KANA\",\"itemId\":\"%s\",\"correct\":true}".formatted(i.get("itemId"))).toList());
        String r2 = send("/tests", "{\"attempt\":2,\"answers\":[" + all + "]}");
        assertThat((Double) JsonPath.read(r2, "$.attempt2Score")).isEqualTo(1.0);
        assertThat((Double) JsonPath.read(r2, "$.finalScore")).isEqualTo(1.0);
        mockMvc.perform(post(BASE + "/tests").contentType(MediaType.APPLICATION_JSON).content("{\"attempt\":2,\"answers\":[" + all + "]}"))
                .andExpect(status().isConflict());

        t = today();
        assertThat((Boolean) JsonPath.read(t, "$.completed")).isTrue();
        assertThat((Integer) JsonPath.read(t, "$.streak")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(t, "$.itemsUnderstood")).isPositive(); // progressPercent rounds to 0 for 5 kana of ~600 items
        assertThat((Integer) JsonPath.read(t, "$.daysCompleted")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(t, "$.itemsIntroduced")).isEqualTo(learn.size());

        String road = mockMvc.perform(get(BASE + "/roadmap")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(road, "$.days[*].status")).contains("TODAY", "UPCOMING");
        assertThat(JsonPath.<List<Integer>>read(road, "$.days[?(@.status=='TODAY')].newItems.KANA")).containsExactly(learn.size());
        assertThat(JsonPath.<List<String>>read(road, "$.days[*].kind")).contains("WEEKLY_TEST", "UNIT_REVIEW");

        // Kana report: item_type is varchar now, so the new KANA value is stored.
        mockMvc.perform(post(BASE + "/reports").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemType\":\"KANA\",\"itemId\":\"hiragana:あ\",\"questionKind\":\"kana-romaji\",\"questionJson\":\"{}\",\"comment\":\"\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void beginnerPreviewGroupsTheProjectedPathIntoCyclesAndSavesNothing() throws Exception {
        String p = send("/preview", profileJson("BEGINNER", 30));
        assertThat((String) JsonPath.read(p, "$.days[0].title")).startsWith("Ngày 1 – Hiragana: năm nguyên âm");
        assertThat((String) JsonPath.read(p, "$.days[0].status")).isEqualTo("TODAY");
        assertThat((Integer) JsonPath.read(p, "$.days[0].newItems.KANA")).isPositive();
        assertThat(JsonPath.<List<String>>read(p, "$.prioritySkills[*].skill")).containsExactly("HIRAGANA", "KATAKANA");
        List<Map<String, Object>> stages = JsonPath.read(p, "$.stages");
        assertThat(stages.size()).isGreaterThan(1);
        assertThat(stages.get(0).get("testDate")).isNotNull(); // a cycle ends with its weekly test
        assertThat((List<?>) stages.get(0).get("topics")).first().asString().startsWith("Hiragana");
        mockMvc.perform(get(BASE + "/status")).andExpect(jsonPath("$.onboarded").value(false));
        mockMvc.perform(get(BASE + "/today")).andExpect(status().isNotFound());
    }

    @Test
    void placementThatKnowsHiraganaStartsAtMinnaLessonOne() throws Exception {
        String placement = mockMvc.perform(get(BASE + "/placement")).andReturn().getResponse().getContentAsString();
        List<String> hiragana = JsonPath.read(placement, "$.hiragana");
        List<String> katakana = JsonPath.read(placement, "$.katakana");
        assertThat(hiragana).hasSize(10).allMatch(id -> id.startsWith("hiragana:"));
        assertThat(katakana).hasSize(10).allMatch(id -> id.startsWith("katakana:"));
        String answers = String.join(",", hiragana.stream().map(id -> "{\"itemType\":\"KANA\",\"itemId\":\"" + id + "\",\"correct\":true}").toList())
                + ",{\"itemType\":\"KANA\",\"itemId\":\"" + katakana.get(0) + "\",\"correct\":false}";
        String result = send("/placement", "{\"answers\":[" + answers + "]}");
        assertThat((Integer) JsonPath.read(result, "$.kanaKnown")).isEqualTo(104); // every hiragana, no katakana
        assertThat(JsonPath.<List<String>>read(result, "$.sections[*].skill")).containsExactly("HIRAGANA", "KATAKANA", "GRAMMAR", "VOCAB", "KANJI");
        assertThat((Integer) JsonPath.read(result, "$.sections[0].known")).isEqualTo(104);
        assertThat((Integer) JsonPath.read(result, "$.sections[0].correct")).isEqualTo(10);
        assertThat((Integer) JsonPath.read(result, "$.sections[1].asked")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(result, "$.sections[1].known")).isZero();

        // The preview now starts after hiragana, at katakana (the kana gate still stands), and saves nothing.
        String preview = send("/preview", profileJson("STUDYING", 30));
        assertThat((String) JsonPath.read(preview, "$.days[0].title")).contains("Katakana");
        // Hiragana is all known, katakana is not: katakana (a prerequisite) leads the priorities.
        assertThat(JsonPath.<List<String>>read(preview, "$.prioritySkills[*].skill")).doesNotContain("HIRAGANA").first().isEqualTo("KATAKANA");
        assertThat((Boolean) JsonPath.read(mockMvc.perform(get(BASE + "/status")).andReturn().getResponse().getContentAsString(), "$.onboarded")).isFalse();

        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content(profileJson("STUDYING", 30)))
                .andExpect(status().isOk());
        String t = today();
        assertThat((String) JsonPath.read(t, "$.title")).contains("Katakana");
        assertThat(items(t, "LEARN")).noneMatch(i -> "KANA".equals(i.get("itemType")) && ((String) i.get("itemId")).startsWith("hiragana:"));
    }

    @Autowired
    private com.vocabpet.backend.repository.LearningPlanRepository planRepository;
    @Autowired
    private com.vocabpet.backend.repository.DailyPlanRepository dailyPlanRepository;

    @Test
    void afterACycleOfCompletedDaysComesTheWeeklyTestAndItsAdjustment() throws Exception {
        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content(profileJson("BEGINNER", 30)))
                .andExpect(status().isOk());
        Long userId = userRepository.findByEmail("path-flow@example.com").orElseThrow().getId();
        var plan = planRepository.findFirstByUserIdAndStatusOrderByIdDesc(userId, com.vocabpet.backend.entity.enums.PathPlanStatus.ACTIVE).orElseThrow();
        // 7 days a week = 6 lesson days, then the test. Six completed days in the past, each with two hiragana learned.
        String[] kana = {"あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ", "さ", "し"};
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Bangkok"));
        for (int d = 0; d < 6; d++) {
            String json = """
                    {"version":2,"kind":"LESSON","dayNumber":%d,"title":"Ngày %d","unitIds":["n5-h01"],"phases":[
                     {"phase":"REVIEW","items":[],"minutes":0},
                     {"phase":"LEARN","items":[{"type":"KANA","id":"hiragana:%s"},{"type":"KANA","id":"hiragana:%s"}],"minutes":1},
                     {"phase":"PRACTICE","items":[],"minutes":0},{"phase":"TEST","items":[],"minutes":0}],
                     "reducedNew":false,"deferredReviews":0}""".formatted(d + 1, d + 1, kana[2 * d], kana[2 * d + 1]);
            dailyPlanRepository.save(com.vocabpet.backend.entity.DailyPlan.builder().plan(plan).localDate(today.minusDays(6 - d))
                    .blocksJson(json).estimatedMinutes(5).completedAt(java.time.Instant.now()).build());
        }

        String t = today();
        assertThat((String) JsonPath.read(t, "$.kind")).isEqualTo("WEEKLY_TEST");
        assertThat((String) JsonPath.read(t, "$.title")).endsWith("Kiểm tra tuần");
        assertThat(JsonPath.<List<String>>read(t, "$.phases[*].label")).containsExactly("Ôn tập", "Củng cố", "Luyện tập", "Kiểm tra tuần");
        List<Map<String, Object>> test = items(t, "TEST");
        assertThat(test).hasSize(12).allMatch(i -> ((String) i.get("itemId")).startsWith("hiragana:")); // the cycle's 12 kana

        // 70%: below the pass mark, retake skipped → weekly rule 60–79% (fewer new items, practise the wrong ones).
        List<String> answers = new ArrayList<>();
        for (int i = 0; i < 10; i++)
            answers.add("{\"itemType\":\"KANA\",\"itemId\":\"%s\",\"correct\":%s}".formatted(test.get(i).get("itemId"), i >= 3));
        String r1 = send("/tests", "{\"attempt\":1,\"answers\":[" + String.join(",", answers) + "]}");
        assertThat((Double) JsonPath.read(r1, "$.attempt1Score")).isEqualTo(0.7);
        String fin = send("/tests/skip-retake", "{}");
        assertThat((Double) JsonPath.read(fin, "$.finalScore")).isEqualTo(0.7);
        assertThat((String) JsonPath.read(fin, "$.message")).isEqualTo("Tuần sau mình bớt bài mới để bạn củng cố Hiragana nhé.");
        assertThat((String) JsonPath.read(today(), "$.cycleNote")).isEqualTo("Tuần sau mình bớt bài mới để bạn củng cố Hiragana nhé.");
    }

    @Test
    void todayExplainsItsPurposeAndRoadmapGroupsTheJourneyIntoChapters() throws Exception {
        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content(profileJson("BEGINNER", 30)))
                .andExpect(status().isOk());
        String t = today();
        assertThat((String) JsonPath.read(t, "$.focus.objective")).startsWith("Hiragana");
        assertThat((String) JsonPath.read(t, "$.focus.why")).contains("Hiragana");
        assertThat((String) JsonPath.read(t, "$.focus.outcome")).contains("chữ kana");
        assertThat((String) JsonPath.read(t, "$.focus.chapterTitle")).isEqualTo("Hiragana");
        assertThat((String) JsonPath.read(t, "$.focus.nextTitle")).startsWith("Ngày 2");

        String road = mockMvc.perform(get(BASE + "/roadmap")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(road, "$.chapters[*].title")).containsExactly("Hiragana", "Katakana", "Kana Mastery", "Minna no Nihongo bài 1–5");
        assertThat(JsonPath.<List<String>>read(road, "$.chapters[*].status")).containsExactly("ACTIVE", "LOCKED", "LOCKED", "LOCKED");
        assertThat((String) JsonPath.read(road, "$.chapters[1].unlockRequires")).contains("Hiragana");
        assertThat((Integer) JsonPath.read(road, "$.chapters[1].unlockMissing")).isEqualTo(9);
        assertThat((String) JsonPath.read(road, "$.chapters[0].units[0].status")).isEqualTo("ACTIVE");
        assertThat(JsonPath.<List<String>>read(road, "$.days[*].checkpoint")).contains("DAILY", "WEEKLY", "CHAPTER");
        assertThat((String) JsonPath.read(road, "$.level")).isEqualTo("N5");

        // Nothing reviewed yet: no due items, no history, and no invented numbers.
        String ov = mockMvc.perform(get(BASE + "/review-overview")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat((Integer) JsonPath.read(ov, "$.due")).isZero();
        assertThat(JsonPath.<List<Object>>read(ov, "$.history")).isEmpty();
    }

    @Test
    void itemsOutsideThePathAreRefused() throws Exception {
        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content(profileJson("BEGINNER", 30)))
                .andExpect(status().isOk());
        mockMvc.perform(post(BASE + "/answers").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemType\":\"GRAMMAR\",\"itemId\":\"not-in-the-path\",\"correct\":true,\"review\":false}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "not-listed@example.com")
    void offForUsersOutsideTheAllowlist() throws Exception {
        mockMvc.perform(get(BASE + "/status")).andExpect(jsonPath("$.enabled").value(false));
        mockMvc.perform(get(BASE + "/today")).andExpect(status().isNotFound());
    }

    @Test
    void rejectsAPastDeadline() throws Exception {
        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content("""
                        {"currentLevel":"BEGINNER","goal":"PASS_JLPT","minutesPerDay":30,"daysPerWeek":5,
                         "targetDate":"2020-01-01","timezone":"Asia/Bangkok"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Hạn chót phải sau hôm nay"));
    }
}
