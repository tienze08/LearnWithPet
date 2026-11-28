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

/** Learning Engine scenarios on the real N5 path (kana + Minna 1–5); vocab lessons become synthetic word ids. */
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
            u.kanaIds().forEach(k -> items.add(new ItemKey(PathItemType.KANA, k)));
            u.grammar().forEach(g -> items.add(new ItemKey(PathItemType.GRAMMAR, g)));
            for (int l : u.vocabLessons())
                IntStream.range(0, lessonSizes[l]).forEach(i -> items.add(new ItemKey(PathItemType.VOCAB, "v" + l + "-" + i)));
            u.kanji().forEach(k -> items.add(new ItemKey(PathItemType.KANJI, k)));
            return new PlanUnit(u.id(), u.order(), u.topic(), u.prerequisites(), items, u.reviewOf(), u.isTest());
        }).toList();
    }

    static Profile profile(int minutes, int daysPerWeek, int days) {
        return new Profile(minutes, daysPerWeek, DAY0, DAY0.plusDays(days - 1), BANGKOK);
    }

    static PlanUnit unit(String id) {
        return units.stream().filter(u -> u.id().equals(id)).findFirst().orElseThrow();
    }

    static List<ItemKey> ofType(PathItemType t) {
        return units.stream().flatMap(u -> u.items().stream()).filter(k -> k.type() == t).toList();
    }

    static ItemState fresh(ItemKey k) {
        return new ItemState(k, MasteryState.NOT_STARTED, 0, null, 0, 0, null, false);
    }

    static ItemState known(ItemKey k, Instant next) {
        return new ItemState(k, MasteryState.MEMORIZED, 3, next, 3, 0, NOW0, false);
    }

    /** Everything in these units learned, next review far away. */
    static Map<ItemKey, ItemState> learnedUnits(String... ids) {
        Map<ItemKey, ItemState> m = new HashMap<>();
        Instant far = NOW0.plus(Duration.ofDays(30));
        for (String id : ids) unit(id).items().forEach(k -> m.put(k, known(k, far)));
        return m;
    }

    static DayPlan plan(Profile p, Map<ItemKey, ItemState> progress, Instant at, CycleState cycle) {
        return planner.generateDailyPlan(p, progress, units, at, null, cycle, 1);
    }

    static CycleState reviewed(String... reviewUnits) {
        return new CycleState(0, Set.of(), false, Set.of(), Set.of(), Set.of(reviewUnits));
    }

    @Test
    void beginnerStartsWithHiraganaInFourPhasesWithinTheBudget() {
        for (int minutes : List.of(15, 45)) {
            DayPlan d = plan(profile(minutes, 5, 60), new HashMap<>(), NOW0, CycleState.fresh());
            assertThat(d.kind()).isEqualTo(DayKind.LESSON);
            assertThat(d.unitIds().get(0)).isEqualTo("n5-h01");
            assertThat(d.title()).startsWith("Ngày 1 – Hiragana: năm nguyên âm");
            assertThat(d.phases()).extracting(PhasePlan::phase).containsExactly(Phase.REVIEW, Phase.LEARN, Phase.PRACTICE, Phase.TEST);
            List<ItemKey> learn = d.phase(Phase.LEARN).items();
            assertThat(learn).isNotEmpty().allMatch(k -> k.type() == PathItemType.KANA);
            assertThat(d.phase(Phase.PRACTICE).items()).containsAll(learn);
            assertThat(d.phase(Phase.TEST).items()).hasSizeLessThanOrEqualTo(CFG.testQuestions()).isSubsetOf(learn);
            assertThat(d.totalMinutes()).as("%d min", minutes).isLessThanOrEqualTo(minutes);
        }
    }

    static final String[] KANA_LEARN = {"n5-h01", "n5-h02", "n5-h03", "n5-h04", "n5-h05", "n5-h07", "n5-h08",
            "n5-k01", "n5-k02", "n5-k03", "n5-k04", "n5-k05", "n5-k07", "n5-k08"};

    @Test
    void firstMinnaLessonWaitsForTheKanaGate() {
        Map<ItemKey, ItemState> basic = learnedUnits("n5-h01", "n5-h02", "n5-h03", "n5-h04", "n5-h05");
        DayPlan review = plan(profile(30, 5, 60), basic, NOW0, CycleState.fresh());
        assertThat(review.kind()).isEqualTo(DayKind.UNIT_REVIEW);
        assertThat(review.title()).isEqualTo("Ngày 1 – Ôn Hiragana cơ bản");
        assertThat(review.phase(Phase.LEARN).items()).isNotEmpty().allMatch(k -> k.type() == PathItemType.KANA);

        // After the review lesson the dakuten unit comes; Minna lesson 1 is far away.
        DayPlan next = plan(profile(30, 5, 60), basic, NOW0, reviewed("n5-h06"));
        assertThat(next.unitIds().get(0)).isEqualTo("n5-h07");

        // Every kana learned and every review lesson done, but the Kana gate test not passed: it is the next day, not Minna.
        Map<ItemKey, ItemState> all = learnedUnits(KANA_LEARN);
        CycleState noGate = reviewed("n5-h06", "n5-h09", "n5-k06", "n5-k09", "n5-m01", "n5-m02", "n5-m03", "n5-m04");
        DayPlan gate = plan(profile(30, 5, 60), all, NOW0, noGate);
        assertThat(gate.unitIds()).containsExactly("n5-m05");
        assertThat(gate.phase(Phase.TEST).items()).hasSize(CFG.chapterTestQuestions());
        assertThat(gate.phase(Phase.LEARN).items()).allMatch(k -> k.type() == PathItemType.KANA);

        // Passing it (the service reports it as a completed review unit) opens Minna lesson 1.
        CycleState passed = reviewed("n5-h06", "n5-h09", "n5-k06", "n5-k09", "n5-m01", "n5-m02", "n5-m03", "n5-m04", "n5-m05");
        DayPlan minna = plan(profile(30, 5, 60), all, NOW0, passed);
        assertThat(minna.unitIds().get(0)).isEqualTo("n5-u01");
        assertThat(minna.phase(Phase.LEARN).items()).anyMatch(k -> k.type() != PathItemType.KANA);
    }

    @Test
    void katakanaWaitsForTheHiraganaTest() {
        Map<ItemKey, ItemState> hira = learnedUnits("n5-h01", "n5-h02", "n5-h03", "n5-h04", "n5-h05", "n5-h07", "n5-h08");
        DayPlan test = plan(profile(30, 5, 60), hira, NOW0, reviewed("n5-h06"));
        assertThat(test.unitIds()).containsExactly("n5-h09");
        DayPlan katakana = plan(profile(30, 5, 60), hira, NOW0, reviewed("n5-h06", "n5-h09"));
        assertThat(katakana.unitIds().get(0)).isEqualTo("n5-k01");
    }

    @Test
    void aKanaDayHasOneMainUnitAndAtMostTheKanaCap() {
        Map<ItemKey, ItemState> before = learnedUnits("n5-h01", "n5-h02", "n5-h03", "n5-h04", "n5-h05", "n5-h07");
        DayPlan d = plan(profile(120, 7, 60), before, NOW0, reviewed("n5-h06"));
        assertThat(d.unitIds()).containsExactly("n5-h08"); // 33 yoon kana: more than the cap, so it continues tomorrow
        assertThat(d.phase(Phase.LEARN).items()).hasSize(CFG.maxNewKanaPerDay());
        assertThat(d.title()).doesNotContain("kèm");
    }

    @Test
    void weeklyCycleIsDaysPerWeekStudyDaysWithAtLeastTwoLessons() {
        assertThat(planner.lessonsPerCycle(1)).isEqualTo(2);
        assertThat(planner.lessonsPerCycle(2)).isEqualTo(2);
        assertThat(planner.lessonsPerCycle(3)).isEqualTo(2);
        assertThat(planner.lessonsPerCycle(5)).isEqualTo(4);
        assertThat(planner.lessonsPerCycle(7)).isEqualTo(6);
    }

    @Test
    void placementThatKnowsAllKanaSkipsTheKanaUnits() {
        Map<ItemKey, ItemState> progress = new HashMap<>();
        Set<ItemKey> kana = new HashSet<>(ofType(PathItemType.KANA));
        kana.forEach(k -> progress.put(k, srs.provisionallyKnown(fresh(k), NOW0)));
        Set<String> covered = PathPlanner.reviewUnitsCovered(units, kana);
        assertThat(covered).containsExactlyInAnyOrder("n5-h06", "n5-h09", "n5-k06", "n5-k09",
                "n5-m01", "n5-m02", "n5-m03", "n5-m04", "n5-m05");

        DayPlan d = plan(profile(30, 5, 60), progress, NOW0, new CycleState(0, Set.of(), false, Set.of(), Set.of(), covered));
        assertThat(d.unitIds()).first().isEqualTo("n5-u01");
        assertThat(d.phase(Phase.LEARN).items()).noneMatch(k -> k.type() == PathItemType.KANA);
    }

    @Test
    void placementWithHalfTheGrammarKnownMovesItToReview() {
        List<ItemKey> grammar = ofType(PathItemType.GRAMMAR);
        List<ItemKey> samples = PathPlanner.placementSamples(grammar, CFG.placementGrammar(), Set.of());
        List<PlacementAnswer> answers = List.of(
                new PlacementAnswer(samples.get(0), true), new PlacementAnswer(samples.get(1), true),
                new PlacementAnswer(samples.get(2), true), new PlacementAnswer(samples.get(3), false));
        Set<ItemKey> knownGrammar = PathPlanner.placementKnown(grammar, answers);
        assertThat(knownGrammar.size()).isBetween(10, 45); // grammar of lessons 1–21 now

        Map<ItemKey, ItemState> progress = learnedUnits("n5-h01", "n5-h02", "n5-h03", "n5-h04", "n5-h05", "n5-h07");
        knownGrammar.forEach(k -> progress.put(k, srs.provisionallyKnown(fresh(k), NOW0)));
        DayPlan tomorrow = plan(profile(45, 7, 60), progress, NOW0.plus(Duration.ofDays(1)), reviewed("n5-h06"));
        assertThat(tomorrow.phase(Phase.LEARN).items()).doesNotContainAnyElementsOf(knownGrammar);
        assertThat(tomorrow.phase(Phase.REVIEW).items()).containsAll(knownGrammar);
    }

    @Test
    void weakestSkillGetsALargerShareOfNewItems() {
        Map<ItemKey, ItemState> progress = new HashMap<>();
        Instant far = NOW0.plus(Duration.ofDays(20));
        ofType(PathItemType.GRAMMAR).stream().limit(10).forEach(k -> progress.put(k, known(k, far)));
        ofType(PathItemType.KANJI).stream().limit(8).forEach(k -> progress.put(k, new ItemState(k, MasteryState.LEARNING, 1, far, 1, 3, NOW0, true)));
        assertThat(planner.weakestSkill(PathPlanner.skillScores(progress, units))).isEqualTo(Skill.KANJI);
        assertThat(planner.skillSuggestion(PathPlanner.skillScores(progress, units))).startsWith("Kanji đang yếu nhất");

        PlanUnit u04 = unit("n5-u04");
        List<ItemKey> plain = planner.pickFromUnits(units, u04, Set.of(), Set.of(), 20, null, new ArrayList<>());
        List<ItemKey> boosted = planner.pickFromUnits(units, u04, Set.of(), Set.of(), 20, Skill.KANJI, new ArrayList<>());
        long k1 = plain.stream().filter(k -> k.type() == PathItemType.KANJI).count();
        long k2 = boosted.stream().filter(k -> k.type() == PathItemType.KANJI).count();
        assertThat(k2).isGreaterThanOrEqualTo(k1);
        assertThat(boosted).allMatch(u04.items()::contains); // never leaves the unit order / prerequisites
    }

    @Test
    void missedDaysDoNotPileUpAndInfeasibleDeadlinesAreReported() {
        Profile p = profile(30, 7, 30);
        double normal = planner.newQuota(p, units, Set.of(), DAY0, false);
        double after = planner.newQuota(p, units, Set.of(), DAY0.plusDays(4), false);
        assertThat(after).isLessThanOrEqualTo(normal * CFG.maxQuotaGrowth() + 1e-9);

        // Feasibility runs the roadmap projection, so it agrees with the days the learner will actually see.
        Profile roomy = profile(30, 7, 90);
        Feasibility ok = planner.feasibility(roomy, Map.of(), units, DAY0);
        assertThat(ok.feasible()).isTrue();
        assertThat(ok.estimatedFinish()).isBeforeOrEqualTo(roomy.targetDate());

        // Too few minutes a day: more minutes fix it (the suggestion is checked by re-running the projection).
        Profile tight = profile(15, 7, 90);
        Feasibility late = planner.feasibility(tight, Map.of(), units, DAY0);
        assertThat(late.feasible()).isFalse();
        assertThat(late.suggestedTargetDate()).isAfter(tight.targetDate());
        assertThat(late.suggestedMinutesPerDay()).isBetween(20, 60);
        assertThat(planner.feasibility(new Profile(late.suggestedMinutesPerDay(), 7, DAY0, tight.targetDate(), BANGKOK), Map.of(), units, DAY0).feasible()).isTrue();

        // 10 days for everything: no daily time fits (0), only a later date does.
        Feasibility hopeless = planner.feasibility(roomy, Map.of(), units, DAY0.plusDays(80));
        assertThat(hopeless.feasible()).isFalse();
        assertThat(hopeless.suggestedMinutesPerDay()).isZero();
    }

    @Test
    void tooManyDueReviewsAreCappedAtHalfTheDayWeakFirst() {
        Map<ItemKey, ItemState> progress = new HashMap<>();
        List<ItemKey> kana = ofType(PathItemType.KANA);
        Instant due = NOW0.minus(Duration.ofHours(1));
        for (int i = 0; i < 150; i++) {
            ItemKey k = kana.get(i);
            progress.put(k, new ItemState(k, MasteryState.UNDERSTOOD, 2, due, 5, 0, NOW0.minus(Duration.ofDays(3)), i == 120));
        }
        DayPlan d = plan(profile(30, 7, 60), progress, NOW0, CycleState.fresh());
        assertThat(d.phase(Phase.REVIEW).minutes()).isLessThanOrEqualTo(15.0 + 1e-9);
        assertThat(d.phase(Phase.REVIEW).items()).hasSize(45).first().isEqualTo(kana.get(120));
        assertThat(d.deferredReviews()).isEqualTo(105);
    }

    @Test
    void dayBoundaryFollowsTheLearnersTimezone() {
        Instant now = LocalDate.of(2026, 11, 18).atTime(17, 30).toInstant(ZoneOffset.UTC); // 00:30 on 19 Nov in Bangkok
        ItemKey tonight = new ItemKey(PathItemType.KANA, "hiragana:あ");
        ItemKey tomorrow = new ItemKey(PathItemType.KANA, "hiragana:い");
        Map<ItemKey, ItemState> progress = new HashMap<>(Map.of(
                tonight, new ItemState(tonight, MasteryState.UNDERSTOOD, 1, Instant.parse("2026-11-19T16:59:00Z"), 1, 0, null, false),
                tomorrow, new ItemState(tomorrow, MasteryState.UNDERSTOOD, 1, Instant.parse("2026-11-19T17:01:00Z"), 1, 0, null, false)));
        DayPlan d = planner.generateDailyPlan(new Profile(30, 7, DAY0, DAY0.plusDays(60), BANGKOK), progress, units, now, null, CycleState.fresh(), 3);
        assertThat(d.date()).isEqualTo(LocalDate.of(2026, 11, 19));
        assertThat(d.phase(Phase.REVIEW).items()).containsExactly(tonight);
    }

    @Test
    void lastStudyDayOfTheCycleIsTheWeeklyTest() {
        Set<ItemKey> cycleItems = new HashSet<>(unit("n5-h01").items());
        cycleItems.addAll(unit("n5-h02").items());
        Map<ItemKey, ItemState> progress = learnedUnits("n5-h01", "n5-h02");
        CycleState cycle = new CycleState(4, cycleItems, false, Set.of(), Set.of(), Set.of()); // 5 days/week: 4 lessons, then the test
        DayPlan d = planner.generateDailyPlan(profile(30, 5, 60), progress, units, NOW0, null, cycle, 5);
        assertThat(d.kind()).isEqualTo(DayKind.WEEKLY_TEST);
        assertThat(d.title()).isEqualTo("Ngày 5 – Kiểm tra tuần");
        assertThat(d.phase(Phase.LEARN).items()).isSubsetOf(cycleItems).hasSizeLessThanOrEqualTo(CFG.consolidateMax());
        assertThat(d.phase(Phase.TEST).items()).isSubsetOf(cycleItems).hasSize(CFG.weeklyTestQuestions());
        // The test mixes both units.
        assertThat(d.phase(Phase.TEST).items()).anyMatch(unit("n5-h01").items()::contains).anyMatch(unit("n5-h02").items()::contains);

        DayPlan notYet = planner.generateDailyPlan(profile(30, 5, 60), progress, units, NOW0, null,
                new CycleState(3, cycleItems, false, Set.of(), Set.of(), Set.of()), 4);
        assertThat(notYet.kind()).isEqualTo(DayKind.LESSON);
    }

    @Test
    void weeklyTestScoresMapToTheConfiguredActions() {
        List<ItemKey> kanjiWrong = List.of(new ItemKey(PathItemType.KANJI, "人"), new ItemKey(PathItemType.KANJI, "日"));
        assertThat(planner.evaluateWeekly(0.95, List.of()).action()).isEqualTo("NORMAL");
        assertThat(planner.evaluateWeekly(0.85, kanjiWrong).action()).isEqualTo("REVIEW_EARLY");
        WeeklyAdjustment reduce = planner.evaluateWeekly(0.7, kanjiWrong);
        assertThat(reduce.action()).isEqualTo("REDUCE_NEW");
        assertThat(reduce.message()).isEqualTo("Tuần sau mình bớt bài mới để bạn củng cố Kanji nhé.");
        assertThat(planner.evaluateWeekly(0.5, kanjiWrong).action()).isEqualTo("RELEARN");
        assertThat(planner.dailyPassed(0.8)).isTrue();
        assertThat(planner.dailyPassed(0.79)).isFalse();
    }

    @Test
    void reducedCycleLearnsFewerNewItemsAndRelearnComesFirst() {
        Profile p = profile(60, 5, 200);
        Map<ItemKey, ItemState> progress = learnedUnits("n5-h01", "n5-h02", "n5-h03", "n5-h04", "n5-h05", "n5-h07");
        CycleState normal = reviewed("n5-h06");
        CycleState reduced = new CycleState(0, Set.of(), true, Set.of(), Set.of(), Set.of("n5-h06"));
        // no kana cap here, so the reduction is what limits the day
        PathPlanner uncapped = new PathPlanner(new Binder(new MapConfigurationPropertySource(Map.of("e.max-new-kana-per-day", "100"))).bindOrCreate("e", Engine.class));
        int n = uncapped.generateDailyPlan(p, progress, units, NOW0, null, normal, 1).phase(Phase.LEARN).items().size();
        int r = uncapped.generateDailyPlan(p, progress, units, NOW0, null, reduced, 1).phase(Phase.LEARN).items().size();
        assertThat(r).isLessThan(n);

        ItemKey weakKa = new ItemKey(PathItemType.KANA, "hiragana:か");
        progress.put(weakKa, progress.get(weakKa).withWeak(true));
        CycleState relearn = new CycleState(0, Set.of(), false, Set.of(weakKa), Set.of(), Set.of("n5-h06"));
        DayPlan d = plan(p, progress, NOW0, relearn);
        assertThat(d.phase(Phase.LEARN).items()).first().isEqualTo(weakKa);
        assertThat(d.phase(Phase.PRACTICE).items()).contains(weakKa);
    }

    @Test
    void forecastWalksUnitsAndPlacesAWeeklyTestEveryCycle() {
        Profile p = profile(30, 5, 90);
        DayPlan today = plan(p, new HashMap<>(), NOW0, CycleState.fresh());
        List<ForecastDay> days = planner.forecast(p, new HashMap<>(), units, today, CycleState.fresh(), 40);
        assertThat(days).isNotEmpty();
        assertThat(days.get(3).kind()).isEqualTo(DayKind.WEEKLY_TEST); // today + 3 lessons, then the test
        assertThat(days).filteredOn(d -> d.kind() == DayKind.UNIT_REVIEW).first()
                .extracting(ForecastDay::title).asString().endsWith("Ôn Hiragana cơ bản");
        assertThat(days).allMatch(d -> PathPlanner.isStudyDay(d.date(), 5));
        assertThat(days).filteredOn(d -> d.kind() == DayKind.LESSON).allMatch(d -> !d.unitIds().isEmpty());
    }

    @Test
    void restDaysOnlyOfferReviewAndNeverBreakTheStreak() {
        Set<LocalDate> done = Set.of(DAY0, DAY0.plusDays(2), DAY0.plusDays(4)); // Mon/Wed/Fri schedule
        assertThat(PathPlanner.streak(DAY0.plusDays(7), done, 3, DAY0)).isEqualTo(3);
        assertThat(PathPlanner.streak(DAY0.plusDays(7), Set.of(DAY0, DAY0.plusDays(4)), 3, DAY0)).isEqualTo(1);
        DayPlan saturday = plan(profile(30, 5, 60), new HashMap<>(), NOW0.plus(Duration.ofDays(5)), CycleState.fresh());
        assertThat(saturday.kind()).isEqualTo(DayKind.REST);
        assertThat(saturday.phase(Phase.LEARN).items()).isEmpty();
    }

    @Test
    void weakFlagFollowsTestsAndStreaksAndLabelsAreSeparateFromMastery() {
        MasteryRules rules = new MasteryRules(CFG);
        assertThat(rules.nextWeak(false, -1, false, true)).isTrue();             // a miss in a test
        assertThat(rules.nextWeak(false, -1, false, false)).isFalse();           // one miss while reviewing
        assertThat(rules.nextWeak(false, MasteryRules.nextStreak(-1, false), false, false)).isTrue(); // two in a row
        assertThat(rules.nextWeak(true, MasteryRules.nextStreak(1, true), true, false)).isFalse();    // two right in a row
        assertThat(MasteryRules.label(MasteryState.MEMORIZED, true)).isEqualTo("Yếu");
        assertThat(MasteryRules.label(MasteryState.MEMORIZED, false)).isEqualTo("Đang ôn");
        assertThat(MasteryRules.label(MasteryState.NOT_STARTED, false)).isEqualTo("Mới");
        assertThat(rules.forKana(0, 0, 0, false, 0)).isEqualTo(MasteryState.NOT_STARTED);
        assertThat(rules.forKana(3, 0, 1, false, 3)).isEqualTo(MasteryState.UNDERSTOOD);
    }

    @Test
    void leitnerMovesUpAndDropsToStageOneOnAMiss() {
        ItemKey k = new ItemKey(PathItemType.KANJI, "人");
        ItemState s = fresh(k);
        for (int i = 0; i < 5; i++) s = srs.scheduleNextReview(s, true, NOW0);
        assertThat(s.stage()).isEqualTo(5);
        assertThat(s.state()).isEqualTo(MasteryState.MASTERED);
        s = srs.scheduleNextReview(s, false, NOW0);
        assertThat(s.stage()).isEqualTo(1);
        assertThat(s.state()).isEqualTo(MasteryState.UNDERSTOOD);
    }

    @Test
    void aLessonWithSeveralPrerequisitesOpensOnlyWhenAllAreCompleted() {
        ItemKey a = new ItemKey(PathItemType.GRAMMAR, "a"), b = new ItemKey(PathItemType.GRAMMAR, "b"), c = new ItemKey(PathItemType.GRAMMAR, "c");
        List<PlanUnit> u = List.of(
                new PlanUnit("A", 1, "A", List.of(), List.of(a), List.of()),
                new PlanUnit("B", 2, "B", List.of(), List.of(b), List.of()),
                new PlanUnit("C", 3, "C", List.of("A", "B"), List.of(c), List.of()));
        List<UnitAccess> only = PathPlanner.unitAccess(u, Set.of(a), Set.of(), Set.of());
        assertThat(only.get(0).status()).isEqualTo(UnitStatus.COMPLETED);
        assertThat(only.get(1).status()).isEqualTo(UnitStatus.AVAILABLE); // independent of A: open from the start
        assertThat(only.get(2).status()).isEqualTo(UnitStatus.LOCKED);
        assertThat(only.get(2).missing()).containsExactly("B");
        assertThat(PathPlanner.unitAccess(u, Set.of(a, b), Set.of(), Set.of()).get(2).status()).isEqualTo(UnitStatus.AVAILABLE);
    }
}
