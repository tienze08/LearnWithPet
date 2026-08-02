package com.vocabpet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.vocabpet.backend.dto.PetRe.PetResponse;
import com.vocabpet.backend.entity.PetUnlock;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.PetSpecies;
import com.vocabpet.backend.repository.PetRepository;
import com.vocabpet.backend.repository.PetUnlockRepository;
import com.vocabpet.backend.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class PetServiceImplTest {

    @Mock
    private PetRepository petRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PetUnlockRepository petUnlockRepository;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private PetServiceImpl petService;

    @Test
    void unlockPetShouldSpendCoinsAndCreateUnlockWhenRequirementsAreMet() {
        User user = new User();
        user.setId(1L);
        user.setLevel(3);
        user.setCoin(100);

        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(petUnlockRepository.existsByUserAndSpecies(user, PetSpecies.FOX)).thenReturn(false);

        PetResponse response = petService.unlockPet(PetSpecies.FOX);

        assertFalse(response.isLocked());
        assertEquals(50, user.getCoin());
        verify(petUnlockRepository).save(any(PetUnlock.class));
        verify(userRepository).save(user);
    }
}
