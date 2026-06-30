package com.vocabpet.backend.service;

import java.util.List;

import com.vocabpet.backend.dto.BookmarkRe.BookmarkResponse;

public interface BookmarkService {

    BookmarkResponse addBookmark(Long vocabularyId);

    void removeBookmark(Long vocabularyId);

    List<BookmarkResponse> getBookmarks();

}