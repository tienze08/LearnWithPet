package com.vocabpet.backend.entity;

import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_missions", uniqueConstraints = {
                @UniqueConstraint(columnNames = {
                                "user_id",
                                "daily_quest_id",
                                "date"
                })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMission {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        private Long userId;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "daily_quest_id")
        private DailyQuest dailyQuest;

        private LocalDate date;

        @Builder.Default
        private int currentValue = 0;

        @Builder.Default
        private boolean completed = false;

        @Builder.Default
        private boolean rewardClaimed = false;
}