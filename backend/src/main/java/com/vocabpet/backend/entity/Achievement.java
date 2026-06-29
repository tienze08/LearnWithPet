package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.AchievementType;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "achievements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Achievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Ví dụ:
     * STUDY_WORD = 1000
     */
    private int target;

    @Builder.Default
    private int rewardXp = 0;

    @Builder.Default
    private int rewardPetXp = 0;

    @Enumerated(EnumType.STRING)
    private AchievementType type;
}