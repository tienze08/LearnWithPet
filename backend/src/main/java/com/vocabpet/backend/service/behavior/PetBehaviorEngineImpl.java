package com.vocabpet.backend.service.behavior;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.PetAction;
import com.vocabpet.backend.entity.enums.PetMood;

@Service
public class PetBehaviorEngineImpl
        implements PetBehaviorEngine {

    @Override
    public PetBehaviorResponse calculate(PetBehaviorContext context) {

        PetBehaviorResponse eventBehavior = calculateByEvent(context);

        if (eventBehavior != null) {
            return eventBehavior;
        }

        return calculateByTime(context);
    }

    private PetBehaviorResponse calculateByEvent(PetBehaviorContext context) {

        if (context.getEvent() == null) {
            return null;
        }

        switch (context.getEvent()) {

            case CORRECT_ANSWER:
                return PetBehaviorResponse.builder()
                        .mood(PetMood.HAPPY)
                        .action(PetAction.CELEBRATE)
                        .priority(100)
                        .duration(3)
                        .build();

            case WRONG_ANSWER:
                return PetBehaviorResponse.builder()
                        .mood(PetMood.SAD)
                        .action(PetAction.SAD)
                        .priority(100)
                        .duration(3)
                        .build();

            case SESSION_COMPLETED:
                return PetBehaviorResponse.builder()
                        .mood(PetMood.HAPPY)
                        .action(PetAction.CELEBRATE)
                        .priority(100)
                        .duration(5)
                        .build();

            case STREAK_BROKEN:
                return PetBehaviorResponse.builder()
                        .mood(PetMood.CRYING)
                        .action(PetAction.CRY)
                        .priority(100)
                        .duration(8)
                        .build();

            default:
                return null;
        }
    }

    private PetBehaviorResponse calculateByTime(PetBehaviorContext context) {

        if (!context.isStudiedToday()) {

            long daysSinceLastStudy = daysSinceLastStudy(context.getUser());

            if (daysSinceLastStudy >= 3
                    || (daysSinceLastStudy >= 1 && context.getCurrentHour() >= 21)) {

                return PetBehaviorResponse.builder()
                        .mood(PetMood.CRYING)
                        .action(PetAction.CRY)
                        .priority(100)
                        .duration(15)
                        .build();
            }

            if (daysSinceLastStudy >= 2
                    || context.getCurrentHour() >= 15) {

                return PetBehaviorResponse.builder()
                        .mood(PetMood.SAD)
                        .action(PetAction.SAD)
                        .priority(70)
                        .duration(10)
                        .build();
            }

            return PetBehaviorResponse.builder()
                    .mood(PetMood.WAITING)
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
                .action(PetAction.STUDY)
                .priority(50)
                .duration(5)
                .build();
    }

    private long daysSinceLastStudy(User user) {
        if (user == null || user.getLastStudyAt() == null) {
            return 999;
        }

        LocalDateTime lastStudyAt = user.getLastStudyAt();
        return ChronoUnit.DAYS.between(lastStudyAt.toLocalDate(), LocalDate.now());
    }
}
