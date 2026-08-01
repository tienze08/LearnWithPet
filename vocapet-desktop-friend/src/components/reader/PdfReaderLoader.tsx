import { useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { onLoaded: (document: { title: string; text: string }) => void };

export function PdfReaderLoader({ onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function loadPdf(file: File) {
    setLoading(true);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = await Promise.all(Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1);
        const content = await page.getTextContent();
        return content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      }));
      onLoaded({ title: file.name.replace(/\.pdf$/i, ""), text: pages.join("\n\n") });
    } finally {
      setLoading(false);
    }
  }

  return <>
    <Button variant="outline" className="rounded-xl border-2 font-bold" onClick={() => inputRef.current?.click()} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
      {loading ? "Reading PDF…" : "Upload PDF"}
    </Button>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) void loadPdf(file);
      event.target.value = "";
    }} />
  </>;
}
