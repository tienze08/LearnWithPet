package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.CompanionPersonality;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "companion_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanionProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pet_id", unique = true, nullable = false)
    private Pet pet;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CompanionPersonality personality = CompanionPersonality.GENTLE;

    @Builder.Default
    private boolean remindersEnabled = true;

    @Builder.Default
    private int quietHoursStart = 23;

    @Builder.Default
    private int quietHoursEnd = 7;
}
