package com.vocabpet.backend.service.learningpath;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Every id in curriculum/n5.json must exist in the real content: the frontend grammar/kanji files
 * and the Tango seed. Never skipped: it fails if the frontend files are missing, so run it from the full repo.
 */
class CurriculumContentTest {

    private static final Path FRONTEND = Path.of("..", "vocapet-desktop-friend", "src");
    private static final Path GRAMMAR_N5 = FRONTEND.resolve("data/japanese/grammar/source/n5.json");
    private static final Path KANJI_N5 = FRONTEND.resolve("lib/japanese/kanji.ts");

    private final ObjectMapper mapper = JsonMapper.builder().build();

    private Curriculum curriculum() throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/curriculum/n5.json")) {
            return mapper.readValue(in, Curriculum.class).validate();
        }
    }

    private static Path existing(Path p) {
        assertThat(p).as("content file %s (run tests from the full repo)", p.toAbsolutePath().normalize()).isRegularFile();
        return p;
    }

    private Set<String> grammarIds() throws IOException {
        Set<String> ids = new LinkedHashSet<>();
        for (JsonNode n : mapper.readTree(Files.readString(existing(GRAMMAR_N5)))) ids.add(n.get("id").asString());
        return ids;
    }

    private static Set<String> kanjiChars() throws IOException {
        // shortcut: regex over kanji.ts instead of a shared JSON file; move kanji to JSON if this file's shape changes.
        Matcher m = Pattern.compile("char: \"([^\"]+)\"").matcher(Files.readString(existing(KANJI_N5)));
        Set<String> out = new LinkedHashSet<>();
        while (m.find()) out.add(m.group(1));
        return out;
    }

    private Set<Integer> tangoLessons() throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/tango/minna-n5-bai-1-5.json")) {
            Set<Integer> out = new HashSet<>();
            for (JsonNode l : mapper.readTree(in).get("lessons")) out.add(l.get("lessonNumber").asInt());
            return out;
        }
    }

    @Test
    void everyGrammarIdExistsAndAllN5GrammarIsPlaced() throws IOException {
        Set<String> source = grammarIds();
        List<String> placed = curriculum().units().stream().flatMap(u -> u.grammar().stream()).toList();
        assertThat(source).as("grammar source").hasSize(81);
        assertThat(placed).as("curriculum grammar ids").allMatch(source::contains);
        assertThat(new HashSet<>(placed)).as("unplaced N5 grammar").containsAll(source);
    }

    @Test
    void everyKanjiExistsAndAllN5KanjiIsPlaced() throws IOException {
        Set<String> source = kanjiChars();
        List<String> placed = curriculum().units().stream().flatMap(u -> u.kanji().stream()).toList();
        assertThat(source).as("kanji source").hasSize(71);
        assertThat(placed).as("curriculum kanji").allMatch(source::contains);
        assertThat(new HashSet<>(placed)).as("unplaced N5 kanji").containsAll(source);
    }

    @Test
    void vocabLessonsExistInTangoSeed() throws IOException {
        Set<Integer> seeded = tangoLessons();
        for (Curriculum.Unit u : curriculum().units()) assertThat(seeded).as(u.id()).containsAll(u.vocabLessons());
    }

    @Test
    void minnaPathCoversLessonsOneToFive() throws IOException {
        Curriculum c = curriculum();
        Curriculum.Path path = c.paths().get(0);
        assertThat(path.id()).isEqualTo("n5-minna-1-5");
        assertThat(c.unitsOf(path)).extracting(Curriculum.Unit::minnaLesson).containsExactly(1, 2, 3, 4, 5);
        assertThat(c.unitsOf(path)).flatExtracting(Curriculum.Unit::vocabLessons).containsExactly(1, 2, 3, 4, 5);
    }

    @Test
    void validateRejectsLaterPrerequisiteAndDuplicateItem() {
        var a = new Curriculum.Unit("a", 1, "A", null, List.of("wa"), List.of(), List.of(), List.of("b"), List.of());
        var b = new Curriculum.Unit("b", 2, "B", null, List.of("wa"), List.of(), List.of(), List.of(), List.of());
        assertThatThrownBy(() -> new Curriculum("N5", 1, List.of(), new ArrayList<>(List.of(a, b))).validate())
                .hasMessageContaining("more than one unit");
        var b2 = new Curriculum.Unit("b", 2, "B", null, List.of("mo"), List.of(), List.of(), List.of(), List.of());
        assertThatThrownBy(() -> new Curriculum("N5", 1, List.of(), List.of(a, b2)).validate())
                .hasMessageContaining("requires later unit");
    }
}
