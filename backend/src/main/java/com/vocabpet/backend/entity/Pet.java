package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

import com.vocabpet.backend.entity.enums.PetColor;
import com.vocabpet.backend.entity.enums.PetSpecies;
import com.vocabpet.backend.entity.enums.PetStage;

@Entity
@Table(name = "pets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    private String name;

    @Enumerated(EnumType.STRING)
    private PetSpecies species;

    @Enumerated(EnumType.STRING)
    private PetColor color;

    @Enumerated(EnumType.STRING)
    private PetStage stage;

    @Builder.Default
    private int level = 1;
    @Builder.Default
    private int exp = 0;

    @Builder.Default
    private int happiness = 100;
    @Builder.Default
    private int energy = 100;

    @Builder.Default
    private String skin = "DEFAULT";

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}