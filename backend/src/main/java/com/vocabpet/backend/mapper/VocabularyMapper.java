package com.vocabpet.backend.mapper;

import org.springframework.stereotype.Component;

import com.vocabpet.backend.dto.VocabularyRe.VocabularyRequest;
import com.vocabpet.backend.dto.VocabularyRe.VocabularyResponse;
import com.vocabpet.backend.entity.Vocabulary;

@Component
public class VocabularyMapper {

    public Vocabulary toEntity(VocabularyRequest request) {

        return Vocabulary.builder()
                .word(request.getWord())
                .meaning(request.getMeaning())
                .example(request.getExample())
                .difficulty(request.getDifficulty())
                .partOfSpeech(request.getPartOfSpeech())
                .build();
    }

    public VocabularyResponse toResponse(Vocabulary vocabulary) {

        return VocabularyResponse.builder()
                .id(vocabulary.getId())
                .word(vocabulary.getWord())
                .meaning(vocabulary.getMeaning())
                .example(vocabulary.getExample())
                .difficulty(vocabulary.getDifficulty().name())
                .partOfSpeech(vocabulary.getPartOfSpeech().name())
                .deckId(vocabulary.getDeck().getId())
                .build();
    }

}