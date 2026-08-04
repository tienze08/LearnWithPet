export type CompanionMood = "cheerful" | "calm" | "curious" | "sleepy" | "missing_you";
export type CompanionPersonality = "gentle" | "playful" | "focused";

export type CompanionMemory = {
  personality: CompanionPersonality;
  energy: number;
  lastSeenAt: number;
  lastStudyAt: number | null;
  lastGreetingDate: string | null;
  lastIdleNudgeAt: number | null;
  lastAbsenceNudgeAt: number | null;
  lastBreakSuggestionAt: number | null;
};

export type CompanionMoment = { message: string; mood: CompanionMood };

const THREE_HOURS = 3 * 60 * 60 * 1000;
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
const BREAK_COOLDOWN = 30 * 60 * 1000;

function dayKey(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

function personalityFor(userId: number): CompanionPersonality {
  const choices: CompanionPersonality[] = ["gentle", "playful", "focused"];
  return choices[userId % choices.length];
}

export function companionStorageKey(userId: number) {
  return `vocapet:companion:${userId}`;
}

export function createCompanionMemory(userId: number, now = Date.now()): CompanionMemory {
  return {
    personality: personalityFor(userId), energy: 82, lastSeenAt: now, lastStudyAt: null,
    lastGreetingDate: null, lastIdleNudgeAt: null, lastAbsenceNudgeAt: null, lastBreakSuggestionAt: null,
  };
}

export function loadCompanionMemory(userId: number, now = Date.now()): CompanionMemory {
  if (typeof window === "undefined") return createCompanionMemory(userId, now);
  try {
    const raw = window.localStorage.getItem(companionStorageKey(userId));
    return raw ? { ...createCompanionMemory(userId, now), ...JSON.parse(raw) } : createCompanionMemory(userId, now);
  } catch {
    return createCompanionMemory(userId, now);
  }
}

export function saveCompanionMemory(userId: number, memory: CompanionMemory) {
  if (typeof window !== "undefined") window.localStorage.setItem(companionStorageKey(userId), JSON.stringify(memory));
}

export function moodForCompanion(memory: CompanionMemory, now = Date.now()): CompanionMood {
  const inactiveFor = memory.lastStudyAt ? now - memory.lastStudyAt : 0;
  const hour = new Date(now).getHours();
  if (inactiveFor >= THREE_DAYS) return "missing_you";
  if (hour >= 23 || hour < 6 || memory.energy < 25) return "sleepy";
  return memory.energy > 75 ? "cheerful" : "calm";
}

export function refreshEnergy(memory: CompanionMemory, now = Date.now()): CompanionMemory {
  const elapsedHours = Math.max(0, now - memory.lastSeenAt) / 3_600_000;
  const hour = new Date(now).getHours();
  const resting = hour >= 23 || hour < 6;
  return { ...memory, energy: Math.round(Math.max(20, Math.min(100, memory.energy + (resting ? elapsedHours * 5 : -elapsedHours * 2)))), lastSeenAt: now };
}

export function nextCompanionMoment(memory: CompanionMemory, name: string, now = Date.now()) {
  const next = refreshEnergy(memory, now);
  const inactiveFor = next.lastStudyAt ? now - next.lastStudyAt : 0;
  if (next.lastStudyAt && inactiveFor >= THREE_DAYS && (!next.lastAbsenceNudgeAt || now - next.lastAbsenceNudgeAt >= THREE_DAYS)) {
    return { memory: { ...next, lastAbsenceNudgeAt: now }, moment: { mood: "missing_you" as const, message: `I haven't seen you lately. Hope everything is okay, ${name}. We can start with just one word.` } };
  }
  const hour = new Date(now).getHours();
  if (next.lastGreetingDate !== dayKey(now) && hour >= 5 && hour < 11) {
    return { memory: { ...next, lastGreetingDate: dayKey(now) }, moment: { mood: "cheerful" as const, message: `Good morning, ${name}! Ready to learn today?` } };
  }
  if (next.lastStudyAt && inactiveFor >= THREE_HOURS && (!next.lastIdleNudgeAt || now - next.lastIdleNudgeAt >= THREE_HOURS)) {
    const message = next.personality === "focused" ? "I've saved a few words for us to revisit when you're ready." : "I'm reading while waiting for you. Want to review a few words together?";
    return { memory: { ...next, lastIdleNudgeAt: now }, moment: { mood: "curious" as const, message } };
  }
  return { memory: next, moment: null };
}

export function recordCompanionStudy(memory: CompanionMemory, now = Date.now()) {
  return { ...refreshEnergy(memory, now), energy: Math.min(100, memory.energy + 8), lastStudyAt: now };
}

export function studyCompleteMoment(memory: CompanionMemory, name: string, now = Date.now()) {
  if (memory.lastBreakSuggestionAt && now - memory.lastBreakSuggestionAt < BREAK_COOLDOWN) return null;
  const message = memory.personality === "playful" ? `Great job, ${name}! Let's stretch our paws and take a short break.` : `Great job, ${name}! Let's take a short break.`;
  return { memory: { ...memory, lastBreakSuggestionAt: now }, moment: { mood: "cheerful" as const, message } };
}
