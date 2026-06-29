package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.PetResponse;
import com.vocabpet.backend.dto.AuthRe.OnboardingRequest;
import com.vocabpet.backend.dto.UserRe.UserResponse;
import com.vocabpet.backend.entity.Pet;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.AvatarType;
import com.vocabpet.backend.entity.enums.PetMood;
import com.vocabpet.backend.entity.enums.PetSpecies;
import com.vocabpet.backend.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

        private final UserRepository userRepository;

        public UserResponse getCurrentUser(Authentication authentication) {

                User user = userRepository.findByEmail(authentication.getName())
                                .orElseThrow();

                Pet pet = user.getCurrentPet();

                PetResponse petResponse = null;

                if (pet != null) {
                        petResponse = PetResponse.builder()
                                        .id(pet.getId())
                                        .name(pet.getName())
                                        .species(pet.getSpecies().name())
                                        .mood(pet.getMood().name())
                                        .level(pet.getLevel())
                                        .xp(pet.getXp())
                                        .build();
                }

                return UserResponse.builder()
                                .id(user.getId())
                                .name(user.getName())
                                .email(user.getEmail())
                                .avatar(user.getAvatar().name())
                                .level(user.getLevel())
                                .xp(user.getXp())
                                .totalXp(user.getTotalXp())
                                .streak(user.getStreak())
                                .onboarded(user.getOnboarded())
                                .pet(petResponse)
                                .build();
        }

        @Transactional
        public void completeOnboarding(Authentication authentication,
                        OnboardingRequest request) {

                User user = userRepository.findByEmail(authentication.getName())
                                .orElseThrow();

                if (Boolean.TRUE.equals(user.getOnboarded())) {
                        return;
                }

                user.setAvatar(AvatarType.valueOf(request.getAvatarType().toUpperCase()));
                user.setOnboarded(true);

                Pet pet = Pet.builder()
                                .user(user)
                                .name(request.getPetName())
                                .species(PetSpecies.CAT)
                                .mood(PetMood.HAPPY)
                                .level(1)
                                .xp(0)
                                .build();

                user.setCurrentPet(pet);

                userRepository.save(user);
        }
}