package com.vocabpet.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

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
import com.vocabpet.backend.repository.UserRepository;

/** Learning Path API end to end on the seeded Minna 1–5 content. Rolled back after each test. */
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

    @BeforeEach
    void users() {
        for (String email : List.of("path-flow@example.com", "not-listed@example.com"))
            if (!userRepository.existsByEmail(email))
                userRepository.save(User.builder().email(email).password("not-used").role(Role.USER).name("Path").build());
    }

    private String profileJson(int minutes) {
        LocalDate target = LocalDate.now(ZoneId.of("Asia/Bangkok")).plusDays(60);
        return """
                {"currentLevel":"STUDYING","goal":"PASS_JLPT","minutesPerDay":%d,"daysPerWeek":7,
                 "targetDate":"%s","timezone":"Asia/Bangkok"}""".formatted(minutes, target);
    }

    @Test
    void onboardingPlacementTodayAndAnswer() throws Exception {
        mockMvc.perform(get(BASE + "/status"))
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.onboarded").value(false))
                .andExpect(jsonPath("$.path.title").value("Lộ trình N5 (Minna bài 1–5)"));

        mockMvc.perform(post(BASE + "/feasibility").contentType(MediaType.APPLICATION_JSON).content(profileJson(15)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remainingNewItems").value(252)); // 25 grammar + 195 distinct words (one word is in two lessons) + 32 kanji

        String placement = mockMvc.perform(get(BASE + "/placement").param("hints", "mo"))
                .andExpect(jsonPath("$.grammar.length()").value(6))
                .andExpect(jsonPath("$.vocab.length()").value(5))
                .andExpect(jsonPath("$.kanji.length()").value(4))
                .andReturn().getResponse().getContentAsString();
        String g0 = JsonPath.read(placement, "$.grammar[0]");
        String g1 = JsonPath.read(placement, "$.grammar[1]");
        assertThat(g0).isEqualTo("ka-question"); // last item of the first segment
        assertThat(g1).isEqualTo("mo"); // the hinted pattern is asked in its segment

        mockMvc.perform(post(BASE + "/placement").contentType(MediaType.APPLICATION_JSON).content("""
                        {"answers":[{"itemType":"GRAMMAR","itemId":"%s","correct":true},
                                    {"itemType":"GRAMMAR","itemId":"%s","correct":false}]}""".formatted(g0, g1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grammarKnown").value(4)); // wa, desu, ではありません, か

        mockMvc.perform(put(BASE + "/profile").contentType(MediaType.APPLICATION_JSON).content(profileJson(30)))
                .andExpect(status().isOk());
        mockMvc.perform(get(BASE + "/status")).andExpect(jsonPath("$.onboarded").value(true));

        String today = mockMvc.perform(get(BASE + "/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMinutes").value(org.hamcrest.Matchers.lessThanOrEqualTo(30)))
                .andExpect(jsonPath("$.progressPercent").value(org.hamcrest.Matchers.greaterThan(0)))
                .andReturn().getResponse().getContentAsString();
        List<String> grammar = JsonPath.read(today, "$.blocks[?(@.type=='GRAMMAR')].items[*].itemId");
        assertThat(grammar).isNotEmpty().doesNotContain("wa", "desu", "ka-question");

        mockMvc.perform(post(BASE + "/answers").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemType\":\"GRAMMAR\",\"itemId\":\"%s\",\"correct\":true,\"review\":false,\"questionKind\":\"grammar-cloze\"}".formatted(grammar.get(0))))
                .andExpect(jsonPath("$.masteryState").value("UNDERSTOOD"));
        List<String> vocab = JsonPath.read(today, "$.blocks[?(@.type=='VOCAB')].items[*].itemId");
        mockMvc.perform(post(BASE + "/answers").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemType\":\"VOCAB\",\"itemId\":\"%s\",\"correct\":true,\"review\":false,\"questionKind\":\"vocab-meaning\"}".formatted(vocab.get(0))))
                .andExpect(status().isOk());

        String after = mockMvc.perform(get(BASE + "/today")).andReturn().getResponse().getContentAsString();
        List<Boolean> doneGrammar = JsonPath.read(after, "$.blocks[?(@.type=='GRAMMAR')].items[0].done");
        List<String> statusVocab = JsonPath.read(after, "$.blocks[?(@.type=='VOCAB')].status");
        assertThat(doneGrammar).containsExactly(true);
        assertThat(statusVocab).containsExactly(vocab.size() == 1 ? "DONE" : "IN_PROGRESS");

        // Items outside the path are refused.
        mockMvc.perform(post(BASE + "/answers").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemType\":\"GRAMMAR\",\"itemId\":\"nagara\",\"correct\":true,\"review\":false}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post(BASE + "/reports").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemType\":\"GRAMMAR\",\"itemId\":\"wa\",\"questionKind\":\"grammar-cloze\",\"questionJson\":\"{}\",\"comment\":\"sai đáp án\"}"))
                .andExpect(status().isCreated());
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
