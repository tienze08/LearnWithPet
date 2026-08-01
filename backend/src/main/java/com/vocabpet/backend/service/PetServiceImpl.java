package com.vocabpet.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetResponse;
import com.vocabpet.backend.entity.Pet;
import com.vocabpet.backend.entity.PetUnlock;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.PetSpecies;
import com.vocabpet.backend.repository.PetRepository;
import com.vocabpet.backend.repository.PetUnlockRepository;
import com.vocabpet.backend.repository.UserRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;
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
        private final UserVocabularyProgressRepository vocabularyProgressRepository;

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

                if (species == PetSpecies.CAT) {
                        return PetResponse.builder().species(species).locked(false).build();
                }

                boolean alreadyUnlocked = petUnlockRepository.existsByUserAndSpecies(user, species);
                if (alreadyUnlocked) {
                        return PetResponse.builder()
                                        .species(species)
                                        .locked(false)
                                        .build();
                }

                int requiredCoins = 50;
                long masteredWords = vocabularyProgressRepository
                                .countByUserIdAndRepetitionsGreaterThanEqual(user.getId(), 4);
                boolean requirementMet = switch (species) {
                        case FOX -> user.getLevel() >= 3;
                        case BUNNY -> user.getStreak() >= 5;
                        case PANDA -> user.getLevel() >= 5;
                        case DRAGON -> masteredWords >= 10;
                        case CAT -> true;
                };

                // A pet can only be unlocked when both its learning requirement
                // and its coin cost are satisfied.
                if (!requirementMet || user.getCoin() < requiredCoins) {
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

        @Override
        public PetResponse selectPet(PetSpecies species) {
                User user = currentUserService.getCurrentUser();
                boolean isUnlocked = species == PetSpecies.CAT
                                || petUnlockRepository.existsByUserAndSpecies(user, species);
                if (!isUnlocked) {
                        throw new IllegalStateException("Pet is not unlocked for this user");
                }

                Pet pet = petRepository.findByUserId(user.getId()).orElseGet(() -> Pet.builder()
                                .user(user).name("Pip")
                                .mood(com.vocabpet.backend.entity.enums.PetMood.HAPPY)
                                .level(1).xp(0).build());
                pet.setSpecies(species);
                pet = petRepository.save(pet);
                user.setCurrentPet(pet);
                userRepository.save(user);

                return PetResponse.builder().id(pet.getId()).name(pet.getName())
                                .species(pet.getSpecies()).level(pet.getLevel()).xp(pet.getXp())
                                .locked(false).build();
        }

        @Override
        public List<PetResponse> getUnlockedPets() {
                User user = currentUserService.getCurrentUser();
                List<PetResponse> unlocked = petUnlockRepository.findByUserId(user.getId()).stream()
                                .map(item -> PetResponse.builder().species(item.getSpecies()).locked(false).build())
                                .toList();
                if (unlocked.stream().noneMatch(item -> item.getSpecies() == PetSpecies.CAT)) {
                        return java.util.stream.Stream.concat(
                                        java.util.stream.Stream.of(PetResponse.builder().species(PetSpecies.CAT).locked(false).build()),
                                        unlocked.stream()).toList();
                }
                return unlocked;
        }
}
