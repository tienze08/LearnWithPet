import { createFileRoute } from "@tanstack/react-router";
import { ReaderPage } from "@/features/reader/ReaderPage";

export const Route = createFileRoute("/app/reader")({
  component: ReaderPage,
});
