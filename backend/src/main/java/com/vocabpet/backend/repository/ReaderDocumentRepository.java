package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.ReaderDocument;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReaderDocumentRepository extends JpaRepository<ReaderDocument, Long> {
    Optional<ReaderDocument> findByUserId(Long userId);
}
