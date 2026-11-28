import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Heart, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { speakKana } from "@/lib/japanese/kana";
import { useSetTangoFavoriteMutation, useTangoVocabularyQuery } from "@/hooks/queries/tango.queries";
import { BankSentences } from "@/components/grammar/BankSentences";
import { ComposeSentence } from "@/components/practice/ComposeSentence";
import { Enso, ErrorBlock, JpText, LoadingBlock, WordStatusBadge, WORD_STATUS_LABEL } from "@/components/tango/shared";

export const Route = createFileRoute("/app/japanese/tango/vocabularies/$vocabularyId")({
  component: TangoVocabularyDetail,
});

function TangoVocabularyDetail() {
  const { vocabularyId } = Route.useParams();
  const id = Number(vocabularyId);
  const word = useTangoVocabularyQuery(id);
  const favorite = useSetTangoFavoriteMutation();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/app/japanese/tango" className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tango
      </Link>

      {word.isPending ? (
        <LoadingBlock rows={3} />
      ) : word.isError ? (
        <ErrorBlock error={word.error} onRetry={() => word.refetch()} />
      ) : (
        <>
          <div className="lift relative space-y-4 overflow-hidden rounded-3xl bg-card p-8 text-center">
            <Enso className="left-1/2 top-4 h-48 w-48 -translate-x-1/2" />
            <JpText serif as="p" className="relative text-5xl sm:text-7xl">{word.data.expression ?? word.data.kana}</JpText>
            {word.data.expression && <JpText as="p" className="relative text-xl text-muted-foreground">{word.data.kana}</JpText>}
            <p className="text-sm text-muted-foreground">{word.data.romaji}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {word.data.partOfSpeech}
              </span>
              {word.data.progress ? (
                <WordStatusBadge status={word.data.progress.status} />
              ) : (
                <span className="text-xs text-muted-foreground">Chưa học</span>
              )}
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => speakKana(word.data.kana)} aria-label="Phát âm">
                <Volume2 className="mr-2 h-4 w-4" /> Nghe
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-pressed={word.data.favorite}
                disabled={favorite.isPending}
                onClick={() => favorite.mutate({ vocabularyId: id, favorite: !word.data.favorite })}
              >
                <Heart className={`mr-2 h-4 w-4 ${word.data.favorite ? "fill-current text-destructive" : ""}`} />
                {word.data.favorite ? "Đã yêu thích" : "Yêu thích"}
              </Button>
            </div>
            {favorite.isError && <p role="alert" className="text-sm text-destructive">{favorite.error.message}</p>}
          </div>

          <Card className="space-y-3 rounded-2xl border-0 bg-surface-2 p-6 shadow-none">
            <h2 className="font-bold">Nghĩa</h2>
            <ul className="space-y-1">
              {word.data.meanings.map((m) => (
                <li key={m.meaning} className="text-sm">
                  <span className={m.isPrimary ? "font-bold" : ""}>{m.meaning}</span>
                  {m.note && <span className="text-muted-foreground"> · {m.note}</span>}
                </li>
              ))}
            </ul>
          </Card>

          {word.data.examples.length > 0 && (
            <Card className="space-y-3 rounded-2xl border-0 bg-surface-2 p-6 shadow-none">
              <h2 className="font-bold">Ví dụ</h2>
              {word.data.examples.map((e) => (
                <div key={e.japanese}>
                  <JpText as="p" className="text-lg font-medium">{e.japanese}</JpText>
                  {e.reading && <p className="text-sm text-muted-foreground">{e.reading}</p>}
                  <p className="text-sm">{e.vietnamese}</p>
                </div>
              ))}
            </Card>
          )}

          <BankSentences word={word.data} />

          <ComposeSentence key={id} word={word.data.expression ?? word.data.kana} />

          <Card className="space-y-2 rounded-2xl border-0 bg-surface-2 p-6 shadow-none">
            <h2 className="font-bold">Thuộc bài học</h2>
            {word.data.lessons.map((l) => (
              <Link
                key={l.lessonId}
                to="/app/japanese/tango/lessons/$lessonId"
                params={{ lessonId: String(l.lessonId) }}
                className="block text-sm font-bold text-primary hover:underline"
              >
                {l.jlptLevel} · Bài {l.lessonNumber}
              </Link>
            ))}
          </Card>

          {word.data.progress && (
            <p className="text-center text-xs text-muted-foreground">
              {WORD_STATUS_LABEL[word.data.progress.status]} · đã trả lời {word.data.progress.answeredCount} lần
              {word.data.progress.accuracy !== null && ` · ${Math.round(word.data.progress.accuracy * 100)}% đúng`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
