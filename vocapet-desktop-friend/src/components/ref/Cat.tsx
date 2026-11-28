import sit from "@/assets/cat/sit.png";
import read from "@/assets/cat/read.png";
import sleep from "@/assets/cat/sleep.png";
import cheer from "@/assets/cat/cheer.png";

export type CatPose = "sit" | "read" | "sleep" | "cheer" | "face" | "hello";

const SRC: Record<CatPose, string> = { sit, read, sleep, cheer, face: sit, hello: sit };

/** The gray tabby mascot (PNG art in assets/cat). `face` crops the sitting pose to its head for the wordmark. */
export function Cat({
  pose = "sit",
  className = "",
  width,
}: {
  pose?: CatPose;
  className?: string;
  /** px; height follows the artwork */
  width?: number;
}) {
  return (
    <img
      src={SRC[pose]}
      alt=""
      aria-hidden
      draggable={false}
      width={width}
      className={`ref-cat h-auto ${pose === "face" ? "aspect-square object-cover object-top" : ""} ${className}`}
    />
  );
}
