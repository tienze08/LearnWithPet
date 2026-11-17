package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.KanaRe.*;
import com.vocabpet.backend.dto.KanaRe.KanaItemProgressResponse;
import com.vocabpet.backend.entity.KanaAttempt;
import com.vocabpet.backend.entity.KanaItemProgress;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.repository.KanaAttemptRepository;
import com.vocabpet.backend.repository.KanaItemProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KanaProgressServiceImpl implements KanaProgressService {

    // Mastery thresholds — change here to adjust globally
    private static final int MIN_TOTAL_SEEN = 5;
    private static final double MIN_ACCURACY = 0.80;

    // Catalog sizes per section (same for hiragana and katakana)
    private static final Map<String, Integer> SECTION_TOTALS = Map.of(
            "basic",       46,
            "dakuten",     20,
            "handakuten",   5,
            "yoon",        33
    );

    private static final List<String> SCRIPTS   = List.of("hiragana", "katakana");
    private static final List<String> SECTIONS  = List.of("basic", "dakuten", "handakuten", "yoon");

    private final KanaAttemptRepository attemptRepo;
    private final KanaItemProgressRepository progressRepo;
    private final CurrentUserService currentUserService;

    @Override
    @Transactional
    public KanaAttemptResponse recordAttempt(KanaAttemptRequest req) {
        // Idempotency: return existing attempt if clientAttemptId already recorded
        if (req.getClientAttemptId() != null && attemptRepo.existsByClientAttemptId(req.getClientAttemptId())) {
            KanaAttempt existing = attemptRepo.findByClientAttemptId(req.getClientAttemptId());
            return buildResponse(existing, getWeakKanaForAttempt(existing), false);
        }

        User user = currentUserService.getCurrentUser();

        // Update per-kana progress for every answer
        for (KanaItemResult answer : req.getAnswers()) {
            updateItemProgress(user, answer.getKana(), req.getScript(), req.getSection(), answer.isCorrect());
        }

        KanaAttempt attempt = KanaAttempt.builder()
                .user(user)
                .script(req.getScript())
                .section(req.getSection())
                .score(req.getScore())
                .total(req.getTotal())
                .durationSeconds(req.getDurationSeconds())
                .completedAt(LocalDateTime.now())
                .clientAttemptId(req.getClientAttemptId())
                .build();

        attemptRepo.save(attempt);

        List<WeakKanaItem> weak = getWeakKanaForAttempt(attempt);
        return buildResponse(attempt, weak, true);
    }

    @Override
    public KanaProgressResponse getProgress() {
        User user = currentUserService.getCurrentUser();
        List<KanaSectionProgress> sections = new ArrayList<>();

        for (String script : SCRIPTS) {
            List<KanaItemProgress> allItems = progressRepo.findByUserIdAndScript(user.getId(), script);
            Map<String, List<KanaItemProgress>> bySection = allItems.stream()
                    .collect(Collectors.groupingBy(KanaItemProgress::getSection));

            // Find lastAttempted for this script across all sections
            List<KanaAttempt> recentAttempts = attemptRepo.findByUserIdOrderByCompletedAtDesc(user.getId());

            for (String section : SECTIONS) {
                List<KanaItemProgress> items = bySection.getOrDefault(section, List.of());
                int totalKana = SECTION_TOTALS.get(section);
                int seen       = items.size();
                int masteredCount = (int) items.stream().filter(KanaItemProgress::isMastered).count();
                int needsWork  = (int) items.stream()
                        .filter(p -> !p.isMastered() && p.getWrongCount() > 0)
                        .count();

                Double accuracy = null;
                if (seen > 0) {
                    int totalCorrect = items.stream().mapToInt(KanaItemProgress::getCorrectCount).sum();
                    int totalSeen    = items.stream().mapToInt(p -> p.getCorrectCount() + p.getWrongCount()).sum();
                    accuracy = totalSeen > 0 ? (double) totalCorrect / totalSeen : null;
                }

                String lastAttempted = recentAttempts.stream()
                        .filter(a -> a.getScript().equals(script) && a.getSection().equals(section))
                        .findFirst()
                        .map(a -> a.getCompletedAt().toString())
                        .orElse(null);

                sections.add(KanaSectionProgress.builder()
                        .script(script)
                        .section(section)
                        .totalKana(totalKana)
                        .seen(seen)
                        .mastered(masteredCount)
                        .needsImprovement(needsWork)
                        .notYetSeen(totalKana - seen)
                        .overallAccuracy(accuracy)
                        .lastAttempted(lastAttempted)
                        .build());
            }
        }

        return KanaProgressResponse.builder().sections(sections).build();
    }

    @Override
    public List<WeakKanaItem> getWeakKana(String script, String section, int limit) {
        User user = currentUserService.getCurrentUser();

        List<KanaItemProgress> items = (section != null)
                ? progressRepo.findWeakKanaBySection(user.getId(), script, section)
                : progressRepo.findWeakKana(user.getId(), script);

        return items.stream()
                .limit(limit)
                .map(this::toWeakKanaItem)
                .collect(Collectors.toList());
    }

    // --- private helpers ---

    private void updateItemProgress(User user, String kana, String script, String section, boolean correct) {
        KanaItemProgress p = progressRepo
                .findByUserIdAndScriptAndKana(user.getId(), script, kana)
                .orElseGet(() -> KanaItemProgress.builder()
                        .user(user)
                        .kana(kana)
                        .script(script)
                        .section(section)
                        .build());

        if (correct) p.setCorrectCount(p.getCorrectCount() + 1);
        else         p.setWrongCount(p.getWrongCount() + 1);

        p.setLastSeenAt(LocalDateTime.now());
        p.setMastered(isMastered(p));
        progressRepo.save(p);
    }

    private boolean isMastered(KanaItemProgress p) {
        int total = p.getCorrectCount() + p.getWrongCount();
        return total >= MIN_TOTAL_SEEN && (double) p.getCorrectCount() / total >= MIN_ACCURACY;
    }

    private List<WeakKanaItem> getWeakKanaForAttempt(KanaAttempt attempt) {
        User user = attempt.getUser();
        // Return weak kana in the same section as this attempt, limit 5
        List<KanaItemProgress> items = progressRepo
                .findWeakKanaBySection(user.getId(), attempt.getScript(), attempt.getSection());
        return items.stream().limit(5).map(this::toWeakKanaItem).collect(Collectors.toList());
    }

    private WeakKanaItem toWeakKanaItem(KanaItemProgress p) {
        int total = p.getCorrectCount() + p.getWrongCount();
        Double accuracy = total > 0 ? (double) p.getCorrectCount() / total : null;
        return WeakKanaItem.builder()
                .kana(p.getKana())
                .script(p.getScript())
                .section(p.getSection())
                .correctCount(p.getCorrectCount())
                .wrongCount(p.getWrongCount())
                .totalSeen(total)
                .accuracy(accuracy)
                .mastered(p.isMastered())
                .lastSeenAt(p.getLastSeenAt() != null ? p.getLastSeenAt().toString() : null)
                .build();
    }

    @Override
    public List<KanaItemProgressResponse> getItems(String script) {
        User user = currentUserService.getCurrentUser();
        return progressRepo.findByUserIdAndScript(user.getId(), script)
                .stream()
                .map(p -> KanaItemProgressResponse.builder()
                        .kana(p.getKana())
                        .script(p.getScript())
                        .section(p.getSection())
                        .correctCount(p.getCorrectCount())
                        .wrongCount(p.getWrongCount())
                        .mastered(p.isMastered())
                        .build())
                .collect(Collectors.toList());
    }

    private KanaAttemptResponse buildResponse(KanaAttempt attempt, List<WeakKanaItem> weak, boolean isNew) {
        double accuracy = attempt.getTotal() > 0
                ? (double) attempt.getScore() / attempt.getTotal()
                : 0.0;
        return KanaAttemptResponse.builder()
                .attemptId(attempt.getId())
                .script(attempt.getScript())
                .section(attempt.getSection())
                .score(attempt.getScore())
                .total(attempt.getTotal())
                .accuracy(accuracy)
                .completedAt(attempt.getCompletedAt().toString())
                .weakKana(weak)
                .isNew(isNew)
                .build();
    }
}
