package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Builder.Default
    private int totalCorrect = 0;
    @Builder.Default
    private int totalWrong = 0;
    @Builder.Default
    private int totalQuiz = 0;
}