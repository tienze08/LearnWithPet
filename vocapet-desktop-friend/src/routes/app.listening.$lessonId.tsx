import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Workspace } from "@/components/listening/Workspace";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import { GRAMMAR_LEVELS } from "@/data/japanese/grammar";
import {
  useListeningLessonsQuery,
  useListeningProgressQuery,
} from "@/hooks/queries/listening.queries";
import { exercisesFor } from "@/lib/listening/session";
import type { Lesson } from "@/lib/listening/types";

export const Route = createFileRoute("/app/listening/$lessonId")({
  validateSearch: (search: Record<string, unknown>): { review?: boolean } => ({
    review: search.review === true || undefined,
  }),
  component: ListeningLesson,
});

const back = (
  <Link to="/app/listening" className="studio-link">
    Về danh sách bài nghe
  </Link>
);

function ListeningLesson() {
  const { lessonId } = Route.useParams();
  const { review } = Route.useSearch();
  // Lesson ids start with their level: "n5-station".
  const level = GRAMMAR_LEVELS.find((l) => lessonId.startsWith(`${l.toLowerCase()}-`)) ?? "N5";
  const lessons = useListeningLessonsQuery(level);

  if (lessons.isPending) return <LoadingBlock rows={4} label="Đang tải bài nghe" />;
  if (lessons.isError)
    return <ErrorBlock error={lessons.error} onRetry={() => lessons.refetch()} />;
  const lesson = lessons.data.find((l) => l.id === lessonId);
  if (!lesson) return <EmptyBlock title="Không tìm thấy bài nghe">{back}</EmptyBlock>;

  const key = `${lessonId}:${review ?? false}`;
  return review ? (
    <Review key={key} lesson={lesson} lessons={lessons.data} />
  ) : (
    <Workspace key={key} lesson={lesson} lessons={lessons.data} />
  );
}

/** Reads the questions to review once, so saving the new result does not change the running session. */
function Review({ lesson, lessons }: { lesson: Lesson; lessons: Lesson[] }) {
  const progress = useListeningProgressQuery();
  const [only, setOnly] = useState<string[] | null>(null);
  const missed = progress.data?.lessons.find((r) => r.lessonId === lesson.id)?.mistakes ?? [];
  // Cached data may predate the last run, so wait for the refetch.
  if (!only && progress.data && !progress.isFetching && exercisesFor(lesson, missed).length)
    setOnly(missed);

  if (only) return <Workspace lesson={lesson} lessons={lessons} only={only} />;
  if (progress.isPending || progress.isFetching)
    return <LoadingBlock rows={3} label="Đang tìm câu cần ôn" />;
  if (progress.isError)
    return <ErrorBlock error={progress.error} onRetry={() => progress.refetch()} />;
  return (
    <EmptyBlock title="Không còn câu sai để ôn">
      <Link to="/app/listening/$lessonId" params={{ lessonId: lesson.id }} className="studio-link">
        Làm lại cả bài
      </Link>
      {" · "}
      {back}
    </EmptyBlock>
  );
}
