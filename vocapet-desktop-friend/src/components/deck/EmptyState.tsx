import React from "react";

export default function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 py-12 text-center text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">Let’s give Burumaru something new to learn.</p>
      <p className="mt-1">Add a few words to this deck, then begin your study session.</p>
    </div>
  );
}
