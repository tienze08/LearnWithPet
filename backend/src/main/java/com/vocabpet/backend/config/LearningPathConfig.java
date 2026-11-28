package com.vocabpet.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.vocabpet.backend.service.learningpath.LeitnerScheduler;
import com.vocabpet.backend.service.learningpath.MasteryRules;
import com.vocabpet.backend.service.learningpath.PathPlanner;
import com.vocabpet.backend.service.learningpath.SrsScheduler;

/** Wires the pure Learning Engine classes with config values. */
@Configuration
@EnableConfigurationProperties(LearningPathProperties.class)
public class LearningPathConfig {

    @Bean
    PathPlanner pathPlanner(LearningPathProperties p) {
        return new PathPlanner(p.engine());
    }

    @Bean
    SrsScheduler pathSrsScheduler(LearningPathProperties p) {
        return new LeitnerScheduler(p.engine());
    }

    @Bean
    MasteryRules masteryRules(LearningPathProperties p) {
        return new MasteryRules(p.engine());
    }
}
