package com.vocabpet.backend.service;

import java.time.LocalDate;
import java.time.LocalTime;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.dto.PetRe.PetResponse;
import com.vocabpet.backend.entity.Pet;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.repository.PetRepository;
import com.vocabpet.backend.service.behavior.PetBehaviorContext;
import com.vocabpet.backend.service.behavior.PetBehaviorEngine;
import com.vocabpet.backend.service.personality.PersonalityEngine;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PetServiceImpl implements PetService {

    private final PetRepository petRepository;
    private final CurrentUserService currentUserService;

    private final PetBehaviorEngine behaviorEngine;
    private final PersonalityEngine personalityEngine;

    @Override
    public PetResponse getMyPet() {

        User user = currentUserService.getCurrentUser();

        Pet pet = petRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Pet not found"));

        boolean studiedToday = user.getLastStudyAt() != null &&
                user.getLastStudyAt()
                        .toLocalDate()
                        .equals(LocalDate.now());

        PetBehaviorContext context = PetBehaviorContext.builder()
                .user(user)
                .pet(pet)
                .studiedToday(studiedToday)
                .dailyCompleted(false)
                .weeklyCompleted(false)
                .currentHour(LocalTime.now().getHour())
                .build();

        PetBehaviorResponse behavior = behaviorEngine.calculate(context);

        PetBehaviorResponse finalBehavior = PetBehaviorResponse.builder()
                .mood(behavior.getMood())
                .action(behavior.getAction())
                .priority(behavior.getPriority())
                .duration(behavior.getDuration())
                .message(personalityEngine.buildMessage(pet.getSpecies(), behavior))
                .build();

        pet.setMood(behavior.getMood());

        petRepository.save(pet);

        return PetResponse.builder()
                .id(pet.getId())
                .name(pet.getName())
                .species(pet.getSpecies())
                .level(pet.getLevel())
                .xp(pet.getXp())
                .behavior(finalBehavior)
                .behavior(behavior)
                .build();
    }
}
