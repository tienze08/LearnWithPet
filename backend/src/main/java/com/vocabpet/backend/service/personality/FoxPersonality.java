package com.vocabpet.backend.service.personality;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.enums.PetSpecies;

@Service
public class FoxPersonality implements PetPersonality {

    @Override
    public PetSpecies getSpecies() {
        return PetSpecies.FOX;
    }

    @Override
    public String buildMessage(PetBehaviorResponse behavior) {

        return switch (behavior.getAction()) {

            case IDLE -> "Chuẩn bị học nào!";

            case STUDY -> "Thêm vài từ nữa nhé!";

            case HAPPY -> "Bạn đang tiến bộ rất nhanh!";

            case SAD -> "Đừng bỏ cuộc nhé.";

            case CRY -> "Hôm nay mình nhớ bạn...";

            case CELEBRATE -> "Chiến thắng tiếp theo!";

            case WALK -> "Khởi động thôi.";

            case SLEEP -> "Mai tiếp tục nhé!";
        };
    }
}
