package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.PetRe.PetResponse;
import java.util.List;

public interface PetService {
    PetResponse getMyPet();

    PetResponse unlockPet(com.vocabpet.backend.entity.enums.PetSpecies species);

    PetResponse selectPet(com.vocabpet.backend.entity.enums.PetSpecies species);

    List<PetResponse> getUnlockedPets();
}
