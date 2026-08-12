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
    private LocalDateTime lastIntentAt;
    private LocalDate lastGreetingDate;
    /** Prevents repeating the same yesterday-recall prompt after each refresh. */
    private LocalDate lastYesterdayRecallDate;

    @Enumerated(EnumType.STRING)
    private com.vocabpet.backend.entity.enums.PetIntent lastIntent;

    /** Routine and relationship memory. These are not FSRS scheduling data. */
    private LocalDate firstStudyDate;

    @Builder.Default
    private int usualStudyHour = -1;

    @Builder.Default
    private long studyDays = 0;

    @Builder.Default
    private long totalSessionsTogether = 0;

    @Builder.Default
    private int averageSessionMinutes = 0;

    @Enumerated(EnumType.STRING)
    private CompanionEventType lastEvent;

    @Builder.Default
    private long totalInteractions = 0;
}
