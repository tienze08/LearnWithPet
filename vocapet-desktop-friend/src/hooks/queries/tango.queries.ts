import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTangoLessonToDeck,
  getTangoFavorites,
  getTangoLesson,
  getTangoLessonVocabularies,
  getTangoLessons,
  getTangoLevels,
  getTangoProgress,
  getTangoQuiz,
  getTangoVocabulary,
  getTangoWeakWords,
  recordStudyProgress,
  searchTango,
  setTangoFavorite,
  startTangoLesson,
  submitTangoAttempt,
  type JlptLevel,
  type TangoAttemptRequest,
  type TangoQuizMode,
  type TangoQuizScope,
} from "@/api/tango.api";

// Keys: ["tango", ...]. Every write invalidates the tango prefix so dashboards refresh together.
const TANGO = "tango" as const;

export function useTangoLevelsQuery() {
  return useQuery({ queryKey: [TANGO, "levels"], queryFn: getTangoLevels });
}

export function useTangoLessonsQuery(level: JlptLevel) {
  return useQuery({ queryKey: [TANGO, "lessons", level], queryFn: () => getTangoLessons(level) });
}

export function useTangoLessonQuery(lessonId: number) {
  return useQuery({ queryKey: [TANGO, "lesson", lessonId], queryFn: () => getTangoLesson(lessonId) });
}

export function useTangoLessonVocabulariesQuery(lessonId: number, enabled = true) {
  return useQuery({
    enabled,
    queryKey: [TANGO, "lesson", lessonId, "vocabularies"],
    queryFn: () => getTangoLessonVocabularies(lessonId),
  });
}

/** Every word of a level, for linking sentences to vocabulary. */
export function useTangoLevelWordsQuery(level: JlptLevel) {
  return useQuery({
    queryKey: [TANGO, "words", level],
    queryFn: async () => {
      const { lessons } = await getTangoLessons(level);
      const lists = await Promise.all(lessons.map((l) => getTangoLessonVocabularies(l.id)));
      return [...new Map(lists.flatMap((l) => l.vocabularies).map((v) => [v.id, v])).values()];
    },
    staleTime: Infinity,
  });
}

export function useTangoVocabularyQuery(vocabularyId: number) {
  return useQuery({
    queryKey: [TANGO, "vocabulary", vocabularyId],
    queryFn: () => getTangoVocabulary(vocabularyId),
    enabled: vocabularyId > 0,
  });
}

export function useTangoProgressQuery(level?: JlptLevel) {
  return useQuery({ queryKey: [TANGO, "progress", level ?? "all"], queryFn: () => getTangoProgress(level) });
}

export function useTangoWeakWordsQuery(level?: JlptLevel) {
  return useQuery({ queryKey: [TANGO, "weak", level ?? "all"], queryFn: () => getTangoWeakWords(level) });
}

export function useTangoFavoritesQuery() {
  return useQuery({ queryKey: [TANGO, "favorites"], queryFn: () => getTangoFavorites() });
}

export function useTangoSearchQuery(q: string, level?: JlptLevel) {
  return useQuery({
    queryKey: [TANGO, "search", q, level ?? "all"],
    queryFn: () => searchTango(q, level),
    enabled: q.trim().length > 0,
  });
}

/** Quiz questions are fetched per session: `nonce` is fixed for one session and changes on "Practice Again". */
export function useTangoQuizQuery(lessonId: number, mode: TangoQuizMode, scope: TangoQuizScope, nonce: number) {
  return useQuery({
    queryKey: [TANGO, "quiz", lessonId, mode, scope, nonce],
    queryFn: () => getTangoQuiz(lessonId, mode, scope),
    staleTime: 0,
    gcTime: 0,
  });
}

function useInvalidateTango() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [TANGO] });
}

export function useStartTangoLessonMutation() {
  const invalidate = useInvalidateTango();
  return useMutation({ mutationFn: startTangoLesson, onSuccess: invalidate });
}

export function useAddLessonToDeckMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addTangoLessonToDeck,
    onSuccess: () => {
      for (const key of ["decks", "vocabularies", TANGO, "learning"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

export function useStudyProgressMutation(lessonId: number) {
  const invalidate = useInvalidateTango();
  return useMutation({
    mutationFn: ({ vocabularyIds, lastPosition }: { vocabularyIds: number[]; lastPosition?: number }) =>
      recordStudyProgress(lessonId, vocabularyIds, lastPosition),
    onSuccess: invalidate,
  });
}

export function useSubmitTangoAttemptMutation(lessonId: number) {
  const invalidate = useInvalidateTango();
  return useMutation({
    mutationFn: (body: TangoAttemptRequest) => submitTangoAttempt(lessonId, body),
    onSuccess: invalidate,
  });
}

export function useSetTangoFavoriteMutation() {
  const invalidate = useInvalidateTango();
  return useMutation({
    mutationFn: ({ vocabularyId, favorite }: { vocabularyId: number; favorite: boolean }) =>
      setTangoFavorite(vocabularyId, favorite),
    onSuccess: invalidate,
  });
}
