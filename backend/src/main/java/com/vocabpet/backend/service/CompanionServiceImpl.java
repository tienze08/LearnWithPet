package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.dto.companion.CompanionEventRequest;
import com.vocabpet.backend.dto.companion.CompanionPreferencesRequest;
import com.vocabpet.backend.dto.companion.CompanionStateResponse;
import com.vocabpet.backend.entity.CompanionMemory;
import com.vocabpet.backend.entity.CompanionProfile;
import com.vocabpet.backend.entity.Pet;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.CompanionEventType;
import com.vocabpet.backend.entity.enums.CompanionPersonality;
import com.vocabpet.backend.entity.enums.PetAction;
import com.vocabpet.backend.entity.enums.PetMood;
import com.vocabpet.backend.entity.enums.PetSpecies;
import com.vocabpet.backend.repository.CompanionMemoryRepository;
import com.vocabpet.backend.repository.CompanionProfileRepository;
import com.vocabpet.backend.repository.PetRepository;
import com.vocabpet.backend.repository.StudyReviewRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class CompanionServiceImpl implements CompanionService {
    private static final int DAILY_GOAL = 10;

    private final CurrentUserService currentUserService;
    private final PetRepository petRepository;
    private final CompanionProfileRepository profileRepository;
    private final CompanionMemoryRepository memoryRepository;
    private final StudyReviewRepository studyReviewRepository;

    @Override
    @Transactional
    public CompanionStateResponse getState() {
        User user = currentUserService.getCurrentUser();
        return stateFor(user, null);
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
        Pet pet = requiredPet(user);
        CompanionProfile profile = profileFor(pet, user);
        CompanionMemory memory = memoryFor(profile, now);
        refreshMemory(memory, now, user);
        PetBehaviorResponse reaction = event == null
                ? ambientReaction(user, profile, memory, now)
                : eventReaction(user, profile, memory, event, now);
        memoryRepository.save(memory);

        LocalDateTime start = LocalDate.now().atStartOfDay();
        long reviewsToday = studyReviewRepository.countByUserIdAndReviewedAtBetween(user.getId(), start,
                start.plusDays(1));
        return CompanionStateResponse.builder()
                .petName(pet.getName()).species(pet.getSpecies()).petLevel(pet.getLevel())
                .personality(profile.getPersonality()).energy(memory.getEnergy())
                .remindersEnabled(profile.isRemindersEnabled())
                .quietHoursStart(profile.getQuietHoursStart()).quietHoursEnd(profile.getQuietHoursEnd())
                .streak(user.getStreak()).reviewsToday(reviewsToday).dailyGoal(DAILY_GOAL)
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

    private PetBehaviorResponse ambientReaction(User user, CompanionProfile profile, CompanionMemory memory,
            LocalDateTime now) {
        if (isQuiet(profile, now))
            return reaction(PetMood.WAITING, PetAction.SLEEP, null, 0, 5);
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

    private PetBehaviorResponse eventReaction(User user, CompanionProfile profile, CompanionMemory memory,
            CompanionEventType event, LocalDateTime now) {
        memory.setLastEvent(event);
        memory.setTotalInteractions(memory.getTotalInteractions() + 1);
        return switch (event) {
            case APP_OPENED -> appOpened(user, profile, memory, now);
            case STUDY_STARTED -> reaction(PetMood.WAITING, PetAction.STUDY,
                    line(profile.getPersonality(), "Let's focus on this together."), 1, 5);
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
        if (!isQuiet(profile, now) && now.getHour() >= 5 && now.getHour() < 11
                && !now.toLocalDate().equals(memory.getLastGreetingDate())) {
            memory.setLastGreetingDate(now.toLocalDate());
            return reaction(PetMood.HAPPY, PetAction.IDLE,
                    "Good morning, " + user.getName() + "! Ready to learn today?", 2, 6);
        }
        return ambientReaction(user, profile, memory, now);
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
