package com.vocabpet.backend.service;

import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.enums.Rating;

public interface FsrsService {

    void review(UserVocabularyProgress progress, Rating rating);
}