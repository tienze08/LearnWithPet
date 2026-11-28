package com.vocabpet.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.QuestionReport;

public interface QuestionReportRepository extends JpaRepository<QuestionReport, Long> {
}
