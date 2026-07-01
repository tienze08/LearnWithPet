package com.vocabpet.backend.service.behavior;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.enums.PetAction;
import com.vocabpet.backend.entity.enums.PetMood;

@Service
public class PetBehaviorEngineImpl
        implements PetBehaviorEngine {

    @Override
    public PetBehaviorResponse calculate(
            PetBehaviorContext context) {

        if (!context.isStudiedToday()) {

            if (context.getCurrentHour() >= 21) {

                return PetBehaviorResponse.builder()
                        .mood(PetMood.CRYING)
                        .action(PetAction.CRY)
                        .priority(100)
                        .duration(15)
                        .build();
            }

            if (context.getCurrentHour() >= 15) {

                return PetBehaviorResponse.builder()
                        .mood(PetMood.SAD)
                        .action(PetAction.SAD)
                        .priority(70)
                        .duration(10)
                        .build();
            }

            return PetBehaviorResponse.builder()
                    .mood(PetMood.WATTING)
                    .action(PetAction.IDLE)
                    .priority(20)
                    .duration(5)
                    .build();
        }

        if (context.isDailyCompleted()) {

            return PetBehaviorResponse.builder()
                    .mood(PetMood.HAPPY)
                    .action(PetAction.CELEBRATE)
                    .priority(90)
                    .duration(8)
                    .build();
        }

        return PetBehaviorResponse.builder()
                .mood(PetMood.HAPPY)
                .action(PetAction.HAPPY)
                .priority(50)
                .duration(5)
                .build();
    }
}
