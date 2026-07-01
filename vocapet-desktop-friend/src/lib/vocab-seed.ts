export type Word = {
  id: string;
  word: string;
  pos: string; // part of speech
  meaning: string;
  example: string;
  deckId: string;
};

export type Deck = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
};

export const SEED_DECKS: Deck[] = [
  { id: "ielts", name: "IELTS Essentials", emoji: "🎓", description: "Core academic vocabulary for IELTS band 7+", color: "bg-emerald-100" },
  { id: "toeic", name: "TOEIC Business", emoji: "💼", description: "Common workplace and business terms", color: "bg-sky-100" },
  { id: "daily", name: "Daily Life", emoji: "☕", description: "Words you use every day", color: "bg-amber-100" },
  { id: "travel", name: "Travel & Adventure", emoji: "✈️", description: "Vocabulary for trips abroad", color: "bg-rose-100" },
];

export const SEED_WORDS: Word[] = [
  // IELTS
  { id: "w1", deckId: "ielts", word: "abundant", pos: "adj", meaning: "existing in large quantities; plentiful", example: "The region has an abundant supply of fresh water." },
  { id: "w2", deckId: "ielts", word: "alleviate", pos: "verb", meaning: "to make suffering or a problem less severe", example: "The medicine helped alleviate the pain." },
  { id: "w3", deckId: "ielts", word: "comprehensive", pos: "adj", meaning: "complete; including all or nearly all elements", example: "She gave a comprehensive overview of the project." },
  { id: "w4", deckId: "ielts", word: "deteriorate", pos: "verb", meaning: "to become progressively worse", example: "His health began to deteriorate quickly." },
  { id: "w5", deckId: "ielts", word: "inevitable", pos: "adj", meaning: "certain to happen; unavoidable", example: "Change is inevitable in any growing company." },
  { id: "w6", deckId: "ielts", word: "scrutinize", pos: "verb", meaning: "to examine carefully and thoroughly", example: "Auditors will scrutinize every transaction." },
  { id: "w7", deckId: "ielts", word: "tentative", pos: "adj", meaning: "not certain or fixed; provisional", example: "We made a tentative plan for next week." },
  { id: "w8", deckId: "ielts", word: "ubiquitous", pos: "adj", meaning: "present, appearing, or found everywhere", example: "Smartphones are ubiquitous in modern life." },
  // TOEIC
  { id: "w9", deckId: "toeic", word: "negotiate", pos: "verb", meaning: "to discuss in order to reach an agreement", example: "We need to negotiate the contract terms." },
  { id: "w10", deckId: "toeic", word: "deadline", pos: "noun", meaning: "the latest time by which something must be done", example: "The deadline for the report is Friday." },
  { id: "w11", deckId: "toeic", word: "revenue", pos: "noun", meaning: "income generated from business activities", example: "Annual revenue grew by 12%." },
  { id: "w12", deckId: "toeic", word: "outsource", pos: "verb", meaning: "to obtain goods or services from an outside supplier", example: "They outsource customer support overseas." },
  { id: "w13", deckId: "toeic", word: "stakeholder", pos: "noun", meaning: "a person with an interest in a business", example: "Every stakeholder was invited to the meeting." },
  { id: "w14", deckId: "toeic", word: "feasible", pos: "adj", meaning: "possible to do easily or conveniently", example: "Is the proposal financially feasible?" },
  // Daily
  { id: "w15", deckId: "daily", word: "errand", pos: "noun", meaning: "a short trip to do or get something", example: "I have to run a few errands this afternoon." },
  { id: "w16", deckId: "daily", word: "chore", pos: "noun", meaning: "a routine task, especially a household one", example: "Doing the dishes is my least favorite chore." },
  { id: "w17", deckId: "daily", word: "cozy", pos: "adj", meaning: "giving a feeling of warmth and comfort", example: "The café has a cozy atmosphere." },
  { id: "w18", deckId: "daily", word: "grumpy", pos: "adj", meaning: "bad-tempered and irritable", example: "He's always grumpy before coffee." },
  { id: "w19", deckId: "daily", word: "leftover", pos: "noun", meaning: "food remaining after a meal", example: "We had leftovers for lunch." },
  { id: "w20", deckId: "daily", word: "tidy", pos: "verb", meaning: "to arrange things neatly", example: "Please tidy your room before guests arrive." },
  // Travel
  { id: "w21", deckId: "travel", word: "itinerary", pos: "noun", meaning: "a planned route or journey", example: "Our itinerary includes three cities in five days." },
  { id: "w22", deckId: "travel", word: "layover", pos: "noun", meaning: "a stop between flights", example: "We had a four-hour layover in Tokyo." },
  { id: "w23", deckId: "travel", word: "souvenir", pos: "noun", meaning: "something kept as a reminder of a place visited", example: "She bought a small souvenir from Paris." },
  { id: "w24", deckId: "travel", word: "landmark", pos: "noun", meaning: "a recognizable feature of a landscape or city", example: "The tower is a famous landmark." },
  { id: "w25", deckId: "travel", word: "wander", pos: "verb", meaning: "to walk around in a leisurely way", example: "We wandered through the old streets." },
];
