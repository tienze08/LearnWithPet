package com.vocabpet.backend.service.behavior;

import java.time.LocalDate;
import java.time.LocalTime;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.Pet;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.PetEvent;
import com.vocabpet.backend.repository.PetRepository;
import com.vocabpet.backend.service.CurrentUserService;
import com.vocabpet.backend.service.personality.PersonalityEngine;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PetBehaviorServiceImpl implements PetBehaviorService {

    private final CurrentUserService currentUserService;
    private final PetRepository petRepository;
    private final PetBehaviorEngine behaviorEngine;
    private final PersonalityEngine personalityEngine;

    @Override
    public PetBehaviorResponse calculateCurrentBehavior() {

        User user = currentUserService.getCurrentUser();

        Pet pet = petRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Pet not found"));

        boolean studiedToday = user.getLastStudyAt() != null
                && user.getLastStudyAt().toLocalDate().equals(LocalDate.now());

        PetBehaviorContext context = PetBehaviorContext.builder()
                .user(user)
                .pet(pet)
                .studiedToday(studiedToday)
                .dailyCompleted(false)
                .weeklyCompleted(false)
                .currentHour(LocalTime.now().getHour())
                .event(PetEvent.NONE)
                .build();

        PetBehaviorResponse behavior = behaviorEngine.calculate(context);

        PetBehaviorResponse finalBehavior = PetBehaviorResponse.builder()
                .mood(behavior.getMood())
                .action(behavior.getAction())
                .priority(behavior.getPriority())
                .duration(behavior.getDuration())
                .message(personalityEngine.buildMessage(pet.getSpecies(), behavior))
                .build();

        pet.setMood(finalBehavior.getMood());
        petRepository.save(pet);

        return finalBehavior;
    }

    @Override
    public PetBehaviorResponse triggerEvent(PetEvent event) {

        User user = currentUserService.getCurrentUser();

        Pet pet = petRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Pet not found"));

        boolean studiedToday = user.getLastStudyAt() != null
                && user.getLastStudyAt().toLocalDate().equals(LocalDate.now());

        PetBehaviorContext context = PetBehaviorContext.builder()
                .user(user)
                .pet(pet)
                .studiedToday(studiedToday)
                .dailyCompleted(false)
                .weeklyCompleted(false)
                .currentHour(LocalTime.now().getHour())
                .event(event)
                .build();

        PetBehaviorResponse behavior = behaviorEngine.calculate(context);

        PetBehaviorResponse finalBehavior = PetBehaviorResponse.builder()
                .mood(behavior.getMood())
                .action(behavior.getAction())
                .priority(behavior.getPriority())
                .duration(behavior.getDuration())
                .message(personalityEngine.buildMessage(pet.getSpecies(), behavior))
                .build();

        pet.setMood(finalBehavior.getMood());
        petRepository.save(pet);

        return finalBehavior;
    }
}