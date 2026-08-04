package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.CompanionEventType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "companion_memories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanionMemory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", unique = true, nullable = false)
    private CompanionProfile profile;

    @Builder.Default
    private int energy = 80;

    private LocalDateTime lastSeenAt;
    private LocalDateTime lastStudyAt;
    private LocalDateTime lastReminderAt;
    private LocalDateTime lastBreakSuggestionAt;
    private LocalDate lastGreetingDate;

    @Enumerated(EnumType.STRING)
    private CompanionEventType lastEvent;

    @Builder.Default
    private long totalInteractions = 0;
}
