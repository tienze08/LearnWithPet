package com.vocabpet.backend.service.learningpath;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

/** Loads every resources/curriculum/*.json at startup and fails fast if one is malformed. */
@Component
public class CurriculumCatalog {

    private final Map<String, Curriculum> byLevel = new LinkedHashMap<>();

    public CurriculumCatalog(ObjectMapper objectMapper) throws IOException {
        for (Resource r : new PathMatchingResourcePatternResolver().getResources("classpath:curriculum/*.json")) {
            try (InputStream in = r.getInputStream()) {
                Curriculum c = objectMapper.readValue(in, Curriculum.class).validate();
                byLevel.put(c.level(), c);
            }
        }
    }

    public Optional<Curriculum> level(String level) {
        return Optional.ofNullable(byLevel.get(level));
    }

    public Optional<Curriculum.Path> path(String pathId) {
        return byLevel.values().stream().flatMap(c -> c.paths().stream())
                .filter(p -> p.id().equals(pathId)).findFirst();
    }

    /** The curriculum that owns a path. */
    public Curriculum curriculumOf(String pathId) {
        return byLevel.values().stream()
                .filter(c -> c.paths().stream().anyMatch(p -> p.id().equals(pathId)))
                .findFirst().orElseThrow(() -> new IllegalArgumentException("Unknown path " + pathId));
    }
}
