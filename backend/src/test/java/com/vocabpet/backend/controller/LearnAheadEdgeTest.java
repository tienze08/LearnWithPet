package com.vocabpet.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;
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
import com.vocabpet.backend.entity.PathProfile;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.PathPlanStatus;
import com.vocabpet.backend.entity.enums.Role;
import com.vocabpet.backend.repository.DailyPlanRepository;
import com.vocabpet.backend.repository.LearningPlanRepository;
import com.vocabpet.backend.repository.PathProfileRepository;
import com.vocabpet.backend.repository.UserRepository;

/** Adaptive pace edge cases: next day, consecutive days, missed days, source classification, pace. Days are moved by shifting stored dates back. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = {"app.learning-path.enabled=false", "app.learning-path.allowlist=ahead-edge@example.com"})
@WithMockUser(username = "ahead-edge@example.com")
class LearnAheadEdgeTest {

    private static final String BASE = "/api/learning-path";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private LearningPlanRepository planRepository;
    @Autowired
    private DailyPlanRepository dailyPlanRepository;
    @Autowired
    private PathProfileRepository profileRepository;
    @Autowired
    private com.vocabpet.backend.repository.LearningSessionRepository sessionRepository;

    @BeforeEach
    void users() {
        if (!userRepository.existsByEmail("ahead-edge@example.com"))
            userRepository.save(User.builder().email("ahead-edge@example.com").password("not-used").role(Role.USER).name("Path").build());
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

    private Long userId() {
        return userRepository.findByEmail("ahead-edge@example.com").orElseThrow().getId();
    }

    /** Moves the whole stored history n days into the past, so "now" is n days after the last stored day. */
    private void shift(int n) {
        var plan = planRepository.findFirstByUserIdAndStatusOrderByIdDesc(userId(), PathPlanStatus.ACTIVE).orElseThrow();
        plan.setStartDate(plan.getStartDate().minusDays(n));
        planRepository.save(plan);
        dailyPlanRepository.findByPlanIdOrderByLocalDateDesc(plan.getId()).forEach(d -> {
            d.setLocalDate(d.getLocalDate().minusDays(n));
            dailyPlanRepository.save(d);
        });
        dailyPlanRepository.flush();
        sessionRepository.findByUserIdAndStartedAtAfter(userId(), java.time.Instant.EPOCH).forEach(x -> {
            if (x.getResultsJson() == null) return;
            var m = java.util.regex.Pattern.compile("\"scheduledFor\":\"(\\d{4}-\\d{2}-\\d{2})\"").matcher(x.getResultsJson());
            x.setResultsJson(m.replaceAll(r -> "\"scheduledFor\":\"" + LocalDate.parse(r.group(1)).minusDays(n) + "\""));
            sessionRepository.save(x);
        });
        sessionRepository.flush();
    }

    private void answers(List<Map<String, Object>> items, String phase, boolean review) throws Exception {
        for (Map<String, Object> i : items)
            send("/answers", "{\"itemType\":\"%s\",\"itemId\":\"%s\",\"correct\":true,\"review\":%s,\"questionKind\":\"t\",\"phase\":\"%s\"}"
                    .formatted(i.get("itemType"), i.get("itemId"), review, phase));
    }

    private void finishToday() throws Exception {
        answers(items(today(), "REVIEW"), "REVIEW", true);
        answers(items(today(), "LEARN"), "LEARN", false);
        answers(items(today(), "PRACTICE"), "PRACTICE", false);
        List<Map<String, Object>> test = items(today(), "TEST");
        if (!test.isEmpty()) {
            String all = String.join(",", test.stream()
                    .map(i -> "{\"itemType\":\"%s\",\"itemId\":\"%s\",\"correct\":true}".formatted(i.get("itemType"), i.get("itemId"))).toList());
            send("/tests", "{\"attempt\":1,\"answers\":[" + all + "]}");
        }
        assertThat((Boolean) JsonPath.read(today(), "$.completed")).isTrue();
    }

    private String nextUp() throws Exception {
        return mockMvc.perform(get(BASE + "/next-up")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private void setUp() throws Exception {
        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content(profileJson("BEGINNER", 30))).andExpect(status().isOk());
    }

    private void setPace(String pace) throws Exception {
        mockMvc.perform(put(BASE + "/pace").contentType(MediaType.APPLICATION_JSON).content("{\"pace\":\"" + pace + "\"}")).andExpect(status().isOk());
    }

    private int introduced() throws Exception {
        return JsonPath.read(today(), "$.itemsIntroduced");
    }

    private static List<String> ids(List<Map<String, Object>> items) {
        return items.stream().map(i -> (String) i.get("itemId")).toList();
    }

    private void learnNextAhead() throws Exception {
        String n = nextUp();
        assertThat(JsonPath.<List<Object>>read(n, "$.lessons")).as(n).isNotEmpty();
        answers(JsonPath.read(n, "$.lessons[0].items"), "LEARN", false);
    }

    private int answerStatus(String type, String id, boolean review, String phase) throws Exception {
        return mockMvc.perform(post(BASE + "/answers").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemType\":\"%s\",\"itemId\":\"%s\",\"correct\":true,\"review\":%s,\"questionKind\":\"t\",\"phase\":\"%s\"}"
                                .formatted(type, id, review, phase)))
                .andReturn().getResponse().getStatus();
    }

    // 1. next day after learning ahead
    @Test
    void dayTwoAfterLearningAheadIsNotReplannedAndStatsStayExact() throws Exception {
        setUp();
        List<String> day1 = ids(items(today(), "LEARN"));
        finishToday();
        List<Map<String, Object>> ahead = JsonPath.read(nextUp(), "$.lessons[0].items");
        answers(ahead, "LEARN", false);
        int introducedDay1 = introduced();
        assertThat(introducedDay1).isEqualTo(day1.size() + ahead.size());

        shift(1);
        String t = today();
        assertThat((String) JsonPath.read(t, "$.title")).startsWith("Ngày 2").contains("hàng T và N");
        assertThat((Integer) JsonPath.read(t, "$.dayNumber")).isEqualTo(2);
        List<String> day2 = ids(items(t, "LEARN"));
        assertThat(day2).isNotEmpty().doesNotContainAnyElementsOf(day1).doesNotContainAnyElementsOf(ids(ahead));
        assertThat((Integer) JsonPath.read(t, "$.daysCompleted")).isEqualTo(1);
        assertThat((Boolean) JsonPath.read(t, "$.completed")).isFalse();
        assertThat((String) JsonPath.read(t, "$.learnedAhead[0].scheduledFor")).isEqualTo(JsonPath.read(t, "$.date"));
        assertThat((Boolean) JsonPath.read(nextUp(), "$.lessons[0].inToday")).isTrue();

        String road = mockMvc.perform(get(BASE + "/roadmap")).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(road, "$.chapters[0].units[0:3].status")).containsExactly("DONE", "DONE", "ACTIVE");
        assertThat(JsonPath.<List<Boolean>>read(road, "$.chapters[0].units[0:3].ahead")).containsExactly(false, true, false);
        assertThat(JsonPath.<List<String>>read(road, "$.days[*].status")).startsWith("DONE", "TODAY");

        finishToday();
        t = today();
        assertThat((Integer) JsonPath.read(t, "$.daysCompleted")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(t, "$.itemsIntroduced")).isEqualTo(introducedDay1 + day2.size());
    }

    // 2. several ahead lessons, the daily cap, consecutive days, pace switches
    @Test
    void severalAheadLessonsKeepTheirOriginalDatesAndThePaceOnlySuggests() throws Exception {
        setUp();
        finishToday();
        LocalDate today = LocalDate.parse(JsonPath.read(today(), "$.date"));
        assertThat((String) JsonPath.read(nextUp(), "$.lessons[0].scheduledFor")).isEqualTo(today.plusDays(1).toString());
        learnNextAhead();
        // The second lesson keeps its original day (day 3), not "tomorrow" behind the first.
        assertThat((String) JsonPath.read(nextUp(), "$.lessons[0].scheduledFor")).isEqualTo(today.plusDays(2).toString());
        learnNextAhead();
        assertThat(JsonPath.<List<String>>read(today(), "$.learnedAhead[*].scheduledFor"))
                .containsExactly(today.plusDays(1).toString(), today.plusDays(2).toString());

        // Flexible's daily amount (2) is reached, but an open lesson is never locked by the pace.
        assertThat((Integer) JsonPath.read(nextUp(), "$.aheadUnitsToday")).isEqualTo(2);
        assertThat(JsonPath.<List<Object>>read(nextUp(), "$.lessons")).isNotEmpty();

        int before = introduced();
        setPace("FAST_TRACK");
        String f = nextUp();
        assertThat((Integer) JsonPath.read(f, "$.aheadUnitsToday")).isEqualTo(2);
        assertThat(JsonPath.<List<Object>>read(f, "$.lessons")).isNotEmpty();
        setPace("RELAXED");
        assertThat(JsonPath.<List<Object>>read(nextUp(), "$.lessons")).hasSize(1); // Relaxed suggests one, still offered
        assertThat(introduced()).isEqualTo(before); // switching pace never undoes progress
        setPace("FAST_TRACK");
        assertThat(JsonPath.<List<Object>>read(today(), "$.learnedAhead")).hasSize(2);

        // Next day: the plan continues after what was really learned; the cap starts over.
        shift(1);
        String t = today();
        assertThat((Integer) JsonPath.read(t, "$.daysCompleted")).isEqualTo(1);
        assertThat(ids(items(t, "LEARN"))).isNotEmpty();
        int day2Intro = introduced();
        finishToday();
        assertThat((Integer) JsonPath.read(nextUp(), "$.aheadUnitsToday")).isZero();
        learnNextAhead();
        assertThat((Integer) JsonPath.read(nextUp(), "$.aheadUnitsToday")).isEqualTo(1);
        assertThat(introduced()).isGreaterThan(day2Intro);
    }

    // 3. source classification
    @Test
    void optionalPracticeAndReviewNeverAdvanceThePath() throws Exception {
        setUp();
        finishToday();
        int before = introduced();
        String known = (String) items(today(), "LEARN").get(0).get("itemId");
        assertThat(answerStatus("KANA", known, false, "LEARN")).isEqualTo(200);    // optional repeat
        assertThat(answerStatus("KANA", known, true, "REVIEW")).isEqualTo(200);    // review
        assertThat(answerStatus("KANA", known, false, "PRACTICE")).isEqualTo(200); // practice
        String t = today();
        assertThat((Integer) JsonPath.read(t, "$.itemsIntroduced")).isEqualTo(before);
        assertThat(JsonPath.<List<Object>>read(t, "$.learnedAhead")).isEmpty();
        assertThat(answerStatus("GRAMMAR", "no-such-item", false, "LEARN")).isEqualTo(400);
        // Repeating an ahead lesson does not create a second record or change counts.
        List<Map<String, Object>> ahead = JsonPath.read(nextUp(), "$.lessons[0].items");
        answers(ahead, "LEARN", false);
        int afterAhead = introduced();
        answers(ahead, "LEARN", false);
        assertThat(introduced()).isEqualTo(afterAhead);
        assertThat(JsonPath.<List<Object>>read(today(), "$.learnedAhead")).hasSize(1);
        assertThat((Integer) JsonPath.read(today(), "$.daysCompleted")).isEqualTo(1);
    }

    // 4. prerequisites, mastery vs completion
    @Test
    void lockedLessonsStayLockedUntilThePrerequisiteIsDoneAndLearningIsNotMastery() throws Exception {
        setUp();
        // Learned and practised but the day's test not taken: items are introduced, the day is not complete, nothing is offered.
        answers(items(today(), "LEARN"), "LEARN", false);
        answers(items(today(), "PRACTICE"), "PRACTICE", false);
        String t = today();
        assertThat((Boolean) JsonPath.read(t, "$.completed")).isFalse();
        assertThat((Integer) JsonPath.read(t, "$.daysCompleted")).isZero();
        assertThat((String) JsonPath.read(nextUp(), "$.lessons[0].unitIds[0]")).isEqualTo("n5-h02"); // lesson one is complete, two opened at once
        assertThat(answerStatus("KANA", "hiragana:た", false, "LEARN")).isEqualTo(400);  // lesson three needs lesson two
        assertThat(answerStatus("KANA", "katakana:ア", false, "LEARN")).isEqualTo(400);
        assertThat(introduced()).isEqualTo(items(t, "LEARN").size());
        assertThat(answerStatus("KANA", "hiragana:か", false, "LEARN")).isEqualTo(200);  // lesson two is the next open lesson
        assertThat(answerStatus("KANA", "hiragana:た", false, "LEARN")).isEqualTo(400);  // ...but not complete yet
        String m = send("/answers", "{\"itemType\":\"KANA\",\"itemId\":\"hiragana:か\",\"correct\":true,\"review\":false,\"questionKind\":\"t\",\"phase\":\"LEARN\"}");
        assertThat((String) JsonPath.read(m, "$.masteryState")).isNotEqualTo("MASTERED"); // introduced is not mastered
    }

    // 5. missed days
    @Test
    void missedDaysAreShownAndAheadWorkBeforeTheAbsenceIsNotReplanned() throws Exception {
        setUp();
        List<String> day1 = ids(items(today(), "LEARN"));
        finishToday();
        List<Map<String, Object>> ahead = JsonPath.read(nextUp(), "$.lessons[0].items");
        answers(ahead, "LEARN", false);

        shift(4); // three days missed after day 1; the ahead lesson was planned for the first of them
        String t = today();
        assertThat((Integer) JsonPath.read(t, "$.dayNumber")).isEqualTo(5);
        assertThat((Integer) JsonPath.read(t, "$.daysCompleted")).isEqualTo(1);
        assertThat(ids(items(t, "LEARN"))).isNotEmpty().doesNotContainAnyElementsOf(day1).doesNotContainAnyElementsOf(ids(ahead));
        assertThat(JsonPath.<List<Object>>read(t, "$.learnedAhead")).isEmpty(); // its planned day has passed
        String road = mockMvc.perform(get(BASE + "/roadmap")).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(road, "$.days[*].status")).containsSequence("DONE", "MISSED", "MISSED", "MISSED", "TODAY");
        assertThat(JsonPath.<List<Boolean>>read(road, "$.chapters[0].units[?(@.ahead==true)].ahead")).isEmpty(); // the flag lives until the planned day
        finishToday();

        shift(30); // long absence: still one unit at a time, nothing repeated
        t = today();
        assertThat((Integer) JsonPath.read(t, "$.daysCompleted")).isEqualTo(2);
        assertThat(ids(items(t, "LEARN"))).isNotEmpty().doesNotContainAnyElementsOf(day1).doesNotContainAnyElementsOf(ids(ahead));
    }

    // 6. pace
    @Test
    void paceDefaultsToFlexibleChangesNothingInThePlanAndRejectsBadValues() throws Exception {
        setUp();
        PathProfile p = profileRepository.findByUserId(userId()).orElseThrow();
        p.setPace(null); // a row from before the column existed
        profileRepository.saveAndFlush(p);
        String before = today();
        assertThat((String) JsonPath.read(before, "$.profile.pace")).isEqualTo("FLEXIBLE");
        assertThat((String) JsonPath.read(nextUp(), "$.pace")).isEqualTo("FLEXIBLE");
        assertThat((Integer) JsonPath.read(nextUp(), "$.aheadCap")).isEqualTo(2);
        setPace("RELAXED");
        setPace("FAST_TRACK");
        String after = today();
        assertThat((Object) JsonPath.read(after, "$.phases")).isEqualTo(JsonPath.read(before, "$.phases"));
        assertThat((Integer) JsonPath.read(after, "$.itemsIntroduced")).isEqualTo((Integer) JsonPath.read(before, "$.itemsIntroduced"));
        mockMvc.perform(put(BASE + "/pace").contentType(MediaType.APPLICATION_JSON).content("{\"pace\":null}")).andExpect(status().isBadRequest());
        mockMvc.perform(put(BASE + "/pace").contentType(MediaType.APPLICATION_JSON).content("{\"pace\":\"TURBO\"}")).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE + "/next-up")).andExpect(status().isOk());
    }
}
