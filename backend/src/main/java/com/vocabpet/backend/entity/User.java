package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

import com.vocabpet.backend.entity.enums.AvatarType;
import com.vocabpet.backend.entity.enums.Role;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String name;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AvatarType avatar = AvatarType.FOX;

    @Builder.Default
    private int level = 1;

    @Builder.Default
    private int xp = 0;

    @Builder.Default
    private int totalXp = 0;

    /**
     * Chuỗi học liên tiếp
     */
    @Builder.Default
    private int streak = 0;

    /**
     * Ngày học gần nhất
     */
    private LocalDateTime lastStudyAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean onboarded = false;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.EAGER, orphanRemoval = true)
    private Pet currentPet;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

}