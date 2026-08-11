package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.dto.companion.CompanionEventRequest;
import com.vocabpet.backend.dto.companion.CompanionPreferencesRequest;
import com.vocabpet.backend.dto.companion.CompanionStateResponse;
import com.vocabpet.backend.dto.companion.LearningProfileResponse;
import com.vocabpet.backend.entity.CompanionMemory;
import com.vocabpet.backend.entity.CompanionProfile;
import com.vocabpet.backend.entity.CompanionWordMemory;
import com.vocabpet.backend.entity.Pet;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.entity.enums.CompanionEventType;
import com.vocabpet.backend.entity.enums.CompanionPersonality;
import com.vocabpet.backend.entity.enums.PetAction;
import com.vocabpet.backend.entity.enums.PetMood;
import com.vocabpet.backend.entity.enums.PetSpecies;
import com.vocabpet.backend.entity.enums.PetIntent;
import com.vocabpet.backend.repository.CompanionMemoryRepository;
import com.vocabpet.backend.repository.CompanionProfileRepository;
import com.vocabpet.backend.repository.CompanionWordMemoryRepository;
import com.vocabpet.backend.repository.PetRepository;
import com.vocabpet.backend.repository.StudyReviewRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanionServiceImpl implements CompanionService {
    private static final int DAILY_GOAL = 10;

    private final CurrentUserService currentUserService;
    private final PetRepository petRepository;
    private final CompanionProfileRepository profileRepository;
    private final CompanionMemoryRepository memoryRepository;
    private final CompanionWordMemoryRepository wordMemoryRepository;
    private final StudyReviewRepository studyReviewRepository;
    private final UserVocabularyProgressRepository progressRepository;
    private final LearningProfileService learningProfileService;

    @Override
    @Transactional
    public CompanionStateResponse getState() {
        User user = currentUserService.getCurrentUser();
        return stateFor(user, null);
    }

    @Override
    @Transactional
    public LearningProfileResponse getLearningProfile() {
        return learningProfileService.profileFor(currentUserService.getCurrentUser());
    }

    @Override
    @Transactional
    public CompanionStateResponse recordEvent(CompanionEventRequest request) {
        User user = currentUserService.getCurrentUser();
        return stateFor(user, request.getEvent());
    }

    @Override
    @Transactional
    public CompanionStateResponse updatePreferences(CompanionPreferencesRequest request) {
        User user = currentUserService.getCurrentUser();
        Pet pet = requiredPet(user);
        CompanionProfile profile = profileFor(pet, user);
        if (request.getPersonality() != null)
            profile.setPersonality(request.getPersonality());
        if (request.getRemindersEnabled() != null)
            profile.setRemindersEnabled(request.getRemindersEnabled());
        if (request.getQuietHoursStart() != null)
            profile.setQuietHoursStart(request.getQuietHoursStart());
        if (request.getQuietHoursEnd() != null)
            profile.setQuietHoursEnd(request.getQuietHoursEnd());
        profileRepository.save(profile);
        return stateFor(user, null);
    }

    private CompanionStateResponse stateFor(User user, CompanionEventType event) {
        LocalDateTime now = LocalDateTime.now();
        LearningProfileResponse learningProfile = learningProfileService.profileFor(user);
        Pet pet = requiredPet(user);
        CompanionProfile profile = profileFor(pet, user);
        CompanionMemory memory = memoryFor(profile, now);
        refreshMemory(memory, now, user);
        PetIntent intent = event == null ? ambientIntent(user, profile, memory, now) : intentFor(event);
        PetBehaviorResponse reaction = event == null
                ? ambientReaction(user, profile, memory, now)
                : eventReaction(user, profile, memory, event, now);
        memory.setLastIntent(intent);
        memory.setLastIntentAt(now);
        memoryRepository.save(memory);

        LocalDateTime start = LocalDate.now().atStartOfDay();
        long reviewsToday = studyReviewRepository.countByUserIdAndReviewedAtBetween(user.getId(), start,
                start.plusDays(1));
        long dueReviews = progressRepository.countDueCards(user.getId(), now);
        return CompanionStateResponse.builder()
                .petName(pet.getName()).species(pet.getSpecies()).petLevel(pet.getLevel())
                .personality(profile.getPersonality()).energy(memory.getEnergy())
                .remindersEnabled(profile.isRemindersEnabled())
                .quietHoursStart(profile.getQuietHoursStart()).quietHoursEnd(profile.getQuietHoursEnd())
                .streak(user.getStreak()).reviewsToday(reviewsToday).dueReviews(dueReviews).dailyGoal(DAILY_GOAL)
                .daysTogether(memory.getFirstStudyDate() == null ? 0
                        : ChronoUnit.DAYS.between(memory.getFirstStudyDate(), LocalDate.now()) + 1)
                .totalSessionsTogether(memory.getTotalSessionsTogether())
                .usualStudyHour(memory.getUsualStudyHour())
                .learningProfile(learningProfile)
                .frequentlyWrongWord(mostDifficultWord(profile))
                .intent(intent)
                .reaction(reaction).build();
    }

    private Pet requiredPet(User user) {
        return petRepository.findByUserId(user.getId()).orElseGet(() -> {
            // A companion should never make a learning action fail. Users who
            // have not chosen a species yet receive the default Pip cat.
            Pet pet = Pet.builder()
                    .user(user)
                    .name("Pip")
                    .species(PetSpecies.CAT)
                    .mood(PetMood.HAPPY)
                    .level(1)
                    .xp(0)
                    .build();
            Pet savedPet = petRepository.save(pet);
            user.setCurrentPet(savedPet);
            return savedPet;
        });
    }

    private CompanionProfile profileFor(Pet pet, User user) {
        return profileRepository.findByPetId(pet.getId()).orElseGet(() -> profileRepository.save(CompanionProfile
                .builder()
                .pet(pet)
                .personality(CompanionPersonality.values()[(int) (user.getId() % CompanionPersonality.values().length)])
                .build()));
    }

    private CompanionMemory memoryFor(CompanionProfile profile, LocalDateTime now) {
        return memoryRepository.findByProfileId(profile.getId()).orElseGet(() -> CompanionMemory.builder()
                .profile(profile).lastSeenAt(now).build());
    }

    private void refreshMemory(CompanionMemory memory, LocalDateTime now, User user) {
        long hours = memory.getLastSeenAt() == null ? 0
                : Math.max(0, ChronoUnit.HOURS.between(memory.getLastSeenAt(), now));
        boolean resting = now.getHour() >= 23 || now.getHour() < 7;
        int delta = (int) hours * (resting ? 4 : -2);
        memory.setEnergy(Math.max(20, Math.min(100, memory.getEnergy() + delta)));
        memory.setLastSeenAt(now);
        if (user.getLastStudyAt() != null
                && (memory.getLastStudyAt() == null || user.getLastStudyAt().isAfter(memory.getLastStudyAt()))) {
            memory.setLastStudyAt(user.getLastStudyAt());
        }
    }

    @Override
    @Transactional
    public PetBehaviorResponse recordQuizOutcome(User user, Vocabulary vocabulary, boolean correct) {
        LocalDateTime now = LocalDateTime.now();
        Pet pet = requiredPet(user);
        CompanionProfile profile = profileFor(pet, user);
        CompanionMemory memory = memoryFor(profile, now);
        CompanionWordMemory wordMemory = wordMemoryRepository
                .findByProfileIdAndVocabularyId(profile.getId(), vocabulary.getId())
                .orElseGet(() -> CompanionWordMemory.builder().profile(profile).vocabulary(vocabulary).build());

        wordMemory.setReviewCount(wordMemory.getReviewCount() + 1);
        wordMemory.setLastReviewedAt(now);
        if (correct) {
            wordMemory.setCorrectCount(wordMemory.getCorrectCount() + 1);
            wordMemory.setMastered(wordMemory.getCorrectCount() >= 3 && wordMemory.getWrongCount() == 0);
        } else {
            wordMemory.setWrongCount(wordMemory.getWrongCount() + 1);
            wordMemory.setMastered(false);
        }
        wordMemoryRepository.save(wordMemory);

        if (memory.getFirstStudyDate() == null)
            memory.setFirstStudyDate(now.toLocalDate());
        if (memory.getLastStudyAt() == null || !memory.getLastStudyAt().toLocalDate().equals(now.toLocalDate()))
            memory.setStudyDays(memory.getStudyDays() + 1);
        memory.setLastStudyAt(now);
        memory.setTotalSessionsTogether(memory.getTotalSessionsTogether() + 1);
        memory.setUsualStudyHour(rollingHour(memory.getUsualStudyHour(), memory.getTotalSessionsTogether(), now.getHour()));
        memoryRepository.save(memory);

        if (!correct) {
            String message = wordMemory.getWrongCount() >= 2
                    ? "You struggled with " + vocabulary.getWord() + " before. We'll see it again later."
                    : "Hmm, " + vocabulary.getWord() + " is tricky. We'll learn it together.";
            return reaction(PetMood.SAD, PetAction.SAD, line(profile.getPersonality(), message), 2, 4);
        }
        if (wordMemory.isMastered())
            return reaction(PetMood.HAPPY, PetAction.CELEBRATE,
                    "You have mastered " + vocabulary.getWord() + "!", 3, 5);
        return reaction(PetMood.HAPPY, PetAction.HAPPY, line(profile.getPersonality(), "You got it!"), 2, 3);
    }

    @Override
    @Transactional
    public PetBehaviorResponse recordReviewOutcome(User user, Vocabulary vocabulary, boolean correct) {
        return recordQuizOutcome(user, vocabulary, correct);
    }

    private int rollingHour(int previousHour, long totalSessions, int currentHour) {
        if (previousHour < 0 || totalSessions <= 1) return currentHour;
        return (int) Math.round(((previousHour * (totalSessions - 1)) + currentHour) / (double) totalSessions);
    }

    private String mostDifficultWord(CompanionProfile profile) {
        return wordMemoryRepository
                .findTopByProfileIdAndWrongCountGreaterThanOrderByWrongCountDescLastReviewedAtDesc(profile.getId(), 0)
                .map(memory -> memory.getVocabulary().getWord())
                .orElse(null);
    }

    private PetBehaviorResponse ambientReaction(User user, CompanionProfile profile, CompanionMemory memory,
            LocalDateTime now) {
        if (isQuiet(profile, now))
            return reaction(PetMood.WAITING, PetAction.SLEEP, null, 0, 5);
        if (profile.isRemindersEnabled() && memory.getUsualStudyHour() >= 0
                && Math.abs(now.getHour() - memory.getUsualStudyHour()) <= 1 && canNudge(memory, now, 12)) {
            memory.setLastReminderAt(now);
            return reaction(PetMood.WAITING, PetAction.IDLE,
                    "It's almost our usual study time. Ready for a quick session together?", 2, 6);
        }
        long dueReviews = progressRepository.countDueCards(user.getId(), now);
        if (profile.isRemindersEnabled() && dueReviews > 0 && canNudge(memory, now, 3)) {
            memory.setLastReminderAt(now);
            String noun = dueReviews == 1 ? "card is" : "cards are";
            return reaction(PetMood.WAITING, PetAction.STUDY,
                    "I picked " + dueReviews + " " + noun + " ready for review. Let's study together.", 2, 6);
        }
        String trickyWord = mostDifficultWord(profile);
        LearningProfileResponse learningProfile = learningProfileService.profileFor(user);
        if (profile.isRemindersEnabled() && learningProfile.getWeakestTopic() != null && canNudge(memory, now, 8)) {
            memory.setLastReminderAt(now);
            return reaction(PetMood.WAITING, PetAction.THINK,
                    "Hmm, " + learningProfile.getWeakestTopic()
                            + " words seem a little tricky. Want a quick five-card review?",
                    2, 6);
        }
        if (profile.isRemindersEnabled() && trickyWord != null && canNudge(memory, now, 6)) {
            memory.setLastReminderAt(now);
            return reaction(PetMood.WAITING, PetAction.THINK,
                    "Remember " + trickyWord + "? Let's try it again when you're ready.", 2, 6);
        }
        long daysAway = user.getLastStudyAt() == null ? Long.MAX_VALUE
                : ChronoUnit.DAYS.between(user.getLastStudyAt().toLocalDate(), now.toLocalDate());
        if (profile.isRemindersEnabled() && daysAway >= 3 && canNudge(memory, now, 24)) {
            memory.setLastReminderAt(now);
            return reaction(PetMood.SAD, PetAction.IDLE,
                    "I haven't seen you lately. Hope everything is okay. We can start again with one small word.", 2,
                    8);
        }
        if (now.getHour() >= 23 || now.getHour() < 7 || memory.getEnergy() < 30) {
            return reaction(PetMood.WAITING, PetAction.SLEEP, null, 0, 5);
        }
        if (profile.isRemindersEnabled() && user.getLastStudyAt() != null
                && ChronoUnit.HOURS.between(user.getLastStudyAt(), now) >= 3 && canNudge(memory, now, 3)) {
            memory.setLastReminderAt(now);
            return reaction(PetMood.WAITING, PetAction.STUDY, line(profile.getPersonality(),
                    "I'm reading while waiting for you. Want to review a few words together?"), 1, 6);
        }
        return reaction(PetMood.WAITING, PetAction.IDLE, null, 0, 4);
    }

    private PetIntent ambientIntent(User user, CompanionProfile profile, CompanionMemory memory, LocalDateTime now) {
        if (isQuiet(profile, now) || memory.getEnergy() < 30) return PetIntent.REST;
        long daysAway = user.getLastStudyAt() == null ? Long.MAX_VALUE
                : ChronoUnit.DAYS.between(user.getLastStudyAt().toLocalDate(), now.toLocalDate());
        if (profile.isRemindersEnabled() && daysAway >= 3 && canNudge(memory, now, 24)) return PetIntent.RECONNECT;
        if (profile.isRemindersEnabled() && memory.getUsualStudyHour() >= 0
                && Math.abs(now.getHour() - memory.getUsualStudyHour()) <= 1 && canNudge(memory, now, 12))
            return PetIntent.USUAL_STUDY_TIME;
        if (profile.isRemindersEnabled() && progressRepository.countDueCards(user.getId(), now) > 0
                && canNudge(memory, now, 3))
            return PetIntent.INVITE_STUDY;
        if (profile.isRemindersEnabled() && mostDifficultWord(profile) != null && canNudge(memory, now, 6))
            return PetIntent.REVISIT_TRICKY_WORD;
        if (profile.isRemindersEnabled() && user.getLastStudyAt() != null
                && ChronoUnit.HOURS.between(user.getLastStudyAt(), now) >= 3 && canNudge(memory, now, 3))
            return PetIntent.INVITE_STUDY;
        return PetIntent.AMBIENT_WAITING;
    }

    private PetIntent intentFor(CompanionEventType event) {
        return switch (event) {
            case APP_OPENED -> PetIntent.MORNING_GREETING;
            case ANSWER_CORRECT, DAILY_GOAL_COMPLETED, SESSION_COMPLETED -> PetIntent.CELEBRATE_PROGRESS;
            case ANSWER_WRONG, REVIEW_COMPLETED, STUDY_STARTED -> PetIntent.REVISIT_TRICKY_WORD;
            case STREAK_BROKEN -> PetIntent.RECONNECT;
        };
    }

    private PetBehaviorResponse eventReaction(User user, CompanionProfile profile, CompanionMemory memory,
            CompanionEventType event, LocalDateTime now) {
        memory.setLastEvent(event);
        memory.setTotalInteractions(memory.getTotalInteractions() + 1);
        return switch (event) {
            case APP_OPENED -> appOpened(user, profile, memory, now);
            case STUDY_STARTED -> reaction(PetMood.WAITING, PetAction.STUDY,
                    studyStartLine(profile, memory), 1, 5);
            case REVIEW_COMPLETED -> {
                memory.setLastStudyAt(now);
                memory.setEnergy(Math.min(100, memory.getEnergy() + 5));
                yield reaction(PetMood.HAPPY, PetAction.HAPPY,
                        line(profile.getPersonality(), "Nice work. Every review makes the next one easier."), 1, 4);
            }
            case SESSION_COMPLETED -> {
                memory.setLastStudyAt(now);
                memory.setLastBreakSuggestionAt(now);
                memory.setEnergy(Math.min(100, memory.getEnergy() + 10));
                yield reaction(PetMood.HAPPY, PetAction.CELEBRATE,
                        line(profile.getPersonality(), "Great job! Let's take a short break."), 2, 6);
            }
            case ANSWER_CORRECT ->
                reaction(PetMood.HAPPY, PetAction.HAPPY, line(profile.getPersonality(), "You got it!"), 2, 3);
            case ANSWER_WRONG -> reaction(PetMood.SAD, PetAction.SAD,
                    line(profile.getPersonality(), "No worries. We'll learn this one together."), 1, 4);
            case DAILY_GOAL_COMPLETED -> reaction(PetMood.HAPPY, PetAction.CELEBRATE,
                    line(profile.getPersonality(), "Today's goal is complete. I'm proud of you!"), 3, 7);
            case STREAK_BROKEN -> reaction(PetMood.CRYING, PetAction.CRY,
                    "I was sad to lose our streak, but tomorrow is a fresh start.", 3, 7);
        };
    }

    private PetBehaviorResponse appOpened(User user, CompanionProfile profile, CompanionMemory memory,
            LocalDateTime now) {
        PetBehaviorResponse yesterdayRecall = yesterdayRecall(user, profile, memory, now);
        if (yesterdayRecall != null) return yesterdayRecall;
        if (!isQuiet(profile, now) && now.getHour() >= 5 && now.getHour() < 11
                && !now.toLocalDate().equals(memory.getLastGreetingDate())) {
            memory.setLastGreetingDate(now.toLocalDate());
            return reaction(PetMood.HAPPY, PetAction.IDLE,
                    "Good morning, " + user.getName() + "! Ready to learn today?", 2, 6);
        }
        return ambientReaction(user, profile, memory, now);
    }

    /**
     * A concrete, once-a-day recall prompt gives the pet continuity without
     * making it repeat a generic greeting. We use saved study reviews, not a
     * random vocabulary list, so every mentioned word belongs to this user.
     */
    private PetBehaviorResponse yesterdayRecall(User user, CompanionProfile profile, CompanionMemory memory,
            LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        if (isQuiet(profile, now) || today.equals(memory.getLastYesterdayRecallDate())) return null;

        LocalDateTime yesterdayStart = today.minusDays(1).atStartOfDay();
        List<com.vocabpet.backend.entity.StudyReview> reviews = studyReviewRepository.findOwnedReviewsBetween(
                user.getId(), yesterdayStart, today.atStartOfDay());
        if (reviews.isEmpty()) return null;

        memory.setLastYesterdayRecallDate(today);
        String message;
        if (reviews.size() == 1) {
            message = "Do you still remember " + reviews.getFirst().getVocabulary().getWord() + "?";
        } else {
            String word = reviews.getFirst().getVocabulary().getWord();
            message = "We studied " + reviews.size() + " words yesterday. Do you still remember " + word + "?";
        }
        return reaction(PetMood.WAITING, PetAction.THINK, line(profile.getPersonality(), message), 2, 6);
    }

    private String studyStartLine(CompanionProfile profile, CompanionMemory memory) {
        String trickyWord = mostDifficultWord(profile);
        if (trickyWord != null)
            return "Remember " + trickyWord + "? Let's try it again.";
        return line(profile.getPersonality(), "Let's focus on this together.");
    }

    private boolean canNudge(CompanionMemory memory, LocalDateTime now, int cooldownHours) {
        return memory.getLastReminderAt() == null
                || ChronoUnit.HOURS.between(memory.getLastReminderAt(), now) >= cooldownHours;
    }

    private boolean isQuiet(CompanionProfile profile, LocalDateTime now) {
        int hour = now.getHour();
        int start = profile.getQuietHoursStart();
        int end = profile.getQuietHoursEnd();
        return start > end ? hour >= start || hour < end : hour >= start && hour < end;
    }

    private PetBehaviorResponse reaction(PetMood mood, PetAction action, String message, int priority, int duration) {
        return PetBehaviorResponse.builder().mood(mood).action(action).message(message).priority(priority)
                .duration(duration).build();
    }

    private String line(CompanionPersonality personality, String base) {
        return switch (personality) {
            case GENTLE -> base;
            case PLAYFUL -> base.replace(".", "! Let's go!");
            case FOCUSED -> base.replace("Let's", "Let's calmly");
        };
    }
}
