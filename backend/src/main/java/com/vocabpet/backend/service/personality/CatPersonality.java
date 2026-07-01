package com.vocabpet.backend.service.personality;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.enums.PetSpecies;

@Service
public class CatPersonality implements PetPersonality {

    @Override
    public PetSpecies getSpecies() {
        return PetSpecies.CAT;
    }

    @Override
    public String buildMessage(PetBehaviorResponse behavior) {

        return switch (behavior.getAction()) {

            case IDLE -> "Meow~";

            case STUDY -> "Học tiếp nào 😼";

            case HAPPY -> "Giỏi lắm nha!";

            case SAD -> "Mình vẫn đang đợi bạn...";

            case CRY -> "Hôm nay mình chưa được học 😿";

            case CELEBRATE -> "Wow!! Bạn tuyệt thật!";

            case WALK -> "Đi dạo một chút thôi~";

            case SLEEP -> "Ngủ chút nha 💤";
        };
    }
}
