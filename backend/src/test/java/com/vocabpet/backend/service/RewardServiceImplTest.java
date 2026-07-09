package com.vocabpet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.repository.UserRepository;
import com.vocabpet.backend.repository.UserRewardRepository;

@ExtendWith(MockitoExtension.class)
class RewardServiceImplTest {

    @Mock
    private UserRewardRepository rewardRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RewardServiceImpl rewardService;

    @Test
    void grantRewardShouldIncreaseUserXpAndTotalXp() {
        User user = new User();
        user.setId(7L);
        user.setXp(10);
        user.setTotalXp(15);

        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(rewardRepository.findById(7L)).thenReturn(Optional.empty());

        rewardService.grantReward(7L, 25, 5);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());

        User savedUser = userCaptor.getValue();
        assertEquals(35, savedUser.getXp());
        assertEquals(40, savedUser.getTotalXp());
    }
}
