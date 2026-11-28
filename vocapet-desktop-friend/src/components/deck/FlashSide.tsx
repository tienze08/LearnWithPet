import React from "react";

interface FlashSideProps {
  children: React.ReactNode;
  front?: boolean;
  back?: boolean;
}

export default function FlashSide({ children, back }: FlashSideProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border border-border bg-sheet p-6 text-center"
      style={{
        backfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
      }}
    >
      {children}
    </div>
  );
}
