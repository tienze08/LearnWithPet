package com.vocabpet.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.vocabpet.backend.entity.UserReward;

public interface UserRewardRepository extends JpaRepository<UserReward, Long> {
}