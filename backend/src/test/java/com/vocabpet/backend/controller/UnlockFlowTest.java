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
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.PathPlanStatus;
import com.vocabpet.backend.entity.enums.Role;
import com.vocabpet.backend.repository.DailyPlanRepository;
import com.vocabpet.backend.repository.KanaItemProgressRepository;
import com.vocabpet.backend.repository.LearningPlanRepository;
import com.vocabpet.backend.repository.UserRepository;

/**
 * Unlock system: lessons open on prerequisites alone, never on their planned day. Covers the lesson states, learning
 * ahead (several lessons, before today's plan is done), locked access, resuming, revisiting, review lessons and chapter
 * tests taken on their own, and the next day's plan not repeating what was learned.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = {"app.learning-path.enabled=false", "app.learning-path.allowlist=unlock@example.com"})
@WithMockUser(username = "unlock@example.com")
class UnlockFlowTest {

    private static final String BASE = "/api/learning-path";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private LearningPlanRepository planRepository;
    @Autowired private DailyPlanRepository dailyPlanRepository;
    @Autowired private KanaItemProgressRepository kanaRepository;

    @BeforeEach
    void setUp() throws Exception {
        if (!userRepository.existsByEmail("unlock@example.com"))
            userRepository.save(User.builder().email("unlock@example.com").password("not-used").role(Role.USER).name("Unlock").build());
        LocalDate target = LocalDate.now(ZoneId.of("Asia/Bangkok")).plusDays(90);
        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content("""
                {"currentLevel":"BEGINNER","goal":"PASS_JLPT","minutesPerDay":30,"daysPerWeek":7,
                 "targetDate":"%s","timezone":"Asia/Bangkok"}""".formatted(target))).andExpect(status().isOk());
    }

    private String getJson(String path) throws Exception {
        return mockMvc.perform(get(BASE + path)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private int send(String path, String body) throws Exception {
        return mockMvc.perform(post(BASE + path).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().getResponse().getStatus();
    }

    private String postJson(String path, String body) throws Exception {
        return mockMvc.perform(post(BASE + path).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private String state(String unit) throws Exception {
        List<String> s = JsonPath.read(getJson("/units"), "$.units[?(@.id=='" + unit + "')].status");
        return s.get(0);
    }

    private int answer(Object type, Object id, boolean correct, String phase) throws Exception {
        return send("/answers", "{\"itemType\":\"%s\",\"itemId\":\"%s\",\"correct\":%s,\"review\":false,\"questionKind\":\"t\",\"phase\":\"%s\"}"
                .formatted(type, id, correct, phase));
    }

    /** Learns a lesson the way the lesson page does: open it, answer its items, again until it is completed. */
    private void learn(String unit, boolean correct) throws Exception {
        for (int guard = 0; guard < 20; guard++) {
            String l = getJson("/units/" + unit);
            if (!"LEARN".equals(JsonPath.read(l, "$.mode"))) return;
            List<Map<String, Object>> items = JsonPath.read(l, "$.items");
            for (Map<String, Object> i : items) assertThat(answer(i.get("itemType"), i.get("itemId"), correct, "LEARN")).isEqualTo(200);
        }
        throw new AssertionError(unit + " never completed");
    }

    /** Takes a review lesson or chapter test from the lesson list, with the given number of wrong answers. */
    private String check(String unit, int wrong) throws Exception {
        String l = getJson("/units/" + unit);
        assertThat((String) JsonPath.read(l, "$.mode")).isEqualTo("CHECK");
        List<Map<String, Object>> items = JsonPath.read(l, "$.items");
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < items.size(); i++)
            b.append(i == 0 ? "" : ",").append("{\"itemType\":\"%s\",\"itemId\":\"%s\",\"correct\":%s}"
                    .formatted(items.get(i).get("itemType"), items.get(i).get("itemId"), i >= wrong));
        return postJson("/units/" + unit + "/check", "{\"attempt\":1,\"answers\":[" + b + "]}");
    }

    private Long userId() {
        return userRepository.findByEmail("unlock@example.com").orElseThrow().getId();
    }

    private void nextDay() {
        var plan = planRepository.findFirstByUserIdAndStatusOrderByIdDesc(userId(), PathPlanStatus.ACTIVE).orElseThrow();
        plan.setStartDate(plan.getStartDate().minusDays(1));
        planRepository.save(plan);
        dailyPlanRepository.findByPlanIdOrderByLocalDateDesc(plan.getId()).forEach(d -> {
            d.setLocalDate(d.getLocalDate().minusDays(1));
            dailyPlanRepository.save(d);
        });
        dailyPlanRepository.flush();
    }

    @Test
    void aNewLearnerSeesOneOpenLessonAndTheRestLockedWithAReason() throws Exception {
        String u = getJson("/units");
        assertThat((String) JsonPath.read(u, "$.nextUnitId")).isEqualTo("n5-h01");
        assertThat(state("n5-h01")).isEqualTo("AVAILABLE");
        assertThat(JsonPath.<List<Boolean>>read(u, "$.units[?(@.id=='n5-h01')].inToday")).containsExactly(true);
        assertThat(state("n5-h02")).isEqualTo("LOCKED");
        assertThat(JsonPath.<List<String>>read(u, "$.units[?(@.id=='n5-h02')].missing[0].id")).containsExactly("n5-h01");
        assertThat((JsonPath.<List<String>>read(u, "$.units[?(@.id=='n5-h02')].lockedReason")).get(0)).contains("Hiragana: năm nguyên âm");
        // Suggested days are information: every unit of the path has one, the locked ones included.
        assertThat(JsonPath.<List<Object>>read(u, "$.units[?(@.id=='n5-h03')].scheduledFor")).doesNotContainNull();
        // The next lesson is offered even though today's plan is not done.
        String n = getJson("/next-up");
        assertThat(JsonPath.<List<Object>>read(n, "$.lessons")).isNotEmpty();
        assertThat((Boolean) JsonPath.read(n, "$.lessons[0].inToday")).isTrue();
    }

    @Test
    void finishingALessonUnlocksTheNextOneTheSameDayAndSeveralCanBeLearnedAhead() throws Exception {
        mockMvc.perform(put(BASE + "/pace").contentType(MediaType.APPLICATION_JSON).content("{\"pace\":\"RELAXED\"}")).andExpect(status().isOk());
        learn("n5-h01", true);
        assertThat(state("n5-h01")).isEqualTo("COMPLETED");
        assertThat(state("n5-h02")).isEqualTo("AVAILABLE"); // no waiting for tomorrow
        // Today's plan is not done (practice and test untouched) and the pace is Relaxed: learning ahead still works.
        assertThat((Boolean) JsonPath.read(getJson("/today"), "$.completed")).isFalse();
        for (String id : List.of("n5-h02", "n5-h03", "n5-h04", "n5-h05")) {
            learn(id, true);
            assertThat(state(id)).isEqualTo("COMPLETED");
        }
        String u = getJson("/units");
        assertThat(JsonPath.<List<Boolean>>read(u, "$.units[?(@.id=='n5-h03')].learnedAhead")).containsExactly(true);
        // The original planned day is kept for statistics, the learning day is recorded separately.
        LocalDate today = LocalDate.parse(JsonPath.read(getJson("/today"), "$.date"));
        LocalDate planned = LocalDate.parse((String) (JsonPath.<List<?>>read(u, "$.units[?(@.id=='n5-h03')].scheduledFor")).get(0));
        assertThat(planned).isAfter(today);
        assertThat(JsonPath.<List<String>>read(u, "$.units[?(@.id=='n5-h03')].learnedOn")).containsExactly(today.toString());
        // The next open lesson is the review lesson; it is offered now instead of "tomorrow".
        assertThat((String) JsonPath.read(u, "$.nextUnitId")).isEqualTo("n5-h06");
        assertThat((String) JsonPath.read(getJson("/next-up"), "$.lessons[0].kind")).isEqualTo("REVIEW");
    }

    @Test
    void lockedLessonsCannotBeStartedInAnyWay() throws Exception {
        String l = getJson("/units/n5-h07");
        assertThat((String) JsonPath.read(l, "$.mode")).isEqualTo("LOCKED");
        assertThat(JsonPath.<List<Object>>read(l, "$.items")).isEmpty();
        assertThat((String) JsonPath.read(l, "$.unit.lockedReason")).contains("Ôn Hiragana cơ bản");
        assertThat(answer("KANA", "hiragana:が", true, "LEARN")).isEqualTo(400);
        assertThat(answer("KANA", "hiragana:が", true, "PRACTICE")).isEqualTo(400); // the phase cannot bypass the lock
        assertThat(send("/units/n5-h06/check", "{\"attempt\":1,\"answers\":[{\"itemType\":\"KANA\",\"itemId\":\"hiragana:あ\",\"correct\":true}]}"))
                .isEqualTo(400);
        assertThat(state("n5-h07")).isEqualTo("LOCKED");
        mockMvc.perform(get(BASE + "/units/no-such-unit")).andExpect(status().isNotFound());
    }

    @Test
    void aLessonInProgressResumesWhereItStoppedAndACompletedOneIsRevisitedNotRelearned() throws Exception {
        List<Map<String, Object>> first = JsonPath.read(getJson("/units/n5-h01"), "$.items");
        answer(first.get(0).get("itemType"), first.get(0).get("itemId"), true, "LEARN");
        assertThat(state("n5-h01")).isEqualTo("IN_PROGRESS");
        List<String> rest = JsonPath.read(getJson("/units/n5-h01"), "$.items[*].itemId");
        assertThat(rest).doesNotContain((String) first.get(0).get("itemId")).isNotEmpty();
        learn("n5-h01", true);

        String revisit = getJson("/units/n5-h01");
        assertThat((String) JsonPath.read(revisit, "$.mode")).isEqualTo("REVISIT");
        assertThat(JsonPath.<List<Object>>read(revisit, "$.items")).hasSize(5);
        int introduced = JsonPath.read(getJson("/today"), "$.itemsIntroduced");
        for (Map<String, Object> i : JsonPath.<List<Map<String, Object>>>read(revisit, "$.items"))
            assertThat(answer(i.get("itemType"), i.get("itemId"), true, "PRACTICE")).isEqualTo(200);
        assertThat((Integer) JsonPath.read(getJson("/today"), "$.itemsIntroduced")).isEqualTo(introduced);
        assertThat(state("n5-h01")).isEqualTo("COMPLETED");
        // No duplicate progress rows: one KanaItemProgress row per kana.
        assertThat(kanaRepository.findByUserId(userId())).hasSize(5);
    }

    @Test
    void completionIsNotMastery() throws Exception {
        learn("n5-h01", false); // every answer wrong
        assertThat(state("n5-h01")).isEqualTo("COMPLETED");
        assertThat(state("n5-h02")).isEqualTo("AVAILABLE");
        assertThat(JsonPath.<List<Integer>>read(getJson("/units"), "$.units[?(@.id=='n5-h01')].masteryPercent")).containsExactly(0);
    }

    @Test
    void takingAReviewLessonAheadKeepsTheSuggestedDaysOfLaterLessons() throws Exception {
        for (String id : List.of("n5-h01", "n5-h02", "n5-h03", "n5-h04", "n5-h05")) learn(id, true);
        String path = "$.units[?(@.id in ['n5-h06','n5-h07','n5-h08'])].scheduledFor";
        List<String> before = JsonPath.read(getJson("/units"), path);
        check("n5-h06", 0);
        assertThat(JsonPath.<List<String>>read(getJson("/units"), path)).isEqualTo(before);
    }

    @Test
    void reviewLessonsAndChapterTestsCompleteOnTheirOwnAndAreNotPlannedAgain() throws Exception {
        for (String id : List.of("n5-h01", "n5-h02", "n5-h03", "n5-h04", "n5-h05")) learn(id, true);
        String r = check("n5-h06", 0);
        assertThat((Boolean) JsonPath.read(r, "$.passed")).isTrue();
        assertThat(state("n5-h06")).isEqualTo("COMPLETED");
        assertThat(state("n5-h07")).isEqualTo("AVAILABLE");
        learn("n5-h07", true);
        learn("n5-h08", true);

        // A failed chapter test keeps the next chapter locked and shows the test as in progress.
        String failed = check("n5-h09", 10);
        assertThat((Boolean) JsonPath.read(failed, "$.passed")).isFalse();
        assertThat(JsonPath.<List<Object>>read(failed, "$.wrongItems")).hasSize(10);
        assertThat(state("n5-h09")).isEqualTo("IN_PROGRESS");
        assertThat(state("n5-k01")).isEqualTo("LOCKED");
        String passed = check("n5-h09", 0);
        assertThat((Boolean) JsonPath.read(passed, "$.passed")).isTrue();
        assertThat(state("n5-h09")).isEqualTo("COMPLETED");
        assertThat(state("n5-k01")).isEqualTo("AVAILABLE");

        // Next day: nothing learned or completed above is planned again.
        nextDay();
        String t = getJson("/today");
        assertThat((String) JsonPath.read(t, "$.title")).doesNotContain("Hiragana");
        List<String> learnIds = JsonPath.read(t, "$.phases[?(@.phase=='LEARN')].items[*].itemId");
        assertThat(learnIds).isNotEmpty().allMatch(id -> id.startsWith("katakana:"));
    }
}
