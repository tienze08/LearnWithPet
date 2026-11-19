import { Link } from "@tanstack/react-router";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GROUP_LABEL, type GrammarPoint } from "@/data/japanese/grammar";
import { JpText, LevelStamp } from "@/components/tango/shared";
import { PatternTitle } from "./PatternTitle";
import { toggleMark, useMarks } from "@/lib/japanese/grammar/progress";
import { ExampleSentence } from "./ExampleSentence";

const NO_DATA = "Chưa có dữ liệu";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-primary-ink">{title}</h2>
      {children}
    </section>
  );
}

const Missing = ({ what }: { what: string }) => <p className="text-sm text-muted-foreground">{what}: {NO_DATA}</p>;

function PointLinks({ items }: { items: GrammarPoint[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((o) => (
        <li key={o.id}>
          <Link to="/app/japanese/grammar/$grammarId" params={{ grammarId: o.id }} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-surface-2 px-3 text-sm transition-colors hover:bg-primary-soft">
            <PatternTitle pattern={o.displayPattern} className="font-bold" />
            {o.meaningVi && <span className="max-w-40 truncate text-xs text-muted-foreground">{o.meaningVi}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Full page for one grammar point. `sameForm` and `sameTopic` are derived hints (see lib/japanese/grammar/search.ts). */
export function GrammarDetail({ g, related, sameForm, sameTopic, prev, next }: { g: GrammarPoint; related: GrammarPoint[]; sameForm: GrammarPoint[]; sameTopic: GrammarPoint[]; prev: GrammarPoint | null; next: GrammarPoint | null }) {
  const learned = useMarks("learned").has(g.id);
  const favorite = useMarks("favorite").has(g.id);

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <Link to="/app/japanese/grammar" className="text-sm font-semibold text-primary hover:underline">
        ← Ngữ pháp
      </Link>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold leading-tight"><PatternTitle pattern={g.displayPattern} /></h1>
          <LevelStamp level={g.level} />
        </div>
        <p lang="ja" className="text-sm text-muted-foreground">{[g.reading, g.romajiDisplay].filter(Boolean).join(" · ")}</p>
        <p className="text-lg font-semibold">{g.meaningVi ?? <span className="text-base font-normal text-muted-foreground">Chưa có bản dịch tiếng Việt</span>}</p>
        <div className="flex flex-wrap gap-1.5">
          {g.groups.map((x) => <span key={x} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold">{GROUP_LABEL[x]}</span>)}
          {g.translation === "draft" && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-bold text-warning-ink">Bản dịch nháp</span>}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" variant={learned ? "default" : "outline"} aria-pressed={learned} onClick={() => toggleMark("learned", g.id)}>
            <Check aria-hidden className="mr-1.5 h-4 w-4" />
            {learned ? "Đã học" : "Đánh dấu đã học"}
          </Button>
          <Button type="button" size="sm" variant={favorite ? "default" : "outline"} aria-pressed={favorite} onClick={() => toggleMark("favorite", g.id)}>
            <Star aria-hidden className={`mr-1.5 h-4 w-4 ${favorite ? "fill-current" : ""}`} />
            {favorite ? "Đã yêu thích" : "Yêu thích"}
          </Button>
        </div>
      </header>

      <Section title="Cấu trúc">
        <p lang="ja" className="rounded-2xl bg-surface-2 p-3 text-base font-semibold">{g.formationVi}</p>
      </Section>

      <Section title="Cách sử dụng">
        {g.explanationVi ? <p className="text-sm leading-relaxed">{g.explanationVi}</p> : <Missing what="Giải thích" />}
      </Section>

      <Section title={`Ví dụ (${g.examples.length})`}>
        <ul className="space-y-2">{g.examples.map((e, i) => <ExampleSentence key={i} e={e} />)}</ul>
      </Section>

      <Section title="Lưu ý khi dùng">
        {g.notesVi ? <p className="text-sm leading-relaxed">{g.notesVi}</p> : <Missing what="Lưu ý" />}
      </Section>

      <Section title="Mẫu dễ nhầm và liên quan">
        {related.length + sameForm.length === 0 ? (
          <Missing what="Ngữ pháp liên quan" />
        ) : (
          <div className="space-y-2">
            {related.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Dễ nhầm hoặc liên quan</p>
                <PointLinks items={related} />
              </div>
            )}
            {sameForm.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Cùng mẫu, khác cách dùng</p>
                <PointLinks items={sameForm} />
              </div>
            )}
          </div>
        )}
      </Section>

      {sameTopic.length > 0 && (
        <Section title="Cùng chủ đề (gợi ý tự động)">
          <PointLinks items={sameTopic} />
        </Section>
      )}

      <details className="rounded-2xl bg-surface-2 p-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Bản gốc tiếng Anh (OpenJLPT)</summary>
        <div lang="en" className="mt-2 space-y-1">
          <p><b>Meaning:</b> {g.meaningEn}</p>
          <p><b>Formation:</b> {g.formation}</p>
          {g.notesEn && <p><b>Notes:</b> {g.notesEn}</p>}
          <ul className="list-disc pl-5">{g.examples.map((e, i) => <li key={i}>{e.meaningEn}</li>)}</ul>
        </div>
      </details>

      <nav aria-label="Chuyển mẫu ngữ pháp" className="grid grid-cols-2 gap-2">
        {prev ? (
          <Link to="/app/japanese/grammar/$grammarId" params={{ grammarId: prev.id }} className="min-h-12 rounded-2xl bg-surface-2 p-3 text-left text-sm transition-colors hover:bg-primary-soft">
            <span className="block text-xs text-muted-foreground">← Mẫu trước</span>
            <PatternTitle pattern={prev.displayPattern} className="font-bold" />
          </Link>
        ) : <span />}
        {next ? (
          <Link to="/app/japanese/grammar/$grammarId" params={{ grammarId: next.id }} className="min-h-12 rounded-2xl bg-surface-2 p-3 text-right text-sm transition-colors hover:bg-primary-soft">
            <span className="block text-xs text-muted-foreground">Mẫu sau →</span>
            <PatternTitle pattern={next.displayPattern} className="font-bold" />
          </Link>
        ) : <span />}
      </nav>

      <p className="text-xs text-muted-foreground">
        Dữ liệu gốc: OpenJLPT (CC BY-SA 4.0). Bản dịch tiếng Việt do VocaPet biên soạn, bản nháp chưa kiểm duyệt, cùng giấy phép CC BY-SA 4.0.
      </p>
    </article>
  );
}
