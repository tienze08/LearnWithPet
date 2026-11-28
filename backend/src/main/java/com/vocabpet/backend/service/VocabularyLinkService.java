package com.vocabpet.backend.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.repository.TangoVocabularyRepository;
import com.vocabpet.backend.repository.VocabularyRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VocabularyLinkService {

    private final VocabularyRepository vocabularyRepository;
    private final TangoVocabularyRepository tangoVocabularyRepository;

    /**
     * Links unlinked deck words to a canonical Tango word when the match is unambiguous
     * (exactly one Tango word has the same kana or expression). Idempotent.
     * Returns the number of deck words linked.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void linkOnStartup() {
        linkUnlinked();
    }

    @Transactional
    public int linkUnlinked() {
        Map<String, List<TangoVocabulary>> byText = new HashMap<>();
        for (TangoVocabulary t : tangoVocabularyRepository.findAll()) {
            byText.computeIfAbsent(t.getKana(), k -> new ArrayList<>()).add(t);
            if (t.getExpression() != null) {
                byText.computeIfAbsent(t.getExpression(), k -> new ArrayList<>()).add(t);
            }
        }
        int linked = 0;
        for (Vocabulary v : vocabularyRepository.findByTangoVocabularyIsNull()) {
            List<TangoVocabulary> matches = byText.getOrDefault(v.getWord(), List.of());
            if (matches.size() == 1) {
                v.setTangoVocabulary(matches.get(0));
                linked++;
            }
        }
        return linked;
    }
}
