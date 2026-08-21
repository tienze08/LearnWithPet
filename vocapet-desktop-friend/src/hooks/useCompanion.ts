import { useEffect, useRef, useState } from "react";
import { loadCompanionMemory, moodForCompanion, nextCompanionMoment, recordCompanionStudy, saveCompanionMemory, studyCompleteMoment, type CompanionMemory } from "@/lib/pet/companion";
import { speakPet } from "@/hooks/stores/petSpeech";

type CompanionStatus = Pick<CompanionMemory, "energy" | "personality"> & { mood: ReturnType<typeof moodForCompanion> };

export function useCompanion(userId: number | undefined, name: string, reviewCount: number): CompanionStatus | null {
  const memoryRef = useRef<CompanionMemory | null>(null);
  const reviewCountRef = useRef(reviewCount);
  const [status, setStatus] = useState<CompanionStatus | null>(null);

  useEffect(() => {
    if (!userId) return;
    const checkIn = () => {
      const current = memoryRef.current ?? loadCompanionMemory(userId);
      const { memory, moment } = nextCompanionMoment(current, name);
      memoryRef.current = memory;
      saveCompanionMemory(userId, memory);
      setStatus({ energy: memory.energy, personality: memory.personality, mood: moment?.mood ?? moodForCompanion(memory) });
      if (moment) speakPet(`Burumaru: ${moment.message}`, 1, 6);
    };
    memoryRef.current = loadCompanionMemory(userId);
    reviewCountRef.current = reviewCount;
    checkIn();
    const timer = window.setInterval(checkIn, 60_000);
    return () => window.clearInterval(timer);
  }, [userId, name]);

  useEffect(() => {
    if (!userId || !memoryRef.current || reviewCount <= reviewCountRef.current) { reviewCountRef.current = reviewCount; return; }
    const now = Date.now();
    let memory = recordCompanionStudy(memoryRef.current, now);
    const completed = studyCompleteMoment(memory, name, now);
    if (completed) { memory = completed.memory; speakPet(`Burumaru: ${completed.moment.message}`, 2, 5); }
    memoryRef.current = memory;
    reviewCountRef.current = reviewCount;
    saveCompanionMemory(userId, memory);
    setStatus({ energy: memory.energy, personality: memory.personality, mood: moodForCompanion(memory, now) });
  }, [name, reviewCount, userId]);

  return status;
}
