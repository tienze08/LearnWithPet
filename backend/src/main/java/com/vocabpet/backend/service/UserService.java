package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.OnboardingRequest;
import com.vocabpet.backend.dto.PetResponse;
import com.vocabpet.backend.dto.UserResponse;
import com.vocabpet.backend.entity.Pet;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.PetColor;
import com.vocabpet.backend.entity.enums.PetSpecies;
import com.vocabpet.backend.entity.enums.PetStage;
import com.vocabpet.backend.repository.PetRepository;
import com.vocabpet.backend.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

        private final UserRepository userRepository;

        private final PetRepository petRepository;

        public UserResponse getCurrentUser(
                        Authentication authentication) {

                String email = authentication.getName();

                User user = userRepository
                                .findByEmail(email)
                                .orElseThrow();

                PetResponse petResponse = petRepository
                                .findByUser(user)
                                .map(pet -> PetResponse.builder()
                                                .id(pet.getId())
                                                .name(pet.getName())
                                                .species(pet.getSpecies().name())
                                                .color(pet.getColor().name())
                                                .stage(pet.getStage().name())
                                                .level(pet.getLevel())
                                                .exp(pet.getExp())
                                                .happiness(pet.getHappiness())
                                                .energy(pet.getEnergy())
                                                .build())
                                .orElse(null);

                return UserResponse.builder()
                                .id(user.getId())
                                .name(user.getName())
                                .email(user.getEmail())
                                .level(user.getLevel())
                                .xp(user.getXp())
                                .onboarded(user.getOnboarded())
                                .avatarType(user.getAvatarType())
                                .pet(petResponse)
                                .build();
        }

        @Transactional
        public void completeOnboarding(Authentication authentication, OnboardingRequest request) {

                String email = authentication.getName();

                User user = userRepository.findByEmail(email)
                                .orElseThrow();

                if (Boolean.TRUE.equals(user.getOnboarded())) {
                        return;
                }

                user.setAvatarType(request.getAvatarType());
                user.setOnboarded(true);

                Pet pet = Pet.builder()
                                .user(user)
                                .name(request.getPetName())
                                .species(PetSpecies.FOX)
                                .color(PetColor.valueOf(request.getPetColor()))
                                .stage(PetStage.BABY)
                                .level(1)
                                .exp(0)
                                .happiness(100)
                                .energy(100)
                                .build();

                user.setPet(pet);

                userRepository.save(user);
        }
}