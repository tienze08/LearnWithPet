package com.vocabpet.backend.service.learningpath;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

import com.vocabpet.backend.config.LearningPathProperties.Engine;
import com.vocabpet.backend.entity.enums.MasteryState;
import com.vocabpet.backend.entity.enums.PathItemType;
import com.vocabpet.backend.service.learningpath.PathModel.*;

import tools.jackson.databind.json.JsonMapper;

/** Learning Engine scenarios, on the real N5 (Minna 1–5) curriculum; vocab lessons become synthetic word ids. */
class PathPlannerTest {

    static final ZoneId BANGKOK = ZoneId.of("Asia/Bangkok");
    static final Engine CFG = new Binder(new MapConfigurationPropertySource()).bindOrCreate("e", Engine.class);
    static final PathPlanner planner = new PathPlanner(CFG);
    static final LeitnerScheduler srs = new LeitnerScheduler(CFG);
    static List<PlanUnit> units;

    /** 2026-11-02 is a Monday; 09:00 in Bangkok. */
    static final LocalDate DAY0 = LocalDate.of(2026, 11, 2);
    static final Instant NOW0 = DAY0.atTime(9, 0).atZone(BANGKOK).toInstant();

    @BeforeAll
    static void loadCurriculum() throws Exception {
        Curriculum c;
        try (InputStream in = PathPlannerTest.class.getResourceAsStream("/curriculum/n5.json")) {
            c = JsonMapper.builder().build().readValue(in, Curriculum.class).validate();
        }
        int[] lessonSizes = {0, 39, 43, 36, 38, 40};
        units = c.unitsOf(c.paths().get(0)).stream().map(u -> {
            List<ItemKey> items = new ArrayList<>();
            u.grammar().forEach(g -> items.add(new ItemKey(PathItemType.GRAMMAR, g)));
            for (int l : u.vocabLessons())
                IntStream.range(0, lessonSizes[l]).forEach(i -> items.add(new ItemKey(PathItemType.VOCAB, "v" + l + "-" + i)));
            u.kanji().forEach(k -> items.add(new ItemKey(PathItemType.KANJI, k)));
            return new PlanUnit(u.id(), u.order(), u.prerequisites(), items);
        }).toList();
    }

    static Profile profile(int minutes, int daysPerWeek, int days) {
        return new Profile(minutes, daysPerWeek, DAY0, DAY0.plusDays(days - 1), BANGKOK);
    }

    static List<ItemKey> ofType(PathItemType t) {
        return units.stream().flatMap(u -> u.items().stream()).filter(k -> k.type() == t).toList();
    }

    static ItemState fresh(ItemKey k) {
        return new ItemState(k, MasteryState.NOT_STARTED, 0, null, 0, 0, null);
    }

    /** Learner answers every new item of the plan correctly at {@code at}. */
    static void learn(Map<ItemKey, ItemState> progress, DayPlan plan, Instant at) {
        for (Block b : plan.blocks())
            for (ItemKey k : b.items())
                progress.put(k, srs.scheduleNextReview(progress.getOrDefault(k, fresh(k)), true, at));
    }

    static int count(DayPlan p, BlockType t) {
        return p.block(t).items().size();
    }

    @Test
    void beginner45MinutesFor60Days() {
        DayPlan plan = planner.generateDailyPlan(profile(45, 7, 60), new HashMap<>(), units, NOW0, null);

        assertThat(plan.totalMinutes()).isLessThanOrEqualTo(45).isPositive();
        // 25 grammar, 196 words, 32 kanji over 60 days: roughly 1 / 4 / 1 a day.
        assertThat(count(plan, BlockType.GRAMMAR)).isEqualTo(1);
        assertThat(count(plan, BlockType.VOCAB)).isBetween(3, 5);
        assertThat(count(plan, BlockType.KANJI)).isEqualTo(1);
        assertThat(plan.block(BlockType.GRAMMAR).items()).containsExactly(new ItemKey(PathItemType.GRAMMAR, "wa"));
        assertThat(count(plan, BlockType.REVIEW)).isZero();
        assertThat(planner.feasibility(profile(45, 7, 60), Map.of(), units, DAY0).feasible()).isTrue();
    }

    @Test
    void placementWithHalfTheGrammarKnownMovesItToReview() {
        List<ItemKey> grammar = ofType(PathItemType.GRAMMAR);
        List<ItemKey> samples = PathPlanner.placementSamples(grammar, CFG.placementGrammar(), Set.of());
        assertThat(samples).hasSize(6);
        // First three right, fourth wrong (the learner stops there).
        List<PlacementAnswer> answers = List.of(
                new PlacementAnswer(samples.get(0), true), new PlacementAnswer(samples.get(1), true),
                new PlacementAnswer(samples.get(2), true), new PlacementAnswer(samples.get(3), false));
        Set<ItemKey> known = PathPlanner.placementKnown(grammar, answers);
        assertThat(known.size()).isBetween(10, 15); // about half of 25
        assertThat(known).doesNotContain(samples.get(3));

        Map<ItemKey, ItemState> progress = new HashMap<>();
        known.forEach(k -> progress.put(k, srs.provisionallyKnown(fresh(k), NOW0)));

        DayPlan tomorrow = planner.generateDailyPlan(profile(30, 7, 30), progress, units, NOW0.plus(Duration.ofDays(1)), null);
        assertThat(tomorrow.block(BlockType.GRAMMAR).items()).doesNotContainAnyElementsOf(known).isNotEmpty();
        assertThat(tomorrow.block(BlockType.REVIEW).items()).containsAll(known);
        assertThat(tomorrow.totalMinutes()).isLessThanOrEqualTo(30);
    }

    @Test
    void placementHintsArePreferredWithinTheirSegment() {
        List<ItemKey> grammar = ofType(PathItemType.GRAMMAR);
        ItemKey hinted = grammar.get(1);
        assertThat(PathPlanner.placementSamples(grammar, 6, Set.of(hinted))).first().isEqualTo(hinted);
    }

    @Test
    void knowsGrammarButWeakKanjiLeansTowardKanji() {
        Map<ItemKey, ItemState> progress = new HashMap<>();
        Instant far = NOW0.plus(Duration.ofDays(20));
        ofType(PathItemType.GRAMMAR).forEach(k -> progress.put(k, new ItemState(k, MasteryState.MEMORIZED, 3, far, 3, 0, NOW0)));

        Profile p = profile(30, 7, 30);
        DayPlan c = planner.generateDailyPlan(p, progress, units, NOW0, null);
        DayPlan beginner = planner.generateDailyPlan(p, new HashMap<>(), units, NOW0, null);

        assertThat(count(c, BlockType.GRAMMAR)).isZero();
        assertThat(c.block(BlockType.KANJI).minutes()).isGreaterThan(c.block(BlockType.GRAMMAR).minutes());
        assertThat(count(c, BlockType.KANJI)).isGreaterThanOrEqualTo(count(beginner, BlockType.KANJI));
        assertThat(c.block(BlockType.KANJI).minutes() + c.block(BlockType.VOCAB).minutes())
                .isGreaterThan(beginner.block(BlockType.KANJI).minutes() + beginner.block(BlockType.VOCAB).minutes() - 1e-9);
    }

    @Test
    void threeMissedDaysDoNotPileUpAndQuotaGrowthIsCapped() {
        Profile p = profile(30, 7, 30);
        Map<ItemKey, ItemState> progress = new HashMap<>();
        DayPlan day0 = planner.generateDailyPlan(p, progress, units, NOW0, null);
        learn(progress, day0, NOW0);

        // Days 1–3 missed; back on day 4.
        Instant day4 = NOW0.plus(Duration.ofDays(4));
        DayPlan back = planner.generateDailyPlan(p, progress, units, day4, null);
        int vocab0 = count(day0, BlockType.VOCAB);
        assertThat(count(back, BlockType.VOCAB)).isLessThanOrEqualTo((int) Math.ceil(vocab0 * CFG.maxQuotaGrowth()));
        assertThat(count(back, BlockType.VOCAB)).isLessThan(vocab0 * 4); // not the 4 days' worth
        assertThat(back.totalMinutes()).isLessThanOrEqualTo(30);
        assertThat(planner.feasibility(p, progress, units, LocalDate.of(2026, 11, 6)).feasible()).isTrue();

        // Missing most of the month makes the deadline unreachable: warn and suggest a later date / more minutes.
        Feasibility late = planner.feasibility(p, progress, units, DAY0.plusDays(25));
        assertThat(late.feasible()).isFalse();
        assertThat(late.suggestedTargetDate()).isAfter(p.targetDate());
        assertThat(late.suggestedMinutesPerDay()).isGreaterThan(30);
    }

    @Test
    void tooManyDueReviewsAreCappedAtHalfTheDayWeakestFirst() {
        Map<ItemKey, ItemState> progress = new HashMap<>();
        List<ItemKey> vocab = ofType(PathItemType.VOCAB);
        Instant due = NOW0.minus(Duration.ofHours(1));
        for (int i = 0; i < 150; i++) {
            ItemKey k = vocab.get(i);
            progress.put(k, new ItemState(k, MasteryState.UNDERSTOOD, 2, due, 5, i == 120 ? 5 : 0, NOW0.minus(Duration.ofDays(3))));
        }
        DayPlan plan = planner.generateDailyPlan(profile(30, 7, 30), progress, units, NOW0, null);

        assertThat(plan.block(BlockType.REVIEW).minutes()).isLessThanOrEqualTo(15.0 + 1e-9);
        assertThat(count(plan, BlockType.REVIEW)).isEqualTo(45); // 15 min / 20 s
        assertThat(plan.block(BlockType.REVIEW).items().get(0)).isEqualTo(vocab.get(120)); // the only weak one
        assertThat(plan.deferredReviews()).isEqualTo(105);
        assertThat(plan.totalMinutes()).isLessThanOrEqualTo(30);
        assertThat(count(plan, BlockType.GRAMMAR) + count(plan, BlockType.KANJI)).isPositive(); // new work still gets time
    }

    @Test
    void dayBoundaryFollowsTheLearnersTimezone() {
        // 17:30 UTC on 18 Nov is 00:30 on 19 Nov in Bangkok.
        Instant now = LocalDate.of(2026, 11, 18).atTime(17, 30).toInstant(ZoneOffset.UTC);
        ItemKey dueTonight = new ItemKey(PathItemType.KANJI, "人");
        ItemKey dueTomorrow = new ItemKey(PathItemType.KANJI, "日");
        Map<ItemKey, ItemState> progress = new HashMap<>(Map.of(
                dueTonight, new ItemState(dueTonight, MasteryState.UNDERSTOOD, 1, Instant.parse("2026-11-19T16:59:00Z"), 1, 0, null),
                dueTomorrow, new ItemState(dueTomorrow, MasteryState.UNDERSTOOD, 1, Instant.parse("2026-11-19T17:01:00Z"), 1, 0, null)));

        DayPlan plan = planner.generateDailyPlan(new Profile(30, 7, DAY0, DAY0.plusDays(60), BANGKOK), progress, units, now, null);
        assertThat(plan.date()).isEqualTo(LocalDate.of(2026, 11, 19));
        assertThat(plan.block(BlockType.REVIEW).items()).containsExactly(dueTonight);
    }

    @Test
    void newItemsRespectCurriculumOrderAndPrerequisites() {
        Profile p = profile(60, 7, 20);
        Map<ItemKey, ItemState> progress = new HashMap<>();
        List<ItemKey> grammarOrder = ofType(PathItemType.GRAMMAR);
        for (int d = 0; d < 10; d++) {
            Instant at = NOW0.plus(Duration.ofDays(d));
            DayPlan plan = planner.generateDailyPlan(p, progress, units, at, null);
            for (ItemKey k : plan.block(BlockType.GRAMMAR).items()) {
                Set<ItemKey> ok = new HashSet<>(progress.keySet());
                ok.addAll(plan.block(BlockType.GRAMMAR).items());
                assertThat(grammarOrder.subList(0, grammarOrder.indexOf(k))).allMatch(ok::contains);
            }
            learn(progress, plan, at);
        }

        // A unit opens only when its prerequisite's items of that type are introduced.
        ItemKey a1 = new ItemKey(PathItemType.GRAMMAR, "a1"), b1 = new ItemKey(PathItemType.GRAMMAR, "b1"), c1 = new ItemKey(PathItemType.GRAMMAR, "c1");
        List<PlanUnit> dag = List.of(
                new PlanUnit("a", 1, List.of(), List.of(a1)),
                new PlanUnit("c", 2, List.of("b"), List.of(c1)),
                new PlanUnit("b", 3, List.of(), List.of(b1)));
        var picks = planner.pickNew(dag, Set.of(), Map.of(PathItemType.GRAMMAR, 3, PathItemType.VOCAB, 0, PathItemType.KANJI, 0));
        assertThat(picks.get(PathItemType.GRAMMAR)).containsExactly(a1, b1);
    }

    @Test
    void lowRecentAccuracyCutsNewItemsByAboutThirtyPercent() {
        Profile p = profile(60, 7, 10);
        DayPlan normal = planner.generateDailyPlan(p, new HashMap<>(), units, NOW0, 0.9);
        DayPlan weak = planner.generateDailyPlan(p, new HashMap<>(), units, NOW0, 0.5);
        assertThat(weak.reducedForAccuracy()).isTrue();
        int n = count(normal, BlockType.VOCAB), w = count(weak, BlockType.VOCAB);
        assertThat(w).isLessThan(n).isGreaterThanOrEqualTo((int) Math.floor(n * 0.6));
    }

    @Test
    void restDaysDoNotBreakTheStreak() {
        // Mon/Wed/Fri schedule. Completed Mon 2, Wed 4, Fri 6; today is Mon 9, not done yet.
        Set<LocalDate> done = Set.of(DAY0, DAY0.plusDays(2), DAY0.plusDays(4));
        assertThat(PathPlanner.streak(DAY0.plusDays(7), done, 3, DAY0)).isEqualTo(3);
        // Missing Wednesday (a study day) resets it, without any penalty beyond that.
        assertThat(PathPlanner.streak(DAY0.plusDays(7), Set.of(DAY0, DAY0.plusDays(4)), 3, DAY0)).isEqualTo(1);
        // A rest day offers only reviews, no new items.
        DayPlan saturday = planner.generateDailyPlan(profile(30, 5, 60), new HashMap<>(), units, NOW0.plus(Duration.ofDays(5)), null);
        assertThat(saturday.studyDay()).isFalse();
        assertThat(saturday.totalMinutes()).isZero();
    }

    @Test
    void leitnerMovesUpAndDropsToStageOneOnAMiss() {
        ItemKey k = new ItemKey(PathItemType.KANJI, "人");
        ItemState s = fresh(k);
        for (int i = 0; i < 5; i++) s = srs.scheduleNextReview(s, true, NOW0);
        assertThat(s.stage()).isEqualTo(5);
        assertThat(s.state()).isEqualTo(MasteryState.MASTERED);
        assertThat(s.nextReviewAt()).isEqualTo(NOW0.plus(Duration.ofDays(30)));
        s = srs.scheduleNextReview(s, false, NOW0);
        assertThat(s.stage()).isEqualTo(1);
        assertThat(s.state()).isEqualTo(MasteryState.UNDERSTOOD);
        assertThat(srs.scheduleNextReview(fresh(k), false, NOW0).state()).isEqualTo(MasteryState.LEARNING);
    }
}
