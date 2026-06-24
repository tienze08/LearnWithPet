package com.vocabpet.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PetResponse {

    private Long id;

    private String name;

    private String species;

    private String color;

    private String stage;

    private Integer level;

    private Integer exp;

    private Integer happiness;

    private Integer energy;
}