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
 * Decides what is new today, what is reviewed, and whether the deadline still fits.
 */
public class PathPlanner {

    /** Which weekdays are study days for a given days-per-week: 3 = Mon/Wed/Fri, 5 = Mon–Fri, 6 = Mon–Sat. */
    private static final List<DayOfWeek> DAY_PREFERENCE = List.of(MONDAY, WEDNESDAY, FRIDAY, TUESDAY, THURSDAY, SATURDAY, SUNDAY);
    private static final List<PathItemType> NEW_TYPES = List.of(PathItemType.GRAMMAR, PathItemType.VOCAB, PathItemType.KANJI);

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

    // ---------- daily plan ----------

    double newCost(PathItemType t) {
        return switch (t) {
            case GRAMMAR -> cfg.grammarMinutes();
            case VOCAB -> cfg.vocabSeconds() / 60.0;
            case KANJI -> cfg.kanjiMinutes();
        };
    }

    double reviewCost() {
        return cfg.reviewSeconds() / 60.0;
    }

    /**
     * Today's plan. Reviews first (weakest first, at most maxReviewShare of the day while new material remains),
     * then new items in curriculum order within prerequisites, sized by remaining work / remaining study days.
     *
     * @param progress       state of every path item the user has touched (missing = not started)
     * @param recentAccuracy recent review accuracy, or null when there are too few answers to judge
     */
    public DayPlan generateDailyPlan(Profile p, Map<ItemKey, ItemState> progress, List<PlanUnit> units,
                                     Instant now, Double recentAccuracy) {
        LocalDate today = now.atZone(p.zone()).toLocalDate();
        Instant endOfDay = today.plusDays(1).atStartOfDay(p.zone()).toInstant();
        boolean studyDay = isStudyDay(today, p.daysPerWeek());
        Set<ItemKey> introduced = introduced(progress.values());
        Map<PathItemType, Integer> remaining = remaining(units, introduced);
        boolean newLeft = remaining.values().stream().anyMatch(n -> n > 0);
        double budget = p.minutesPerDay();

        List<ItemState> due = progress.values().stream()
                .filter(s -> s.introduced() && s.nextReviewAt() != null && s.nextReviewAt().isBefore(endOfDay))
                .sorted(Comparator.comparingDouble(ItemState::errorRate).reversed()
                        .thenComparingInt(ItemState::stage)
                        .thenComparing(ItemState::nextReviewAt))
                .toList();
        double reviewCap = studyDay && newLeft ? budget * cfg.maxReviewShare() : budget;
        int maxReviews = (int) Math.floor(reviewCap / reviewCost() + 1e-9);
        List<ItemKey> reviews = due.stream().limit(maxReviews).map(ItemState::key).toList();
        double reviewMinutes = reviews.size() * reviewCost();

        Map<PathItemType, List<ItemKey>> picked = emptyPicks();
        boolean reduced = false;
        if (studyDay && newLeft) {
            Map<PathItemType, Integer> quota = quotas(p, units, remaining, today);
            if (recentAccuracy != null && recentAccuracy < cfg.lowAccuracy()) {
                quota.replaceAll((t, q) -> q == 0 ? 0 : Math.max(1, (int) Math.round(q * (1 - cfg.lowAccuracyCut()))));
                reduced = true;
            }
            picked = pickNew(units, introduced, fitTime(quota, budget - reviewMinutes));
        }

        List<Block> blocks = new ArrayList<>();
        double total = reviewMinutes;
        for (PathItemType t : NEW_TYPES) {
            List<ItemKey> items = picked.get(t);
            double minutes = items.size() * newCost(t);
            total += minutes;
            blocks.add(new Block(BlockType.valueOf(t.name()), items, minutes));
        }
        blocks.add(new Block(BlockType.REVIEW, reviews, reviewMinutes));
        return new DayPlan(today, studyDay, blocks, (int) Math.round(total), reduced, due.size() - reviews.size());
    }

    /** New items per type for {@code day}: remaining / remaining study days, capped at maxQuotaGrowth × the original quota. */
    Map<PathItemType, Integer> quotas(Profile p, List<PlanUnit> units, Map<PathItemType, Integer> remaining, LocalDate day) {
        int totalDays = Math.max(1, studyDaysBetween(p.startDate(), p.targetDate(), p.daysPerWeek()));
        int daysLeft = studyDaysBetween(day, p.targetDate(), p.daysPerWeek());
        Map<PathItemType, Integer> total = count(units, null);
        Map<PathItemType, Integer> q = new EnumMap<>(PathItemType.class);
        for (PathItemType t : NEW_TYPES) {
            int rem = remaining.get(t);
            int cap = cap(total.get(t), totalDays);
            int want = daysLeft <= 0 ? cap : ceilDiv(rem, daysLeft);
            q.put(t, Math.min(rem, Math.min(want, cap)));
        }
        return q;
    }

    private int cap(int totalItems, int totalDays) {
        return (int) Math.ceil(ceilDiv(totalItems, totalDays) * cfg.maxQuotaGrowth() - 1e-9);
    }

    /** Shrinks quotas proportionally until they fit {@code minutes}, then refills one item at a time where room is left. */
    Map<PathItemType, Integer> fitTime(Map<PathItemType, Integer> quota, double minutes) {
        double need = NEW_TYPES.stream().mapToDouble(t -> quota.get(t) * newCost(t)).sum();
        if (need <= minutes + 1e-9) return quota;
        double f = Math.max(0, minutes) / need;
        Map<PathItemType, Integer> out = new EnumMap<>(PathItemType.class);
        double used = 0;
        for (PathItemType t : NEW_TYPES) {
            int n = (int) Math.floor(quota.get(t) * f);
            out.put(t, n);
            used += n * newCost(t);
        }
        for (boolean grew = true; grew; ) {
            grew = false;
            for (PathItemType t : NEW_TYPES) {
                if (out.get(t) < quota.get(t) && used + newCost(t) <= minutes + 1e-9) {
                    out.merge(t, 1, Integer::sum);
                    used += newCost(t);
                    grew = true;
                }
            }
        }
        return out;
    }

    /**
     * Next not-yet-introduced items in curriculum order. A unit opens for a type once every prerequisite unit's
     * items of that type are introduced (or picked earlier in this same call).
     */
    Map<PathItemType, List<ItemKey>> pickNew(List<PlanUnit> units, Set<ItemKey> introduced, Map<PathItemType, Integer> quota) {
        Map<String, PlanUnit> byId = new HashMap<>();
        units.forEach(u -> byId.put(u.id(), u));
        List<PlanUnit> ordered = units.stream().sorted(Comparator.comparingInt(PlanUnit::order)).toList();
        Set<ItemKey> known = new HashSet<>(introduced);
        Map<PathItemType, List<ItemKey>> out = emptyPicks();
        for (PathItemType t : NEW_TYPES) {
            List<ItemKey> list = out.get(t);
            int q = quota.get(t);
            for (PlanUnit u : ordered) {
                if (list.size() >= q) break;
                boolean open = u.prerequisites().stream().map(byId::get)
                        .allMatch(pre -> pre == null || pre.items().stream().filter(k -> k.type() == t).allMatch(known::contains));
                if (!open) continue;
                for (ItemKey k : u.items()) {
                    if (list.size() >= q) break;
                    if (k.type() == t && known.add(k)) list.add(k);
                }
            }
        }
        return out;
    }

    // ---------- feasibility & forecast ----------

    public Feasibility feasibility(Profile p, Map<ItemKey, ItemState> progress, List<PlanUnit> units, LocalDate today) {
        Map<PathItemType, Integer> rem = remaining(units, introduced(progress.values()));
        int remainingItems = rem.values().stream().mapToInt(Integer::intValue).sum();
        double newMinutes = NEW_TYPES.stream().mapToDouble(t -> rem.get(t) * newCost(t)).sum();
        double perDay = p.minutesPerDay() * (1 - cfg.reviewReserveShare());
        int daysLeft = studyDaysBetween(today, p.targetDate(), p.daysPerWeek());

        int byTime = (int) Math.ceil(newMinutes / perDay - 1e-9);
        // The daily cap also limits catching up after missed days.
        int totalDays = Math.max(1, studyDaysBetween(p.startDate(), p.targetDate(), p.daysPerWeek()));
        Map<PathItemType, Integer> total = count(units, null);
        int byCap = NEW_TYPES.stream().mapToInt(t -> rem.get(t) == 0 ? 0 : ceilDiv(rem.get(t), Math.max(1, cap(total.get(t), totalDays)))).max().orElse(0);
        int needed = Math.max(byTime, byCap);

        LocalDate finish = nthStudyDay(today, needed, p.daysPerWeek());
        int calendarDays = needed == 0 ? 0 : (int) ChronoUnit.DAYS.between(today, finish) + 1;
        int suggestedMinutes = daysLeft <= 0 ? 0 : (int) (Math.ceil(newMinutes / (daysLeft * (1 - cfg.reviewReserveShare())) / 5.0) * 5);
        return new Feasibility(needed <= daysLeft, remainingItems, daysLeft, needed, calendarDays, finish,
                Math.max(suggestedMinutes, 5), finish);
    }

    /** Expected new items on the next {@code days} study days after today. A projection, not a commitment. */
    public List<ForecastDay> forecast(Profile p, Map<ItemKey, ItemState> progress, List<PlanUnit> units, DayPlan todayPlan, int days) {
        Set<ItemKey> known = introduced(progress.values());
        todayPlan.blocks().forEach(b -> known.addAll(b.items()));
        List<ForecastDay> out = new ArrayList<>();
        double perDay = p.minutesPerDay() * (1 - cfg.reviewReserveShare());
        for (LocalDate d = todayPlan.date().plusDays(1); out.size() < days && d.isBefore(todayPlan.date().plusDays(days * 7L + 1)); d = d.plusDays(1)) {
            if (!isStudyDay(d, p.daysPerWeek())) continue;
            Map<PathItemType, Integer> rem = remaining(units, known);
            if (rem.values().stream().allMatch(n -> n == 0)) break;
            Map<PathItemType, List<ItemKey>> picked = pickNew(units, known, fitTime(quotas(p, units, rem, d), perDay));
            picked.values().forEach(known::addAll);
            out.add(new ForecastDay(d, picked.get(PathItemType.GRAMMAR).size(), picked.get(PathItemType.VOCAB).size(), picked.get(PathItemType.KANJI).size()));
        }
        return out;
    }

    /** Share of path items at UNDERSTOOD or better, 0–100. Measured on knowledge, not on days elapsed. */
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

    // ---------- helpers ----------

    private static Set<ItemKey> introduced(Collection<ItemState> states) {
        Set<ItemKey> out = new HashSet<>();
        for (ItemState s : states) if (s.introduced()) out.add(s.key());
        return out;
    }

    private static Map<PathItemType, Integer> remaining(List<PlanUnit> units, Set<ItemKey> introduced) {
        return count(units, introduced);
    }

    /** Items per type, skipping those in {@code exclude} (null = count all). */
    private static Map<PathItemType, Integer> count(List<PlanUnit> units, Set<ItemKey> exclude) {
        Map<PathItemType, Integer> out = new EnumMap<>(PathItemType.class);
        NEW_TYPES.forEach(t -> out.put(t, 0));
        for (PlanUnit u : units)
            for (ItemKey k : u.items())
                if (exclude == null || !exclude.contains(k)) out.merge(k.type(), 1, Integer::sum);
        return out;
    }

    private static Map<PathItemType, List<ItemKey>> emptyPicks() {
        Map<PathItemType, List<ItemKey>> m = new EnumMap<>(PathItemType.class);
        NEW_TYPES.forEach(t -> m.put(t, new ArrayList<>()));
        return m;
    }

    private static int ceilDiv(int a, int b) {
        return b <= 0 ? a : (a + b - 1) / b;
    }
}
