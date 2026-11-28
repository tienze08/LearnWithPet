package com.vocabpet.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
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

/** Adaptive schedule: speed measured on real study, review advice, and plans that follow progress without repeats. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = {"app.learning-path.enabled=false", "app.learning-path.allowlist=adaptive@example.com"})
@WithMockUser(username = "adaptive@example.com")
class AdaptiveScheduleTest {

    private static final String BASE = "/api/learning-path";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private LearningPlanRepository planRepository;
    @Autowired private DailyPlanRepository dailyPlanRepository;
    @Autowired private KanaItemProgressRepository kanaRepository;

    @BeforeEach
    void setUp() throws Exception {
        if (!userRepository.existsByEmail("adaptive@example.com"))
            userRepository.save(User.builder().email("adaptive@example.com").password("not-used").role(Role.USER).name("Adaptive").build());
        LocalDate target = LocalDate.now(ZoneId.of("Asia/Bangkok")).plusDays(60);
        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content("""
                {"currentLevel":"BEGINNER","goal":"PASS_JLPT","minutesPerDay":10,"daysPerWeek":7,
                 "targetDate":"%s","timezone":"Asia/Bangkok"}""".formatted(target))).andExpect(status().isOk());
    }

    private String getJson(String path) throws Exception {
        return mockMvc.perform(get(BASE + path)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private void answer(Object type, Object id, boolean correct, boolean review, String phase) throws Exception {
        mockMvc.perform(post(BASE + "/answers").contentType(MediaType.APPLICATION_JSON).content(
                        "{\"itemType\":\"%s\",\"itemId\":\"%s\",\"correct\":%s,\"review\":%s,\"questionKind\":\"t\",\"phase\":\"%s\"}"
                                .formatted(type, id, correct, review, phase)))
                .andExpect(status().isOk());
    }

    private void learn(String unit) throws Exception {
        for (int guard = 0; guard < 20; guard++) {
            String l = getJson("/units/" + unit);
            if (!"LEARN".equals(JsonPath.read(l, "$.mode"))) return;
            for (Map<String, Object> i : JsonPath.<List<Map<String, Object>>>read(l, "$.items"))
                answer(i.get("itemType"), i.get("itemId"), true, false, "LEARN");
        }
    }

    private Long userId() {
        return userRepository.findByEmail("adaptive@example.com").orElseThrow().getId();
    }

    private void shift(int n) {
        var plan = planRepository.findFirstByUserIdAndStatusOrderByIdDesc(userId(), PathPlanStatus.ACTIVE).orElseThrow();
        plan.setStartDate(plan.getStartDate().minusDays(n));
        planRepository.save(plan);
        dailyPlanRepository.findByPlanIdOrderByLocalDateDesc(plan.getId()).forEach(d -> {
            d.setLocalDate(d.getLocalDate().minusDays(n));
            dailyPlanRepository.save(d);
        });
        dailyPlanRepository.flush();
    }

    @Test
    void speedIsMeasuredOnRealStudyAndTheTargetDateIsNeverChanged() throws Exception {
        String t = getJson("/today");
        assertThat((Object) JsonPath.read(t, "$.actualPace")).isNull(); // nothing to measure on day 1
        String target = JsonPath.read(t, "$.profile.targetDate");

        for (String u : List.of("n5-h01", "n5-h02", "n5-h03")) learn(u);
        shift(3);
        t = getJson("/today");
        assertThat((Integer) JsonPath.read(t, "$.actualPace.sampleStudyDays")).isEqualTo(4);
        assertThat((Double) JsonPath.read(t, "$.actualPace.itemsPerStudyDay")).isEqualTo(25 / 4.0, org.assertj.core.data.Offset.offset(0.05));
        assertThat((String) JsonPath.read(t, "$.actualPace.estimatedFinish")).isNotNull();
        assertThat((String) JsonPath.read(t, "$.profile.targetDate")).isEqualTo(target);
        // The plan of the new day starts after what was really learned, not after what was planned.
        List<String> learn = JsonPath.read(t, "$.phases[?(@.phase=='LEARN')].items[*].itemId");
        assertThat(learn).isNotEmpty().noneMatch(id -> List.of("hiragana:あ", "hiragana:か", "hiragana:た").contains(id));
        // Locked lessons are never planned: everything planned belongs to an open lesson.
        List<String> unitIds = JsonPath.read(getJson("/units"), "$.units[?(@.status=='LOCKED')].id");
        assertThat((String) JsonPath.read(t, "$.title")).doesNotContain("âm đục");
        assertThat(unitIds).contains("n5-h07");
    }

    @Test
    void aReviewBacklogIsAdvisedBeforeMoreNewLessonsWithoutLockingThem() throws Exception {
        for (String u : List.of("n5-h01", "n5-h02", "n5-h03")) learn(u);
        kanaRepository.findByUserId(userId()).forEach(k -> {
            k.setNextReviewAt(Instant.now().minusSeconds(3600)); // 25 kana due, more than a 10-minute day can review
            kanaRepository.save(k);
        });
        kanaRepository.flush();
        String t = getJson("/today");
        assertThat((String) JsonPath.read(t, "$.advice.kind")).isEqualTo("REVIEW_BACKLOG");
        assertThat((Integer) JsonPath.read(t, "$.advice.dueReviews")).isEqualTo(25);
        assertThat(JsonPath.<List<Object>>read(getJson("/next-up"), "$.lessons")).isNotEmpty(); // advice, not a lock
        assertThat((String) JsonPath.read(getJson("/units"), "$.nextUnitId")).isEqualTo("n5-h04");
    }

    @Test
    void lowRecentAccuracyIsAdvisedAndSRSIsUpdatedOnlyByAnswers() throws Exception {
        learn("n5-h01");
        learn("n5-h02");
        var before = kanaRepository.findByUserId(userId()).stream().mapToInt(k -> k.getCorrectCount() + k.getWrongCount()).sum();
        List<String> ids = List.of("あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ");
        for (String k : ids) answer("KANA", "hiragana:" + k, false, true, "REVIEW");
        String t = getJson("/today");
        assertThat((String) JsonPath.read(t, "$.advice.kind")).isEqualTo("LOW_ACCURACY");
        // Opening views never touches SRS; only the 10 answers above did.
        getJson("/units");
        getJson("/next-up");
        var after = kanaRepository.findByUserId(userId()).stream().mapToInt(k -> k.getCorrectCount() + k.getWrongCount()).sum();
        assertThat(after - before).isEqualTo(10);
        assertThat(kanaRepository.findByUserId(userId())).hasSize(15); // no duplicate progress rows
    }
}
