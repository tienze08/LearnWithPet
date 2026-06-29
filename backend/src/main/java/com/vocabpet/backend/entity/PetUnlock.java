package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

import com.vocabpet.backend.entity.enums.PetSpecies;

@Entity
@Table(name = "pet_unlocks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetUnlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private PetSpecies species;

    private LocalDateTime unlockedAt;

    @PrePersist
    public void prePersist() {
        unlockedAt = LocalDateTime.now();
    }

}
