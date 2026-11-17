package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.KanaRe.KanaAttemptRequest;
import com.vocabpet.backend.dto.KanaRe.KanaAttemptResponse;
import com.vocabpet.backend.dto.KanaRe.KanaItemProgressResponse;
import com.vocabpet.backend.dto.KanaRe.KanaProgressResponse;
import com.vocabpet.backend.dto.KanaRe.WeakKanaItem;

import java.util.List;

public interface KanaProgressService {

    KanaAttemptResponse recordAttempt(KanaAttemptRequest request);

    KanaProgressResponse getProgress();

    List<WeakKanaItem> getWeakKana(String script, String section, int limit);

    List<KanaItemProgressResponse> getItems(String script);
}
