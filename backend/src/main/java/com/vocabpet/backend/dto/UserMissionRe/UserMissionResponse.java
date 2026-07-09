package com.vocabpet.backend.dto.UserMissionRe;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserMissionResponse {

    private Long id;

    private String type;

    private String title;

    private String description;

    private int currentValue;

    private int targetValue;

    private boolean completed;

    private boolean rewardClaimed;

    private int rewardXp;

    private int rewardCoin;
}