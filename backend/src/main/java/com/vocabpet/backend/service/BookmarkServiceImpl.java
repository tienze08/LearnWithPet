package com.vocabpet.backend.service;

import com.vocabpet.backend.mapper.BookmarkMapper;
import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

import com.vocabpet.backend.dto.BookmarkRe.BookmarkResponse;
import com.vocabpet.backend.entity.Bookmark;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.repository.BookmarkRepository;
import com.vocabpet.backend.repository.VocabularyRepository;

import jakarta.persistence.EntityNotFoundException;

@Service
@RequiredArgsConstructor
public class BookmarkServiceImpl
        implements BookmarkService {

    private final BookmarkMapper bookmarkMapper;

    private final BookmarkRepository bookmarkRepository;

    private final VocabularyRepository vocabularyRepository;

    private final CurrentUserService currentUserService;

    @Override
    public BookmarkResponse addBookmark(Long vocabularyId) {

        User user = currentUserService.getCurrentUser();

        if (bookmarkRepository
                .existsByUserIdAndVocabularyId(
                        user.getId(),
                        vocabularyId)) {

            throw new IllegalArgumentException(
                    "Already bookmarked");
        }

        Vocabulary vocabulary = vocabularyRepository.findById(vocabularyId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Vocabulary not found"));

        Bookmark bookmark = Bookmark.builder()
                .user(user)
                .vocabulary(vocabulary)
                .build();

        bookmarkRepository.save(bookmark);

        return bookmarkMapper.toResponse(bookmark);
    }

    @Override
    public void removeBookmark(
            Long vocabularyId) {

        User user = currentUserService.getCurrentUser();

        Bookmark bookmark = bookmarkRepository
                .findByUserIdAndVocabularyId(
                        user.getId(),
                        vocabularyId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Bookmark not found"));

        bookmarkRepository.delete(bookmark);

    }

    @Override
    public List<BookmarkResponse> getBookmarks() {

        User user = currentUserService.getCurrentUser();

        return bookmarkRepository
                .findByUser(user)
                .stream()
                .map(bookmarkMapper::toResponse)
                .toList();

    }

}