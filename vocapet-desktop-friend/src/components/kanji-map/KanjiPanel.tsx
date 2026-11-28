import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadStrokes, type KanjiGraphData, type Part } from "@/data/kanji";
import { speakKana } from "@/lib/japanese/kana";
import { labelOf } from "@/lib/japanese/kanji-map/detail";
import type { KanjiDetail, KanjiVocab } from "@/lib/japanese/kanji-map/types";
import { Ruby } from "./Ruby";
import { StrokeOrder } from "./StrokeOrder";

const NO_DATA = "Chưa có dữ liệu";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-primary-ink">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold">{children}</dd>
    </div>
  );
}

const Empty = ({ what }: { what?: string }) => (
  <span className="text-sm font-normal text-muted-foreground">
    {what ? `${what}: ` : ""}
    {NO_DATA}
  </span>
);

/** All Han Viet readings; flags readings that came through a variant form or are unreviewed Unihan data. */
function HanViet({ d }: { d: KanjiDetail }) {
  const info = d.hanVietInfo;
  return (
    <>
      {d.hanViet.join(" · ")}
      {info?.status === "variant" && info.via && (
        <span
          className="ml-2 rounded-full bg-warning/20 px-1.5 text-[10px] font-bold text-warning-ink"
          title="Âm Hán Việt tra qua dạng biến thể, chưa đối chiếu trực tiếp"
        >
          qua biến thể {info.via.map((v) => v.char).join(", ")}
        </span>
      )}
    </>
  );
}

function Draft() {
  return (
    <span className="ml-2 rounded-full bg-warning/20 px-1.5 text-[10px] font-bold text-warning-ink">
      Nháp
    </span>
  );
}

function Listen({ text, label }: { text: string; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => speakKana(text)}
      aria-label={label}
    >
      <Volume2 aria-hidden className="mr-1.5 h-4 w-4" /> Nghe
    </Button>
  );
}

/** A kanji as a chip: opens its map when it has data, otherwise plain text. */
function Chip({
  char,
  current,
  graph,
  onOpen,
}: {
  char: string;
  current: string;
  graph: KanjiGraphData;
  onOpen: (c: string) => void;
}) {
  const label = labelOf(char, true);
  const openable = !!graph.kanji[char] && char !== current;
  const body = (
    <>
      <span lang="ja" className="jp-serif text-xl leading-none">
        {char}
      </span>
      {label && <span className="max-w-24 truncate text-xs text-muted-foreground">{label}</span>}
    </>
  );
  return openable ? (
    <button
      type="button"
      onClick={() => onOpen(char)}
      aria-label={`Mở bản đồ kanji ${char}${label ? `, ${label}` : ""}`}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-surface-2 px-2.5 transition-colors hover:bg-primary-soft"
    >
      {body}
    </button>
  ) : (
    <span className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 opacity-80 ring-1 ring-border">
      {body}
    </span>
  );
}

function PartList({
  parts,
  current,
  graph,
  onOpen,
}: {
  parts: Part[];
  current: string;
  graph: KanjiGraphData;
  onOpen: (c: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {parts.map((p, i) => (
        <li key={`${p.c}${i}`}>
          <Chip char={p.c} current={current} graph={graph} onOpen={onOpen} />
          {p.k.length > 0 && (
            <div className="ml-5 mt-1 border-l-2 border-border pl-2">
              <PartList parts={p.k} current={current} graph={graph} onOpen={onOpen} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function useStrokes(char: string) {
  const [paths, setPaths] = useState<string[] | null | undefined>(undefined); // undefined = loading
  useEffect(() => {
    let live = true;
    setPaths(undefined);
    loadStrokes(char)
      .then((p) => {
        if (live) setPaths(p);
      })
      .catch(() => {
        if (live) setPaths(null);
      });
    return () => {
      live = false;
    };
  }, [char]);
  return paths;
}

export function KanjiPanel({
  detail: d,
  graph,
  onOpenKanji,
}: {
  detail: KanjiDetail;
  graph: KanjiGraphData;
  onOpenKanji: (c: string) => void;
}) {
  const paths = useStrokes(d.char);
  const [openWord, setOpenWord] = useState<string | null>(null);
  useEffect(() => setOpenWord(null), [d.char]);
  const noParts = d.parts.length === 0;
  const kradParts = d.krad && !(d.krad.length === 1 && d.krad[0] === d.char) ? d.krad : null;

  return (
    <div className="space-y-5">
      <Section title="Chữ và thứ tự nét">
        <div className="flex items-center gap-4">
          <span lang="ja" className="jp-serif text-7xl leading-none">
            {d.char}
          </span>
          <div>
            <p className="text-lg font-bold">
              {d.hanViet.length ? d.hanViet.join(" · ") : <Empty what="Hán Việt" />}
            </p>
            <p className="text-sm">{d.meaningVi ?? <Empty what="Nghĩa tiếng Việt" />}</p>
          </div>
        </div>
        {paths === undefined ? (
          <div className="h-44 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
        ) : paths ? (
          <StrokeOrder paths={paths} label={`Thứ tự nét chữ ${d.char}`} />
        ) : (
          <p className="text-sm text-muted-foreground">Thứ tự nét: {NO_DATA}</p>
        )}
      </Section>

      <Section title="Thông tin">
        <dl className="divide-y divide-border">
          <Row label="Âm Hán Việt">{d.hanViet.length ? <HanViet d={d} /> : <Empty />}</Row>
          <Row label="Nghĩa tiếng Việt">{d.meaningVi ?? <Empty />}</Row>
          <Row label="On'yomi">
            <span lang="ja">{d.on.join("、") || "—"}</span>
          </Row>
          <Row label="Kun'yomi">
            <span lang="ja">{d.kun.join("、") || "—"}</span>
          </Row>
          <Row label="Số nét">{d.strokes ?? <Empty />}</Row>
          <Row label="JLPT (quy đổi, tham khảo)">{d.level ?? <Empty />}</Row>
          {d.jlptOld !== null && <Row label="JLPT (KANJIDIC2, thang cũ)">{d.jlptOld}</Row>}
          {d.grade !== null && <Row label="Lớp học ở Nhật">{d.grade}</Row>}
        </dl>
        {d.meaningEn && (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Thông tin bổ sung (tiếng Anh)
            </summary>
            <p lang="en" className="mt-1">
              {d.meaningEn}
            </p>
          </details>
        )}
      </Section>

      <Section title="Cấu trúc">
        <dl className="divide-y divide-border">
          <Row label="Bộ thủ">
            {d.radical ? (
              <>
                {d.radical.char ? (
                  <span lang="ja" className="jp-serif text-lg">
                    {d.radical.char}
                  </span>
                ) : null}
                {d.radical.number ? (
                  <span className="ml-1 text-muted-foreground">bộ số {d.radical.number}</span>
                ) : null}
                {d.radical.name ? <span className="ml-1">{d.radical.name}</span> : null}
              </>
            ) : (
              <Empty />
            )}
          </Row>
        </dl>
        {d.radical?.note && <p className="text-xs text-muted-foreground">{d.radical.note}</p>}
        <div>
          <p className="mb-1 text-sm text-muted-foreground">Thành phần</p>
          {!noParts ? (
            <PartList parts={d.parts} current={d.char} graph={graph} onOpen={onOpenKanji} />
          ) : kradParts ? (
            <div className="flex flex-wrap gap-1.5">
              {kradParts.map((c, i) => (
                <Chip key={c + i} char={c} current={d.char} graph={graph} onOpen={onOpenKanji} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {d.radical ? "Chữ cơ bản, không phân tách thêm." : NO_DATA}
            </p>
          )}
        </div>
        <div>
          <p className="mb-1 text-sm text-muted-foreground">Dùng trong ({d.usedIn.length})</p>
          {d.usedIn.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {d.usedIn.map((c) => (
                <Chip key={c} char={c} current={d.char} graph={graph} onOpen={onOpenKanji} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{NO_DATA}</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-sm text-muted-foreground">
            Cùng âm Hán Việt ({d.sameHanViet.length})
          </p>
          {d.sameHanViet.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {d.sameHanViet.map((c) => (
                <Chip key={c} char={c} current={d.char} graph={graph} onOpen={onOpenKanji} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{NO_DATA}</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-sm text-muted-foreground">Mẹo nhớ{d.mnemonic && <Draft />}</p>
          {d.mnemonic ? (
            <div className="space-y-1 rounded-2xl bg-surface-2 p-3 text-sm">
              {d.mnemonic.origin && (
                <p>
                  <b>Nguồn gốc:</b> {d.mnemonic.origin}
                </p>
              )}
              {d.mnemonic.tip && (
                <p>
                  <b>Cách nhớ:</b> {d.mnemonic.tip}
                </p>
              )}
              {d.mnemonic.related.length > 0 && (
                <p className="flex flex-wrap items-center gap-2">
                  <b>Kanji liên quan:</b>
                  {d.mnemonic.related.map((r) => (
                    <Chip
                      key={r.char}
                      char={r.char}
                      current={d.char}
                      graph={graph}
                      onOpen={onOpenKanji}
                    />
                  ))}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{NO_DATA}</p>
          )}
        </div>
      </Section>

      <Section title="Từ vựng liên quan">
        {d.vocab.length === 0 ? (
          <p className="text-sm text-muted-foreground">{NO_DATA}</p>
        ) : (
          <ul className="space-y-1">
            {d.vocab.map((v) => (
              <VocabItem
                key={v.word}
                v={v}
                open={openWord === v.word}
                onToggle={() => setOpenWord(openWord === v.word ? null : v.word)}
                current={d.char}
                graph={graph}
                onOpenKanji={onOpenKanji}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Ứng dụng">
        {d.sentences.length === 0 ? (
          <p className="text-sm text-muted-foreground">Câu ví dụ: {NO_DATA}</p>
        ) : (
          <ul className="space-y-2">
            {d.sentences.map((s, i) => (
              <li key={i} className="rounded-2xl bg-surface-2 p-3">
                <Ruby segments={s.ja} className="block text-lg leading-loose" />
                {s.reading && (
                  <p lang="ja" className="text-sm text-muted-foreground">
                    {s.reading}
                  </p>
                )}
                <p className="text-sm">{s.vi}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Listen
                    text={s.reading ?? s.ja.map((x) => x.t).join("")}
                    label="Phát âm câu ví dụ"
                  />
                  <span className="text-xs text-muted-foreground">
                    {s.source === "tango" ? "Ví dụ từ Tango" : "Bản nháp"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function VocabItem({
  v,
  open,
  onToggle,
  current,
  graph,
  onOpenKanji,
}: {
  v: KanjiVocab;
  open: boolean;
  onToggle: () => void;
  current: string;
  graph: KanjiGraphData;
  onOpenKanji: (c: string) => void;
}) {
  return (
    <li className="rounded-2xl bg-surface-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-12 w-full items-baseline gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-primary-soft"
      >
        <span lang="ja" className="jp-serif text-xl">
          {v.word}
        </span>
        <span lang="ja" className="text-sm text-muted-foreground">
          {v.reading}
        </span>
        {v.hanViet && <span className="text-xs font-bold text-primary-ink">{v.hanViet}</span>}
        <span className="ml-auto truncate text-sm">{v.meaning || "—"}</span>
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {v.source === "tango"
                ? "Từ trong Tango"
                : v.source === "dataset"
                  ? "Từ ví dụ của kanji"
                  : "Bản nháp"}
            </p>
            <Listen text={v.reading} label={`Phát âm ${v.reading}`} />
          </div>
          {v.composition.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Kanji trong từ
              </p>
              <div className="flex flex-wrap gap-1.5">
                {v.composition.map((c) => (
                  <Chip
                    key={c.char}
                    char={c.char}
                    current={current}
                    graph={graph}
                    onOpen={onOpenKanji}
                  />
                ))}
              </div>
            </div>
          )}
          {v.example && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Ví dụ
              </p>
              <Ruby segments={v.example.ja} className="block text-lg leading-loose" />
              <p className="text-sm">{v.example.vi}</p>
            </div>
          )}
          {v.tangoId && (
            <Button asChild variant="outline" size="sm">
              <Link
                to="/app/japanese/tango/vocabularies/$vocabularyId"
                params={{ vocabularyId: String(v.tangoId) }}
              >
                Mở trong Tango →
              </Link>
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
