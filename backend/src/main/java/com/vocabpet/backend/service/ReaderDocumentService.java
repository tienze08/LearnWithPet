package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.reader.ReaderDocumentResponse;
import com.vocabpet.backend.dto.reader.ReaderDocumentStateRequest;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.util.Optional;

public interface ReaderDocumentService {
    ReaderDocumentResponse upload(MultipartFile file, String extractedText);
    Optional<ReaderDocumentResponse> findLatest();
    Resource latestFile();
    String latestContentType();
    ReaderDocumentResponse updateState(ReaderDocumentStateRequest request);
}
