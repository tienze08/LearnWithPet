package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.reader.ReaderDocumentResponse;
import com.vocabpet.backend.dto.reader.ReaderDocumentStateRequest;
import com.vocabpet.backend.entity.ReaderDocument;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.repository.ReaderDocumentRepository;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
public class ReaderDocumentServiceImpl implements ReaderDocumentService {
    private final ReaderDocumentRepository documentRepository;
    private final CurrentUserService currentUserService;
    @Value("${app.storage.supabase.bucket:}")
    private String bucket;

    @Value("${app.storage.supabase.url:}")
    private String supabaseUrl;

    @Value("${app.storage.supabase.service-key:}")
    private String serviceKey;

    @Override
    @Transactional
    public ReaderDocumentResponse upload(MultipartFile file, String extractedText) {
        requireStorage();
        if (file == null || file.isEmpty() || !"application/pdf".equalsIgnoreCase(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please upload a PDF file");
        }
        if (extractedText == null || extractedText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The PDF text could not be extracted");
        }

        User user = currentUserService.getCurrentUser();
        ReaderDocument document = documentRepository.findByUserId(user.getId()).orElse(null);
        String key = "reader/" + user.getId() + "/" + UUID.randomUUID() + ".pdf";
        try {
            storageClient().post()
                    .uri("/storage/v1/object/{bucket}/{key}", bucket, key)
                    .header("x-upsert", "true")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(file.getBytes())
                    .retrieve().toBodilessEntity();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The PDF could not be read", exception);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cloud storage could not save this PDF", exception);
        }

        LocalDateTime now = LocalDateTime.now();
        if (document == null) {
            document = ReaderDocument.builder().user(user).createdAt(now).build();
        }
        document.setTitle(file.getOriginalFilename() == null ? "Untitled PDF" : file.getOriginalFilename());
        document.setStorageKey(key);
        document.setContentType("application/pdf");
        document.setSizeBytes(file.getSize());
        document.setExtractedText(extractedText);
        document.setBasketJson("[]");
        document.setHighlightsJson("{}");
        document.setUpdatedAt(now);
        return toResponse(documentRepository.save(document));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ReaderDocumentResponse> findLatest() {
        return documentRepository.findByUserId(currentUserService.getCurrentUser().getId())
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Resource latestFile() {
        requireStorage();
        ReaderDocument document = requireDocument();
        try {
            byte[] bytes = storageClient().get()
                    .uri("/storage/v1/object/{bucket}/{key}", bucket, document.getStorageKey())
                    .retrieve().body(byte[].class);
            return new ByteArrayResource(bytes == null ? new byte[0] : bytes);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cloud storage could not load this PDF", exception);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public String latestContentType() { return requireDocument().getContentType(); }

    @Override
    @Transactional
    public ReaderDocumentResponse updateState(ReaderDocumentStateRequest request) {
        ReaderDocument document = requireDocument();
        document.setBasketJson(request.basketJson() == null ? "[]" : request.basketJson());
        document.setHighlightsJson(request.highlightsJson() == null ? "{}" : request.highlightsJson());
        document.setUpdatedAt(LocalDateTime.now());
        return toResponse(documentRepository.save(document));
    }

    private ReaderDocument requireDocument() {
        return documentRepository.findByUserId(currentUserService.getCurrentUser().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No PDF has been saved yet"));
    }

    private void requireStorage() {
        if (supabaseUrl.isBlank() || serviceKey.isBlank() || bucket.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "PDF cloud storage is not configured yet");
        }
    }

    private RestClient storageClient() {
        requireStorage();
        return RestClient.builder()
                .baseUrl(supabaseUrl)
                .defaultHeader("apikey", serviceKey)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + serviceKey)
                .build();
    }

    private ReaderDocumentResponse toResponse(ReaderDocument document) {
        return new ReaderDocumentResponse(document.getId(), document.getTitle(), document.getContentType(),
                document.getSizeBytes(), document.getExtractedText(), document.getBasketJson(),
                document.getHighlightsJson(), document.getUpdatedAt());
    }
}
