package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.TangoRe.TangoResponses.*;
import com.vocabpet.backend.entity.*;
import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.TangoVocabularyStatus;
import com.vocabpet.backend.exception.TangoNotFoundException;
import com.vocabpet.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Read-only Tango queries. Progress rows missing from the DB mean NOT_STARTED /
 * NEW.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TangoReadService {

        private final CurrentUserService currentUserService;
        private final TangoLessonRepository lessonRepository;
        private final TangoLessonVocabularyRepository lessonVocabularyRepository;
        private final TangoVocabularyRepository vocabularyRepository;
        private final UserTangoLessonProgressRepository lessonProgressRepository;
        private final UserTangoVocabularyProgressRepository vocabularyProgressRepository;
        private final UserTangoFavoriteRepository favoriteRepository;

        public LevelsResponse getLevels() {
                Long userId = currentUserService.getCurrentUser().getId();
                Map<Long, UserTangoVocabularyProgress> vocabProgress = vocabularyProgressRepository.findByUserId(userId)
                                .stream()
                                .collect(Collectors.toMap(p -> p.getVocabulary().getId(), p -> p, (a, b) -> a));
                Map<Long, UserTangoLessonProgress> lessonProgress = lessonProgressRepository.findByUserId(userId)
                                .stream()
                                .collect(Collectors.toMap(p -> p.getLesson().getId(), p -> p, (a, b) -> a));

                List<LevelResponse> levels = new ArrayList<>();
                for (JlptLevel level : JlptLevel.values()) {
                        List<TangoLesson> lessons = lessonRepository
                                        .findByJlptLevelAndPublishedTrueOrderBySortOrderAsc(level);
                        Set<Long> vocabularyIds = lessonVocabularyRepository.findPublishedByLevel(level).stream()
                                        .map(lv -> lv.getVocabulary().getId())
                                        .collect(Collectors.toSet());

                        int learning = 0, mastered = 0, needReview = 0;
                        for (Long vocabularyId : vocabularyIds) {
                                UserTangoVocabularyProgress p = vocabProgress.get(vocabularyId);
                                if (p == null)
                                        continue;
                                switch (p.getStatus()) {
                                        case LEARNING -> learning++;
                                        case MASTERED -> mastered++;
                                        case NEED_REVIEW -> needReview++;
                                        default -> {
                                        }
                                }
                        }
                        int newCount = vocabularyIds.size() - learning - mastered - needReview;

                        int completed = (int) lessons.stream()
                                        .map(l -> lessonProgress.get(l.getId()))
                                        .filter(p -> p != null && p
                                                        .getStatus() == com.vocabpet.backend.entity.enums.TangoLessonStatus.COMPLETED)
                                        .count();

                        levels.add(new LevelResponse(level.name(), lessons.size(), vocabularyIds.size(),
                                        new UserSummary(newCount, learning, mastered, needReview), completed));
                }
                return new LevelsResponse(levels);
        }

        public LessonsResponse getLessons(JlptLevel level) {
                Long userId = currentUserService.getCurrentUser().getId();
                List<TangoLesson> lessons = lessonRepository.findByJlptLevelAndPublishedTrueOrderBySortOrderAsc(level);
                Map<Long, List<TangoLessonVocabulary>> linksByLesson = lessonVocabularyRepository
                                .findPublishedByLevel(level)
                                .stream()
                                .collect(Collectors.groupingBy(lv -> lv.getLesson().getId()));
                Set<Long> vocabularyIds = linksByLesson.values().stream()
                                .flatMap(List::stream)
                                .map(lv -> lv.getVocabulary().getId())
                                .collect(Collectors.toSet());
                Map<Long, UserTangoVocabularyProgress> vocabProgress = progressByVocabulary(userId, vocabularyIds);
                Map<Long, UserTangoLessonProgress> lessonProgress = lessonProgressFor(userId, lessons);

                List<LessonListItem> items = new ArrayList<>();
                for (TangoLesson lesson : lessons) {
                        List<TangoLessonVocabulary> links = linksByLesson.getOrDefault(lesson.getId(), List.of());
                        UserTangoLessonProgress lp = lessonProgress.get(lesson.getId());
                        int required = (int) links.stream().filter(TangoLessonVocabulary::isRequired).count();
                        int viewed = (int) links.stream()
                                        .filter(TangoLessonVocabulary::isRequired)
                                        .filter(lv -> isViewed(vocabProgress.get(lv.getVocabulary().getId())))
                                        .count();
                        String status = lessonStatus(lp);
                        int percent = "COMPLETED".equals(status) ? 100 : percent(viewed, required);
                        items.add(new LessonListItem(lesson.getId(), lesson.getLessonNumber(), lesson.getTitle(),
                                        links.size(), required, viewed, status, percent,
                                        lp == null ? null : lp.getLastStudiedAt()));
                }
                return new LessonsResponse(level.name(), items);
        }

        public LessonDetail getLesson(Long lessonId) {
                Long userId = currentUserService.getCurrentUser().getId();
                TangoLesson lesson = publishedLesson(lessonId);
                List<TangoLessonVocabulary> links = lessonVocabularyRepository
                                .findByLessonIdOrderByPositionAsc(lessonId);
                UserTangoLessonProgress lp = lessonProgressFor(userId, List.of(lesson)).get(lessonId);

                int required = (int) links.stream().filter(TangoLessonVocabulary::isRequired).count();
                return new LessonDetail(lesson.getId(), lesson.getJlptLevel().name(), lesson.getLessonNumber(),
                                lesson.getTitle(), lesson.getDescription(), links.size(), required, lessonStatus(lp),
                                lp != null && lp.isQuizPassed(), lp == null ? null : lp.getBestQuizAccuracy(),
                                lp == null ? null : lp.getLastPosition(), lp == null ? null : lp.getLastStudiedAt());
        }

        public LessonVocabulariesResponse getLessonVocabularies(Long lessonId) {
                Long userId = currentUserService.getCurrentUser().getId();
                publishedLesson(lessonId);
                List<TangoLessonVocabulary> links = lessonVocabularyRepository
                                .findByLessonIdOrderByPositionAsc(lessonId);
                Set<Long> vocabularyIds = vocabularyIdsOf(links);
                Map<Long, UserTangoVocabularyProgress> vocabProgress = progressByVocabulary(userId, vocabularyIds);
                Set<Long> favorites = favoriteRepository.findByUserIdAndVocabularyIdIn(userId, vocabularyIds).stream()
                                .map(f -> f.getVocabulary().getId())
                                .collect(Collectors.toSet());

                List<LessonVocabularyItem> items = links.stream().map(lv -> {
                        TangoVocabulary v = lv.getVocabulary();
                        UserTangoVocabularyProgress p = vocabProgress.get(v.getId());
                        return new LessonVocabularyItem(v.getId(), lv.getPosition(), lv.isRequired(),
                                        v.getExpression(), v.getKana(), v.getRomaji(), v.getPartOfSpeech().name(),
                                        primaryMeaning(v), statusOf(p).name(), isViewed(p),
                                        favorites.contains(v.getId()),
                                        v.getAudioUrl());
                }).toList();
                return new LessonVocabulariesResponse(lessonId, items);
        }

        public VocabularyDetail getVocabulary(Long vocabularyId) {
                Long userId = currentUserService.getCurrentUser().getId();
                TangoVocabulary v = vocabularyRepository.findById(vocabularyId)
                                .orElseThrow(() -> new TangoNotFoundException("Vocabulary not found"));

                List<LessonRef> lessons = lessonVocabularyRepository.findByVocabularyId(vocabularyId).stream()
                                .filter(lv -> lv.getLesson().isPublished())
                                .map(lv -> new LessonRef(lv.getLesson().getId(), lv.getLesson().getJlptLevel().name(),
                                                lv.getLesson().getLessonNumber()))
                                .toList();
                UserTangoVocabularyProgress p = vocabularyProgressRepository
                                .findByUserIdAndVocabularyId(userId, vocabularyId).orElse(null);
                VocabularyProgressItem progress = p == null ? null
                                : new VocabularyProgressItem(
                                                p.getStatus().name(), isViewed(p), p.getAnsweredCount(), accuracy(p));

                return new VocabularyDetail(v.getId(), v.getExpression(), v.getKana(), v.getRomaji(),
                                v.getPartOfSpeech().name(), v.getAudioUrl(),
                                v.getMeanings().stream()
                                                .map(m -> new MeaningItem(m.getMeaning(), m.isPrimaryMeaning(),
                                                                m.getNote()))
                                                .toList(),
                                v.getExamples().stream()
                                                .map(e -> new ExampleItem(e.getJapanese(), e.getReading(),
                                                                e.getVietnamese()))
                                                .toList(),
                                lessons, progress,
                                favoriteRepository.existsByUserIdAndVocabularyId(userId, vocabularyId));
        }

        private TangoLesson publishedLesson(Long lessonId) {
                return lessonRepository.findByIdAndPublishedTrue(lessonId)
                                .orElseThrow(() -> new TangoNotFoundException("Lesson not found"));
        }

        private Set<Long> vocabularyIdsOf(List<TangoLessonVocabulary> links) {
                return links.stream().map(lv -> lv.getVocabulary().getId()).collect(Collectors.toSet());
        }

        private Map<Long, UserTangoVocabularyProgress> progressByVocabulary(Long userId,
                        Collection<Long> vocabularyIds) {
                if (vocabularyIds.isEmpty())
                        return Map.of();
                return vocabularyProgressRepository.findByUserIdAndVocabularyIdIn(userId, vocabularyIds).stream()
                                .collect(Collectors.toMap(p -> p.getVocabulary().getId(), p -> p, (a, b) -> a));
        }

        private Map<Long, UserTangoLessonProgress> lessonProgressFor(Long userId, List<TangoLesson> lessons) {
                if (lessons.isEmpty())
                        return Map.of();
                return lessonProgressRepository.findByUserIdAndLessonIdIn(userId,
                                lessons.stream().map(TangoLesson::getId).toList()).stream()
                                .collect(Collectors.toMap(p -> p.getLesson().getId(), p -> p, (a, b) -> a));
        }

        private static String lessonStatus(UserTangoLessonProgress lp) {
                return lp == null ? "NOT_STARTED" : lp.getStatus().name();
        }

        private static TangoVocabularyStatus statusOf(UserTangoVocabularyProgress p) {
                return p == null ? TangoVocabularyStatus.NEW : p.getStatus();
        }

        private static boolean isViewed(UserTangoVocabularyProgress p) {
                return p != null && p.getViewedAt() != null;
        }

        private static Double accuracy(UserTangoVocabularyProgress p) {
                return p == null || p.getAnsweredCount() == 0
                                ? null
                                : (double) p.getCorrectCount() / p.getAnsweredCount();
        }

        private static int percent(int part, int whole) {
                return whole == 0 ? 0 : (int) Math.round(part * 100.0 / whole);
        }

        private static String primaryMeaning(TangoVocabulary v) {
                return v.getMeanings().stream()
                                .filter(TangoVocabularyMeaning::isPrimaryMeaning)
                                .findFirst()
                                .or(() -> v.getMeanings().stream().findFirst())
                                .map(TangoVocabularyMeaning::getMeaning)
                                .orElse(null);
        }
}
