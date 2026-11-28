package com.vocabpet.backend.controller;

import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.Role;
import com.vocabpet.backend.repository.ItemProgressRepository;
import com.vocabpet.backend.repository.ListeningAttemptRepository;
import com.vocabpet.backend.repository.UserRepository;
import com.vocabpet.backend.repository.UserTangoVocabularyProgressRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@WithMockUser(username = "listening@example.com")
class ListeningFlowTest {

    private static final String BASE = "/api/japanese/listening";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private ListeningAttemptRepository attempts;
    @Autowired
    private UserTangoVocabularyProgressRepository vocabularyProgress;
    @Autowired
    private ItemProgressRepository itemProgress;

    @BeforeEach
    void setUp() {
        for (String email : new String[] {"listening@example.com", "other@example.com"})
            if (!users.existsByEmail(email))
                users.save(User.builder().email(email).password("not-used").role(Role.USER).name("L").build());
    }

    private static String answer(String question, boolean correct, int replays) {
        return """
                {"questionId":"n5-station/%s","type":"choose","difficulty":"MEDIUM","correct":%s,"replays":%d,\
                "words":["駅"],"grammar":["made"]}""".formatted(question, correct, replays);
    }

    private static String run(String id, String mode, String... answers) {
        return """
                {"clientAttemptId":"%s","lessonId":"n5-station","level":"N5","mode":"%s","durationSeconds":60,\
                "answers":[%s]}""".formatted(id, mode, String.join(",", answers));
    }

    private ResultActions send(String body) throws Exception {
        return mockMvc.perform(post(BASE + "/attempts").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void countsTotalsStoresOnceAndLeavesMasteryAlone() throws Exception {
        long vocabularyBefore = vocabularyProgress.count();
        long itemsBefore = itemProgress.count();
        String body = run("attempt-0001", "FULL", answer("q1", true, 2), answer("q2", false, 1));

        send(body).andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.correct").value(1))
                .andExpect(jsonPath("$.replays").value(3));
        send(body).andExpect(status().isOk()).andExpect(jsonPath("$.isNew").value(false));

        assertThat(attempts.count()).isEqualTo(1);
        assertThat(vocabularyProgress.count()).isEqualTo(vocabularyBefore);
        assertThat(itemProgress.count()).isEqualTo(itemsBefore);
    }

    @Test
    void progressTracksMistakesAndKeepsReviewRunsOutOfAccuracy() throws Exception {
        send(run("attempt-0001", "FULL", answer("q1", true, 0), answer("q2", false, 0)))
                .andExpect(status().isCreated());
        mockMvc.perform(get(BASE + "/progress"))
                .andExpect(jsonPath("$.lessons[0].lastAccuracy").value(0.5))
                .andExpect(jsonPath("$.lessons[0].mistakes[0]").value("n5-station/q2"))
                .andExpect(jsonPath("$.weakWords[0].ref").value("駅"))
                .andExpect(jsonPath("$.weakGrammar[0].wrong").value(1));

        send(run("attempt-0002", "REVIEW", answer("q2", true, 4))).andExpect(status().isCreated());
        mockMvc.perform(get(BASE + "/progress"))
                .andExpect(jsonPath("$.lessons[0].attempts").value(1))
                .andExpect(jsonPath("$.lessons[0].lastAccuracy").value(0.5))
                .andExpect(jsonPath("$.lessons[0].replays").value(4))
                .andExpect(jsonPath("$.lessons[0].mistakes").isEmpty())
                // 1 miss in 3 answers is no longer "weak".
                .andExpect(jsonPath("$.weakWords").isEmpty());
    }

    @Test
    void progressIsPerUser() throws Exception {
        send(run("attempt-0001", "FULL", answer("q1", false, 0))).andExpect(status().isCreated());
        mockMvc.perform(get(BASE + "/progress").with(user("other@example.com")))
                .andExpect(jsonPath("$.lessons").isEmpty());
    }

    @Test
    void rejectsBadInput() throws Exception {
        String ok = answer("q1", true, 0);
        send(run("attempt-0001", "FULL")).andExpect(status().isBadRequest());
        send(run("attempt-0001", "OTHER", ok)).andExpect(status().isBadRequest());
        send(run("attempt-0001", "FULL", ok, ok)).andExpect(status().isBadRequest());
        send(run("attempt-0001", "FULL", answer("q1", true, -1))).andExpect(status().isBadRequest());
        send(run("attempt-0001", "FULL", ok.replace("n5-station/", "n5-other/"))).andExpect(status().isBadRequest());
        send(run("attempt-0001", "FULL", ok.replace("\"駅\"", "\"a,b\""))).andExpect(status().isBadRequest());
        send(run("attempt-0001", "FULL", ok.replace("\"correct\":true,", ""))).andExpect(status().isBadRequest());
        send(run("attempt-0001", "FULL", ok).replace("\"N5\"", "\"N4\"")).andExpect(status().isBadRequest());
        assertThat(attempts.count()).isZero();
    }

    @Test
    @WithAnonymousUser
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get(BASE + "/progress")).andExpect(status().isUnauthorized());
    }
}
