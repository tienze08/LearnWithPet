import { Landscape } from "./Landscape";

/** Welcome-screen backdrop: Fuji, pagoda, hills and blossoms; the cat sits in front. */
export function WelcomeScene({ className = "" }: { className?: string }) {
  return <Landscape variant="welcome" className={className} />;
}
