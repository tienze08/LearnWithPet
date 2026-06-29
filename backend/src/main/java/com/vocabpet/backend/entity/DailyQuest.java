package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.DailyQuestType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "daily_quests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyQuest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private DailyQuestType type;

    /**
     * Ví dụ:
     * STUDY_WORD = 20
     * QUIZ = 3
     */
    private int target;

    @Builder.Default
    private int rewardXp = 0;

    @Builder.Default
    private int rewardPetXp = 0;

    @Builder.Default
    private boolean active = true;
}