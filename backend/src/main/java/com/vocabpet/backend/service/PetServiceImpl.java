package com.vocabpet.backend.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetResponse;
import com.vocabpet.backend.entity.Pet;
import com.vocabpet.backend.entity.PetUnlock;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.PetSpecies;
import com.vocabpet.backend.repository.PetRepository;
import com.vocabpet.backend.repository.PetUnlockRepository;
import com.vocabpet.backend.repository.UserRepository;
import com.vocabpet.backend.service.behavior.PetBehaviorService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PetServiceImpl implements PetService {

        private final PetBehaviorService petBehaviorService;
        private final CurrentUserService currentUserService;
        private final PetRepository petRepository;

        private final PetUnlockRepository petUnlockRepository;
        private final UserRepository userRepository;

        @Override
        public PetResponse getMyPet() {

                User user = currentUserService.getCurrentUser();

                Pet pet = petRepository.findByUserId(user.getId())
                                .orElseThrow(() -> new RuntimeException("Pet not found"));

                return PetResponse.builder()
                                .id(pet.getId())
                                .name(pet.getName())
                                .species(pet.getSpecies())
                                .level(pet.getLevel())
                                .xp(pet.getXp())
                                .behavior(petBehaviorService.calculateCurrentBehavior())
                                .build();
        }

        @Override
        public PetResponse unlockPet(PetSpecies species) {
                User user = currentUserService.getCurrentUser();

                boolean alreadyUnlocked = petUnlockRepository.existsByUserAndSpecies(user, species);
                if (alreadyUnlocked) {
                        return PetResponse.builder()
                                        .species(species)
                                        .locked(false)
                                        .build();
                }

                int requiredLevel = species == PetSpecies.FOX || species == PetSpecies.BUNNY ? 3 : 5;
                int requiredCoins = 50;

                if (user.getLevel() < requiredLevel || user.getCoin() < requiredCoins) {
                        throw new IllegalStateException("Requirements not met");
                }

                PetUnlock unlock = PetUnlock.builder()
                                .user(user)
                                .species(species)
                                .unlockedAt(LocalDateTime.now())
                                .build();

                user.setCoin(user.getCoin() - requiredCoins);
                userRepository.save(user);
                petUnlockRepository.save(unlock);

                return PetResponse.builder()
                                .species(species)
                                .locked(false)
                                .build();
        }
}
