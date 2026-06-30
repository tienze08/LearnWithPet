package com.vocabpet.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.vocabpet.backend.dto.BookmarkRe.BookmarkResponse;
import com.vocabpet.backend.service.BookmarkService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @PostMapping("/{vocabularyId}")
    @ResponseStatus(HttpStatus.CREATED)
    public BookmarkResponse addBookmark(
            @PathVariable Long vocabularyId) {

        return bookmarkService.addBookmark(vocabularyId);
    }

    @DeleteMapping("/{vocabularyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeBookmark(
            @PathVariable Long vocabularyId) {

        bookmarkService.removeBookmark(vocabularyId);
    }

    @GetMapping
    public List<BookmarkResponse> getBookmarks() {

        return bookmarkService.getBookmarks();
    }
}