package com.vocabpet.backend.service.learningpath;

import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.vocabpet.backend.config.LearningPathProperties;
import com.vocabpet.backend.entity.DailyPlan;
import com.vocabpet.backend.entity.ItemProgress;
import com.vocabpet.backend.entity.KanaItemProgress;
import com.vocabpet.backend.entity.LearningPlan;
import com.vocabpet.backend.entity.LearningSession;
import com.vocabpet.backend.entity.PathProfile;
import com.vocabpet.backend.entity.PathTest;
import com.vocabpet.backend.entity.QuestionReport;
import com.vocabpet.backend.entity.TangoLessonVocabulary;
import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.TangoVocabularyMeaning;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.LearningSource;
import com.vocabpet.backend.entity.enums.MasteryState;
import com.vocabpet.backend.entity.enums.PathGoal;
import com.vocabpet.backend.entity.enums.PathItemType;
import com.vocabpet.backend.entity.enums.PathPace;
import com.vocabpet.backend.entity.enums.PathPlanStatus;
import com.vocabpet.backend.entity.enums.PathSessionKind;
import com.vocabpet.backend.entity.enums.PathStartingLevel;
import com.vocabpet.backend.entity.enums.Rating;
import com.vocabpet.backend.repository.DailyPlanRepository;
import com.vocabpet.backend.repository.ItemProgressRepository;
import com.vocabpet.backend.repository.KanaItemProgressRepository;
import com.vocabpet.backend.repository.LearningPlanRepository;
import com.vocabpet.backend.repository.LearningSessionRepository;
import com.vocabpet.backend.repository.PathProfileRepository;
import com.vocabpet.backend.repository.PathTestRepository;
import com.vocabpet.backend.repository.QuestionReportRepository;
import com.vocabpet.backend.repository.TangoLessonVocabularyRepository;
import com.vocabpet.backend.repository.TangoVocabularyRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;
import com.vocabpet.backend.service.CurrentUserService;
import com.vocabpet.backend.service.KanaProgressServiceImpl;
import com.vocabpet.backend.service.LearningEngineService;
import com.vocabpet.backend.service.LearningReviewService;
import com.vocabpet.backend.service.learningpath.PathModel.*;

import lombok.RequiredArgsConstructor;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Learning Path glue: loads profile, curriculum and progress, runs the pure engine (PathPlanner), stores DailyPlan
 * and test results. Progress of each item type stays in its own table and is read through one adapter
 * ({@link #progress}): ItemProgress (grammar, kanji), UserVocabularyProgress (vocab, shared with the Review Center)
 * and KanaItemProgress (kana, shared with the Kana page).
 *
 * <p>Two things are kept apart: <b>learning progress</b> (did the learner finish today's phases? derived from the
 * session log and test results) and <b>mastery</b> (how well an item is known: MasteryState plus the weak flag).
 */
@Service
@RequiredArgsConstructor
public class LearningPathService {

    /** Phase 1 has one path. */
    public static final String PATH_ID = "n5-minna-1-5";

    private final CurrentUserService currentUserService;
    private final LearningPathAccess access;
    private final CurriculumCatalog catalog;
    private final LearningPathProperties properties;
    private final PathPlanner planner;
    private final SrsScheduler srs;
    private final MasteryRules mastery;
    private final PathProfileRepository profileRepository;
    private final LearningPlanRepository planRepository;
    private final DailyPlanRepository dailyPlanRepository;
    private final ItemProgressRepository itemProgressRepository;
    private final KanaItemProgressRepository kanaProgressRepository;
    private final LearningSessionRepository sessionRepository;
    private final PathTestRepository testRepository;
    private final QuestionReportRepository reportRepository;
    private final UserVocabularyProgressRepository vocabularyProgressRepository;
    private final TangoLessonVocabularyRepository lessonVocabularyRepository;
    private final TangoVocabularyRepository tangoVocabularyRepository;
    private final LearningReviewService reviewService;
    private final LearningEngineService learningEngine;
    private final ObjectMapper objectMapper;

    // ---------- DTOs ----------

    public record PathInfo(String id, String title, String scope) {}

    public record StatusResponse(boolean enabled, boolean onboarded, PathInfo path) {}

    public record ProfileRequest(PathStartingLevel currentLevel, PathGoal goal, Integer minutesPerDay,
                                 Integer daysPerWeek, LocalDate targetDate, String timezone) {}

    public record ProfileResponse(PathStartingLevel currentLevel, PathGoal goal, int minutesPerDay, int daysPerWeek,
                                  JlptLevel targetLevel, LocalDate targetDate, String timezone, LocalDate startDate, PathPace pace) {}

    public record PaceRequest(PathPace pace) {}

    /**
     * A lesson the learner can take now: its items and the day it was planned for (null when beyond the forecast).
     * kind: LEARN, REVIEW or TEST (review lessons and chapter tests are taken through /units/{id}/check).
     * inToday: the lesson is (part of) today's plan; status: its unlock state (AVAILABLE or IN_PROGRESS).
     */
    public record NextLesson(String title, List<String> unitIds, List<TodayItem> items, LocalDate scheduledFor,
                             String kind, boolean inToday, UnitStatus status) {}

    /**
     * reason (when lessons is empty): PATH_DONE, or BLOCKED (a locked chain; cannot happen with a valid curriculum).
     * Pace only decides how many lessons are suggested: aheadCap is the pace's soft daily amount, never a lock.
     */
    public record NextUpResponse(PathPace pace, List<NextLesson> lessons, String reason, int aheadUnitsToday, int aheadCap) {}

    public record PrerequisiteView(String id, String title) {}

    /**
     * One lesson's state for the Today dashboard and the roadmap. status comes from prerequisites only; scheduledFor is
     * the suggested day (the original planned day once learned) and never gates access. masteryPercent is knowledge,
     * separate from completion. lockedReason: a sentence for LOCKED lessons.
     */
    public record UnitStateView(String id, String title, String kind, String chapterId, String chapterTitle, UnitStatus status,
                                String lockedReason, List<PrerequisiteView> missing, int itemsTotal, int itemsLearned,
                                int masteryPercent, LocalDate scheduledFor, boolean inToday, boolean learnedAhead,
                                LocalDate learnedOn, int estimatedMinutes) {}

    /** nextUnitId: the first AVAILABLE or IN_PROGRESS lesson in path order (null when the path is done). */
    public record UnitsResponse(List<UnitStateView> units, String nextUnitId) {}

    /**
     * A lesson opened on its own. mode: LEARN (items left to learn), REVISIT (a completed lesson, every item, for
     * practice), CHECK (review lesson or chapter test questions), LOCKED (no items; see unit.lockedReason).
     */
    public record UnitLesson(UnitStateView unit, String mode, List<TodayItem> items) {}

    /** A unit learned before its planned day. */
    public record AheadView(String unitId, String title, LocalDate scheduledFor, LocalDate learnedOn) {}

    public record VocabItem(String id, String word, String kana, String romaji, String meaning, int lesson) {}

    public record PlacementQuestions(List<String> hiragana, List<String> katakana, List<String> grammar,
                                     List<String> vocab, List<String> kanji) {}

    public record PlacementRequest(List<PlacementAnswerDto> answers) {}

    public record PlacementAnswerDto(PathItemType itemType, String itemId, boolean correct) {}

    /** sections: hiragana, katakana, GRAMMAR, VOCAB, KANJI with what was asked and what now counts as known. */
    public record PlacementResult(int kanaKnown, int grammarKnown, int vocabKnown, int kanjiKnown,
                                  List<PlacementSection> sections) {}

    /** asked/correct: answers given; known: items skipped as known (correct answers plus the items before them); total: items of the section. */
    public record PlacementSection(Skill skill, String label, int asked, int correct, int known, int total) {}

    /** A cycle of the projected path: study days ending with a weekly test (the last one may end without). */
    public record PreviewStage(int index, LocalDate from, LocalDate to, int lessonDays, int reviewDays,
                               LocalDate testDate, List<String> topics) {}

    /** Draft plan before saving: same projection as the roadmap, nothing stored. */
    public record PreviewResponse(Feasibility feasibility, LocalDate startDate, int minutesPerDay, int daysPerWeek,
                                  List<CalendarDay> days, List<PreviewStage> stages, List<SkillView> prioritySkills) {}

    /** label: Mới / Đang học / Đang ôn / Thành thạo / Yếu (mastery, not lesson progress). */
    public record TodayItem(PathItemType itemType, String itemId, boolean done, String label, boolean weak) {}

    public record PhaseView(Phase phase, String label, List<TodayItem> items, int minutes, String status,
                            Map<PathItemType, Integer> counts) {}

    public record TestView(String kind, Double attempt1Score, Double attempt2Score, Double finalScore, boolean passed,
                           boolean canRetake, List<ItemKey> wrongItems, String message) {}

    /**
     * One day of the week strip or the roadmap. status: DONE, TODAY, MISSED, UPCOMING, REST, NONE.
     * newItems: new items per type planned for the day (stored plan, or the projection for days ahead).
     */
    public record CalendarDay(LocalDate date, Integer dayNumber, String title, DayKind kind, String status,
                              Map<PathItemType, Integer> newItems, String chapterId, String checkpoint) {

        CalendarDay(LocalDate date, Integer dayNumber, String title, DayKind kind, String status) {
            this(date, dayNumber, title, kind, status, Map.of(), null, null);
        }

        CalendarDay(LocalDate date, Integer dayNumber, String title, DayKind kind, String status, Map<PathItemType, Integer> newItems) {
            this(date, dayNumber, title, kind, status, newItems, null, null);
        }
    }

    public record SkillView(Skill skill, String label, int percent, int introduced, int total) {}

    public record TodayResponse(PathInfo path, LocalDate date, DayKind kind, int dayNumber, int totalDays, String title,
                                int progressPercent, int itemsUnderstood, int itemsTotal, int itemsIntroduced,
                                int itemsMastered, int daysCompleted, int streak,
                                List<PhaseView> phases, Phase nextPhase, int totalMinutes, boolean completed,
                                boolean reducedNew, int deferredReviews, TestView test, String cycleNote,
                                Feasibility feasibility, List<CalendarDay> week, List<SkillView> skills, String suggestion,
                                ProfileResponse profile, Focus focus, List<AheadView> learnedAhead, ActualPace actualPace,
                                Advice advice) {}

    /**
     * Speed measured on the learner's real study (new items over the last two weeks of study days), not on the plan.
     * estimatedFinish: when the path ends at that speed (null with no new item learned). Null as a whole when fewer
     * than three study days are behind the learner. The target date is never changed from here.
     */
    public record ActualPace(double itemsPerStudyDay, int sampleStudyDays, int remainingItems, LocalDate estimatedFinish,
                             boolean behindTarget) {}

    /**
     * What to do before new lessons: kind REVIEW_BACKLOG (more due than one day's review time), LOW_ACCURACY (recent
     * reviews below the low-accuracy mark) or null. Advice only: it never locks a lesson.
     */
    public record Advice(String kind, int dueReviews, Double recentAccuracy) {}

    /** What today is for: its objective, why it matters, what the learner gains, and what comes next. Derived, not stored. */
    public record Focus(String objective, String why, String outcome, String chapterId, String chapterTitle,
                        String nextTitle, LocalDate nextDate, DayKind nextKind) {}

    public record AnswerRequest(PathItemType itemType, String itemId, Boolean correct, boolean review, String questionKind, Phase phase) {}

    public record AnswerResponse(MasteryState masteryState, boolean weak, String label) {}

    public record TestAnswer(PathItemType itemType, String itemId, boolean correct) {}

    public record TestRequest(Integer attempt, List<TestAnswer> answers) {}

    public record RoadmapResponse(PathInfo path, LocalDate today, LocalDate targetDate, List<CalendarDay> days,
                                  String level, int progressPercent, int dayNumber, int totalDays, List<ChapterView> chapters) {}

    /** status: DONE, ACTIVE, OPEN (unlocked, not started) or LOCKED. kind: LEARN, REVIEW or TEST. */
    public record UnitView(String id, String title, String kind, String status, boolean ahead) {}

    /** unlockRequires/unlockMissing: for a locked chapter, what the previous chapter still needs (units not done). */
    public record ChapterView(String id, String title, String goal, String status, int unitsTotal, int unitsDone, int percent,
                              List<UnitView> units, String unlockRequires, int unlockMissing) {}

    /** Path items (kana, grammar, kanji, path words) by review state, from their real schedule. history lists only days with answers. */
    public record ReviewOverview(int due, int overdue, int weak, Map<PathItemType, Integer> dueByType, Instant nextReviewAt,
                                 List<UpcomingBucket> upcoming, List<HistoryDay> history) {}

    public record UpcomingBucket(LocalDate date, int count) {}

    public record HistoryDay(LocalDate date, int answered, int correct) {}

    public record ReviewQueueItem(PathItemType itemType, String itemId) {}

    public record ReportRequest(PathItemType itemType, String itemId, String questionKind, String questionJson, String comment) {}

    /** DailyPlan.blocksJson, version 2. Version 1 rows ({"blocks": [...]}) are mapped on read, see {@link #read}. */
    record StoredPhase(Phase phase, List<ItemKey> items, double minutes) {}

    record StoredPlan(int version, DayKind kind, int dayNumber, String title, List<String> unitIds,
                      List<StoredPhase> phases, boolean reducedNew, int deferredReviews) {

        List<ItemKey> items(Phase p) {
            return phases.stream().filter(x -> x.phase() == p).findFirst().map(StoredPhase::items).orElse(List.of());
        }
    }

    /** One answer in LearningSession.resultsJson. phase is null in rows written before phases existed. */
    /**
     * source: SCHEDULED (in today's plan), AHEAD (new item learned before its day) or OPTIONAL (extra practice of a known
     * item); null on older rows and on reviews/tests. scheduledFor: the day an AHEAD item was planned for.
     */
    /**
     * unitId/score: set on answers of a review lesson or chapter test taken on its own ({@link #checkUnit}); its closing
     * row has questionKind {@value #UNIT_RESULT}, itemType null, itemId = unit id, correct = completed (test: passed).
     */
    record StoredResult(PathItemType itemType, String itemId, String questionKind, boolean correct, boolean review, Instant at, Phase phase,
                        String source, LocalDate scheduledFor, String unitId, Double score) {

        StoredResult(PathItemType itemType, String itemId, String questionKind, boolean correct, boolean review, Instant at, Phase phase) {
            this(itemType, itemId, questionKind, correct, review, at, phase, null, null, null, null);
        }

        StoredResult(PathItemType itemType, String itemId, String questionKind, boolean correct, boolean review, Instant at, Phase phase,
                     String source, LocalDate scheduledFor) {
            this(itemType, itemId, questionKind, correct, review, at, phase, source, scheduledFor, null, null);
        }
    }

    static final String UNIT_RESULT = "unit-result";

    // ---------- status & profile ----------

    @Transactional(readOnly = true)
    public StatusResponse status() {
        User user = currentUserService.getCurrentUser();
        if (!access.isEnabledFor(user)) return new StatusResponse(false, false, null);
        boolean onboarded = profileRepository.findByUserId(user.getId()).isPresent() && activePlan(user).isPresent();
        return new StatusResponse(true, onboarded, pathInfo());
    }

    @Transactional(readOnly = true)
    public Optional<ProfileResponse> profile() {
        User user = user();
        return profileRepository.findByUserId(user.getId()).map(p -> toResponse(p, activePlan(user).orElse(null)));
    }

    /** Create or edit the settings. Editing recomputes today's plan right away; later days always use the new values. */
    @Transactional
    public ProfileResponse saveProfile(ProfileRequest r) {
        User user = user();
        ZoneId zone = validate(r);
        LocalDate today = LocalDate.now(zone);
        PathProfile p = profileRepository.findByUserId(user.getId()).orElseGet(() -> PathProfile.builder().user(user).build());
        int oldMinutes = p.getMinutesPerDay(), oldDays = p.getDaysPerWeek();
        p.setCurrentLevel(r.currentLevel());
        p.setGoal(r.goal());
        p.setMinutesPerDay(r.minutesPerDay());
        p.setDaysPerWeek(r.daysPerWeek());
        p.setTargetLevel(JlptLevel.valueOf(catalog.curriculumOf(PATH_ID).level()));
        p.setTargetDate(r.targetDate());
        p.setTimezone(zone.getId());
        profileRepository.save(p);

        LearningPlan plan = activePlan(user).orElseGet(() -> LearningPlan.builder()
                .user(user).pathId(PATH_ID).level(p.getTargetLevel()).startDate(today).build());
        boolean paceChanged = plan.getId() != null && (!r.targetDate().equals(plan.getTargetDate())
                || oldMinutes != r.minutesPerDay() || oldDays != r.daysPerWeek());
        if (paceChanged) plan.setPaceFrom(today);
        plan.setTargetDate(r.targetDate());
        plan.setConfigSnapshot(json(Map.of("profile", r, "engine", properties.engine())));
        planRepository.save(plan);

        // Recompute today's plan in place (the row may already have a session attached).
        dailyPlanRepository.findByPlanIdAndLocalDate(plan.getId(), today).ifPresent(dp -> {
            if (testRepository.findByDailyPlanId(dp.getId()).isPresent()) return; // a test already started: keep the day
            List<PlanUnit> units = units();
            Map<ItemKey, ItemState> progress = progress(user, units);
            store(dp, planner.generateDailyPlan(engineProfile(p, plan), progress, units, Instant.now(), recentAccuracy(user),
                    cycle(user, plan, units, progress, today), dayNumber(plan, p, today)));
            dailyPlanRepository.save(dp);
        });
        return toResponse(p, plan);
    }

    /** "Is this plan realistic?" for a draft profile, from the learner's current knowledge. Saves nothing. */
    @Transactional(readOnly = true)
    public Feasibility feasibility(ProfileRequest r) {
        User user = user();
        ZoneId zone = validate(r);
        LocalDate today = LocalDate.now(zone);
        Optional<LearningPlan> plan = activePlan(user);
        // Saving this draft resets the pace to today (see saveProfile), so judge it from today.
        Profile draft = new Profile(r.minutesPerDay(), r.daysPerWeek(), today, r.targetDate(), zone);
        List<PlanUnit> units = units();
        Map<ItemKey, ItemState> progress = progress(user, units);
        // Before a plan exists, review lessons the placement test already covered are skipped too.
        CycleState cycle = plan.map(pl -> cycle(user, pl, units, progress, today))
                .orElseGet(() -> new CycleState(0, Set.of(), false, Set.of(), Set.of(), PathPlanner.reviewUnitsCovered(units, placementKnown(user))));
        return planner.feasibility(draft, progress, units, today, cycle);
    }

    /**
     * The path a draft profile would give, before it is saved: today's plan and the same projection the roadmap
     * uses, grouped into cycles that end with a weekly test. Saves nothing.
     */
    @Transactional(readOnly = true)
    public PreviewResponse preview(ProfileRequest r) {
        User user = user();
        ZoneId zone = validate(r);
        LocalDate today = LocalDate.now(zone);
        Optional<LearningPlan> plan = activePlan(user);
        Profile draft = new Profile(r.minutesPerDay(), r.daysPerWeek(), today, r.targetDate(), zone);
        List<PlanUnit> units = units();
        Map<ItemKey, ItemState> progress = progress(user, units);
        CycleState cycle = plan.map(pl -> cycle(user, pl, units, progress, today))
                .orElseGet(() -> new CycleState(0, Set.of(), false, Set.of(), Set.of(), PathPlanner.reviewUnitsCovered(units, placementKnown(user))));
        int dayNumber = plan.map(pl -> Math.max(1, PathPlanner.studyDaysBetween(pl.getStartDate(), today, r.daysPerWeek()))).orElse(1);
        DayPlan first = planner.generateDailyPlan(draft, progress, units, today.atTime(12, 0).atZone(zone).toInstant(),
                recentAccuracy(user), cycle, dayNumber);

        List<CalendarDay> days = new ArrayList<>();
        List<List<String>> dayUnits = new ArrayList<>();
        if (first.kind() != DayKind.REST) {
            days.add(new CalendarDay(today, first.dayNumber(), first.title(), first.kind(), "TODAY", counts(first.phase(Phase.LEARN).items())));
            dayUnits.add(first.unitIds());
        }
        for (ForecastDay f : planner.forecast(draft, progress, units, first, cycle, 200)) {
            days.add(new CalendarDay(f.date(), dayOf(f.title()), f.title(), f.kind(), "UPCOMING", counts(f)));
            dayUnits.add(f.unitIds());
        }

        Map<String, String> topicOf = units.stream().collect(Collectors.toMap(PlanUnit::id, PlanUnit::title, (a, b) -> a));
        List<PreviewStage> stages = new ArrayList<>();
        LocalDate from = null, to = null;
        int lessons = 0, reviews = 0;
        Set<String> topics = new LinkedHashSet<>();
        for (int i = 0; i < days.size(); i++) {
            CalendarDay d = days.get(i);
            if (from == null) from = d.date();
            to = d.date();
            List<String> ids = dayUnits.get(i);
            if (d.kind() == DayKind.WEEKLY_TEST) {
                stages.add(new PreviewStage(stages.size() + 1, from, to, lessons, reviews, d.date(), List.copyOf(topics)));
                from = null;
                lessons = reviews = 0;
                topics.clear();
                continue;
            }
            if (d.kind() == DayKind.UNIT_REVIEW || d.kind() == DayKind.REVIEW_DAY) reviews++;
            else lessons++;
            ids.forEach(id -> topics.add(topicOf.getOrDefault(id, id)));
        }
        if (from != null) stages.add(new PreviewStage(stages.size() + 1, from, to, lessons, reviews, null, List.copyOf(topics)));
        return new PreviewResponse(planner.feasibility(draft, progress, units, today, cycle), today, r.minutesPerDay(),
                r.daysPerWeek(), days, stages, prioritySkills(progress, units));
    }

    /**
     * Up to two skills still to learn. Unfinished kana come first (every lesson after them needs them, so the path
     * starts there); then the least mastered.
     */
    private static List<SkillView> prioritySkills(Map<ItemKey, ItemState> progress, List<PlanUnit> units) {
        return PathPlanner.skillScores(progress, units).stream()
                .filter(s -> s.introduced() < s.total())
                .sorted(Comparator.comparing((SkillScore s) -> s.skill() != Skill.HIRAGANA && s.skill() != Skill.KATAKANA)
                        .thenComparingInt(SkillScore::percent))
                .limit(2)
                .map(s -> new SkillView(s.skill(), PathPlanner.skillLabel(s.skill()), s.percent(), s.introduced(), s.total()))
                .toList();
    }

    /** New items per type, only the types present. */
    private static Map<PathItemType, Integer> counts(List<ItemKey> items) {
        Map<PathItemType, Integer> c = new EnumMap<>(PathItemType.class);
        items.forEach(k -> c.merge(k.type(), 1, Integer::sum));
        return c;
    }

    private static Map<PathItemType, Integer> counts(ForecastDay f) {
        Map<PathItemType, Integer> c = new EnumMap<>(PathItemType.class);
        if (f.kana() > 0) c.put(PathItemType.KANA, f.kana());
        if (f.grammar() > 0) c.put(PathItemType.GRAMMAR, f.grammar());
        if (f.vocab() > 0) c.put(PathItemType.VOCAB, f.vocab());
        if (f.kanji() > 0) c.put(PathItemType.KANJI, f.kanji());
        return c;
    }

    // ---------- content ----------

    /** Every word of the path with its primary Vietnamese meaning, for building questions on the frontend. */
    @Transactional(readOnly = true)
    public List<VocabItem> vocabulary() {
        user();
        Set<Integer> lessons = pathLessons();
        // Meanings load lazily, batched by hibernate.default_batch_fetch_size (application.yaml).
        return lessonVocabulary().stream()
                .filter(lv -> lessons.contains(lv.getLesson().getLessonNumber()))
                .map(lv -> {
                    TangoVocabulary t = lv.getVocabulary();
                    String meaning = t.getMeanings().stream()
                            .sorted(Comparator.comparing((TangoVocabularyMeaning m) -> !m.isPrimaryMeaning())
                                    .thenComparingInt(TangoVocabularyMeaning::getSortOrder))
                            .map(TangoVocabularyMeaning::getMeaning).findFirst().orElse("");
                    return new VocabItem(t.getId().toString(), t.getExpression() != null ? t.getExpression() : t.getKana(),
                            t.getKana(), t.getRomaji(), meaning, lv.getLesson().getLessonNumber());
                })
                .collect(Collectors.toMap(VocabItem::id, v -> v, (a, b) -> a, LinkedHashMap::new))
                .values().stream().toList();
    }

    // ---------- placement ----------

    /** Items to ask, per section, in curriculum order. Grammar marked "learned" in this browser are preferred. */
    @Transactional(readOnly = true)
    public PlacementQuestions placementQuestions(List<String> grammarHints) {
        user();
        List<PlanUnit> units = units();
        Set<ItemKey> hints = new HashSet<>();
        if (grammarHints != null) grammarHints.forEach(h -> hints.add(new ItemKey(PathItemType.GRAMMAR, h)));
        var e = properties.engine();
        List<ItemKey> kana = ordered(units, PathItemType.KANA);
        return new PlacementQuestions(
                ids(PathPlanner.placementSamples(kana.stream().filter(k -> k.id().startsWith("hiragana:")).toList(), e.placementHiragana(), Set.of())),
                ids(PathPlanner.placementSamples(kana.stream().filter(k -> k.id().startsWith("katakana:")).toList(), e.placementKatakana(), Set.of())),
                ids(PathPlanner.placementSamples(ordered(units, PathItemType.GRAMMAR), e.placementGrammar(), hints)),
                ids(PathPlanner.placementSamples(ordered(units, PathItemType.VOCAB), e.placementVocab(), Set.of())),
                ids(PathPlanner.placementSamples(ordered(units, PathItemType.KANJI), e.placementKanji(), Set.of())));
    }

    /**
     * Known items become provisionally understood and are reviewed tomorrow, so the SRS confirms or corrects them.
     * Kana sections are judged per script (hiragana, katakana) so someone who knows hiragana still learns katakana.
     */
    @Transactional
    public PlacementResult submitPlacement(PlacementRequest r) {
        User user = user();
        if (r == null || r.answers() == null) throw bad("Thiếu câu trả lời");
        List<PlanUnit> units = units();
        Map<ItemKey, ItemState> progress = progress(user, units);
        Map<String, String> kanaSections = catalog.curriculumOf(PATH_ID).kanaSections();
        Instant now = Instant.now();
        Map<PathItemType, Integer> known = new EnumMap<>(PathItemType.class);
        List<StoredResult> results = new ArrayList<>();

        Map<Skill, List<ItemKey>> sections = new LinkedHashMap<>();
        List<ItemKey> kana = ordered(units, PathItemType.KANA);
        sections.put(Skill.HIRAGANA, kana.stream().filter(k -> k.id().startsWith("hiragana:")).toList());
        sections.put(Skill.KATAKANA, kana.stream().filter(k -> k.id().startsWith("katakana:")).toList());
        sections.put(Skill.GRAMMAR, ordered(units, PathItemType.GRAMMAR));
        sections.put(Skill.VOCAB, ordered(units, PathItemType.VOCAB));
        sections.put(Skill.KANJI, ordered(units, PathItemType.KANJI));
        List<PlacementSection> sectionResults = new ArrayList<>();

        for (Map.Entry<Skill, List<ItemKey>> section : sections.entrySet()) {
            List<ItemKey> ordered = section.getValue();
            Set<ItemKey> inSection = new HashSet<>(ordered);
            List<PlacementAnswer> answers = r.answers().stream()
                    .filter(a -> a.itemType() != null && a.itemId() != null)
                    .map(a -> new PlacementAnswer(new ItemKey(a.itemType(), a.itemId()), a.correct()))
                    .filter(a -> inSection.contains(a.key()))
                    .toList();
            answers.forEach(a -> results.add(new StoredResult(a.key().type(), a.key().id(), "placement", a.correct(), false, now, null)));
            Set<ItemKey> knownHere = PathPlanner.placementKnown(ordered, answers);
            sectionResults.add(new PlacementSection(section.getKey(), PathPlanner.skillLabel(section.getKey()), answers.size(),
                    (int) answers.stream().filter(PlacementAnswer::correct).count(), knownHere.size(), ordered.size()));
            for (ItemKey k : knownHere) {
                results.add(new StoredResult(k.type(), k.id(), "placement-known", true, false, now, null));
                ItemState current = progress.get(k);
                if (current != null && current.introduced()) continue; // never overwrite real progress
                switch (k.type()) {
                    case VOCAB -> tangoVocabularyRepository.findById(Long.valueOf(k.id())).ifPresent(t -> learningEngine.recordPlacement(user, t));
                    case KANA -> {
                        KanaItemProgress kp = kanaProgress(user, k, kanaSections);
                        kp.setCorrectCount(Math.max(1, kp.getCorrectCount()));
                        kp.setLastSeenAt(LocalDateTime.now());
                        kp.setSrsStage(1);
                        kp.setNextReviewAt(now.plus(Duration.ofDays(properties.engine().leitnerDays().get(0))));
                        kanaProgressRepository.save(kp);
                    }
                    default -> {
                        ItemProgress ip = itemProgress(user, k);
                        apply(ip, srs.provisionallyKnown(toState(ip), now));
                        ip.setProvisional(true);
                        itemProgressRepository.save(ip);
                    }
                }
                known.merge(k.type(), 1, Integer::sum);
            }
        }
        sessionRepository.save(LearningSession.builder().user(user).kind(PathSessionKind.PLACEMENT)
                .startedAt(now).endedAt(now).resultsJson(json(results)).build());
        return new PlacementResult(known.getOrDefault(PathItemType.KANA, 0), known.getOrDefault(PathItemType.GRAMMAR, 0),
                known.getOrDefault(PathItemType.VOCAB, 0), known.getOrDefault(PathItemType.KANJI, 0), sectionResults);
    }

    // ---------- today ----------

    @Transactional
    public TodayResponse today() {
        User user = user();
        PathProfile profile = requireProfile(user);
        LearningPlan plan = activePlan(user).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa thiết lập lộ trình"));
        ZoneId zone = ZoneId.of(profile.getTimezone());
        Instant now = Instant.now();
        LocalDate today = now.atZone(zone).toLocalDate();
        Profile p = engineProfile(profile, plan);
        List<PlanUnit> units = units();
        Map<ItemKey, ItemState> progress = progress(user, units);

        DailyPlan dp = todayPlan(user, profile, plan, units, progress, now);
        StoredPlan sp = read(dp);
        Optional<PathTest> test = testRepository.findByDailyPlanId(dp.getId());
        Map<Phase, Boolean> done = phaseDone(dp, sp, progress, test, today.atStartOfDay(zone).toInstant());
        Map<Phase, Set<ItemKey>> answered = answeredByPhase(dp);
        Instant dayStart = today.atStartOfDay(zone).toInstant();

        List<PhaseView> phases = new ArrayList<>();
        Phase next = null;
        for (StoredPhase ph : sp.phases()) {
            List<TodayItem> items = ph.items().stream().map(k -> {
                ItemState s = progress.get(k);
                boolean itemDone = ph.phase() == Phase.REVIEW ? reviewedToday(s, dayStart) || answered.get(Phase.REVIEW).contains(k)
                        : ph.phase() == Phase.TEST ? done.get(Phase.TEST) : answered.get(ph.phase()).contains(k);
                return new TodayItem(k.type(), k.id(), itemDone,
                        MasteryRules.label(s == null ? MasteryState.NOT_STARTED : s.state(), s != null && s.weak()), s != null && s.weak());
            }).toList();
            long d = items.stream().filter(TodayItem::done).count();
            String status = done.get(ph.phase()) ? "DONE" : d == 0 ? "NOT_STARTED" : "IN_PROGRESS";
            if (next == null && !done.get(ph.phase())) next = ph.phase();
            Map<PathItemType, Integer> counts = new EnumMap<>(PathItemType.class);
            ph.items().forEach(k -> counts.merge(k.type(), 1, Integer::sum));
            phases.add(new PhaseView(ph.phase(), phaseLabel(sp.kind(), ph.phase()), items, (int) Math.round(ph.minutes()), status, counts));
        }
        boolean hasWork = sp.phases().stream().anyMatch(ph -> !ph.items().isEmpty());
        if (hasWork && next == null && dp.getCompletedAt() == null) {
            dp.setCompletedAt(now);
            dailyPlanRepository.save(dp);
        }

        long itemsTotal = units.stream().mapToLong(u -> u.items().size()).sum();
        long understood = units.stream().flatMap(u -> u.items().stream())
                .filter(k -> progress.containsKey(k) && progress.get(k).atLeast(MasteryState.UNDERSTOOD)).count();
        long introduced = units.stream().flatMap(u -> u.items().stream())
                .filter(k -> progress.containsKey(k) && progress.get(k).introduced()).count();
        long mastered = units.stream().flatMap(u -> u.items().stream())
                .filter(k -> progress.containsKey(k) && progress.get(k).atLeast(MasteryState.MASTERED)).count();
        Set<LocalDate> completed = completedDays(plan);
        CycleState cycle = cycle(user, plan, units, progress, today);
        List<SkillScore> scores = PathPlanner.skillScores(progress, units);
        Feasibility feasibility = planner.feasibility(p, progress, units, today, cycle);

        return new TodayResponse(pathInfo(), today, sp.kind(), sp.dayNumber(),
                PathPlanner.studyDaysBetween(plan.getStartDate(), plan.getTargetDate(), p.daysPerWeek()), sp.title(),
                PathPlanner.progressPercent(progress, units), (int) understood, (int) itemsTotal,
                (int) introduced, (int) mastered, completed.size(),
                PathPlanner.streak(today, completed, p.daysPerWeek(), plan.getStartDate()),
                phases, next, dp.getEstimatedMinutes(), dp.getCompletedAt() != null || (hasWork && next == null),
                sp.reducedNew(), sp.deferredReviews(), test.map(this::testView).orElse(null), lastWeeklyMessage(plan),
                feasibility, week(plan, p, today, sp, toDayPlan(sp, today), progress, units, cycle),
                scores.stream().map(s -> new SkillView(s.skill(), PathPlanner.skillLabel(s.skill()), s.percent(), s.introduced(), s.total())).toList(),
                planner.skillSuggestion(scores), toResponse(profile, plan),
                focus(sp, units, p, progress, cycle, today), aheadUnits(user, units, progress, zone, today),
                actualPace(user, plan, p, progress, units, zone, today), advice(user, p, progress, now));
    }

    private Focus focus(StoredPlan sp, List<PlanUnit> units, Profile p, Map<ItemKey, ItemState> progress,
                        CycleState cycle, LocalDate today) {
        Curriculum c = catalog.curriculumOf(PATH_ID);
        Map<String, PlanUnit> byId = units.stream().collect(Collectors.toMap(PlanUnit::id, u -> u, (a, b) -> a));
        PlanUnit main = sp.unitIds().stream().map(byId::get).filter(Objects::nonNull).findFirst().orElse(null);
        Curriculum.Chapter ch = main == null ? null : chapterOf(c, main.id());
        List<Curriculum.Chapter> chapters = c.chapters();
        Curriculum.Chapter after = ch == null ? null : chapters.indexOf(ch) + 1 < chapters.size() ? chapters.get(chapters.indexOf(ch) + 1) : null;
        Map<PathItemType, Integer> learn = counts(sp.items(Phase.LEARN));
        String gain = learn.entrySet().stream().map(e -> e.getValue() + " " + typeNoun(e.getKey())).collect(Collectors.joining(", "));
        int pass = (int) Math.round(properties.engine().chapterPassScore() * 100);
        String objective, why, outcome;
        if (sp.kind() == DayKind.WEEKLY_TEST) {
            objective = "Kiểm tra tuần: xem bạn nhớ được bao nhiêu";
            why = "Bài kiểm tra tuần cho mình biết nội dung nào cần học lại trước khi sang phần mới.";
            outcome = "Biết rõ phần còn yếu để tuần sau được điều chỉnh đúng chỗ.";
        } else if (sp.kind() == DayKind.REST) {
            objective = "Ngày nghỉ";
            why = "Nghỉ đúng lịch giúp bạn học đều hơn.";
            outcome = "Ôn nhẹ nếu muốn, không bắt buộc.";
        } else if (main != null && main.test()) {
            objective = main.title();
            why = "Đây là cửa kiểm tra của chặng " + (ch == null ? "" : ch.title()) + ": cần đạt " + pass + "% để tiếp tục.";
            outcome = "Đạt bài này, " + (after != null ? "chặng " + after.title() + " được mở khóa." : "bạn hoàn thành lộ trình hiện tại.");
        } else if (main != null && main.isReview()) {
            objective = main.title();
            why = "Ôn lại để chữ và mẫu câu đã học không bị quên trước bước tiếp theo.";
            outcome = "Nhớ chắc hơn những nội dung vừa ôn.";
        } else if (main != null) {
            objective = main.title();
            why = ch == null ? "" : "Chặng " + ch.title() + ": " + ch.goal() + ".";
            outcome = gain.isEmpty() ? "Củng cố những phần còn yếu." : "Học xong, bạn nhận biết và nhớ " + gain + " mới.";
        } else {
            objective = "Ôn tập những phần còn yếu";
            why = "Chưa có bài mới phù hợp, nên hôm nay dành cho việc ôn lại.";
            outcome = "Các nội dung yếu được củng cố.";
        }
        List<ForecastDay> ahead = planner.forecast(p, progress, units, toDayPlan(sp, today), cycle, 1);
        ForecastDay n = ahead.isEmpty() ? null : ahead.get(0);
        return new Focus(objective, why, outcome, ch == null ? null : ch.id(), ch == null ? null : ch.title(),
                n == null ? null : n.title(), n == null ? null : n.date(), n == null ? null : n.kind());
    }

    private static String typeNoun(PathItemType t) {
        return switch (t) {
            case KANA -> "chữ kana";
            case GRAMMAR -> "mẫu ngữ pháp";
            case VOCAB -> "từ vựng";
            case KANJI -> "chữ kanji";
        };
    }

    private static Curriculum.Chapter chapterOf(Curriculum c, String unitId) {
        return c.chapters().stream().filter(x -> x.units().contains(unitId)).findFirst().orElse(null);
    }

    private static String checkpoint(DayKind kind, List<String> unitIds, List<PlanUnit> units) {
        if (kind == null || kind == DayKind.REST) return null;
        if (kind == DayKind.WEEKLY_TEST) return "WEEKLY";
        return units.stream().anyMatch(u -> u.test() && unitIds.contains(u.id())) ? "CHAPTER" : "DAILY";
    }

    private static String chapterId(Curriculum c, List<String> unitIds) {
        return unitIds.stream().map(id -> chapterOf(c, id)).filter(Objects::nonNull).map(Curriculum.Chapter::id).findFirst().orElse(null);
    }

    /** One graded answer from a phase of today, the Review Center or a test (tests go through {@link #submitTest}). */
    @Transactional
    public AnswerResponse answer(AnswerRequest r) {
        User user = user();
        if (r == null || r.itemType() == null || r.itemId() == null || r.correct() == null) throw bad("Thiếu dữ liệu câu trả lời");
        PathProfile profile = requireProfile(user);
        LearningPlan plan = activePlan(user).orElseThrow(() -> bad("Chưa thiết lập lộ trình"));
        List<PlanUnit> units = units();
        ItemKey key = new ItemKey(r.itemType(), r.itemId());
        if (units.stream().noneMatch(u -> u.items().contains(key))) throw bad("Nội dung không thuộc lộ trình");
        Instant now = Instant.now();
        ZoneId zone = ZoneId.of(profile.getTimezone());
        LocalDate today = now.atZone(zone).toLocalDate();
        Map<ItemKey, ItemState> before = progress(user, units);
        DailyPlan dp = todayPlan(user, profile, plan, units, before, now);
        Phase phase = r.phase() == null ? (r.review() ? Phase.REVIEW : Phase.LEARN) : r.phase();
        String source = null;
        LocalDate scheduledFor = null;
        ItemState was = before.get(key);
        boolean fresh = was == null || !was.introduced();
        // A new item must pass the ahead checks in every phase: the phase is client input and must not bypass prerequisites.
        if (fresh || (!r.review() && phase == Phase.LEARN)) {
            StoredPlan sp = read(dp);
            List<StoredResult> todays = sessionRepository.findFirstByDailyPlanIdAndKindOrderByIdDesc(dp.getId(), PathSessionKind.DAILY)
                    .map(this::results).orElse(List.of());
            Optional<StoredResult> prior = todays.stream()
                    .filter(x -> "AHEAD".equals(x.source()) && x.itemType() == key.type() && x.itemId().equals(key.id())).findFirst();
            boolean planned = sp.phases().stream().anyMatch(ph -> ph.items().contains(key));
            if (planned) source = r.review() || phase != Phase.LEARN ? null : "SCHEDULED";
            else if (prior.isPresent()) {
                source = "AHEAD";
                scheduledFor = prior.get().scheduledFor();
            } else if (!fresh) source = "OPTIONAL";
            else {
                // A new item outside today's plan: learning ahead. Its unit must be open (prerequisites done) and within the pace's daily cap.
                // Unlocking depends on prerequisites only: the planned day and the pace never block an open lesson.
                PlanUnit unit = unitOf(units, key);
                CycleState cycle = cycle(user, plan, units, before, today);
                Set<ItemKey> known = before.values().stream().filter(ItemState::introduced).map(ItemState::key).collect(Collectors.toSet());
                Map<String, PlanUnit> byId = units.stream().collect(Collectors.toMap(PlanUnit::id, u -> u, (a, b) -> a));
                List<String> missing = unit.prerequisites().stream().map(byId::get)
                        .filter(pre -> pre != null && !PathPlanner.unitDone(pre, known, cycle.completedReviewUnits()))
                        .map(PlanUnit::title).toList();
                if (!missing.isEmpty()) throw bad("Bài này chưa mở khóa: cần hoàn thành " + String.join(", ", missing) + " trước");
                source = "AHEAD";
                scheduledFor = scheduledDate(suggestedForecast(user, engineProfile(profile, plan), units, before, sp, cycle, zone, today, 14),
                        unit.id());
            }
        }
        ItemState after = applyAnswer(user, key, r.correct(), r.review(), false, now);
        log(user, dp, List.of(new StoredResult(key.type(), key.id(), truncate(r.questionKind(), 32), r.correct(), r.review(), now,
                phase, source, scheduledFor)), now);
        return new AnswerResponse(after.state(), after.weak(), MasteryRules.label(after.state(), after.weak()));
    }

    /**
     * End-of-day or weekly test. Attempt 1 at or above the pass mark (80%) ends the test; below it the learner
     * reviews the wrong answers and may retake once (attempt 2) or skip the retake. Wrong items become weak.
     */
    @Transactional
    public TestView submitTest(TestRequest r) {
        User user = user();
        if (r == null || r.answers() == null || r.answers().isEmpty() || r.attempt() == null) throw bad("Thiếu câu trả lời");
        PathProfile profile = requireProfile(user);
        LearningPlan plan = activePlan(user).orElseThrow(() -> bad("Chưa thiết lập lộ trình"));
        List<PlanUnit> units = units();
        Instant now = Instant.now();
        DailyPlan dp = todayPlan(user, profile, plan, units, progress(user, units), now);
        StoredPlan sp = read(dp);
        Set<ItemKey> allowed = new HashSet<>(sp.items(Phase.TEST));
        List<TestAnswer> answers = r.answers().stream()
                .filter(a -> a.itemType() != null && a.itemId() != null && allowed.contains(new ItemKey(a.itemType(), a.itemId())))
                .toList();
        if (answers.isEmpty()) throw bad("Câu trả lời không thuộc bài kiểm tra hôm nay");

        PathTest t = testRepository.findByDailyPlanId(dp.getId()).orElseGet(() -> PathTest.builder()
                .user(user).dailyPlan(dp).kind(sp.kind() == DayKind.WEEKLY_TEST ? "WEEKLY" : isChapterTest(sp, units) ? "CHAPTER" : "DAILY").build());
        if (t.getFinalScore() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Bài kiểm tra hôm nay đã xong");
        if (r.attempt() == 1 && t.getAttempt1Score() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Đã nộp lần 1");
        if (r.attempt() == 2 && t.getAttempt1Score() == null) throw bad("Chưa làm lần 1");
        if (r.attempt() != 1 && r.attempt() != 2) throw bad("Lượt làm không hợp lệ");

        List<StoredResult> logged = new ArrayList<>();
        Set<ItemKey> wrong = new LinkedHashSet<>(t.getWrongItemsJson() == null ? List.of()
                : objectMapper.readValue(t.getWrongItemsJson(), new TypeReference<List<ItemKey>>() {}));
        int right = 0;
        for (TestAnswer a : answers) {
            ItemKey k = new ItemKey(a.itemType(), a.itemId());
            applyAnswer(user, k, a.correct(), true, true, now);
            logged.add(new StoredResult(k.type(), k.id(), "test", a.correct(), true, now, Phase.TEST));
            if (a.correct()) right++;
            else wrong.add(k);
        }
        log(user, dp, logged, now);
        double score = (double) right / answers.size();
        t.setWrongItemsJson(json(new ArrayList<>(wrong)));
        if (r.attempt() == 1) {
            t.setAttempt1Score(score);
            if (passes(t.getKind(), score)) finish(t, score, now, units, user);
            else t.setMessage("Chưa đạt " + ("CHAPTER".equals(t.getKind()) ? "85" : "80") + "%. Xem lại các câu sai rồi làm lại một lần nhé.");
        } else {
            t.setAttempt2Score(score);
            finish(t, Math.max(t.getAttempt1Score(), score), now, units, user);
        }
        testRepository.save(t);
        return testView(t);
    }

    /** Chapter tests (the kana gate) have their own, higher pass mark. */
    private boolean passes(String kind, double score) {
        return "CHAPTER".equals(kind) ? planner.chapterPassed(score) : planner.dailyPassed(score);
    }

    private static boolean isChapterTest(StoredPlan sp, List<PlanUnit> units) {
        return units.stream().anyMatch(u -> u.test() && sp.unitIds().contains(u.id()));
    }

    /** Ends a failed test without the retake. The day still counts as done. */
    @Transactional
    public TestView skipRetake() {
        User user = user();
        PathProfile profile = requireProfile(user);
        LearningPlan plan = activePlan(user).orElseThrow(() -> bad("Chưa thiết lập lộ trình"));
        List<PlanUnit> units = units();
        Instant now = Instant.now();
        DailyPlan dp = todayPlan(user, profile, plan, units, progress(user, units), now);
        PathTest t = testRepository.findByDailyPlanId(dp.getId()).orElseThrow(() -> bad("Chưa làm bài kiểm tra"));
        if (t.getFinalScore() == null) {
            finish(t, t.getAttempt1Score(), now, units, user);
            testRepository.save(t);
        }
        return testView(t);
    }

    /** Final result, weak marking and, for a weekly test, next cycle's adjustment. */
    private void finish(PathTest t, double finalScore, Instant now, List<PlanUnit> units, User user) {
        t.setFinalScore(finalScore);
        t.setPassed(passes(t.getKind(), finalScore));
        t.setFinishedAt(now);
        List<ItemKey> wrong = objectMapper.readValue(t.getWrongItemsJson(), new TypeReference<List<ItemKey>>() {});
        if ("WEEKLY".equals(t.getKind())) {
            WeeklyAdjustment adj = planner.evaluateWeekly(finalScore, wrong);
            t.setAdjustment(adj.action());
            t.setMessage(adj.message());
            if ("REVIEW_EARLY".equals(adj.action())) wrong.forEach(k -> reviewNow(user, k, now));
        } else if ("CHAPTER".equals(t.getKind())) {
            t.setMessage(t.isPassed() ? "Đạt! Bạn đã hoàn thành phần này, bài tiếp theo đã mở."
                    : "Chưa đạt 85%. Các nội dung sai được đánh dấu Yếu; ôn lại rồi làm bài kiểm tra này một lần nữa nhé.");
        } else {
            t.setMessage(t.isPassed() ? "Đạt! Hôm nay bạn đã nắm bài." : "Đã ghi nhận. Các nội dung còn sai được đánh dấu Yếu để ôn thêm.");
        }
    }

    /** Grammar, kanji and kana due now. The Review Center shows these next to due words; answers go through {@link #answer}. */
    @Transactional(readOnly = true)
    public List<ReviewQueueItem> reviewQueue() {
        User user = user();
        if (activePlan(user).isEmpty()) return List.of();
        List<PlanUnit> units = units();
        Instant now = Instant.now();
        return progress(user, units).values().stream()
                .filter(s -> s.key().type() != PathItemType.VOCAB && s.introduced())
                .filter(s -> s.nextReviewAt() != null && !s.nextReviewAt().isAfter(now))
                .sorted(Comparator.comparing((ItemState s) -> !s.weak()).thenComparing(ItemState::nextReviewAt))
                .map(s -> new ReviewQueueItem(s.key().type(), s.key().id()))
                .toList();
    }

    /** Past study days (done / missed), today, and the projected days ahead with their lesson names. */
    @Transactional
    public RoadmapResponse roadmap() {
        User user = user();
        PathProfile profile = requireProfile(user);
        LearningPlan plan = activePlan(user).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa thiết lập lộ trình"));
        ZoneId zone = ZoneId.of(profile.getTimezone());
        Instant now = Instant.now();
        LocalDate today = now.atZone(zone).toLocalDate();
        Profile p = engineProfile(profile, plan);
        List<PlanUnit> units = units();
        Map<ItemKey, ItemState> progress = progress(user, units);
        DailyPlan dp = todayPlan(user, profile, plan, units, progress, now);
        StoredPlan sp = read(dp);

        Curriculum cur = catalog.curriculumOf(PATH_ID);
        CycleState cycle = cycle(user, plan, units, progress, today);
        Map<LocalDate, DailyPlan> byDate = new HashMap<>();
        dailyPlanRepository.findByPlanIdOrderByLocalDateDesc(plan.getId()).forEach(x -> byDate.put(x.getLocalDate(), x));
        List<CalendarDay> days = new ArrayList<>();
        for (LocalDate d = plan.getStartDate(); d.isBefore(today); d = d.plusDays(1)) {
            DailyPlan x = byDate.get(d);
            boolean study = PathPlanner.isStudyDay(d, p.daysPerWeek());
            if (x == null && !study) continue;
            StoredPlan s = x == null ? null : read(x);
            if (s != null && s.kind() == DayKind.REST && x.getCompletedAt() == null) continue;
            // The stored number is what the learner saw that day; only days with no stored plan (missed) are counted.
            int n = s != null ? s.dayNumber() : PathPlanner.studyDaysBetween(plan.getStartDate(), d, p.daysPerWeek());
            days.add(new CalendarDay(d, n, s == null ? "Ngày " + n : s.title(), s == null ? DayKind.LESSON : s.kind(),
                    x != null && x.getCompletedAt() != null ? "DONE" : "MISSED", s == null ? Map.of() : counts(s.items(Phase.LEARN)),
                    s == null ? null : chapterId(cur, s.unitIds()), s == null ? null : checkpoint(s.kind(), s.unitIds(), units)));
        }
        days.add(new CalendarDay(today, sp.dayNumber(), sp.title(), sp.kind(), "TODAY", counts(sp.items(Phase.LEARN)),
                chapterId(cur, sp.unitIds()), checkpoint(sp.kind(), sp.unitIds(), units)));
        for (ForecastDay f : planner.forecast(p, progress, units, toDayPlan(sp, today), cycle, 200))
            days.add(new CalendarDay(f.date(), dayOf(f.title()), f.title(), f.kind(), "UPCOMING", counts(f),
                    chapterId(cur, f.unitIds()), checkpoint(f.kind(), f.unitIds(), units)));
        return new RoadmapResponse(pathInfo(), today, plan.getTargetDate(), days, profile.getTargetLevel().name(),
                PathPlanner.progressPercent(progress, units), sp.dayNumber(),
                PathPlanner.studyDaysBetween(plan.getStartDate(), plan.getTargetDate(), p.daysPerWeek()),
                chapterViews(cur, units, progress, cycle,
                aheadUnits(user, units, progress, zone, today).stream().map(AheadView::unitId).collect(Collectors.toSet())));
    }

    /** Chapters with real unit state: done by the engine's own rule (items introduced; review and test units completed or passed). */
    private List<ChapterView> chapterViews(Curriculum cur, List<PlanUnit> units, Map<ItemKey, ItemState> progress, CycleState cycle, Set<String> ahead) {
        Set<ItemKey> introduced = progress.values().stream().filter(ItemState::introduced).map(ItemState::key).collect(Collectors.toSet());
        Map<String, PlanUnit> byId = units.stream().collect(Collectors.toMap(PlanUnit::id, u -> u, (a, b) -> a));
        PlanUnit current = PathPlanner.currentUnits(units, introduced, cycle.completedReviewUnits());
        List<ChapterView> out = new ArrayList<>();
        for (Curriculum.Chapter ch : cur.chapters()) {
            List<UnitView> views = new ArrayList<>();
            for (String id : ch.units()) {
                PlanUnit u = byId.get(id);
                if (u == null) continue;
                boolean done = PathPlanner.unitDone(u, introduced, cycle.completedReviewUnits());
                boolean open = u.prerequisites().stream().map(byId::get).allMatch(pre -> pre == null || PathPlanner.unitDone(pre, introduced, cycle.completedReviewUnits()));
                String status = done ? "DONE" : current != null && current.id().equals(id) ? "ACTIVE" : open ? "OPEN" : "LOCKED";
                views.add(new UnitView(id, u.title(), u.test() ? "TEST" : u.isReview() ? "REVIEW" : "LEARN", status, done && ahead.contains(id)));
            }
            int done = (int) views.stream().filter(v -> "DONE".equals(v.status())).count();
            boolean active = views.stream().anyMatch(v -> "ACTIVE".equals(v.status()));
            boolean locked = !active && done < views.size() && views.stream().noneMatch(v -> "OPEN".equals(v.status()));
            String status = done == views.size() ? "DONE" : locked ? "LOCKED" : "ACTIVE";
            Curriculum.Chapter prev = out.isEmpty() ? null : cur.chapters().get(out.size() - 1);
            ChapterView before = out.isEmpty() ? null : out.get(out.size() - 1);
            out.add(new ChapterView(ch.id(), ch.title(), ch.goal(), status, views.size(), done,
                    views.isEmpty() ? 0 : done * 100 / views.size(), views,
                    "LOCKED".equals(status) && prev != null ? "Hoàn thành chặng " + prev.title() + " và đạt bài kiểm tra tổng hợp" : null,
                    "LOCKED".equals(status) && before != null ? before.unitsTotal() - before.unitsDone() : 0));
        }
        return out;
    }

    /** Review state of the path's items from their real schedule; nothing is estimated. */
    @Transactional(readOnly = true)
    public ReviewOverview reviewOverview() {
        User user = user();
        if (activePlan(user).isEmpty()) return new ReviewOverview(0, 0, 0, Map.of(), null, List.of(), List.of());
        PathProfile profile = requireProfile(user);
        ZoneId zone = ZoneId.of(profile.getTimezone());
        Instant now = Instant.now();
        LocalDate today = now.atZone(zone).toLocalDate();
        Instant startOfToday = today.atStartOfDay(zone).toInstant();
        List<ItemState> started = progress(user, units()).values().stream().filter(ItemState::introduced).toList();
        List<ItemState> scheduled = started.stream().filter(s -> s.nextReviewAt() != null).toList();
        List<ItemState> due = scheduled.stream().filter(s -> !s.nextReviewAt().isAfter(now)).toList();
        Map<PathItemType, Integer> byType = new EnumMap<>(PathItemType.class);
        due.forEach(s -> byType.merge(s.key().type(), 1, Integer::sum));
        Instant next = scheduled.stream().map(ItemState::nextReviewAt).filter(t -> t.isAfter(now)).min(Comparator.naturalOrder()).orElse(null);
        List<UpcomingBucket> upcoming = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate d = today.plusDays(i);
            int n = (int) scheduled.stream().filter(s -> s.nextReviewAt().isAfter(now) && s.nextReviewAt().atZone(zone).toLocalDate().equals(d)).count();
            if (n > 0) upcoming.add(new UpcomingBucket(d, n));
        }
        Map<LocalDate, int[]> hist = new TreeMap<>();
        for (LearningSession s : sessionRepository.findByUserIdAndStartedAtAfter(user.getId(), today.minusDays(6).atStartOfDay(zone).toInstant())) {
            if (s.getKind() != PathSessionKind.DAILY) continue;
            for (StoredResult r : results(s)) {
                if (!(r.phase() == Phase.REVIEW || (r.phase() == null && r.review())) || r.at() == null) continue;
                int[] a = hist.computeIfAbsent(r.at().atZone(zone).toLocalDate(), x -> new int[2]);
                a[0]++;
                if (r.correct()) a[1]++;
            }
        }
        List<HistoryDay> history = hist.entrySet().stream().map(e -> new HistoryDay(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();
        return new ReviewOverview(due.size(), (int) scheduled.stream().filter(s -> s.nextReviewAt().isBefore(startOfToday)).count(),
                (int) started.stream().filter(ItemState::weak).count(), byType, next, upcoming, history);
    }

    @Transactional
    public void report(ReportRequest r) {
        User user = user();
        if (r == null || r.itemType() == null || isBlank(r.itemId()) || isBlank(r.questionKind()) || isBlank(r.questionJson()))
            throw bad("Thiếu dữ liệu báo cáo");
        if (r.questionJson().length() > 10_000) throw bad("Câu hỏi quá dài");
        reportRepository.save(QuestionReport.builder().user(user).itemType(r.itemType())
                .itemId(truncate(r.itemId(), 64)).questionKind(truncate(r.questionKind(), 32))
                .questionJson(r.questionJson()).comment(truncate(r.comment(), 500)).build());
    }

    // ---------- answers ----------

    /**
     * Writes one graded answer into the item's own table: SRS schedule, counters, answer streak and weak flag.
     * Vocab goes through the shared FSRS engine (same rows as the Review Center).
     */
    private ItemState applyAnswer(User user, ItemKey key, boolean correct, boolean review, boolean inTest, Instant now) {
        switch (key.type()) {
            case VOCAB -> {
                UserVocabularyProgress p = reviewService.reviewWord(Long.valueOf(key.id()), null,
                        correct ? Rating.GOOD : Rating.AGAIN, review ? LearningSource.REVIEW : LearningSource.TANGO);
                if (inTest && !correct) {
                    p.setWeak(true);
                    vocabularyProgressRepository.save(p);
                }
                return vocabState(p);
            }
            case KANA -> {
                KanaItemProgress kp = kanaProgress(user, key, catalog.curriculumOf(PATH_ID).kanaSections());
                ItemState s = srs.scheduleNextReview(kanaState(kp), correct, now);
                if (correct) kp.setCorrectCount(kp.getCorrectCount() + 1);
                else kp.setWrongCount(kp.getWrongCount() + 1);
                kp.setLastSeenAt(LocalDateTime.ofInstant(now, ZoneId.systemDefault()));
                kp.setMastered(KanaProgressServiceImpl.isMastered(kp.getCorrectCount(), kp.getWrongCount()));
                kp.setSrsStage(s.stage());
                kp.setNextReviewAt(s.nextReviewAt());
                kp.setAnswerStreak(MasteryRules.nextStreak(kp.getAnswerStreak(), correct));
                kp.setWeak(mastery.nextWeak(kp.isWeak(), kp.getAnswerStreak(), correct, inTest));
                kanaProgressRepository.save(kp);
                return kanaState(kp);
            }
            default -> {
                ItemProgress ip = itemProgress(user, key);
                apply(ip, srs.scheduleNextReview(toState(ip), correct, now));
                ip.setProvisional(false);
                ip.setAnswerStreak(MasteryRules.nextStreak(ip.getAnswerStreak(), correct));
                ip.setWeak(mastery.nextWeak(ip.isWeak(), ip.getAnswerStreak(), correct, inTest));
                itemProgressRepository.save(ip);
                return toState(ip);
            }
        }
    }

    /** "80–89%" weekly rule: wrong items come back in the next review. */
    private void reviewNow(User user, ItemKey k, Instant now) {
        switch (k.type()) {
            case VOCAB -> vocabularyProgressRepository.findByUserIdAndTangoVocabularyIdIn(user.getId(), List.of(Long.valueOf(k.id())))
                    .forEach(p -> {
                        p.setNextReviewTime(LocalDateTime.ofInstant(now, ZoneId.systemDefault()));
                        vocabularyProgressRepository.save(p);
                    });
            case KANA -> {
                KanaItemProgress kp = kanaProgress(user, k, catalog.curriculumOf(PATH_ID).kanaSections());
                kp.setNextReviewAt(now);
                kanaProgressRepository.save(kp);
            }
            default -> {
                ItemProgress ip = itemProgress(user, k);
                ip.setNextReviewAt(now);
                itemProgressRepository.save(ip);
            }
        }
    }

    private void log(User user, DailyPlan dp, List<StoredResult> add, Instant now) {
        LearningSession session = sessionRepository.findFirstByDailyPlanIdAndKindOrderByIdDesc(dp.getId(), PathSessionKind.DAILY)
                .orElseGet(() -> LearningSession.builder().user(user).dailyPlan(dp).kind(PathSessionKind.DAILY).startedAt(now).build());
        List<StoredResult> results = new ArrayList<>(results(session));
        results.addAll(add);
        session.setResultsJson(json(results));
        session.setEndedAt(now);
        sessionRepository.save(session);
    }

    private List<StoredResult> results(LearningSession s) {
        return s.getResultsJson() == null ? List.of() : objectMapper.readValue(s.getResultsJson(), new TypeReference<List<StoredResult>>() {});
    }

    // ---------- learning progress (phases) ----------

    /** Items answered today in each phase. Rows from before phases existed count as REVIEW or LEARN by their review flag. */
    private Map<Phase, Set<ItemKey>> answeredByPhase(DailyPlan dp) {
        Map<Phase, Set<ItemKey>> out = new EnumMap<>(Phase.class);
        for (Phase ph : Phase.values()) out.put(ph, new HashSet<>());
        sessionRepository.findFirstByDailyPlanIdAndKindOrderByIdDesc(dp.getId(), PathSessionKind.DAILY).ifPresent(s -> {
            for (StoredResult r : results(s)) {
                if (r.itemType() == null) continue; // a lesson's closing row, not an answer
                Phase ph = r.phase() != null ? r.phase() : r.review() ? Phase.REVIEW : Phase.LEARN;
                out.get(ph).add(new ItemKey(r.itemType(), r.itemId()));
            }
        });
        return out;
    }

    /**
     * A phase is done only when its required activity is done: every review item reviewed today (anywhere, so the
     * Review Center counts), every LEARN and PRACTICE item answered in that phase, the test finished. Opening a
     * lesson alone never completes anything. Empty phases are done.
     */
    private Map<Phase, Boolean> phaseDone(DailyPlan dp, StoredPlan sp, Map<ItemKey, ItemState> progress, Optional<PathTest> test, Instant dayStart) {
        Map<Phase, Set<ItemKey>> answered = answeredByPhase(dp);
        Map<Phase, Boolean> out = new EnumMap<>(Phase.class);
        // Today's review lesson / chapter test already completed on its own (from the lesson list): the day is done too.
        if (sp.kind() == DayKind.UNIT_REVIEW && !sp.unitIds().isEmpty()) {
            Set<String> passed = sessionRepository.findFirstByDailyPlanIdAndKindOrderByIdDesc(dp.getId(), PathSessionKind.DAILY)
                    .map(this::results).orElse(List.of()).stream()
                    .filter(r -> UNIT_RESULT.equals(r.questionKind()) && r.correct()).map(StoredResult::itemId).collect(Collectors.toSet());
            if (passed.containsAll(sp.unitIds())) {
                for (Phase ph : Phase.values()) out.put(ph, true);
                return out;
            }
        }
        for (StoredPhase ph : sp.phases()) {
            boolean done = switch (ph.phase()) {
                case REVIEW -> ph.items().stream().allMatch(k -> reviewedToday(progress.get(k), dayStart) || answered.get(Phase.REVIEW).contains(k));
                case LEARN, PRACTICE -> answered.get(ph.phase()).containsAll(ph.items());
                case TEST -> ph.items().isEmpty() || test.map(t -> t.getFinalScore() != null).orElse(false);
            };
            out.put(ph.phase(), done);
        }
        for (Phase ph : Phase.values()) out.putIfAbsent(ph, true);
        return out;
    }

    private static boolean reviewedToday(ItemState s, Instant dayStart) {
        return s != null && s.lastReviewedAt() != null && !s.lastReviewedAt().isBefore(dayStart);
    }

    private static String phaseLabel(DayKind kind, Phase ph) {
        return switch (ph) {
            case REVIEW -> "Ôn tập";
            case LEARN -> kind == DayKind.WEEKLY_TEST ? "Củng cố" : kind == DayKind.UNIT_REVIEW ? "Ôn bài" : "Học mới";
            case PRACTICE -> "Luyện tập";
            case TEST -> kind == DayKind.WEEKLY_TEST ? "Kiểm tra tuần" : "Kiểm tra cuối ngày";
        };
    }

    private TestView testView(PathTest t) {
        List<ItemKey> wrong = t.getWrongItemsJson() == null ? List.of() : objectMapper.readValue(t.getWrongItemsJson(), new TypeReference<List<ItemKey>>() {});
        boolean canRetake = t.getFinalScore() == null && t.getAttempt1Score() != null && t.getAttempt2Score() == null;
        return new TestView(t.getKind(), t.getAttempt1Score(), t.getAttempt2Score(), t.getFinalScore(), t.isPassed(), canRetake, wrong, t.getMessage());
    }

    // ---------- cycle ----------

    /**
     * Cycle position from stored days: completed study days since the last finished weekly test (rest and missed
     * days do not count), the items learned in them, and what that weekly test asked for.
     */
    private CycleState cycle(User user, LearningPlan plan, List<PlanUnit> units, Map<ItemKey, ItemState> progress, LocalDate today) {
        List<DailyPlan> days = dailyPlanRepository.findByPlanIdOrderByLocalDateDesc(plan.getId());
        PathTest last = testRepository.findByDailyPlanPlanIdOrderByIdDesc(plan.getId()).stream()
                .filter(t -> "WEEKLY".equals(t.getKind()) && t.getFinalScore() != null).findFirst().orElse(null);
        LocalDate cutoff = last == null ? null : last.getDailyPlan().getLocalDate();
        int lessons = 0;
        Set<ItemKey> cycleItems = new LinkedHashSet<>();
        Set<String> reviewed = new HashSet<>();
        Map<String, PlanUnit> unitById = units.stream().collect(Collectors.toMap(PlanUnit::id, u -> u, (a, b) -> a));
        int movedPast = 0; // order of the furthest non-kana unit the learner really studied
        for (DailyPlan d : days) {
            StoredPlan s = read(d);
            if (d.getCompletedAt() != null) {
                for (String id : s.unitIds()) {
                    PlanUnit u = unitById.get(id);
                    if (u == null) continue;
                    if (s.kind() == DayKind.UNIT_REVIEW && (!u.test() || testRepository.findByDailyPlanId(d.getId()).map(PathTest::isPassed).orElse(false)))
                        reviewed.add(id); // a chapter test only counts when passed: this is the kana gate
                    if (s.kind() == DayKind.LESSON && u.items().stream().anyMatch(k -> k.type() != PathItemType.KANA)) movedPast = Math.max(movedPast, u.order());
                }
            }
            if (!d.getLocalDate().isBefore(today) || (cutoff != null && !d.getLocalDate().isAfter(cutoff))) continue;
            if (d.getCompletedAt() == null || s.kind() == DayKind.REST || s.kind() == DayKind.WEEKLY_TEST) continue;
            lessons++;
            cycleItems.addAll(s.items(Phase.LEARN));
        }
        reviewed.addAll(PathPlanner.reviewUnitsCovered(units, placementKnown(user)));
        unitResults(user).forEach((id, ok) -> {
            if (ok) reviewed.add(id); // review lessons / chapter tests completed outside their planned day
        });
        // Plans that started before the kana gate existed: whoever already studied a Minna unit keeps their place,
        // so review lessons and tests before that unit do not lock them out again.
        final int past = movedPast;
        units.stream().filter(u -> u.isReview() && u.order() < past).forEach(u -> reviewed.add(u.id()));

        Set<ItemKey> relearn = Set.of(), extra = Set.of();
        boolean reduce = false;
        if (last != null) {
            Instant at = last.getFinishedAt();
            List<ItemKey> wrong = objectMapper.readValue(last.getWrongItemsJson(), new TypeReference<List<ItemKey>>() {});
            Set<ItemKey> notSince = wrong.stream().filter(k -> {
                ItemState s = progress.get(k);
                return s == null || s.lastReviewedAt() == null || s.lastReviewedAt().isBefore(at);
            }).collect(Collectors.toCollection(LinkedHashSet::new));
            switch (last.getAdjustment() == null ? "NORMAL" : last.getAdjustment()) {
                case "REDUCE_NEW" -> {
                    reduce = true;
                    extra = new LinkedHashSet<>(wrong);
                }
                case "RELEARN" -> relearn = notSince;
                default -> { }
            }
        }
        return new CycleState(lessons, cycleItems, reduce, relearn, extra, reviewed);
    }

    private String lastWeeklyMessage(LearningPlan plan) {
        return testRepository.findByDailyPlanPlanIdOrderByIdDesc(plan.getId()).stream()
                .filter(t -> "WEEKLY".equals(t.getKind()) && t.getFinalScore() != null).findFirst()
                .map(PathTest::getMessage).orElse(null);
    }

    /** Items the placement test marked as known (stored in its session). */
    private Set<ItemKey> placementKnown(User user) {
        return sessionRepository.findByUserIdAndStartedAtAfter(user.getId(), Instant.EPOCH).stream()
                .filter(s -> s.getKind() == PathSessionKind.PLACEMENT)
                .flatMap(s -> results(s).stream())
                .filter(r -> "placement-known".equals(r.questionKind()))
                .map(r -> new ItemKey(r.itemType(), r.itemId()))
                .collect(Collectors.toSet());
    }

    /** Review lessons and chapter tests taken on their own: unit id → completed (a chapter test: passed) at least once. */
    private Map<String, Boolean> unitResults(User user) {
        Map<String, Boolean> out = new HashMap<>();
        for (LearningSession s : sessionRepository.findByUserIdAndStartedAtAfter(user.getId(), Instant.EPOCH)) {
            if (s.getKind() != PathSessionKind.DAILY) continue;
            for (StoredResult r : results(s))
                if (UNIT_RESULT.equals(r.questionKind())) out.merge(r.itemId(), r.correct(), Boolean::logicalOr);
        }
        return out;
    }

    private Set<LocalDate> completedDays(LearningPlan plan) {
        return dailyPlanRepository.findByPlanIdOrderByLocalDateDesc(plan.getId()).stream()
                .filter(x -> x.getCompletedAt() != null).map(DailyPlan::getLocalDate).collect(Collectors.toSet());
    }

    /** Monday–Sunday around today: done, today, missed, rest, and the projected kinds of the days ahead. */
    private List<CalendarDay> week(LearningPlan plan, Profile p, LocalDate today, StoredPlan sp, DayPlan todayPlan,
                                   Map<ItemKey, ItemState> progress, List<PlanUnit> units, CycleState cycle) {
        LocalDate monday = today.with(DayOfWeek.MONDAY);
        Map<LocalDate, DailyPlan> byDate = new HashMap<>();
        dailyPlanRepository.findByPlanIdOrderByLocalDateDesc(plan.getId()).forEach(x -> byDate.put(x.getLocalDate(), x));
        Map<LocalDate, ForecastDay> ahead = new HashMap<>();
        planner.forecast(p, progress, units, todayPlan, cycle, 7).forEach(f -> ahead.put(f.date(), f));
        List<CalendarDay> out = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate d = monday.plusDays(i);
            boolean study = PathPlanner.isStudyDay(d, p.daysPerWeek());
            if (d.equals(today)) out.add(new CalendarDay(d, sp.dayNumber(), sp.title(), sp.kind(), "TODAY"));
            else if (d.isBefore(plan.getStartDate())) out.add(new CalendarDay(d, null, null, null, "NONE"));
            else if (d.isBefore(today)) {
                DailyPlan x = byDate.get(d);
                StoredPlan s = x == null ? null : read(x);
                String status = x != null && x.getCompletedAt() != null ? "DONE" : study ? "MISSED" : "REST";
                out.add(new CalendarDay(d, s == null ? null : s.dayNumber(), s == null ? null : s.title(),
                        s == null ? (study ? DayKind.LESSON : DayKind.REST) : s.kind(), status));
            } else if (!study) out.add(new CalendarDay(d, null, null, DayKind.REST, "REST"));
            else {
                ForecastDay f = ahead.get(d);
                out.add(new CalendarDay(d, f == null ? null : dayOf(f.title()), f == null ? null : f.title(),
                        f == null ? DayKind.REVIEW_DAY : f.kind(), "UPCOMING"));
            }
        }
        return out;
    }

    private static Integer dayOf(String title) {
        try {
            return Integer.valueOf(title.replaceAll("^Ngày (\\d+).*$", "$1"));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // ---------- internals ----------

    private User user() {
        User user = currentUserService.getCurrentUser();
        if (!access.isEnabledFor(user)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Learning Path chưa được bật");
        return user;
    }

    private PathProfile requireProfile(User user) {
        return profileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa thiết lập lộ trình"));
    }

    private Optional<LearningPlan> activePlan(User user) {
        return planRepository.findFirstByUserIdAndStatusOrderByIdDesc(user.getId(), PathPlanStatus.ACTIVE);
    }

    private PathInfo pathInfo() {
        return catalog.path(PATH_ID).map(p -> new PathInfo(p.id(), p.title(), p.scope())).orElse(null);
    }

    /** Engine profile; its start date is where the pace is measured from (see LearningPlan.paceFrom). */
    private Profile engineProfile(PathProfile p, LearningPlan plan) {
        LocalDate pace = plan.getPaceFrom() != null ? plan.getPaceFrom() : plan.getStartDate();
        return new Profile(p.getMinutesPerDay(), p.getDaysPerWeek(), pace, plan.getTargetDate(), ZoneId.of(p.getTimezone()));
    }

    private static int dayNumber(LearningPlan plan, PathProfile p, LocalDate today) {
        return Math.max(1, PathPlanner.studyDaysBetween(plan.getStartDate(), today, p.getDaysPerWeek()));
    }

    private ZoneId validate(ProfileRequest r) {
        if (r == null || r.currentLevel() == null || r.goal() == null || r.minutesPerDay() == null
                || r.daysPerWeek() == null || r.targetDate() == null || r.timezone() == null)
            throw bad("Thiếu thông tin thiết lập");
        if (r.minutesPerDay() < 5 || r.minutesPerDay() > 240) throw bad("Thời gian mỗi ngày không hợp lệ");
        if (r.daysPerWeek() < 1 || r.daysPerWeek() > 7) throw bad("Số ngày học mỗi tuần không hợp lệ");
        ZoneId zone;
        try {
            zone = ZoneId.of(r.timezone());
        } catch (DateTimeException e) {
            throw bad("Múi giờ không hợp lệ");
        }
        LocalDate today = LocalDate.now(zone);
        if (!r.targetDate().isAfter(today)) throw bad("Hạn chót phải sau hôm nay");
        if (r.targetDate().isAfter(today.plusYears(3))) throw bad("Hạn chót quá xa");
        return zone;
    }

    /** Today's frozen plan, generated on the first request of the learner's local day. */
    private DailyPlan todayPlan(User user, PathProfile profile, LearningPlan plan, List<PlanUnit> units,
                                Map<ItemKey, ItemState> progress, Instant now) {
        LocalDate today = now.atZone(ZoneId.of(profile.getTimezone())).toLocalDate();
        return dailyPlanRepository.findByPlanIdAndLocalDate(plan.getId(), today).orElseGet(() -> {
            DayPlan generated = planner.generateDailyPlan(engineProfile(profile, plan), progress, units, now, recentAccuracy(user),
                    cycle(user, plan, units, progress, today), dayNumber(plan, profile, today));
            DailyPlan dp = DailyPlan.builder().plan(plan).localDate(today).build();
            store(dp, generated);
            // shortcut: two first requests racing hit the unique key and one fails; the client's retry then reads the saved row.
            return dailyPlanRepository.saveAndFlush(dp);
        });
    }

    private void store(DailyPlan dp, DayPlan plan) {
        dp.setBlocksJson(json(new StoredPlan(2, plan.kind(), plan.dayNumber(), plan.title(), plan.unitIds(),
                plan.phases().stream().map(x -> new StoredPhase(x.phase(), x.items(), x.minutes())).toList(),
                plan.reducedNew(), plan.deferredReviews())));
        dp.setEstimatedMinutes(plan.totalMinutes());
    }

    /**
     * Reads a stored day. Version 1 rows (blocks GRAMMAR/VOCAB/KANJI/REVIEW, before phases) map to a LESSON whose
     * LEARN phase holds the new items; practice and test are empty there, so old days complete as they did before.
     */
    StoredPlan read(DailyPlan dp) {
        JsonNode n = objectMapper.readTree(dp.getBlocksJson());
        if (n.has("phases")) return objectMapper.treeToValue(n, StoredPlan.class);
        List<ItemKey> learn = new ArrayList<>(), review = new ArrayList<>();
        double learnMin = 0, reviewMin = 0;
        for (JsonNode b : n.path("blocks")) {
            List<ItemKey> items = objectMapper.treeToValue(b.path("items"), new TypeReference<List<ItemKey>>() {});
            if ("REVIEW".equals(b.path("type").asString())) {
                review.addAll(items);
                reviewMin += b.path("minutes").asDouble();
            } else {
                learn.addAll(items);
                learnMin += b.path("minutes").asDouble();
            }
        }
        boolean study = n.path("studyDay").asBoolean(true);
        int day = legacyDayNumber(dp.getPlan(), dp.getLocalDate());
        return new StoredPlan(1, study ? DayKind.LESSON : DayKind.REST, day, study ? "Ngày " + day : "Ngày nghỉ", List.of(),
                List.of(new StoredPhase(Phase.REVIEW, review, reviewMin), new StoredPhase(Phase.LEARN, learn, learnMin),
                        new StoredPhase(Phase.PRACTICE, List.of(), 0), new StoredPhase(Phase.TEST, List.of(), 0)),
                n.path("reducedForAccuracy").asBoolean(false), n.path("deferredReviews").asInt(0));
    }

    /** Day number for a v1 row: the weekly schedule lives in the profile, not at hand here, so calendar days are counted. */
    private static int legacyDayNumber(LearningPlan plan, LocalDate day) {
        return (int) Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(plan.getStartDate(), day) + 1);
    }

    private static DayPlan toDayPlan(StoredPlan sp, LocalDate date) {
        return new DayPlan(date, sp.kind(), sp.dayNumber(), sp.title(), sp.unitIds(),
                sp.phases().stream().map(x -> new PhasePlan(x.phase(), x.items(), x.minutes())).toList(), 0, sp.reducedNew(), sp.deferredReviews());
    }

    /** Review accuracy over the last few days, or null when there are too few review answers to judge. */
    private Double recentAccuracy(User user) {
        var e = properties.engine();
        Instant since = Instant.now().minus(Duration.ofDays(e.accuracyWindowDays()));
        int n = 0, ok = 0;
        for (LearningSession s : sessionRepository.findByUserIdAndStartedAtAfter(user.getId(), since)) {
            if (s.getKind() != PathSessionKind.DAILY) continue;
            for (StoredResult r : results(s)) {
                if (!(r.phase() == Phase.REVIEW || (r.phase() == null && r.review()))) continue;
                n++;
                if (r.correct()) ok++;
            }
        }
        return n < e.minAnswersForAccuracy() ? null : (double) ok / n;
    }

    private static Optional<PlanUnit> findUnit(List<PlanUnit> units, ItemKey key) {
        return units.stream().filter(u -> !u.isReview() && u.items().contains(key)).findFirst();
    }

    private static PlanUnit unitOf(List<PlanUnit> units, ItemKey key) {
        return findUnit(units, key).orElseThrow(() -> bad("Nội dung không thuộc lộ trình"));
    }

    private static Set<String> aheadUnitIds(List<StoredResult> results, List<PlanUnit> units) {
        return results.stream().filter(x -> "AHEAD".equals(x.source()))
                .map(x -> unitOfResult(x, units)).flatMap(Optional::stream) // items dropped from the curriculum are ignored
                .map(PlanUnit::id).collect(Collectors.toSet());
    }

    /** The unit a logged row belongs to: an answer's lesson, or the lesson a closing row completes. Answers of a check belong to the check. */
    private static Optional<PlanUnit> unitOfResult(StoredResult r, List<PlanUnit> units) {
        if (r.itemType() == null) return units.stream().filter(u -> u.id().equals(r.unitId())).findFirst();
        if (r.unitId() != null) return Optional.empty();
        return findUnit(units, new ItemKey(r.itemType(), r.itemId()));
    }

    /**
     * The projection behind suggested days: as if whatever was learned ahead (planned for a later day), items and review
     * lessons alike, were not done yet. So later units keep the day they had instead of moving up behind it.
     */
    private List<ForecastDay> suggestedForecast(User user, Profile p, List<PlanUnit> units, Map<ItemKey, ItemState> progress,
                                                StoredPlan sp, CycleState cycle, ZoneId zone, LocalDate today, int days) {
        Map<ItemKey, ItemState> known = new HashMap<>(progress);
        Set<String> reviewed = new HashSet<>(cycle.completedReviewUnits());
        for (LearningSession s : sessionRepository.findByUserIdAndStartedAtAfter(user.getId(), today.minusDays(14).atStartOfDay(zone).toInstant())) {
            if (s.getKind() != PathSessionKind.DAILY) continue;
            for (StoredResult r : results(s)) {
                if (!"AHEAD".equals(r.source()) || r.scheduledFor() == null || !r.scheduledFor().isAfter(today)) continue;
                if (r.itemType() != null) known.remove(new ItemKey(r.itemType(), r.itemId()));
                else if (r.correct()) reviewed.remove(r.unitId());
            }
        }
        CycleState planned = new CycleState(cycle.lessonDaysDone(), cycle.cycleItems(), cycle.reduceNew(), cycle.relearn(),
                cycle.extraPractice(), reviewed);
        return planner.forecast(p, known, units, toDayPlan(sp, today), planned, days);
    }

    private static LocalDate scheduledDate(List<ForecastDay> forecast, String unitId) {
        return forecast.stream().filter(f -> f.unitIds().contains(unitId)).map(ForecastDay::date).findFirst().orElse(null);
    }

    /** Units learned ahead in the last 14 days, fully introduced, whose planned day has not passed. Derived from the answer log. */
    private List<AheadView> aheadUnits(User user, List<PlanUnit> units, Map<ItemKey, ItemState> progress, ZoneId zone, LocalDate today) {
        Map<String, AheadView> out = new LinkedHashMap<>();
        for (LearningSession s : sessionRepository.findByUserIdAndStartedAtAfter(user.getId(), today.minusDays(14).atStartOfDay(zone).toInstant())) {
            if (s.getKind() != PathSessionKind.DAILY) continue;
            for (StoredResult r : results(s)) {
                if (!"AHEAD".equals(r.source())) continue;
                PlanUnit u = unitOfResult(r, units).orElse(null);
                if (u == null) continue;
                boolean learned = u.isReview() ? r.correct()
                        : u.items().stream().allMatch(k -> progress.containsKey(k) && progress.get(k).introduced());
                if (!learned || (r.scheduledFor() != null && r.scheduledFor().isBefore(today))) continue;
                out.putIfAbsent(u.id(), new AheadView(u.id(), u.title(), r.scheduledFor(), r.at().atZone(zone).toLocalDate()));
            }
        }
        return List.copyOf(out.values());
    }

    /** Review backlog or low recent accuracy: review comes before more new lessons. */
    private Advice advice(User user, Profile p, Map<ItemKey, ItemState> progress, Instant now) {
        var e = properties.engine();
        int due = (int) progress.values().stream()
                .filter(s -> s.introduced() && s.nextReviewAt() != null && !s.nextReviewAt().isAfter(now)).count();
        Double acc = recentAccuracy(user);
        int dayBudget = (int) Math.floor(p.minutesPerDay() * e.maxReviewShare() / planner.reviewCost());
        String kind = acc != null && acc < e.lowAccuracy() ? "LOW_ACCURACY" : due > dayBudget ? "REVIEW_BACKLOG" : null;
        return new Advice(kind, due, acc);
    }

    private static final int PACE_WINDOW_DAYS = 14;

    private ActualPace actualPace(User user, LearningPlan plan, Profile p, Map<ItemKey, ItemState> progress, List<PlanUnit> units,
                                  ZoneId zone, LocalDate today) {
        LocalDate from = plan.getStartDate().isAfter(today.minusDays(PACE_WINDOW_DAYS - 1)) ? plan.getStartDate() : today.minusDays(PACE_WINDOW_DAYS - 1);
        int days = PathPlanner.studyDaysBetween(from, today, p.daysPerWeek());
        if (days < 3) return null; // too little study behind the learner to measure a speed
        Set<ItemKey> inPath = new HashSet<>();
        units.forEach(u -> inPath.addAll(u.items()));
        Set<ItemKey> learned = new HashSet<>();
        for (LearningSession s : sessionRepository.findByUserIdAndStartedAtAfter(user.getId(), from.atStartOfDay(zone).toInstant())) {
            if (s.getKind() != PathSessionKind.DAILY) continue;
            for (StoredResult r : results(s))
                if (r.itemType() != null && r.phase() == Phase.LEARN && !r.review() && !"OPTIONAL".equals(r.source()))
                    learned.add(new ItemKey(r.itemType(), r.itemId()));
        }
        learned.retainAll(inPath);
        int remaining = (int) inPath.stream().filter(k -> !progress.containsKey(k) || !progress.get(k).introduced()).count();
        double rate = (double) learned.size() / days;
        // Both rates count every study day (tests and review days included), so the remaining items convert to study days directly.
        LocalDate finish = remaining == 0 ? today
                : rate <= 0 ? null : PathPlanner.nthStudyDay(today.plusDays(1), (int) Math.ceil(remaining / rate), p.daysPerWeek());
        return new ActualPace(Math.round(rate * 10) / 10.0, days, remaining, finish, finish == null || finish.isAfter(p.targetDate()));
    }

    /** Everything the unlock views need, read once per request. */
    private record Ctx(User user, PathProfile profile, LearningPlan plan, ZoneId zone, LocalDate today, Profile p,
                       List<PlanUnit> units, Map<ItemKey, ItemState> progress, DailyPlan dp, StoredPlan sp, CycleState cycle,
                       Set<ItemKey> introduced, Set<String> attempted, List<UnitAccess> access) {

        UnitAccess access(String unitId) {
            return access.stream().filter(a -> a.unit().id().equals(unitId)).findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không có bài học này trong lộ trình"));
        }
    }

    private Ctx ctx() {
        User user = user();
        PathProfile profile = requireProfile(user);
        LearningPlan plan = activePlan(user).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa thiết lập lộ trình"));
        ZoneId zone = ZoneId.of(profile.getTimezone());
        Instant now = Instant.now();
        LocalDate today = now.atZone(zone).toLocalDate();
        List<PlanUnit> units = units();
        Map<ItemKey, ItemState> progress = progress(user, units);
        DailyPlan dp = todayPlan(user, profile, plan, units, progress, now);
        CycleState cycle = cycle(user, plan, units, progress, today);
        Set<ItemKey> introduced = progress.values().stream().filter(ItemState::introduced).map(ItemState::key).collect(Collectors.toSet());
        Set<String> attempted = new HashSet<>();
        unitResults(user).forEach((id, ok) -> {
            if (!ok) attempted.add(id);
        });
        return new Ctx(user, profile, plan, zone, today, engineProfile(profile, plan), units, progress, dp, read(dp), cycle,
                introduced, attempted, PathPlanner.unitAccess(units, introduced, cycle.completedReviewUnits(), attempted));
    }

    private List<ForecastDay> suggestedForecast(Ctx c, int days) {
        return suggestedForecast(c.user(), c.p(), c.units(), c.progress(), c.sp(), c.cycle(), c.zone(), c.today(), days);
    }

    private boolean todayDone(Ctx c) {
        return c.sp().kind() == DayKind.REST || phaseDone(c.dp(), c.sp(), c.progress(), testRepository.findByDailyPlanId(c.dp().getId()),
                c.today().atStartOfDay(c.zone()).toInstant()).values().stream().allMatch(b -> b);
    }

    private static String unitKind(PlanUnit u) {
        return u.test() ? "TEST" : u.isReview() ? "REVIEW" : "LEARN";
    }

    private static List<TodayItem> todayItems(List<ItemKey> keys, Map<ItemKey, ItemState> progress) {
        return keys.stream().map(k -> {
            ItemState s = progress.get(k);
            boolean weak = s != null && s.weak();
            return new TodayItem(k.type(), k.id(), false, MasteryRules.label(s == null ? MasteryState.NOT_STARTED : s.state(), weak), weak);
        }).toList();
    }

    /**
     * What to learn next: the next open lessons in path order, as many as the pace suggests. Works whether or not
     * today's plan is done (a lesson of today's plan comes back with inToday), and offers review lessons and chapter
     * tests as soon as they open instead of waiting for the day they are planned.
     */
    @Transactional
    public NextUpResponse nextUp() {
        Ctx c = ctx();
        PathPace pace = c.profile().pace();
        Set<String> aheadToday = aheadUnitIds(sessionRepository.findFirstByDailyPlanIdAndKindOrderByIdDesc(c.dp().getId(), PathSessionKind.DAILY)
                .map(this::results).orElse(List.of()), c.units());
        boolean todayDone = todayDone(c);
        List<ForecastDay> forecast = suggestedForecast(c, 60);
        Set<ItemKey> known = new HashSet<>(c.introduced());
        Set<String> reviewed = new HashSet<>(c.cycle().completedReviewUnits());
        List<NextLesson> out = new ArrayList<>();
        String reason = null;
        // Adaptive: fast and accurate learners get one more suggestion; a backlog or low accuracy keeps it to the pace's own amount.
        Advice advice = advice(c.user(), c.p(), c.progress(), Instant.now());
        boolean strong = advice.kind() == null && advice.recentAccuracy() != null && advice.recentAccuracy() >= properties.engine().weeklyNormalMin();
        int suggested = pace.suggested + (strong ? 1 : 0);
        for (int i = 0; i < suggested; i++) {
            PlanUnit cur = PathPlanner.currentUnits(c.units(), known, reviewed);
            if (cur == null) {
                reason = "PATH_DONE";
                break;
            }
            boolean inToday = !todayDone && c.sp().unitIds().contains(cur.id());
            LocalDate when = inToday ? c.today() : scheduledDate(forecast, cur.id());
            UnitStatus status = c.access(cur.id()).status();
            if (cur.isReview()) {
                out.add(new NextLesson(cur.title(), List.of(cur.id()), todayItems(planner.unitCheckItems(cur, c.units(), c.progress()), c.progress()),
                        when, unitKind(cur), inToday, status));
                if (cur.test()) break; // what follows a chapter test depends on passing it
                reviewed.add(cur.id());
                continue;
            }
            List<PlanUnit> picked = new ArrayList<>();
            List<ItemKey> items = planner.pickFromUnits(c.units(), cur, known, reviewed, c.p().minutesPerDay() * 0.5, null, picked);
            if (items.isEmpty()) {
                items = planner.sessionItems(cur, known, 0);
                picked = List.of(cur);
            }
            known.addAll(items);
            out.add(new NextLesson(picked.stream().map(PlanUnit::title).collect(Collectors.joining(" · ")),
                    picked.stream().map(PlanUnit::id).toList(),
                    items.stream().map(k -> new TodayItem(k.type(), k.id(), false, MasteryRules.label(MasteryState.NOT_STARTED, false), false)).toList(),
                    when, "LEARN", inToday, status));
        }
        return new NextUpResponse(pace, out, out.isEmpty() ? reason : null, aheadToday.size(), pace.maxAheadUnitsPerDay);
    }

    /** Every lesson of the path with its unlock state, suggested day and mastery: the source for Today and the roadmap. */
    @Transactional
    public UnitsResponse unitStates() {
        Ctx c = ctx();
        Map<String, LocalDate[]> ahead = aheadLog(c);
        Map<String, LocalDate> firstPlanned = firstPlannedDays(c);
        List<ForecastDay> forecast = suggestedForecast(c, 200);
        boolean todayDone = todayDone(c);
        List<UnitStateView> views = c.access().stream().map(a -> view(c, a, ahead, firstPlanned, forecast, todayDone)).toList();
        String next = views.stream().filter(v -> v.status() == UnitStatus.IN_PROGRESS || v.status() == UnitStatus.AVAILABLE)
                .map(UnitStateView::id).findFirst().orElse(null);
        return new UnitsResponse(views, next);
    }

    /**
     * One lesson opened on its own, at any time once it is unlocked. A lesson in progress continues where it stopped
     * (only the items not learned yet are returned); a completed one opens every item for practice.
     */
    @Transactional
    public UnitLesson unitLesson(String unitId) {
        Ctx c = ctx();
        UnitAccess a = c.access(unitId);
        UnitStateView v = view(c, a, aheadLog(c), firstPlannedDays(c), List.of(), todayDone(c));
        PlanUnit u = a.unit();
        if (a.status() == UnitStatus.LOCKED) return new UnitLesson(v, "LOCKED", List.of());
        if (u.isReview()) return new UnitLesson(v, "CHECK", todayItems(planner.unitCheckItems(u, c.units(), c.progress()), c.progress()));
        if (a.status() == UnitStatus.COMPLETED) return new UnitLesson(v, "REVISIT", todayItems(u.items(), c.progress()));
        return new UnitLesson(v, "LEARN", todayItems(planner.sessionItems(u, c.introduced(), c.p().minutesPerDay() * 0.5), c.progress()));
    }

    /**
     * A review lesson or chapter test taken on its own. Answers update the items like a planned test (SRS, weak flag);
     * the lesson completes right away (a chapter test only when passed), so the next lesson opens without waiting for a day.
     */
    @Transactional
    public TestView checkUnit(String unitId, TestRequest r) {
        if (r == null || r.answers() == null || r.answers().isEmpty()) throw bad("Thiếu câu trả lời");
        Ctx c = ctx();
        UnitAccess a = c.access(unitId);
        PlanUnit u = a.unit();
        if (!u.isReview()) throw bad("Bài này không phải bài ôn hay bài kiểm tra");
        if (a.status() == UnitStatus.LOCKED) throw bad("Bài này chưa mở khóa: cần hoàn thành bài trước");
        Set<ItemKey> pool = new HashSet<>();
        c.units().stream().filter(x -> u.reviewOf().contains(x.id())).forEach(x -> pool.addAll(x.items()));
        Map<ItemKey, Boolean> answers = new LinkedHashMap<>();
        for (TestAnswer t : r.answers())
            if (t.itemType() != null && t.itemId() != null && pool.contains(new ItemKey(t.itemType(), t.itemId())))
                answers.putIfAbsent(new ItemKey(t.itemType(), t.itemId()), t.correct());
        int needed = planner.unitCheckItems(u, c.units(), c.progress()).size();
        if (answers.size() < needed) throw bad("Cần trả lời đủ " + needed + " câu của bài này");

        Instant now = Instant.now();
        boolean planned = c.sp().unitIds().contains(u.id());
        LocalDate scheduledFor = planned ? c.today() : Optional.ofNullable(firstPlannedDays(c).get(u.id())).orElseGet(() ->
                scheduledDate(suggestedForecast(c, 60), u.id()));
        String source = planned || (scheduledFor != null && !scheduledFor.isAfter(c.today())) ? "SCHEDULED" : "AHEAD";
        List<StoredResult> logged = new ArrayList<>();
        List<ItemKey> wrong = new ArrayList<>();
        answers.forEach((k, ok) -> {
            applyAnswer(c.user(), k, ok, true, true, now);
            logged.add(new StoredResult(k.type(), k.id(), "unit-check", ok, true, now, Phase.TEST, null, null, u.id(), null));
            if (!ok) wrong.add(k);
        });
        double score = (double) (answers.size() - wrong.size()) / answers.size();
        boolean passed = !u.test() || planner.chapterPassed(score);
        logged.add(new StoredResult(null, u.id(), UNIT_RESULT, passed, false, now, null, source, scheduledFor, u.id(), score));
        log(c.user(), c.dp(), logged, now);
        int pass = (int) Math.round(properties.engine().chapterPassScore() * 100);
        String message = !u.test() ? "Đã hoàn thành bài ôn. Bài tiếp theo đã mở."
                : passed ? "Đạt! Bạn đã qua bài kiểm tra, bài tiếp theo đã mở."
                : "Chưa đạt " + pass + "%. Các nội dung sai được đánh dấu Yếu; ôn lại rồi làm lại bài này nhé.";
        return new TestView(u.test() ? "CHAPTER" : "UNIT_REVIEW", score, null, score, passed, false, wrong, message);
    }

    private UnitStateView view(Ctx c, UnitAccess a, Map<String, LocalDate[]> ahead, Map<String, LocalDate> firstPlanned,
                               List<ForecastDay> forecast, boolean todayDone) {
        PlanUnit u = a.unit();
        Curriculum.Chapter ch = chapterOf(catalog.curriculumOf(PATH_ID), u.id());
        Map<String, PlanUnit> byId = c.units().stream().collect(Collectors.toMap(PlanUnit::id, x -> x, (x, y) -> x));
        List<ItemKey> scope = u.isReview()
                ? c.units().stream().filter(x -> u.reviewOf().contains(x.id())).flatMap(x -> x.items().stream()).toList() : u.items();
        int understood = (int) scope.stream().filter(k -> c.progress().containsKey(k) && c.progress().get(k).atLeast(MasteryState.UNDERSTOOD)).count();
        List<PrerequisiteView> missing = a.missing().stream().map(id -> new PrerequisiteView(id, byId.get(id).title())).toList();
        String reason = missing.isEmpty() ? null
                : "Hoàn thành " + missing.stream().map(m -> "“" + m.title() + "”").collect(Collectors.joining(", ")) + " để mở bài này.";
        boolean inToday = c.sp().unitIds().contains(u.id()) && !(todayDone && a.status() == UnitStatus.COMPLETED);
        LocalDate[] log = ahead.get(u.id());
        LocalDate scheduled = firstPlanned.containsKey(u.id()) ? firstPlanned.get(u.id())
                : log != null && log[0] != null ? log[0] : scheduledDate(forecast, u.id());
        boolean learnedAhead = a.status() == UnitStatus.COMPLETED && log != null && log[0] != null && log[1].isBefore(log[0]);
        double minutes = u.isReview() ? planner.unitCheckItems(u, c.units(), c.progress()).size() * planner.testCost()
                : (a.status() == UnitStatus.COMPLETED ? u.items().stream() : u.items().stream().filter(k -> !c.introduced().contains(k)))
                        .mapToDouble(k -> planner.newCost(k.type())).sum();
        return new UnitStateView(u.id(), u.title(), unitKind(u), ch == null ? null : ch.id(), ch == null ? null : ch.title(), a.status(),
                reason, missing, scope.size(), a.itemsLearned(), scope.isEmpty() ? 0 : understood * 100 / scope.size(),
                scheduled, inToday, learnedAhead, log == null ? null : log[1], (int) Math.max(1, Math.ceil(minutes)));
    }

    /** Lessons learned ahead, from the whole answer log: unit id → [planned day, day learned]. The first record wins. */
    private Map<String, LocalDate[]> aheadLog(Ctx c) {
        Map<String, LocalDate[]> out = new HashMap<>();
        for (LearningSession s : sessionRepository.findByUserIdAndStartedAtAfter(c.user().getId(), Instant.EPOCH)) {
            if (s.getKind() != PathSessionKind.DAILY) continue;
            for (StoredResult r : results(s)) {
                if (!"AHEAD".equals(r.source()) || r.at() == null || (r.itemType() == null && !r.correct())) continue;
                unitOfResult(r, c.units()).ifPresent(u -> out.putIfAbsent(u.id(), new LocalDate[] {r.scheduledFor(), r.at().atZone(c.zone()).toLocalDate()}));
            }
        }
        return out;
    }

    /** First stored day each unit was planned on (the original suggestion, kept for statistics). */
    private Map<String, LocalDate> firstPlannedDays(Ctx c) {
        Map<String, LocalDate> out = new HashMap<>();
        for (DailyPlan d : dailyPlanRepository.findByPlanIdOrderByLocalDateDesc(c.plan().getId()))
            for (String id : read(d).unitIds()) out.merge(id, d.getLocalDate(), (x, y) -> x.isBefore(y) ? x : y);
        return out;
    }

    @Transactional
    public ProfileResponse setPace(PaceRequest r) {
        if (r == null || r.pace() == null) throw bad("Thiếu tốc độ học");
        User user = user();
        PathProfile p = requireProfile(user);
        p.setPace(r.pace());
        profileRepository.save(p);
        return toResponse(p, activePlan(user).orElse(null));
    }

    /** Path units with kana ids and vocab lessons expanded to Tango word ids (in lesson order). */
    List<PlanUnit> units() {
        Curriculum c = catalog.curriculumOf(PATH_ID);
        Curriculum.Path path = catalog.path(PATH_ID).orElseThrow();
        Map<Integer, List<String>> wordsByLesson = new HashMap<>();
        lessonVocabulary().stream()
                .sorted(Comparator.comparingInt(TangoLessonVocabulary::getPosition))
                .forEach(lv -> wordsByLesson.computeIfAbsent(lv.getLesson().getLessonNumber(), x -> new ArrayList<>())
                        .add(lv.getVocabulary().getId().toString()));
        Set<ItemKey> seen = new HashSet<>();
        List<PlanUnit> out = new ArrayList<>();
        for (Curriculum.Unit u : c.unitsOf(path)) {
            List<ItemKey> items = new ArrayList<>();
            u.kanaIds().forEach(k -> items.add(new ItemKey(PathItemType.KANA, k)));
            u.grammar().forEach(g -> items.add(new ItemKey(PathItemType.GRAMMAR, g)));
            for (int lesson : u.vocabLessons())
                for (String id : wordsByLesson.getOrDefault(lesson, List.of())) items.add(new ItemKey(PathItemType.VOCAB, id));
            u.kanji().forEach(k -> items.add(new ItemKey(PathItemType.KANJI, k)));
            out.add(new PlanUnit(u.id(), u.order(), u.topic(), u.prerequisites(), items.stream().filter(seen::add).toList(), u.reviewOf(), u.isTest()));
        }
        return out;
    }

    private List<TangoLessonVocabulary> lessonVocabulary() {
        return lessonVocabularyRepository.findPublishedByLevel(JlptLevel.valueOf(catalog.curriculumOf(PATH_ID).level()));
    }

    private Set<Integer> pathLessons() {
        Curriculum c = catalog.curriculumOf(PATH_ID);
        return c.unitsOf(catalog.path(PATH_ID).orElseThrow()).stream()
                .flatMap(u -> u.vocabLessons().stream()).collect(Collectors.toSet());
    }

    private static List<ItemKey> ordered(List<PlanUnit> units, PathItemType type) {
        return units.stream().flatMap(u -> u.items().stream()).filter(k -> k.type() == type).toList();
    }

    private static List<String> ids(List<ItemKey> keys) {
        return keys.stream().map(ItemKey::id).toList();
    }

    /**
     * Progress adapter (the ItemProgressView of the design): one ItemState per path item, read from the table that
     * owns it. Nothing is copied between tables.
     */
    Map<ItemKey, ItemState> progress(User user, List<PlanUnit> units) {
        Set<ItemKey> inPath = new LinkedHashSet<>();
        units.forEach(u -> inPath.addAll(u.items()));
        Map<ItemKey, ItemState> out = new HashMap<>();
        for (ItemProgress ip : itemProgressRepository.findByUserId(user.getId())) {
            ItemState s = toState(ip);
            if (inPath.contains(s.key())) out.put(s.key(), s);
        }
        for (KanaItemProgress kp : kanaProgressRepository.findByUserId(user.getId())) {
            ItemState s = kanaState(kp);
            if (inPath.contains(s.key())) out.put(s.key(), s);
        }
        List<Long> vocabIds = inPath.stream().filter(k -> k.type() == PathItemType.VOCAB).map(k -> Long.valueOf(k.id())).toList();
        if (!vocabIds.isEmpty()) {
            for (UserVocabularyProgress p : vocabularyProgressRepository.findByUserIdAndTangoVocabularyIdIn(user.getId(), vocabIds)) {
                ItemState s = vocabState(p);
                out.put(s.key(), s);
            }
        }
        return out;
    }

    private ItemState vocabState(UserVocabularyProgress p) {
        ItemKey k = new ItemKey(PathItemType.VOCAB, p.getTangoVocabulary().getId().toString());
        MasteryState st = mastery.forVocab(p.getTimesSeen(), p.getRepetitions(), p.getCorrectCount(), p.getIncorrectCount(),
                p.getStatus(), p.getLastReviewTime(), p.getNextReviewTime());
        return new ItemState(k, st, p.getRepetitions(), instant(p.getNextReviewTime()), p.getCorrectCount(), p.getIncorrectCount(),
                instant(p.getLastReviewTime()), p.isWeak());
    }

    private ItemState kanaState(KanaItemProgress kp) {
        ItemKey k = new ItemKey(PathItemType.KANA, kp.getScript() + ":" + kp.getKana());
        MasteryState st = mastery.forKana(kp.getCorrectCount(), kp.getWrongCount(), kp.getSrsStage(), kp.isMastered(), kp.getAnswerStreak());
        // Kana seen only on the Kana page has no path schedule yet: due now, so the path reviews it once.
        Instant next = kp.getNextReviewAt() != null ? kp.getNextReviewAt() : st == MasteryState.NOT_STARTED ? null : instant(kp.getLastSeenAt());
        return new ItemState(k, st, kp.getSrsStage(), next, kp.getCorrectCount(), kp.getWrongCount(), instant(kp.getLastSeenAt()), kp.isWeak());
    }

    /** UserVocabularyProgress and KanaItemProgress store server-local LocalDateTime. */
    private static Instant instant(LocalDateTime t) {
        return t == null ? null : t.atZone(ZoneId.systemDefault()).toInstant();
    }

    private KanaItemProgress kanaProgress(User user, ItemKey k, Map<String, String> sections) {
        String[] parts = k.id().split(":", 2);
        return kanaProgressRepository.findByUserIdAndScriptAndKana(user.getId(), parts[0], parts[1])
                .orElseGet(() -> KanaItemProgress.builder().user(user).script(parts[0]).kana(parts[1])
                        .section(sections.getOrDefault(k.id(), "basic")).build());
    }

    private ItemProgress itemProgress(User user, ItemKey k) {
        return itemProgressRepository.findByUserIdAndItemTypeAndItemId(user.getId(), k.type(), k.id())
                .orElseGet(() -> ItemProgress.builder().user(user).itemType(k.type()).itemId(k.id()).build());
    }

    private static ItemState toState(ItemProgress ip) {
        return new ItemState(new ItemKey(ip.getItemType(), ip.getItemId()), ip.getMasteryState(), ip.getSrsStage(),
                ip.getNextReviewAt(), ip.getCorrectCount(), ip.getWrongCount(), ip.getLastReviewedAt(), ip.isWeak());
    }

    private static void apply(ItemProgress ip, ItemState s) {
        ip.setMasteryState(s.state());
        ip.setSrsStage(s.stage());
        ip.setNextReviewAt(s.nextReviewAt());
        ip.setCorrectCount(s.correct());
        ip.setWrongCount(s.wrong());
        ip.setLastReviewedAt(s.lastReviewedAt());
    }

    private static ProfileResponse toResponse(PathProfile p, LearningPlan plan) {
        return new ProfileResponse(p.getCurrentLevel(), p.getGoal(), p.getMinutesPerDay(), p.getDaysPerWeek(),
                p.getTargetLevel(), p.getTargetDate(), p.getTimezone(), plan == null ? null : plan.getStartDate(), p.pace());
    }

    private String json(Object o) {
        return objectMapper.writeValueAsString(o);
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String truncate(String s, int max) {
        return s == null ? null : s.length() <= max ? s : s.substring(0, max);
    }
}
