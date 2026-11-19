package com.vocabpet.backend.service.learningpath;

import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.vocabpet.backend.config.LearningPathProperties;
import com.vocabpet.backend.entity.DailyPlan;
import com.vocabpet.backend.entity.ItemProgress;
import com.vocabpet.backend.entity.LearningPlan;
import com.vocabpet.backend.entity.LearningSession;
import com.vocabpet.backend.entity.PathProfile;
import com.vocabpet.backend.entity.QuestionReport;
import com.vocabpet.backend.entity.TangoLessonVocabulary;
import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.LearningSource;
import com.vocabpet.backend.entity.enums.MasteryState;
import com.vocabpet.backend.entity.enums.PathGoal;
import com.vocabpet.backend.entity.enums.PathItemType;
import com.vocabpet.backend.entity.enums.PathPlanStatus;
import com.vocabpet.backend.entity.enums.PathSessionKind;
import com.vocabpet.backend.entity.enums.PathStartingLevel;
import com.vocabpet.backend.entity.enums.Rating;
import com.vocabpet.backend.repository.DailyPlanRepository;
import com.vocabpet.backend.repository.ItemProgressRepository;
import com.vocabpet.backend.repository.LearningPlanRepository;
import com.vocabpet.backend.repository.LearningSessionRepository;
import com.vocabpet.backend.repository.PathProfileRepository;
import com.vocabpet.backend.repository.QuestionReportRepository;
import com.vocabpet.backend.repository.TangoLessonVocabularyRepository;
import com.vocabpet.backend.repository.TangoVocabularyRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;
import com.vocabpet.backend.service.CurrentUserService;
import com.vocabpet.backend.service.LearningEngineService;
import com.vocabpet.backend.service.LearningReviewService;
import com.vocabpet.backend.service.learningpath.PathModel.*;

import lombok.RequiredArgsConstructor;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * Learning Path glue: loads profile, curriculum and progress, runs the pure engine (PathPlanner), stores DailyPlan.
 * Vocabulary progress is read from and written to UserVocabularyProgress through the existing learning engine,
 * so the Today review block and the Review Center share one queue.
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
    private final LearningSessionRepository sessionRepository;
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
                                  JlptLevel targetLevel, LocalDate targetDate, String timezone, LocalDate startDate) {}

    public record VocabItem(String id, String word, String kana, String romaji, String meaning, int lesson) {}

    public record PlacementQuestions(List<String> grammar, List<String> vocab, List<String> kanji) {}

    public record PlacementRequest(List<PlacementAnswerDto> answers) {}

    public record PlacementAnswerDto(PathItemType itemType, String itemId, boolean correct) {}

    public record PlacementResult(int grammarKnown, int vocabKnown, int kanjiKnown) {}

    public record TodayItem(PathItemType itemType, String itemId, boolean done) {}

    public record TodayBlock(BlockType type, List<TodayItem> items, int minutes, String status) {}

    public record TodayResponse(PathInfo path, LocalDate date, boolean studyDay, int dayIndex, int totalDays,
                                int progressPercent, int itemsUnderstood, int itemsTotal, int streak,
                                List<TodayBlock> blocks, int totalMinutes, boolean completed,
                                boolean reducedForAccuracy, int deferredReviews,
                                Feasibility feasibility, List<ForecastDay> forecast, ProfileResponse profile) {}

    public record AnswerRequest(PathItemType itemType, String itemId, Boolean correct, boolean review, String questionKind) {}

    public record AnswerResponse(MasteryState masteryState) {}

    public record ReviewQueueItem(PathItemType itemType, String itemId) {}

    public record ReportRequest(PathItemType itemType, String itemId, String questionKind, String questionJson, String comment) {}

    /** Stored in DailyPlan.blocksJson. */
    record StoredBlock(BlockType type, List<ItemKey> items, double minutes) {}

    record StoredPlan(boolean studyDay, List<StoredBlock> blocks, boolean reducedForAccuracy, int deferredReviews) {}

    /** One answer in LearningSession.resultsJson. */
    record StoredResult(PathItemType itemType, String itemId, String questionKind, boolean correct, boolean review, Instant at) {}

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
        plan.setTargetDate(r.targetDate());
        plan.setConfigSnapshot(json(Map.of("profile", r, "engine", properties.engine())));
        planRepository.save(plan);

        // Recompute today's plan in place (the row may already have a session attached).
        dailyPlanRepository.findByPlanIdAndLocalDate(plan.getId(), today).ifPresent(dp -> {
            List<PlanUnit> units = units();
            DayPlan fresh = planner.generateDailyPlan(engineProfile(p, plan), progress(user, units), units, Instant.now(), recentAccuracy(user));
            store(dp, fresh);
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
        LocalDate start = activePlan(user).map(LearningPlan::getStartDate).orElse(today);
        Profile draft = new Profile(r.minutesPerDay(), r.daysPerWeek(), start, r.targetDate(), zone);
        List<PlanUnit> units = units();
        return planner.feasibility(draft, progress(user, units), units, today);
    }

    // ---------- content ----------

    /** Every word of the path with its primary Vietnamese meaning, for building questions on the frontend. */
    @Transactional(readOnly = true)
    public List<VocabItem> vocabulary() {
        user();
        Set<Integer> lessons = pathLessons();
        // shortcut: meanings load lazily (one query per word, ~200); add a fetch join if the path grows a lot.
        return lessonVocabulary().stream()
                .filter(lv -> lessons.contains(lv.getLesson().getLessonNumber()))
                .map(lv -> {
                    TangoVocabulary t = lv.getVocabulary();
                    String meaning = t.getMeanings().stream()
                            .sorted(Comparator.comparing((com.vocabpet.backend.entity.TangoVocabularyMeaning m) -> !m.isPrimaryMeaning())
                                    .thenComparingInt(m -> m.getSortOrder()))
                            .map(m -> m.getMeaning()).findFirst().orElse("");
                    return new VocabItem(t.getId().toString(), t.getExpression() != null ? t.getExpression() : t.getKana(),
                            t.getKana(), t.getRomaji(), meaning, lv.getLesson().getLessonNumber());
                })
                .collect(Collectors.toMap(VocabItem::id, v -> v, (a, b) -> a, LinkedHashMap::new))
                .values().stream().toList();
    }

    // ---------- placement ----------

    /** Items to ask, per type, in curriculum order. Grammar marked "learned" in this browser are preferred. */
    @Transactional(readOnly = true)
    public PlacementQuestions placementQuestions(List<String> grammarHints) {
        user();
        List<PlanUnit> units = units();
        Set<ItemKey> hints = new HashSet<>();
        if (grammarHints != null) grammarHints.forEach(h -> hints.add(new ItemKey(PathItemType.GRAMMAR, h)));
        var e = properties.engine();
        return new PlacementQuestions(
                ids(PathPlanner.placementSamples(ordered(units, PathItemType.GRAMMAR), e.placementGrammar(), hints)),
                ids(PathPlanner.placementSamples(ordered(units, PathItemType.VOCAB), e.placementVocab(), Set.of())),
                ids(PathPlanner.placementSamples(ordered(units, PathItemType.KANJI), e.placementKanji(), Set.of())));
    }

    /** Known items become provisionally understood and are reviewed tomorrow, so the SRS confirms or corrects them. */
    @Transactional
    public PlacementResult submitPlacement(PlacementRequest r) {
        User user = user();
        if (r == null || r.answers() == null) throw bad("Thiếu câu trả lời");
        List<PlanUnit> units = units();
        Map<ItemKey, ItemState> progress = progress(user, units);
        Instant now = Instant.now();
        int[] known = new int[3];
        List<StoredResult> results = new ArrayList<>();
        for (PathItemType type : List.of(PathItemType.GRAMMAR, PathItemType.VOCAB, PathItemType.KANJI)) {
            List<ItemKey> ordered = ordered(units, type);
            List<PlacementAnswer> answers = r.answers().stream()
                    .filter(a -> a.itemType() == type && a.itemId() != null)
                    .map(a -> new PlacementAnswer(new ItemKey(type, a.itemId()), a.correct()))
                    .filter(a -> ordered.contains(a.key()))
                    .toList();
            answers.forEach(a -> results.add(new StoredResult(type, a.key().id(), "placement", a.correct(), false, now)));
            for (ItemKey k : PathPlanner.placementKnown(ordered, answers)) {
                ItemState current = progress.get(k);
                if (current != null && current.introduced()) continue; // never overwrite real progress
                if (type == PathItemType.VOCAB) {
                    tangoVocabularyRepository.findById(Long.valueOf(k.id())).ifPresent(t -> learningEngine.recordPlacement(user, t));
                } else {
                    ItemProgress ip = itemProgress(user, k);
                    apply(ip, srs.provisionallyKnown(toState(ip), now));
                    ip.setProvisional(true);
                    itemProgressRepository.save(ip);
                }
                known[type.ordinal()]++;
            }
        }
        sessionRepository.save(LearningSession.builder().user(user).kind(PathSessionKind.PLACEMENT)
                .startedAt(now).endedAt(now).resultsJson(json(results)).build());
        return new PlacementResult(known[PathItemType.GRAMMAR.ordinal()], known[PathItemType.VOCAB.ordinal()], known[PathItemType.KANJI.ordinal()]);
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
        Instant dayStart = today.atStartOfDay(zone).toInstant();

        List<TodayBlock> blocks = new ArrayList<>();
        int total = 0, done = 0;
        for (StoredBlock b : sp.blocks()) {
            List<TodayItem> items = b.items().stream().map(k -> {
                ItemState s = progress.get(k);
                return new TodayItem(k.type(), k.id(), s != null && s.lastReviewedAt() != null && !s.lastReviewedAt().isBefore(dayStart));
            }).toList();
            long d = items.stream().filter(TodayItem::done).count();
            total += items.size();
            done += (int) d;
            String status = d == items.size() ? "DONE" : d == 0 ? "NOT_STARTED" : "IN_PROGRESS";
            blocks.add(new TodayBlock(b.type(), items, (int) Math.round(b.minutes()), status));
        }
        if (total > 0 && done == total && dp.getCompletedAt() == null) {
            dp.setCompletedAt(now);
            dailyPlanRepository.save(dp);
        }

        Set<LocalDate> completedDays = dailyPlanRepository.findByPlanIdOrderByLocalDateDesc(plan.getId()).stream()
                .filter(x -> x.getCompletedAt() != null).map(DailyPlan::getLocalDate).collect(Collectors.toSet());
        DayPlan asDayPlan = new DayPlan(today, sp.studyDay(),
                sp.blocks().stream().map(b -> new Block(b.type(), b.items(), b.minutes())).toList(),
                dp.getEstimatedMinutes(), sp.reducedForAccuracy(), sp.deferredReviews());
        long itemsTotal = units.stream().mapToLong(u -> u.items().size()).sum();
        long understood = units.stream().flatMap(u -> u.items().stream())
                .filter(k -> progress.containsKey(k) && progress.get(k).atLeast(MasteryState.UNDERSTOOD)).count();

        return new TodayResponse(pathInfo(), today, sp.studyDay(),
                PathPlanner.studyDaysBetween(plan.getStartDate(), today, p.daysPerWeek()),
                PathPlanner.studyDaysBetween(plan.getStartDate(), plan.getTargetDate(), p.daysPerWeek()),
                PathPlanner.progressPercent(progress, units), (int) understood, (int) itemsTotal,
                PathPlanner.streak(today, completedDays, p.daysPerWeek(), plan.getStartDate()),
                blocks, dp.getEstimatedMinutes(), dp.getCompletedAt() != null,
                sp.reducedForAccuracy(), sp.deferredReviews(),
                planner.feasibility(p, progress, units, today),
                planner.forecast(p, progress, units, asDayPlan, 7),
                toResponse(profile, plan));
    }

    /** One graded answer from a Today block, the Review Center or a placement retry. */
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
        boolean correct = r.correct();

        MasteryState state;
        if (key.type() == PathItemType.VOCAB) {
            UserVocabularyProgress p = reviewService.reviewWord(Long.valueOf(key.id()), null,
                    correct ? Rating.GOOD : Rating.AGAIN, r.review() ? LearningSource.REVIEW : LearningSource.TANGO);
            state = vocabState(p);
        } else {
            ItemProgress ip = itemProgress(user, key);
            apply(ip, srs.scheduleNextReview(toState(ip), correct, now));
            ip.setProvisional(false);
            itemProgressRepository.save(ip);
            state = ip.getMasteryState();
        }

        DailyPlan dp = todayPlan(user, profile, plan, units, progress(user, units), now);
        LearningSession session = sessionRepository.findFirstByDailyPlanIdAndKindOrderByIdDesc(dp.getId(), PathSessionKind.DAILY)
                .orElseGet(() -> LearningSession.builder().user(user).dailyPlan(dp).kind(PathSessionKind.DAILY).startedAt(now).build());
        List<StoredResult> results = new ArrayList<>(session.getResultsJson() == null ? List.of()
                : objectMapper.readValue(session.getResultsJson(), new TypeReference<List<StoredResult>>() {}));
        results.add(new StoredResult(key.type(), key.id(), truncate(r.questionKind(), 32), correct, r.review(), now));
        session.setResultsJson(json(results));
        session.setEndedAt(now);
        sessionRepository.save(session);
        return new AnswerResponse(state);
    }

    /** Grammar and kanji due now. Review Center shows these next to due words; answers go through {@link #answer}. */
    @Transactional(readOnly = true)
    public List<ReviewQueueItem> reviewQueue() {
        User user = user();
        if (activePlan(user).isEmpty()) return List.of();
        Set<ItemKey> inPath = units().stream().flatMap(u -> u.items().stream()).collect(Collectors.toSet());
        Instant now = Instant.now();
        return itemProgressRepository.findByUserId(user.getId()).stream()
                .filter(ip -> ip.getNextReviewAt() != null && !ip.getNextReviewAt().isAfter(now))
                .filter(ip -> ip.getMasteryState() != MasteryState.NOT_STARTED)
                .filter(ip -> inPath.contains(new ItemKey(ip.getItemType(), ip.getItemId())))
                .sorted(Comparator.comparing(ItemProgress::getNextReviewAt))
                .map(ip -> new ReviewQueueItem(ip.getItemType(), ip.getItemId()))
                .toList();
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

    private Profile engineProfile(PathProfile p, LearningPlan plan) {
        return new Profile(p.getMinutesPerDay(), p.getDaysPerWeek(), plan.getStartDate(), plan.getTargetDate(), ZoneId.of(p.getTimezone()));
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
            DayPlan generated = planner.generateDailyPlan(engineProfile(profile, plan), progress, units, now, recentAccuracy(user));
            DailyPlan dp = DailyPlan.builder().plan(plan).localDate(today).build();
            store(dp, generated);
            // shortcut: two first requests racing hit the unique key and one fails; the client's retry then reads the saved row.
            return dailyPlanRepository.saveAndFlush(dp);
        });
    }

    private void store(DailyPlan dp, DayPlan plan) {
        dp.setBlocksJson(json(new StoredPlan(plan.studyDay(),
                plan.blocks().stream().map(b -> new StoredBlock(b.type(), b.items(), b.minutes())).toList(),
                plan.reducedForAccuracy(), plan.deferredReviews())));
        dp.setEstimatedMinutes(plan.totalMinutes());
    }

    private StoredPlan read(DailyPlan dp) {
        return objectMapper.readValue(dp.getBlocksJson(), StoredPlan.class);
    }

    /** Review accuracy over the last few days, or null when there are too few review answers to judge. */
    private Double recentAccuracy(User user) {
        var e = properties.engine();
        Instant since = Instant.now().minus(Duration.ofDays(e.accuracyWindowDays()));
        int n = 0, ok = 0;
        for (LearningSession s : sessionRepository.findByUserIdAndStartedAtAfter(user.getId(), since)) {
            if (s.getKind() != PathSessionKind.DAILY || s.getResultsJson() == null) continue;
            for (StoredResult r : objectMapper.readValue(s.getResultsJson(), new TypeReference<List<StoredResult>>() {})) {
                if (!r.review()) continue;
                n++;
                if (r.correct()) ok++;
            }
        }
        return n < e.minAnswersForAccuracy() ? null : (double) ok / n;
    }

    /** Path units with vocab lessons expanded to Tango word ids (in lesson order). */
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
            u.grammar().forEach(g -> items.add(new ItemKey(PathItemType.GRAMMAR, g)));
            for (int lesson : u.vocabLessons())
                for (String id : wordsByLesson.getOrDefault(lesson, List.of())) items.add(new ItemKey(PathItemType.VOCAB, id));
            u.kanji().forEach(k -> items.add(new ItemKey(PathItemType.KANJI, k)));
            out.add(new PlanUnit(u.id(), u.order(), u.prerequisites(), items.stream().filter(seen::add).toList()));
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

    /** Progress of every path item: grammar/kanji from ItemProgress, vocab derived from UserVocabularyProgress. */
    Map<ItemKey, ItemState> progress(User user, List<PlanUnit> units) {
        Set<ItemKey> inPath = new LinkedHashSet<>();
        units.forEach(u -> inPath.addAll(u.items()));
        Map<ItemKey, ItemState> out = new HashMap<>();
        for (ItemProgress ip : itemProgressRepository.findByUserId(user.getId())) {
            ItemState s = toState(ip);
            if (inPath.contains(s.key())) out.put(s.key(), s);
        }
        List<Long> vocabIds = inPath.stream().filter(k -> k.type() == PathItemType.VOCAB).map(k -> Long.valueOf(k.id())).toList();
        if (!vocabIds.isEmpty()) {
            for (UserVocabularyProgress p : vocabularyProgressRepository.findByUserIdAndTangoVocabularyIdIn(user.getId(), vocabIds)) {
                ItemKey k = new ItemKey(PathItemType.VOCAB, p.getTangoVocabulary().getId().toString());
                out.put(k, new ItemState(k, vocabState(p), p.getRepetitions(), instant(p.getNextReviewTime()),
                        p.getCorrectCount(), p.getIncorrectCount(), instant(p.getLastReviewTime())));
            }
        }
        return out;
    }

    private MasteryState vocabState(UserVocabularyProgress p) {
        return mastery.forVocab(p.getTimesSeen(), p.getRepetitions(), p.getCorrectCount(), p.getIncorrectCount(),
                p.getStatus(), p.getLastReviewTime(), p.getNextReviewTime());
    }

    /** UserVocabularyProgress stores server-local LocalDateTime (LocalDateTime.now()). */
    private static Instant instant(LocalDateTime t) {
        return t == null ? null : t.atZone(ZoneId.systemDefault()).toInstant();
    }

    private ItemProgress itemProgress(User user, ItemKey k) {
        return itemProgressRepository.findByUserIdAndItemTypeAndItemId(user.getId(), k.type(), k.id())
                .orElseGet(() -> ItemProgress.builder().user(user).itemType(k.type()).itemId(k.id()).build());
    }

    private static ItemState toState(ItemProgress ip) {
        return new ItemState(new ItemKey(ip.getItemType(), ip.getItemId()), ip.getMasteryState(), ip.getSrsStage(),
                ip.getNextReviewAt(), ip.getCorrectCount(), ip.getWrongCount(), ip.getLastReviewedAt());
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
                p.getTargetLevel(), p.getTargetDate(), p.getTimezone(), plan == null ? null : plan.getStartDate());
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
