package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
public class UserReward {

    @Id
    private Long userId;

    private int xp;
    private int coin;
    private int level;
}
