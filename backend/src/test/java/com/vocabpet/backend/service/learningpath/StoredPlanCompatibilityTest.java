package com.vocabpet.backend.service.learningpath;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.vocabpet.backend.entity.DailyPlan;
import com.vocabpet.backend.entity.LearningPlan;
import com.vocabpet.backend.entity.enums.PathItemType;
import com.vocabpet.backend.service.learningpath.PathModel.DayKind;
import com.vocabpet.backend.service.learningpath.PathModel.ItemKey;
import com.vocabpet.backend.service.learningpath.PathModel.Phase;

import tools.jackson.databind.json.JsonMapper;

/** DailyPlan rows saved before phases existed (blocks by content type) must still read. */
class StoredPlanCompatibilityTest {

    @Test
    void versionOneBlocksMapToPhases() {
        LearningPathService service = new LearningPathService(null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, JsonMapper.builder().build());
        LearningPlan plan = LearningPlan.builder().startDate(LocalDate.of(2026, 11, 2)).build();
        DailyPlan old = DailyPlan.builder().plan(plan).localDate(LocalDate.of(2026, 11, 4)).blocksJson("""
                {"studyDay":true,"blocks":[
                  {"type":"GRAMMAR","items":[{"type":"GRAMMAR","id":"wa"}],"minutes":5.0},
                  {"type":"VOCAB","items":[{"type":"VOCAB","id":"12"}],"minutes":0.67},
                  {"type":"KANJI","items":[],"minutes":0.0},
                  {"type":"REVIEW","items":[{"type":"KANJI","id":"人"}],"minutes":0.33}],
                 "reducedForAccuracy":false,"deferredReviews":2}""").build();

        LearningPathService.StoredPlan p = service.read(old);
        assertThat(p.version()).isEqualTo(1);
        assertThat(p.kind()).isEqualTo(DayKind.LESSON);
        assertThat(p.title()).isEqualTo("Ngày 3");
        assertThat(p.items(Phase.LEARN)).containsExactly(new ItemKey(PathItemType.GRAMMAR, "wa"), new ItemKey(PathItemType.VOCAB, "12"));
        assertThat(p.items(Phase.REVIEW)).containsExactly(new ItemKey(PathItemType.KANJI, "人"));
        assertThat(p.items(Phase.PRACTICE)).isEmpty(); // empty phases count as done, so an old day completes as before
        assertThat(p.items(Phase.TEST)).isEmpty();
        assertThat(p.deferredReviews()).isEqualTo(2);
    }
}
