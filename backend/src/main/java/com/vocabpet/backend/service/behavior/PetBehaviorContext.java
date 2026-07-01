package com.vocabpet.backend.service.behavior;

import com.vocabpet.backend.entity.Pet;
import com.vocabpet.backend.entity.User;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PetBehaviorContext {

    private User user;

    private Pet pet;

    private boolean studiedToday;

    private boolean dailyCompleted;

    private boolean weeklyCompleted;

    private int currentHour;
}
