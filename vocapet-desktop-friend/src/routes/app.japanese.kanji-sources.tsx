import { createFileRoute, Link } from "@tanstack/react-router";
import { DATA_SOURCES, type DataSource } from "@/lib/japanese/kanji-sources";

export const Route = createFileRoute("/app/japanese/kanji-sources")({
  component: KanjiSourcesPage,
});

function KanjiSourcesPage() {
  const used = DATA_SOURCES.filter((s) => s.inUse);
  const planned = DATA_SOURCES.filter((s) => !s.inUse);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link to="/app/japanese/kanji" className="text-sm font-semibold text-primary hover:underline">← Kanji</Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Nguồn dữ liệu Kanji</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          VocaPet ghi nguồn dữ liệu và giấy phép của các bộ dữ liệu mở dùng trong phần Kanji.
        </p>
      </header>

      <Section title="Đang sử dụng" items={used} />
      <Section title="Dự kiến tích hợp" items={planned} note="Chưa được dùng trong ứng dụng." />

      <p className="text-xs text-muted-foreground">
        KANJIDIC2, KRADFILE và KanjiVG được dùng theo giấy phép Creative Commons Ghi công – Chia sẻ tương tự (CC BY-SA),
        và đã được chỉnh sửa như mô tả ở từng mục. Việc nêu nguồn không có nghĩa tác giả bảo trợ VocaPet.
        Giấy phép của các tệp dữ liệu đi kèm trong mã nguồn: src/data/kanji/LICENSE-DATA.md.
      </p>
    </div>
  );
}

function Section({ title, items, note }: { title: string; items: DataSource[]; note?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="font-bold">{title}</h2>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="rounded-2xl bg-surface-2 p-4">
            <p className="font-semibold">{s.name}</p>
            <p className="text-sm">{s.provides}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
              <dt>Tác giả</dt><dd>{s.holder}</dd>
              <dt>Giấy phép</dt>
              <dd>{s.licenceUrl ? <a className="text-primary hover:underline" href={s.licenceUrl} target="_blank" rel="noreferrer">{s.licence}</a> : s.licence}</dd>
              {s.homepage && (<><dt>Trang chủ</dt><dd><a className="break-all text-primary hover:underline" href={s.homepage} target="_blank" rel="noreferrer">{s.homepage}</a></dd></>)}
              {s.changes && (<><dt>Thay đổi</dt><dd>{s.changes}</dd></>)}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
