package com.vocabpet.backend.service;

import com.vocabpet.backend.exception.GeminiQuotaExceededException;
import com.vocabpet.backend.service.TranslationAiService.Direction;
import com.vocabpet.backend.service.TranslationAiService.GradeRequest;
import com.vocabpet.backend.service.TranslationAiService.Verdict;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TranslationAiServiceTest {

    private final ReaderAiService gemini = mock(ReaderAiService.class);
    private final TranslationAiService service = new TranslationAiService(gemini, new ObjectMapper());
    private final GradeRequest request =
            new GradeRequest(Direction.VI_JA, "Tôi là học sinh.", "私は学生です。", "学生です。");

    private void reply(String json) throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.requestGemini(anyString())).thenReturn(json);
    }

    private int statusOfFailure() {
        return assertThrows(ResponseStatusException.class, () -> service.grade(request)).getStatusCode().value();
    }

    @Test
    void readsAGradingReply() throws Exception {
        reply("{\"verdict\":\"ACCEPTABLE\",\"explanation\":\"Được\",\"suggestion\":\"\"}");

        var result = service.grade(request);

        assertEquals(Verdict.ACCEPTABLE, result.verdict());
        assertTrue(result.issues().isEmpty());
    }

    @Test
    void answers503WithoutAnApiKey() {
        assertEquals(503, statusOfFailure());
    }

    @Test
    void rejectsAReplyThatIsNotAGrade() throws Exception {
        String[] replies = {"not json", "{\"explanation\":\"x\"}", "{\"verdict\":\"MAYBE\",\"explanation\":\"x\"}"};
        for (String bad : replies) {
            reply(bad);
            assertEquals(502, statusOfFailure(), bad);
        }
    }

    @Test
    void keepsTheQuotaError() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.requestGemini(anyString())).thenThrow(new GeminiQuotaExceededException(30));

        assertThrows(GeminiQuotaExceededException.class, () -> service.grade(request));
    }
}
