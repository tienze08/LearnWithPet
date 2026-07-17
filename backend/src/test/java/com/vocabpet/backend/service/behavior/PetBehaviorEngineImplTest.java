package com.vocabpet.backend.service.behavior;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.Pet;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.PetAction;
import com.vocabpet.backend.entity.enums.PetMood;

class PetBehaviorEngineImplTest {

    private final PetBehaviorEngineImpl engine = new PetBehaviorEngineImpl();

    @Test
    void shouldReturnCryingWhenUserHasBeenInactiveForSeveralDays() {
        User user = new User();
        user.setLastStudyAt(LocalDateTime.now().minusDays(3));

        PetBehaviorResponse response = engine.calculate(PetBehaviorContext.builder()
                .user(user)
                .pet(Pet.builder().build())
                .studiedToday(false)
                .dailyCompleted(false)
                .weeklyCompleted(false)
                .currentHour(22)
                .build());

        assertEquals(PetMood.CRYING, response.getMood());
        assertEquals(PetAction.CRY, response.getAction());
    }

    @Test
    void shouldReturnHappyWhenTheUserHasStudiedToday() {
        User user = new User();
        user.setLastStudyAt(LocalDateTime.now());

        PetBehaviorResponse response = engine.calculate(PetBehaviorContext.builder()
                .user(user)
                .pet(Pet.builder().build())
                .studiedToday(true)
                .dailyCompleted(true)
                .weeklyCompleted(false)
                .currentHour(14)
                .build());

        assertEquals(PetMood.HAPPY, response.getMood());
        assertEquals(PetAction.CELEBRATE, response.getAction());
    }
}
