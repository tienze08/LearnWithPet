package com.vocabpet.backend.service.learningpath;

import static java.time.DayOfWeek.*;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.vocabpet.backend.config.LearningPathProperties.Engine;
import com.vocabpet.backend.entity.enums.MasteryState;
import com.vocabpet.backend.entity.enums.PathItemType;
import com.vocabpet.backend.service.learningpath.PathModel.*;

/**
 * Learning Engine: deterministic, pure functions over plain values (no DB, no clock, no Spring).
 * Builds each day as four phases (review, learn, practice, test), walks the curriculum one unit at a time,
 * places a weekly test at the end of every cycle and adapts to test results and weak skills.
 */
public class PathPlanner {

    /** Which weekdays are study days for a given days-per-week: 3 = Mon/Wed/Fri, 5 = Mon–Fri, 6 = Mon–Sat. */
    private static final List<DayOfWeek> DAY_PREFERENCE = List.of(MONDAY, WEDNESDAY, FRIDAY, TUESDAY, THURSDAY, SATURDAY, SUNDAY);
    private static final List<PathItemType> TYPE_ORDER = List.of(PathItemType.KANA, PathItemType.GRAMMAR, PathItemType.VOCAB, PathItemType.KANJI);

    private final Engine cfg;

    public PathPlanner(Engine cfg) {
        this.cfg = cfg;
    }

    // ---------- calendar ----------

    public static Set<DayOfWeek> studyDays(int daysPerWeek) {
        return EnumSet.copyOf(DAY_PREFERENCE.subList(0, Math.max(1, Math.min(7, daysPerWeek))));
    }

    public static boolean isStudyDay(LocalDate d, int daysPerWeek) {
        return studyDays(daysPerWeek).contains(d.getDayOfWeek());
    }

    /** Study days in [from, to], both inclusive; 0 when to is before from. */
    public static int studyDaysBetween(LocalDate from, LocalDate to, int daysPerWeek) {
        Set<DayOfWeek> days = studyDays(daysPerWeek);
        int n = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) if (days.contains(d.getDayOfWeek())) n++;
        return n;
    }

    /** Date of the n-th study day counting from {@code from} (inclusive); {@code from} itself when n <= 0. */
    public static LocalDate nthStudyDay(LocalDate from, int n, int daysPerWeek) {
        Set<DayOfWeek> days = studyDays(daysPerWeek);
        LocalDate d = from;
        int seen = 0;
        while (n > 0) {
            if (days.contains(d.getDayOfWeek()) && ++seen == n) return d;
            d = d.plusDays(1);
        }
        return from;
    }

    /**
     * Study days of one cycle that are lessons; the study day after them is the weekly test, so a cycle is daysPerWeek
     * study days (one calendar week). With 1 or 2 days a week a test every 1–2 days would test almost nothing, so the
     * cycle is 2 lessons + the test (3 study days).
     */
    int lessonsPerCycle(int daysPerWeek) {
        return daysPerWeek <= 2 ? 2 : daysPerWeek - 1;
    }

    /** Lesson days in [from, to]: study days minus one weekly test per cycle. */
    int lessonDaysBetween(LocalDate from, LocalDate to, int daysPerWeek) {
        int sd = studyDaysBetween(from, to, daysPerWeek);
        return sd - sd / (lessonsPerCycle(daysPerWeek) + 1);
    }

    // ---------- costs ----------

    /** Minutes to learn one new item, without its practice question. */
    double learnCost(PathItemType t) {
        return switch (t) {
            case KANA -> cfg.kanaSeconds() / 60.0;
            case GRAMMAR -> cfg.grammarMinutes();
            case VOCAB -> cfg.vocabSeconds() / 60.0;
            case KANJI -> cfg.kanjiMinutes();
        };
    }

    double practiceCost() {
        return cfg.practiceSeconds() / 60.0;
    }

    double reviewCost() {
        return cfg.reviewSeconds() / 60.0;
    }

    double testCost() {
        return cfg.testSeconds() / 60.0;
    }

    /** A new item costs its lesson plus its practice question. */
    double newCost(PathItemType t) {
        return learnCost(t) + practiceCost();
    }

    // ---------- daily plan ----------

    /**
     * Today's plan, frozen by the caller for the rest of the day.
     *
     * @param progress       state of every path item the user has touched (missing = not started)
     * @param recentAccuracy recent review accuracy, or null when there are too few answers to judge
     * @param cycle          position in the current cycle and the last weekly test's adjustments
     * @param dayNumber      "Ngày N" of the plan
     */
    public DayPlan generateDailyPlan(Profile p, Map<ItemKey, ItemState> progress, List<PlanUnit> units,
                                     Instant now, Double recentAccuracy, CycleState cycle, int dayNumber) {
        LocalDate today = now.atZone(p.zone()).toLocalDate();
        Instant endOfDay = today.plusDays(1).atStartOfDay(p.zone()).toInstant();
        double budget = p.minutesPerDay();
        List<ItemKey> due = dueSorted(progress, endOfDay);
        Set<ItemKey> introduced = introduced(progress.values());
        Skill weakSkill = weakestSkill(skillScores(progress, units));

        if (!isStudyDay(today, p.daysPerWeek())) {
            List<ItemKey> reviews = limit(due, budget * cfg.maxReviewShare(), reviewCost());
            return assemble(today, DayKind.REST, dayNumber, "Ngày nghỉ", List.of(), reviews, List.of(), List.of(), List.of(), false, due.size() - reviews.size());
        }

        double testReserve = cfg.testQuestions() * testCost();
        boolean weeklyTest = cycle.lessonDaysDone() >= lessonsPerCycle(p.daysPerWeek()) && !cycle.cycleItems().isEmpty();
        PlanUnit unit = weeklyTest ? null : currentUnits(units, introduced, cycle.completedReviewUnits());

        // 01 · Review: due items, weak first, at most maxReviewShare of the day.
        List<ItemKey> reviews = limit(due, budget * cfg.maxReviewShare(), reviewCost());
        double used = reviews.size() * reviewCost();

        if (weeklyTest) {
            List<ItemKey> consolidate = prioritise(cycle.cycleItems(), progress, weakSkill).stream().limit(cfg.consolidateMax()).toList();
            Set<ItemKey> weakPool = new LinkedHashSet<>(cycle.extraPractice());
            weakPool.addAll(weakItems(progress, units));
            List<ItemKey> practice = prioritise(weakPool, progress, weakSkill).stream().limit(cfg.practiceExtraMax() * 2L).toList();
            if (practice.isEmpty()) practice = consolidate.stream().limit(cfg.practiceExtraMax()).toList();
            List<ItemKey> test = balancedSample(cycle.cycleItems(), units, cfg.weeklyTestQuestions());
            return assemble(today, DayKind.WEEKLY_TEST, dayNumber, "Ngày " + dayNumber + " – Kiểm tra tuần", List.of(),
                    reviews, consolidate, practice, test, false, due.size() - reviews.size());
        }

        if (unit != null && unit.isReview()) {
            // A curriculum review lesson: go over the reviewed units' items, weakest and least practised first.
            Set<ItemKey> pool = new LinkedHashSet<>();
            units.stream().filter(u -> unit.reviewOf().contains(u.id())).forEach(u -> pool.addAll(u.items()));
            // A chapter test samples the whole chapter and needs a bigger test; a review lesson re-tests what it went over.
            double reserve = unit.test() ? cfg.chapterTestQuestions() * testCost() : testReserve;
            double room = Math.max(0, budget - used - reserve);
            int n = (int) Math.floor(room / (reviewCost() + practiceCost()) + 1e-9);
            List<ItemKey> consolidate = prioritise(pool, progress, weakSkill).stream().limit(Math.max(1, n)).toList();
            List<ItemKey> practice = consolidate;
            List<ItemKey> test = unit.test() ? balancedSample(pool, units, cfg.chapterTestQuestions())
                    : consolidate.stream().limit(cfg.testQuestions()).toList();
            return assemble(today, DayKind.UNIT_REVIEW, dayNumber, "Ngày " + dayNumber + " – " + unit.title(), List.of(unit.id()),
                    reviews, consolidate, practice, test, false, due.size() - reviews.size());
        }

        // 02 · Learn: weak items to relearn first (after a weekly test < 60%), then new items of the current unit.
        double room = Math.max(0, budget - used - testReserve);
        List<ItemKey> relearn = new ArrayList<>();
        for (ItemKey k : prioritise(cycle.relearn(), progress, weakSkill)) {
            if (reviews.contains(k)) continue;
            double c = learnCost(k.type()) / 2 + practiceCost();
            if (relearnMinutes(relearn) + c > room * cfg.relearnShare() + 1e-9) break;
            relearn.add(k);
        }
        room -= relearnMinutes(relearn);

        boolean reduced = (recentAccuracy != null && recentAccuracy < cfg.lowAccuracy()) || cycle.reduceNew();
        double quota = Math.min(newQuota(p, units, introduced, today, reduced), room);
        List<PlanUnit> picked = new ArrayList<>();
        List<ItemKey> fresh = unit == null ? List.of() : pickFromUnits(units, unit, introduced, cycle.completedReviewUnits(), quota, weakSkill, picked);

        if (fresh.isEmpty() && unit != null && !unit.isReview()) {
            // Never stall: learn at least one item, giving up review time if needed.
            ItemKey first = unit.items().stream().filter(k -> !introduced.contains(k)).findFirst().orElse(null);
            if (first != null) {
                fresh = List.of(first);
                picked = List.of(unit);
                double over = used + newCost(first.type()) + testReserve - budget;
                if (over > 0) reviews = reviews.subList(0, Math.max(0, reviews.size() - (int) Math.ceil(over / reviewCost())));
            }
        }

        List<ItemKey> learn = new ArrayList<>(relearn);
        learn.addAll(fresh);

        if (learn.isEmpty()) {
            // Nothing new or open: a review day built from due and weak items.
            List<ItemKey> dayReviews = limit(due, budget * 0.6, reviewCost());
            List<ItemKey> practice = prioritise(weakItems(progress, units), progress, weakSkill).stream().limit(cfg.practiceExtraMax() * 2L).toList();
            List<ItemKey> test = fill(dayReviews, practice, cfg.testQuestions());
            return assemble(today, DayKind.REVIEW_DAY, dayNumber, "Ngày " + dayNumber + " – Ngày ôn tập", List.of(),
                    dayReviews, List.of(), practice, test, reduced, due.size() - dayReviews.size());
        }

        // 03 · Practice: today's items, plus wrong items of the last weekly test and other weak items (weakest skill first).
        double spent = used + relearnMinutes(relearn) + fresh.stream().mapToDouble(k -> newCost(k.type())).sum() + testReserve;
        int extraRoom = Math.max(0, (int) Math.floor((budget - spent) / practiceCost() + 1e-9));
        Set<ItemKey> extraPool = new LinkedHashSet<>(cycle.extraPractice());
        extraPool.addAll(weakItems(progress, units));
        extraPool.removeAll(learn);
        List<ItemKey> practice = new ArrayList<>(learn);
        prioritise(extraPool, progress, weakSkill).stream().limit(Math.min(extraRoom, cfg.practiceExtraMax())).forEach(practice::add);

        // 04 · Test: today's items first, then some reviewed ones.
        List<ItemKey> test = fill(learn, reviews, cfg.testQuestions());

        String title = "Ngày " + dayNumber + " – " + (picked.isEmpty() ? "Học lại phần yếu" : unitNames(picked, introduced));
        return assemble(today, DayKind.LESSON, dayNumber, title, picked.stream().map(PlanUnit::id).toList(),
                reviews, learn, practice, test, reduced, due.size() - reviews.size());
    }

    /** "Hiragana: hàng K và S (tiếp)": the day's main unit; a second unit that shares the day is added as "(kèm …)". */
    private static String unitNames(List<PlanUnit> picked, Set<ItemKey> introducedBefore) {
        PlanUnit main = picked.get(0);
        String name = main.title() + (main.items().stream().anyMatch(introducedBefore::contains) ? " (tiếp)" : "");
        return picked.size() > 1 ? name + " (kèm " + picked.get(1).title() + ")" : name;
    }

    private double relearnMinutes(List<ItemKey> relearn) {
        return relearn.stream().mapToDouble(k -> learnCost(k.type()) / 2 + practiceCost()).sum();
    }

    private DayPlan assemble(LocalDate date, DayKind kind, int dayNumber, String title, List<String> unitIds,
                             List<ItemKey> review, List<ItemKey> learn, List<ItemKey> practice, List<ItemKey> test,
                             boolean reduced, int deferred) {
        double learnMinutes = kind == DayKind.LESSON
                ? learn.stream().mapToDouble(k -> learnCost(k.type())).sum()
                : learn.size() * reviewCost();
        List<PhasePlan> phases = List.of(
                new PhasePlan(Phase.REVIEW, List.copyOf(review), review.size() * reviewCost()),
                new PhasePlan(Phase.LEARN, List.copyOf(learn), learnMinutes),
                new PhasePlan(Phase.PRACTICE, List.copyOf(practice), practice.size() * practiceCost()),
                new PhasePlan(Phase.TEST, List.copyOf(test), test.size() * testCost()));
        int total = (int) Math.round(phases.stream().mapToDouble(PhasePlan::minutes).sum());
        return new DayPlan(date, kind, dayNumber, title, unitIds, phases, total, reduced, Math.max(0, deferred));
    }

    /** Due by the end of the learner's day; weak first, then most errors, lowest stage, oldest. */
    private static List<ItemKey> dueSorted(Map<ItemKey, ItemState> progress, Instant endOfDay) {
        return progress.values().stream()
                .filter(s -> s.introduced() && s.nextReviewAt() != null && s.nextReviewAt().isBefore(endOfDay))
                .sorted(Comparator.comparing((ItemState s) -> !s.weak())
                        .thenComparing(Comparator.comparingDouble(ItemState::errorRate).reversed())
                        .thenComparingInt(ItemState::stage)
                        .thenComparing(ItemState::nextReviewAt))
                .map(ItemState::key)
                .toList();
    }

    private static List<ItemKey> limit(List<ItemKey> items, double minutes, double each) {
        int n = (int) Math.floor(minutes / each + 1e-9);
        return items.stream().limit(Math.max(0, n)).toList();
    }

    /** a first, then b, distinct, at most n. */
    private static List<ItemKey> fill(List<ItemKey> a, List<ItemKey> b, int n) {
        LinkedHashSet<ItemKey> out = new LinkedHashSet<>();
        for (ItemKey k : a) if (out.size() < n) out.add(k);
        for (ItemKey k : b) if (out.size() < n) out.add(k);
        return List.copyOf(out);
    }

    /** Weak first, then the weakest skill, then lowest stage; ties keep the given order. */
    private static List<ItemKey> prioritise(Collection<ItemKey> items, Map<ItemKey, ItemState> progress, Skill weakSkill) {
        List<ItemKey> list = new ArrayList<>(items);
        list.sort(Comparator.comparing((ItemKey k) -> !(progress.containsKey(k) && progress.get(k).weak()))
                .thenComparing(k -> weakSkill == null || skillOf(k) != weakSkill)
                .thenComparingInt(k -> progress.containsKey(k) ? progress.get(k).stage() : 0));
        return list;
    }

    private static List<ItemKey> weakItems(Map<ItemKey, ItemState> progress, List<PlanUnit> units) {
        Set<ItemKey> inPath = new HashSet<>();
        units.forEach(u -> inPath.addAll(u.items()));
        return progress.values().stream().filter(s -> s.weak() && inPath.contains(s.key())).map(ItemState::key).toList();
    }

    /** Up to n items spread over the units they come from (round robin), in curriculum order. */
    private static List<ItemKey> balancedSample(Set<ItemKey> items, List<PlanUnit> units, int n) {
        List<List<ItemKey>> byUnit = new ArrayList<>();
        for (PlanUnit u : units.stream().sorted(Comparator.comparingInt(PlanUnit::order)).toList()) {
            List<ItemKey> in = u.items().stream().filter(items::contains).toList();
            if (!in.isEmpty()) byUnit.add(in);
        }
        List<ItemKey> out = new ArrayList<>();
        for (int i = 0; out.size() < n; i++) {
            boolean any = false;
            for (List<ItemKey> l : byUnit) {
                if (i < l.size() && out.size() < n) {
                    out.add(l.get(i));
                    any = true;
                }
            }
            if (!any) break;
        }
        return out;
    }

    // ---------- units ----------

    /** A unit is done when every item is introduced; a review unit when it was completed (or skipped). */
    static boolean unitDone(PlanUnit u, Set<ItemKey> introduced, Set<String> completedReviewUnits) {
        return u.isReview() ? completedReviewUnits.contains(u.id()) : introduced.containsAll(u.items());
    }

    /** The unit to learn next: first in curriculum order that is not done and whose prerequisites are all done. */
    static PlanUnit currentUnits(List<PlanUnit> units, Set<ItemKey> introduced, Set<String> completedReviewUnits) {
        Map<String, PlanUnit> byId = new HashMap<>();
        units.forEach(u -> byId.put(u.id(), u));
        for (PlanUnit u : units.stream().sorted(Comparator.comparingInt(PlanUnit::order)).toList()) {
            if (unitDone(u, introduced, completedReviewUnits)) continue;
            boolean open = u.prerequisites().stream().map(byId::get)
                    .allMatch(pre -> pre == null || unitDone(pre, introduced, completedReviewUnits));
            if (open) return u;
        }
        return null;
    }

    /**
     * Unlock state of every unit, in curriculum order. A unit opens as soon as all its prerequisites are completed;
     * {@code attempted} holds review/test units tried but not finished (a failed chapter test), shown as in progress.
     */
    public static List<UnitAccess> unitAccess(List<PlanUnit> units, Set<ItemKey> introduced, Set<String> completedReviewUnits,
                                              Set<String> attempted) {
        Map<String, PlanUnit> byId = new HashMap<>();
        units.forEach(u -> byId.put(u.id(), u));
        List<UnitAccess> out = new ArrayList<>();
        for (PlanUnit u : units.stream().sorted(Comparator.comparingInt(PlanUnit::order)).toList()) {
            int learned = (int) u.items().stream().filter(introduced::contains).count();
            if (unitDone(u, introduced, completedReviewUnits)) {
                out.add(new UnitAccess(u, UnitStatus.COMPLETED, List.of(), learned));
                continue;
            }
            List<String> missing = u.prerequisites().stream()
                    .filter(id -> byId.containsKey(id) && !unitDone(byId.get(id), introduced, completedReviewUnits)).toList();
            UnitStatus s = !missing.isEmpty() ? UnitStatus.LOCKED
                    : learned > 0 || attempted.contains(u.id()) ? UnitStatus.IN_PROGRESS : UnitStatus.AVAILABLE;
            out.add(new UnitAccess(u, s, missing, learned));
        }
        return out;
    }

    /** Items of one unit for a self-paced session: what is left of it, about {@code quota} minutes, at least one item. */
    List<ItemKey> sessionItems(PlanUnit u, Set<ItemKey> introduced, double quota) {
        List<ItemKey> got = pickFromUnit(u, introduced, quota, null);
        return got.isEmpty() ? u.items().stream().filter(k -> !introduced.contains(k)).limit(1).toList() : got;
    }

    /**
     * Questions for a review lesson or chapter test taken on its own (outside a planned day): a chapter test samples
     * the whole chapter like its planned version; a review lesson asks its weakest, least practised items first.
     */
    List<ItemKey> unitCheckItems(PlanUnit unit, List<PlanUnit> units, Map<ItemKey, ItemState> progress) {
        Set<ItemKey> pool = new LinkedHashSet<>();
        units.stream().filter(u -> unit.reviewOf().contains(u.id())).forEach(u -> pool.addAll(u.items()));
        if (unit.test()) return balancedSample(pool, units, cfg.chapterTestQuestions());
        return prioritise(pool, progress, null).stream().limit(cfg.testQuestions()).toList();
    }

    /** New-learning minutes for today: remaining work / remaining lesson days, capped at maxQuotaGrowth × the original pace. */
    double newQuota(Profile p, List<PlanUnit> units, Set<ItemKey> introduced, LocalDate day, boolean reduced) {
        double total = 0, remaining = 0;
        int reviewLessonsLeft = 0;
        for (PlanUnit u : units) {
            if (u.isReview() && !u.reviewOf().stream().allMatch(id -> units.stream().filter(x -> x.id().equals(id)).allMatch(x -> introduced.containsAll(x.items()))))
                reviewLessonsLeft++;
            for (ItemKey k : u.items()) {
                total += newCost(k.type());
                if (!introduced.contains(k)) remaining += newCost(k.type());
            }
        }
        double baseline = total / Math.max(1, lessonDaysBetween(p.startDate(), p.targetDate(), p.daysPerWeek()) * cfg.paceSlack());
        // Review lessons still ahead take whole days without new items.
        double left = (lessonDaysBetween(day, p.targetDate(), p.daysPerWeek()) - reviewLessonsLeft) * cfg.paceSlack();
        double cap = baseline * cfg.maxQuotaGrowth();
        double q = left < 1 ? cap : Math.min(remaining / left, cap);
        if (reduced) q *= 1 - Math.max(cfg.lowAccuracyCut(), cfg.weeklyReduceNewCut());
        return q;
    }

    /**
     * New items from the current unit within {@code quota} minutes, mixing the unit's item types in proportion to
     * what is left of each (the weakest skill gets weakSkillBoost more). When the unit is finished early and enough
     * quota is left, the next open unit continues the same day (small kana units fit two or three to a day).
     * Units actually used are added to {@code picked}.
     */
    List<ItemKey> pickFromUnits(List<PlanUnit> units, PlanUnit first, Set<ItemKey> introduced, Set<String> completedReviewUnits,
                                double quota, Skill weakSkill, List<PlanUnit> picked) {
        Set<ItemKey> known = new HashSet<>(introduced);
        List<ItemKey> out = new ArrayList<>();
        double left = quota;
        PlanUnit u = first;
        while (u != null && !u.isReview() && left > 1e-9 && picked.size() < MAX_UNITS_PER_DAY) {
            List<ItemKey> got = pickFromUnit(u, known, left, weakSkill);
            if (got.isEmpty()) break;
            picked.add(u);
            out.addAll(got);
            known.addAll(got);
            left -= got.stream().mapToDouble(k -> newCost(k.type())).sum();
            boolean finished = known.containsAll(u.items());
            // Kana are new shapes and get a day to themselves; other short units may share a day.
            boolean kana = u.items().stream().anyMatch(k -> k.type() == PathItemType.KANA);
            if (!finished || kana || left < quota * cfg.unitMergeShare()) break;
            u = currentUnits(units, known, completedReviewUnits);
        }
        return out;
    }

    /** One main unit, at most one more: keeps a day to one objective and its title readable. */
    private static final int MAX_UNITS_PER_DAY = 2;

    private List<ItemKey> pickFromUnit(PlanUnit u, Set<ItemKey> known, double quota, Skill weakSkill) {
        Map<PathItemType, List<ItemKey>> remaining = new EnumMap<>(PathItemType.class);
        for (ItemKey k : u.items()) if (!known.contains(k)) remaining.computeIfAbsent(k.type(), t -> new ArrayList<>()).add(k);
        Map<PathItemType, Double> weight = new EnumMap<>(PathItemType.class);
        double sum = 0;
        for (var e : remaining.entrySet()) {
            double w = e.getValue().stream().mapToDouble(k -> newCost(k.type())).sum();
            if (weakSkill != null && e.getValue().stream().anyMatch(k -> skillOf(k) == weakSkill)) w *= 1 + cfg.weakSkillBoost();
            weight.put(e.getKey(), w);
            sum += w;
        }
        List<ItemKey> out = new ArrayList<>();
        double used = 0;
        // Proportional share per type, in curriculum order within each type.
        for (PathItemType t : TYPE_ORDER) {
            if (!remaining.containsKey(t)) continue;
            double share = quota * weight.get(t) / sum, spent = 0;
            for (ItemKey k : remaining.get(t)) {
                double c = newCost(t);
                if (spent + c > share + 1e-9) break;
                out.add(k);
                spent += c;
            }
            used += spent;
        }
        // Rounding leftovers: keep filling in unit order while it fits.
        for (ItemKey k : u.items()) {
            if (known.contains(k) || out.contains(k)) continue;
            double c = newCost(k.type());
            if (used + c > quota + 1e-9) continue;
            out.add(k);
            used += c;
        }
        // Keep the unit's own order (kana, grammar, vocab, kanji as listed); a day takes at most maxNewKanaPerDay kana.
        List<ItemKey> ordered = new ArrayList<>(u.items());
        ordered.retainAll(new HashSet<>(out));
        int kana = 0;
        List<ItemKey> capped = new ArrayList<>();
        for (ItemKey k : ordered) if (k.type() != PathItemType.KANA || ++kana <= cfg.maxNewKanaPerDay()) capped.add(k);
        return capped;
    }

    // ---------- skills ----------

    public static Skill skillOf(ItemKey k) {
        return switch (k.type()) {
            case KANA -> k.id().startsWith("katakana:") ? Skill.KATAKANA : Skill.HIRAGANA;
            case GRAMMAR -> Skill.GRAMMAR;
            case VOCAB -> Skill.VOCAB;
            case KANJI -> Skill.KANJI;
        };
    }

    /** How much one item counts toward a skill: a weak item counts little whatever its mastery. */
    private static double itemValue(ItemState s) {
        if (s == null) return 0;
        double v = switch (s.state()) {
            case NOT_STARTED -> 0;
            case LEARNING -> 0.25;
            case UNDERSTOOD -> 0.6;
            case MEMORIZED -> 0.85;
            case MASTERED -> 1;
        };
        return s.weak() ? Math.min(v, 0.25) : v;
    }

    /** Mastery per skill over the path's items. Skills without items in the path are left out. */
    public static List<SkillScore> skillScores(Map<ItemKey, ItemState> progress, List<PlanUnit> units) {
        Map<Skill, double[]> acc = new EnumMap<>(Skill.class); // total items, sum value, introduced, sum value over introduced
        for (PlanUnit u : units)
            for (ItemKey k : u.items()) {
                double[] a = acc.computeIfAbsent(skillOf(k), s -> new double[4]);
                ItemState s = progress.get(k);
                double v = itemValue(s);
                a[0]++;
                a[1] += v;
                if (s != null && s.introduced()) {
                    a[2]++;
                    a[3] += v;
                }
            }
        List<SkillScore> out = new ArrayList<>();
        for (Skill sk : Skill.values()) {
            double[] a = acc.get(sk);
            if (a == null) continue;
            out.add(new SkillScore(sk, (int) Math.round(a[1] * 100 / a[0]), (int) a[2], (int) a[0], a[2] == 0 ? null : a[3] / a[2]));
        }
        return out;
    }

    /** The skill to push: lowest quality among skills with enough items started, if it is below the threshold. */
    public Skill weakestSkill(List<SkillScore> scores) {
        return scores.stream()
                .filter(s -> s.quality() != null && s.introduced() >= cfg.minIntroducedForSkill() && s.quality() < cfg.weakSkillThreshold())
                .min(Comparator.comparingDouble(SkillScore::quality))
                .map(SkillScore::skill).orElse(null);
    }

    public static String skillLabel(Skill s) {
        return switch (s) {
            case HIRAGANA -> "Hiragana";
            case KATAKANA -> "Katakana";
            case VOCAB -> "Từ vựng";
            case KANJI -> "Kanji";
            case GRAMMAR -> "Ngữ pháp";
        };
    }

    /** One rule-based sentence for the skill map. */
    public String skillSuggestion(List<SkillScore> scores) {
        Skill w = weakestSkill(scores);
        if (w != null) return skillLabel(w) + " đang yếu nhất, những ngày tới mình tăng thời gian " + skillLabel(w) + " cho bạn.";
        boolean started = scores.stream().anyMatch(s -> s.introduced() >= cfg.minIntroducedForSkill());
        return started ? "Các kỹ năng đang đều nhau, cứ tiếp tục theo kế hoạch nhé." : "Học vài ngày nữa để mình biết kỹ năng nào cần thêm thời gian.";
    }

    // ---------- tests ----------

    public boolean dailyPassed(double score) {
        return score >= cfg.dailyPassScore() - 1e-9;
    }

    /** Chapter tests (the kana gate) are stricter than a daily test. */
    public boolean chapterPassed(double score) {
        return score >= cfg.chapterPassScore() - 1e-9;
    }

    /** Weekly test result → what changes next cycle, with a short explanation. */
    public WeeklyAdjustment evaluateWeekly(double score, Collection<ItemKey> wrong) {
        Map<Skill, Integer> bySkill = new EnumMap<>(Skill.class);
        for (ItemKey k : wrong) bySkill.merge(skillOf(k), 1, Integer::sum);
        String skill = bySkill.entrySet().stream().max(Map.Entry.comparingByValue())
                .map(e -> skillLabel(e.getKey())).orElse("phần đã học");
        int n = wrong.size();
        if (score >= cfg.weeklyNormalMin() - 1e-9)
            return new WeeklyAdjustment("NORMAL", "Tuyệt vời! Tuần sau mình tiếp tục theo kế hoạch.");
        if (score >= cfg.weeklyEarlyReviewMin() - 1e-9)
            return new WeeklyAdjustment("REVIEW_EARLY", "Khá tốt! Mình đưa " + n + " nội dung còn sai lên lịch ôn sớm cho bạn.");
        if (score >= cfg.weeklyReduceMin() - 1e-9)
            return new WeeklyAdjustment("REDUCE_NEW", "Tuần sau mình bớt bài mới để bạn củng cố " + skill + " nhé.");
        return new WeeklyAdjustment("RELEARN", "Mình sẽ cho bạn học lại " + n + " nội dung còn yếu (nhiều nhất là " + skill + ") trước khi sang bài mới.");
    }

    // ---------- feasibility & forecast ----------

    /**
     * Whether the rest of the path fits before the target date. Runs the same projection as the roadmap, so the
     * estimate includes weekly tests, review lessons and unit boundaries. When it does not fit, suggests the minutes
     * per day that would (keeping the date) and the date it would end on (keeping the minutes).
     */
    public Feasibility feasibility(Profile p, Map<ItemKey, ItemState> progress, List<PlanUnit> units, LocalDate today, CycleState cycle) {
        Set<ItemKey> introduced = introduced(progress.values());
        int remainingItems = (int) units.stream().flatMap(u -> u.items().stream()).filter(k -> !introduced.contains(k)).count();
        int studyLeft = studyDaysBetween(today, p.targetDate(), p.daysPerWeek());
        LocalDate finish = simulateFinish(p, progress, units, today, cycle);
        boolean feasible = finish != null && !finish.isAfter(p.targetDate());
        int suggested = p.minutesPerDay();
        if (!feasible) {
            suggested = 0; // 0 = no daily time up to 4 hours fits the date
            for (int m = (p.minutesPerDay() / 5 + 1) * 5; m <= 240; m += 5) {
                // Accepting the suggestion re-saves the settings, which resets the pace to today.
                Profile more = new Profile(m, p.daysPerWeek(), today, p.targetDate(), p.zone());
                LocalDate f = simulateFinish(more, progress, units, today, cycle);
                if (f != null && !f.isAfter(p.targetDate())) {
                    suggested = m;
                    break;
                }
            }
        }
        LocalDate end = finish != null ? finish : today.plusDays(FORECAST_HORIZON);
        int needed = studyDaysBetween(today, end, p.daysPerWeek());
        int calendarDays = remainingItems == 0 ? 0 : (int) ChronoUnit.DAYS.between(today, end) + 1;
        return new Feasibility(feasible, remainingItems, studyLeft, needed, calendarDays, end, suggested, end);
    }

    public Feasibility feasibility(Profile p, Map<ItemKey, ItemState> progress, List<PlanUnit> units, LocalDate today) {
        return feasibility(p, progress, units, today, CycleState.fresh());
    }

    /** Study days the projection may run; a plan that needs more is reported as not finishing. */
    private static final int FORECAST_HORIZON = 400;

    /** Last day with new material in the projection starting today, or null if it does not finish within the horizon. */
    private LocalDate simulateFinish(Profile p, Map<ItemKey, ItemState> progress, List<PlanUnit> units, LocalDate today, CycleState cycle) {
        Set<ItemKey> introduced = introduced(progress.values());
        if (currentUnits(units, introduced, cycle.completedReviewUnits()) == null) return today;
        DayPlan d = generateDailyPlan(p, progress, units, today.atTime(12, 0).atZone(p.zone()).toInstant(), null, cycle, 1);
        List<ForecastDay> f = forecast(p, progress, units, d, cycle, FORECAST_HORIZON);
        if (f.size() >= FORECAST_HORIZON) return null;
        LocalDate last = d.phase(Phase.LEARN).items().isEmpty() && d.kind() != DayKind.UNIT_REVIEW ? null : d.date();
        for (ForecastDay x : f) if (x.kind() == DayKind.LESSON || x.kind() == DayKind.UNIT_REVIEW) last = x.date();
        return last == null ? today : last;
    }

    /**
     * Projected study days after {@code todayPlan} until everything new is learned (at most {@code maxDays} study days).
     * A projection, not a commitment: assumes every day is completed as planned.
     */
    public List<ForecastDay> forecast(Profile p, Map<ItemKey, ItemState> progress, List<PlanUnit> units,
                                      DayPlan todayPlan, CycleState cycle, int maxDays) {
        Set<ItemKey> known = introduced(progress.values());
        known.addAll(todayPlan.phase(Phase.LEARN).items());
        Set<String> reviewed = new HashSet<>(cycle.completedReviewUnits());
        if (todayPlan.kind() == DayKind.UNIT_REVIEW) reviewed.addAll(todayPlan.unitIds());
        int lessons = cycle.lessonDaysDone();
        boolean cycleHasItems = !cycle.cycleItems().isEmpty();
        if (todayPlan.kind() == DayKind.WEEKLY_TEST) {
            lessons = 0;
            cycleHasItems = false;
        } else if (todayPlan.kind() != DayKind.REST) {
            lessons++;
            cycleHasItems |= !todayPlan.phase(Phase.LEARN).items().isEmpty();
        }
        double perDay = Math.max(1, p.minutesPerDay() * (1 - cfg.reviewReserveShare()) - cfg.testQuestions() * testCost());
        int dayNumber = todayPlan.dayNumber();
        List<ForecastDay> out = new ArrayList<>();
        for (LocalDate d = todayPlan.date().plusDays(1); out.size() < maxDays; d = d.plusDays(1)) {
            if (!isStudyDay(d, p.daysPerWeek())) continue;
            dayNumber++;
            if (lessons >= lessonsPerCycle(p.daysPerWeek()) && cycleHasItems) {
                out.add(new ForecastDay(d, DayKind.WEEKLY_TEST, "Ngày " + dayNumber + " – Kiểm tra tuần", List.of(), 0, 0, 0, 0));
                lessons = 0;
                cycleHasItems = false;
                continue;
            }
            PlanUnit u = currentUnits(units, known, reviewed);
            if (u == null) break; // everything learned: the roadmap ends here
            lessons++;
            if (u.isReview()) {
                reviewed.add(u.id());
                cycleHasItems = true;
                out.add(new ForecastDay(d, DayKind.UNIT_REVIEW, "Ngày " + dayNumber + " – " + u.title(), List.of(u.id()), 0, 0, 0, 0));
                continue;
            }
            List<PlanUnit> picked = new ArrayList<>();
            double quota = Math.min(newQuota(p, units, known, d, false), perDay);
            List<ItemKey> got = pickFromUnits(units, u, known, reviewed, quota, null, picked);
            if (got.isEmpty()) {
                got = u.items().stream().filter(k -> !known.contains(k)).limit(1).toList();
                picked = List.of(u);
            }
            String names = unitNames(picked, known);
            known.addAll(got);
            cycleHasItems = true;
            Map<PathItemType, Integer> c = new EnumMap<>(PathItemType.class);
            got.forEach(k -> c.merge(k.type(), 1, Integer::sum));
            out.add(new ForecastDay(d, DayKind.LESSON,
                    "Ngày " + dayNumber + " – " + names,
                    picked.stream().map(PlanUnit::id).toList(),
                    c.getOrDefault(PathItemType.KANA, 0), c.getOrDefault(PathItemType.GRAMMAR, 0),
                    c.getOrDefault(PathItemType.VOCAB, 0), c.getOrDefault(PathItemType.KANJI, 0)));
        }
        return out;
    }

    /** Share of path items at UNDERSTOOD or better, 0–100. Measured on knowledge, not on lessons done. */
    public static int progressPercent(Map<ItemKey, ItemState> progress, List<PlanUnit> units) {
        long total = units.stream().mapToLong(u -> u.items().size()).sum();
        if (total == 0) return 0;
        long done = units.stream().flatMap(u -> u.items().stream())
                .filter(k -> progress.containsKey(k) && progress.get(k).atLeast(MasteryState.UNDERSTOOD)).count();
        return (int) (done * 100 / total);
    }

    // ---------- streak ----------

    /**
     * Consecutive completed study days ending today (or yesterday, while today is still open).
     * Days off by the weekly schedule never break it; a completed day off still counts.
     */
    public static int streak(LocalDate today, Set<LocalDate> completed, int daysPerWeek, LocalDate since) {
        int n = completed.contains(today) ? 1 : 0;
        for (LocalDate d = today.minusDays(1); !d.isBefore(since); d = d.minusDays(1)) {
            if (completed.contains(d)) n++;
            else if (isStudyDay(d, daysPerWeek)) break;
        }
        return n;
    }

    // ---------- placement ----------

    /**
     * Questions for one item type: one per equal segment of the curriculum order, preferring an item the
     * learner already marked as learned (hints), otherwise the segment's last item.
     */
    public static List<ItemKey> placementSamples(List<ItemKey> ordered, int n, Set<ItemKey> hints) {
        List<ItemKey> out = new ArrayList<>();
        int size = ordered.size();
        n = Math.min(n, size);
        for (int k = 0; k < n; k++) {
            List<ItemKey> seg = ordered.subList(k * size / n, (k + 1) * size / n);
            ItemKey pick = seg.get(seg.size() - 1);
            for (ItemKey c : seg) if (hints.contains(c)) pick = c;
            out.add(pick);
        }
        return out;
    }

    /**
     * Items the placement shows as known: everything up to the last correct answer before the first wrong one
     * (answers are in the order asked, which is curriculum order), plus any other item answered correctly.
     */
    public static Set<ItemKey> placementKnown(List<ItemKey> ordered, List<PlacementAnswer> answers) {
        int last = -1;
        for (PlacementAnswer a : answers) {
            if (!a.correct()) break;
            last = Math.max(last, ordered.indexOf(a.key()));
        }
        Set<ItemKey> known = new LinkedHashSet<>(ordered.subList(0, last + 1));
        answers.stream().filter(PlacementAnswer::correct).map(PlacementAnswer::key).filter(ordered::contains).forEach(known::add);
        return known;
    }

    /** Review units whose reviewed items are all known (e.g. from placement): nothing left to review there. */
    public static Set<String> reviewUnitsCovered(List<PlanUnit> units, Set<ItemKey> known) {
        Set<String> out = new HashSet<>();
        for (PlanUnit u : units) {
            if (!u.isReview()) continue;
            boolean all = units.stream().filter(x -> u.reviewOf().contains(x.id())).allMatch(x -> known.containsAll(x.items()));
            if (all) out.add(u.id());
        }
        return out;
    }

    // ---------- helpers ----------

    private static Set<ItemKey> introduced(Collection<ItemState> states) {
        Set<ItemKey> out = new HashSet<>();
        for (ItemState s : states) if (s.introduced()) out.add(s.key());
        return out;
    }
}
