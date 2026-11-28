package com.vocabpet.backend.controller;

import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.Role;
import com.vocabpet.backend.repository.*;
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
@WithMockUser(username = "shadowing@example.com")
class ShadowingFlowTest {

    private static final String BASE = "/api/japanese/shadowing";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private ShadowingSessionRepository sessions;
    @Autowired
    private ListeningAttemptRepository listening;
    @Autowired
    private UserTangoVocabularyProgressRepository vocabularyProgress;
    @Autowired
    private ItemProgressRepository itemProgress;

    @BeforeEach
    void setUp() {
        for (String email : new String[] {"shadowing@example.com", "other@example.com"})
            if (!users.existsByEmail(email))
                users.save(User.builder().email(email).password("not-used").role(Role.USER).name("S").build());
    }

    private static String sentence(String key, int recordings, String passed, String missed, String match) {
        return """
                {"sentenceKey":"%s","recordings":%d,"passed":[%s],"missed":[%s],"contentMatch":%s}"""
                .formatted(key, recordings, passed, missed, match);
    }

    private static String session(String id, int unitSentences, String... sentences) {
        return """
                {"clientSessionId":"%s","unitId":"n5-station","level":"N5","mode":"REPEAT","unitSentences":%d,\
                "durationSeconds":90,"sentences":[%s]}""".formatted(id, unitSentences, String.join(",", sentences));
    }

    private ResultActions send(String body) throws Exception {
        return mockMvc.perform(post(BASE + "/sessions").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void countsOnTheServerStoresOnceAndLeavesOtherProgressAlone() throws Exception {
        long vocabularyBefore = vocabularyProgress.count();
        long itemsBefore = itemProgress.count();
        String body = session("session-0001", 3,
                sentence("n5-station:1", 2, "\"WORDS\"", "\"RHYTHM\"", "null"),
                sentence("kurai-gurai:0", 1, "", "", "55"));

        send(body).andExpect(status().isCreated())
                .andExpect(jsonPath("$.sentences").value(2))
                .andExpect(jsonPath("$.recordings").value(3))
                .andExpect(jsonPath("$.completed").value(false));
        send(body).andExpect(status().isOk()).andExpect(jsonPath("$.isNew").value(false));

        assertThat(sessions.count()).isEqualTo(1);
        assertThat(listening.count()).isZero();
        assertThat(vocabularyProgress.count()).isEqualTo(vocabularyBefore);
        assertThat(itemProgress.count()).isEqualTo(itemsBefore);
    }

    @Test
    void progressFollowsTheLatestAssessmentOfEachSentence() throws Exception {
        send(session("session-0001", 1, sentence("n5-station:1", 1, "", "\"RHYTHM\"", "null")))
                .andExpect(jsonPath("$.completed").value(true));
        // Practised again without assessing: the difficulty stays.
        send(session("session-0002", 1, sentence("n5-station:1", 1, "", "", "null")));
        mockMvc.perform(get(BASE + "/progress"))
                .andExpect(jsonPath("$.sentencesPracticed").value(1))
                .andExpect(jsonPath("$.totalRecordings").value(2))
                .andExpect(jsonPath("$.totalSeconds").value(180))
                .andExpect(jsonPath("$.completedUnits[0]").value("n5-station"))
                .andExpect(jsonPath("$.sessions.length()").value(2))
                .andExpect(jsonPath("$.difficulties[0].missed[0]").value("RHYTHM"))
                .andExpect(jsonPath("$.checks[0].missed").value(1));

        send(session("session-0003", 1, sentence("n5-station:1", 1, "\"RHYTHM\"", "", "90")));
        mockMvc.perform(get(BASE + "/progress"))
                .andExpect(jsonPath("$.difficulties").isEmpty())
                .andExpect(jsonPath("$.checks[0].assessed").value(2));
    }

    @Test
    void progressIsPerUser() throws Exception {
        send(session("session-0001", 1, sentence("n5-station:1", 1, "", "", "null"))).andExpect(status().isCreated());
        mockMvc.perform(get(BASE + "/progress").with(user("other@example.com")))
                .andExpect(jsonPath("$.sessions").isEmpty())
                .andExpect(jsonPath("$.sentencesPracticed").value(0));
    }

    @Test
    void rejectsBadInput() throws Exception {
        String ok = sentence("n5-station:1", 1, "", "", "null");
        send(session("session-0001", 3)).andExpect(status().isBadRequest());
        send(session("session-0001", 3, ok, ok)).andExpect(status().isBadRequest());
        send(session("session-0001", 1, ok, sentence("n5-station:2", 1, "", "", "null")))
                .andExpect(status().isBadRequest());
        send(session("session-0001", 3, sentence("n5-station:1", -1, "", "", "null")))
                .andExpect(status().isBadRequest());
        send(session("session-0001", 3, sentence("n5-station:1", 1, "\"PITCH\"", "", "null")))
                .andExpect(status().isBadRequest());
        send(session("session-0001", 3, sentence("n5-station:1", 1, "\"CLEAR\"", "\"CLEAR\"", "null")))
                .andExpect(status().isBadRequest());
        send(session("session-0001", 3, sentence("n5-station:1", 1, "", "", "101")))
                .andExpect(status().isBadRequest());
        send(session("session-0001", 3, ok).replace("\"REPEAT\"", "\"SCORED\"")).andExpect(status().isBadRequest());
        send(session("session-0001", 3, ok).replace("\"N5\"", "\"N4\"")).andExpect(status().isBadRequest());
        assertThat(sessions.count()).isZero();
    }

    @Test
    @WithAnonymousUser
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get(BASE + "/progress")).andExpect(status().isUnauthorized());
    }
}
