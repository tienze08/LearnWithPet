package com.vocabpet.backend.controller;

import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.vocabpet.backend.dto.PetRe.PetResponse;
import com.vocabpet.backend.entity.enums.PetSpecies;
import com.vocabpet.backend.service.PetService;

@RestController
@RequestMapping("/api/pets")
@RequiredArgsConstructor
public class PetController {

    private final PetService petService;

    @GetMapping("/me")
    public PetResponse getMyPet() {
        return petService.getMyPet();
    }

    @GetMapping("/starter")
    public List<PetResponse> starterPets() {

        return List.of(
                PetResponse.builder()
                        .species(PetSpecies.CAT)
                        .locked(false)
                        .build(),

                PetResponse.builder()
                        .species(PetSpecies.FOX)
                        .locked(true)
                        .build(),

                PetResponse.builder()
                        .species(PetSpecies.BUNNY)
                        .locked(true)
                        .build(),

                PetResponse.builder()
                        .species(PetSpecies.PANDA)
                        .locked(true)
                        .build(),

                PetResponse.builder()
                        .species(PetSpecies.DRAGON)
                        .locked(true)
                        .build());
    }

}