package com.vocabpet.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.ItemProgress;
import com.vocabpet.backend.entity.enums.PathItemType;

public interface ItemProgressRepository extends JpaRepository<ItemProgress, Long> {
    List<ItemProgress> findByUserId(Long userId);

    Optional<ItemProgress> findByUserIdAndItemTypeAndItemId(Long userId, PathItemType itemType, String itemId);
}
