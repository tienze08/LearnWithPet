package com.vocabpet.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PetResponse {

    private Long id;

    private String name;

    private String species;

    private String mood;

    private int level;

    private int xp;
}