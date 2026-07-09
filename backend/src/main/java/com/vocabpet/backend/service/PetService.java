package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.PetRe.PetResponse;

public interface PetService {
    PetResponse getMyPet();

    PetResponse unlockPet(com.vocabpet.backend.entity.enums.PetSpecies species);
}
