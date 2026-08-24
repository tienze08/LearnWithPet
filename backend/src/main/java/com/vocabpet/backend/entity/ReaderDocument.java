package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reader_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReaderDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, name = "storage_key")
    private String storageKey;

    @Column(nullable = false, name = "content_type")
    private String contentType;

    @Column(nullable = false, name = "size_bytes")
    private long sizeBytes;

    @Lob
    @Column(nullable = false, name = "extracted_text", columnDefinition = "LONGTEXT")
    private String extractedText;

    @Lob
    @Column(name = "basket_json", columnDefinition = "LONGTEXT")
    private String basketJson;

    @Lob
    @Column(name = "highlights_json", columnDefinition = "LONGTEXT")
    private String highlightsJson;

    @Column(nullable = false, name = "created_at")
    private LocalDateTime createdAt;

    @Column(nullable = false, name = "updated_at")
    private LocalDateTime updatedAt;
}
