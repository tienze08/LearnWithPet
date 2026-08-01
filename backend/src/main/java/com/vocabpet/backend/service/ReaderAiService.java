package com.vocabpet.backend.service;

import tools.jackson.databind.ObjectMapper;
import com.vocabpet.backend.dto.ReaderAi.GeneratedFlashcardResponse;
import com.vocabpet.backend.dto.ReaderAi.GeminiGenerateContentRequest;
import com.vocabpet.backend.dto.ReaderAi.GeminiGenerateContentResponse;
import com.vocabpet.backend.dto.ReaderAi.ReaderFlashcardGenerationRequest;
import com.vocabpet.backend.dto.ReaderAi.ReaderFlashcardGenerationResponse;
import com.vocabpet.backend.dto.ReaderAi.ReaderVocabularySuggestionRequest;
import com.vocabpet.backend.dto.ReaderAi.ReaderVocabularySuggestionResponse;
import com.vocabpet.backend.dto.ReaderAi.VocabularySuggestionResponse;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ReaderAiService {
    private final ObjectMapper objectMapper;
    private final String geminiApiKey;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public ReaderAiService(ObjectMapper objectMapper, @Value("${app.gemini.api-key:}") String geminiApiKey) {
        this.objectMapper = objectMapper;
        this.geminiApiKey = geminiApiKey;
    }

    public ReaderFlashcardGenerationResponse generate(ReaderFlashcardGenerationRequest request) {
        if (geminiApiKey.isBlank()) {
            throw new IllegalStateException("Gemini is not configured");
        }
        try {
            String prompt = """
                    You are a vocabulary tutor. Return JSON only, with this exact shape:
                    {"cards":[{"word":"","partOfSpeech":"noun|verb|adj|adv|phrase","ipa":"/…/","cefr":"A1|A2|B1|B2|C1|C2","meaning":"short learner-friendly English definition","example":"example sentence","contextSentence":"sentence from passage"}]}
                    Use the passage context for every definition. Return one card for each selected term in the same order.
                    Source title: %s
                    Passage: %s
                    Selected terms: %s
                    """.formatted(request.sourceTitle(), request.context(), String.join(", ", request.words()));

            var payload = new GeminiGenerateContentRequest(
                    List.of(new GeminiGenerateContentRequest.Content(
                            List.of(new GeminiGenerateContentRequest.Part(prompt)))),
                    new GeminiGenerateContentRequest.GenerationConfig("application/json", 1));
            String body = objectMapper.writeValueAsString(payload);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", geminiApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String detail = response.body().replaceAll("\\s+", " ");
                throw new IllegalStateException("Gemini request failed (" + response.statusCode() + "): "
                        + detail.substring(0, Math.min(detail.length(), 500)));
            }
            GeminiGenerateContentResponse gemini = objectMapper.readValue(response.body(), GeminiGenerateContentResponse.class);
            String json = gemini.candidates().getFirst().content().parts().getFirst().text();
            CardsPayload cards = objectMapper.readValue(json, CardsPayload.class);
            return new ReaderFlashcardGenerationResponse(cards.cards(),
                    "I prepared " + cards.cards().size() + " cards from this passage!");
        } catch (Exception exception) {
            if (exception instanceof IllegalStateException stateException) throw stateException;
            throw new IllegalStateException("Could not generate flashcards right now", exception);
        }
    }

    public ReaderVocabularySuggestionResponse suggestVocabulary(ReaderVocabularySuggestionRequest request) {
        if (geminiApiKey.isBlank()) throw new IllegalStateException("Gemini is not configured");
        try {
            String prompt = """
                    You are VocaPet, a friendly vocabulary companion. Analyze this reading passage and return JSON only:
                    {"suggestions":[{"word":"single word or short phrase","contextSentence":"exact sentence from passage","reason":"why this word is useful to learn"}]}
                    Choose at most 5 useful, non-obvious English vocabulary terms. Do not choose names or basic words.
                    Title: %s
                    Passage: %s
                    """.formatted(request.sourceTitle(), request.context());
            String json = requestGemini(prompt);
            SuggestionsPayload payload = objectMapper.readValue(json, SuggestionsPayload.class);
            return new ReaderVocabularySuggestionResponse(
                    "I analyzed this passage and found " + payload.suggestions().size() + " useful vocabulary words for you.",
                    payload.suggestions());
        } catch (Exception exception) {
            if (exception instanceof IllegalStateException stateException) throw stateException;
            throw new IllegalStateException("Could not suggest vocabulary right now", exception);
        }
    }

    private String requestGemini(String prompt) throws Exception {
        var payload = new GeminiGenerateContentRequest(
                List.of(new GeminiGenerateContentRequest.Content(List.of(new GeminiGenerateContentRequest.Part(prompt)))),
                new GeminiGenerateContentRequest.GenerationConfig("application/json", 1));
        HttpRequest request = HttpRequest.newBuilder(URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent"))
                .header("Content-Type", "application/json").header("x-goog-api-key", geminiApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload))).build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) throw new IllegalStateException("Gemini request failed (" + response.statusCode() + ")");
        GeminiGenerateContentResponse gemini = objectMapper.readValue(response.body(), GeminiGenerateContentResponse.class);
        return gemini.candidates().getFirst().content().parts().getFirst().text();
    }

    private record CardsPayload(List<GeneratedFlashcardResponse> cards) {
    }

    private record SuggestionsPayload(List<VocabularySuggestionResponse> suggestions) {
    }
}
