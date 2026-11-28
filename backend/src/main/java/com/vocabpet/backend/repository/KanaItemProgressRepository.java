package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.KanaItemProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface KanaItemProgressRepository extends JpaRepository<KanaItemProgress, Long> {

    Optional<KanaItemProgress> findByUserIdAndScriptAndKana(Long userId, String script, String kana);

    List<KanaItemProgress> findByUserIdAndScript(Long userId, String script);

    List<KanaItemProgress> findByUserId(Long userId);

    List<KanaItemProgress> findByUserIdAndScriptAndSection(Long userId, String script, String section);

    @Query("SELECT p FROM KanaItemProgress p WHERE p.user.id = :userId AND p.script = :script " +
           "AND p.mastered = false AND (p.wrongCount > 0 OR p.correctCount + p.wrongCount < 5) " +
           "ORDER BY (CAST(p.correctCount AS double) / NULLIF(p.correctCount + p.wrongCount, 0)) ASC NULLS FIRST, " +
           "p.wrongCount DESC, p.lastSeenAt ASC")
    List<KanaItemProgress> findWeakKana(Long userId, String script);

    @Query("SELECT p FROM KanaItemProgress p WHERE p.user.id = :userId AND p.script = :script " +
           "AND p.section = :section " +
           "AND p.mastered = false AND (p.wrongCount > 0 OR p.correctCount + p.wrongCount < 5) " +
           "ORDER BY (CAST(p.correctCount AS double) / NULLIF(p.correctCount + p.wrongCount, 0)) ASC NULLS FIRST, " +
           "p.wrongCount DESC, p.lastSeenAt ASC")
    List<KanaItemProgress> findWeakKanaBySection(Long userId, String script, String section);
}
