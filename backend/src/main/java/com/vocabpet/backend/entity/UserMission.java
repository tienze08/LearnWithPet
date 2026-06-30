package com.vocabpet.backend.entity;

import java.time.LocalDate;

import com.vocabpet.backend.entity.enums.MissionType;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_missions", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "type", "date" })
}, indexes = {
        @Index(name = "idx_user_date", columnList = "user_id, date")
})
@Getter
@Setter
public class UserMission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private MissionType type;

    @Column(name = "date")
    private LocalDate date;

    private LocalDate weekStart;

    private int targetValue;
    private int currentValue;

    private boolean completed;

    private int rewardXp;
    private int rewardCoin;
}