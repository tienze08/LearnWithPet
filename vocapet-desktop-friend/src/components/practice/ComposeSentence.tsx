import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { gradeTranslation } from "@/api/translation.api";
import { AiFeedback } from "./AiFeedback";

/** Write your own sentence with a word and ask the AI about it. */
export function ComposeSentence({ word }: { word: string }) {
  const [answer, setAnswer] = useState("");
  const ai = useMutation({
    mutationFn: () =>
      gradeTranslation({ direction: "COMPOSE", source: word, answer: answer.trim() }),
  });

  return (
    <section aria-label="Tự đặt câu" className="space-y-3 rounded-2xl bg-surface-2 p-6">
      <h2 className="font-bold">
        Tự đặt câu với <span lang="ja">{word}</span>
      </h2>
      <Textarea
        value={answer}
        maxLength={300}
        lang="ja"
        onChange={(e) => {
          setAnswer(e.target.value);
          ai.reset(); // old feedback is about the old sentence
        }}
        aria-label="Câu của bạn"
        placeholder="Viết một câu tiếng Nhật"
      />
      <Button type="button" disabled={!answer.trim() || ai.isPending} onClick={() => ai.mutate()}>
        {ai.isPending ? "AI đang đọc…" : "Nhờ AI nhận xét"}
      </Button>
      {ai.data && <AiFeedback result={ai.data} />}
      {ai.isError && (
        <p role="alert" className="text-sm text-destructive">
          {ai.error.message}
        </p>
      )}
    </section>
  );
}
