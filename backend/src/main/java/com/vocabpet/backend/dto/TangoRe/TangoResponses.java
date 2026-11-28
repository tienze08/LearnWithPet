package com.vocabpet.backend.dto.TangoRe;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.List;

/** Response shapes for the Tango read API. See docs/TANGO_API_SPEC.md. */
public final class TangoResponses {

    private TangoResponses() {
    }

    public record LevelsResponse(List<LevelResponse> levels) {}

    public record LevelResponse(String level, int lessonCount, int vocabularyCount,
                                UserSummary userSummary, int completedLessons) {}

    public record UserSummary(@JsonProperty("new") int newCount, int learning, int mastered, int needReview) {}

    public record LessonsResponse(String level, List<LessonListItem> lessons) {}

    public record LessonListItem(Long id, int lessonNumber, String title, int vocabularyCount, int requiredCount,
                                 int viewedCount, String status, int progressPercent, LocalDateTime lastStudiedAt) {}

    public record LessonDetail(Long id, String jlptLevel, int lessonNumber, String title, String description,
                               int vocabularyCount, int requiredCount, String status, boolean quizPassed,
                               Double bestQuizAccuracy, Integer lastPosition, LocalDateTime lastStudiedAt) {}

    public record LessonVocabulariesResponse(Long lessonId, List<LessonVocabularyItem> vocabularies) {}

    public record LessonVocabularyItem(Long id, int position, boolean required, String expression, String kana,
                                       String romaji, String partOfSpeech, String primaryMeaning, String status,
                                       boolean viewed, boolean favorite, String audioUrl) {}

    public record VocabularyDetail(Long id, String expression, String kana, String romaji, String partOfSpeech,
                                   String audioUrl, List<MeaningItem> meanings, List<ExampleItem> examples,
                                   List<LessonRef> lessons, VocabularyProgressItem progress, boolean favorite) {}

    public record MeaningItem(String meaning, @JsonProperty("isPrimary") boolean primary, String note) {}

    public record ExampleItem(String japanese, String reading, String vietnamese) {}

    public record LessonRef(Long lessonId, String jlptLevel, int lessonNumber) {}

    public record VocabularyProgressItem(String status, boolean viewed, int answeredCount, Double accuracy) {}

    public record StartResponse(Long lessonId, String status, LocalDateTime startedAt, Integer lastPosition,
                                boolean created) {}

    public record StudyProgressResponse(Long lessonId, int viewedCount, int requiredCount, String lessonStatus,
                                        int newlyViewed) {}

    public record QuizResponse(Long lessonId, com.vocabpet.backend.entity.enums.TangoQuizMode mode,
                               com.vocabpet.backend.entity.enums.TangoQuizScope scope, int totalQuestions,
                               List<QuizQuestion> questions) {}

    public record QuizQuestion(Long vocabularyId, com.vocabpet.backend.entity.enums.TangoQuizMode mode,
                               QuizPrompt prompt, String inputType) {}

    public record QuizPrompt(String text, String kana) {}

    public record AttemptResponse(Long attemptId, boolean replayed, Long lessonId,
                                  com.vocabpet.backend.entity.enums.TangoQuizMode mode,
                                  com.vocabpet.backend.entity.enums.TangoQuizScope scope, int totalQuestions,
                                  int correctCount, int incorrectCount, double accuracy, boolean passed,
                                  String lessonStatus, List<AttemptResult> results, LocalDateTime submittedAt) {}

    public record ProgressResponse(String level, WordCounts words, LessonCounts lessons,
                                   ContinueLearning continueLearning, List<RecentAttempt> recentAttempts) {}

    public record WordCounts(@JsonProperty("new") int newCount, int learning, int mastered, int needReview,
                             int total) {}

    public record LessonCounts(int notStarted, int inProgress, int completed, int total) {}

    public record ContinueLearning(Long lessonId, int lessonNumber, String title, Integer lastPosition) {}

    public record RecentAttempt(Long attemptId, Long lessonId, String scope, double accuracy,
                                LocalDateTime submittedAt) {}

    public record WeakResponse(List<WeakItem> items) {}

    public record WeakItem(Long vocabularyId, String expression, String kana, String primaryMeaning, String status,
                           int answeredCount, int correctCount, int incorrectCount, double accuracy,
                           LocalDateTime lastAnsweredAt) {}

    public record FavoriteToggleResponse(Long vocabularyId, boolean favorite) {}

    public record FavoritesResponse(List<WordSummary> items, int page, int size, long total) {}

    public record WordSummary(Long vocabularyId, String expression, String kana, String primaryMeaning) {}

    public record SearchResponse(List<SearchLesson> lessons, List<WordSummary> vocabularies) {}

    public record SearchLesson(Long id, String jlptLevel, int lessonNumber, String title) {}

    public record AttemptResult(Long vocabularyId, com.vocabpet.backend.entity.enums.TangoQuizMode mode,
                                @JsonProperty("isCorrect") boolean correct, String submittedAnswer,
                                List<String> correctAnswers) {}
}
