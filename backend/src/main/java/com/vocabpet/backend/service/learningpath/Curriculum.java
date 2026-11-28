package com.vocabpet.backend.service.learningpath;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * One level's curriculum (resources/curriculum/&lt;level&gt;.json). It only references content by id:
 * kana characters (frontend kana.ts, progress in KanaItemProgress), grammar slugs and kanji characters from the
 * frontend data, Tango lessons by lesson number. Adding a level or a Minna lesson means editing data, not this code.
 */
public record Curriculum(String level, int version, List<Path> paths, List<Chapter> chapters, List<Unit> units) {

    public Curriculum {
        chapters = chapters == null ? List.of() : chapters;
    }

    /** A stage of the journey (e.g. "Hiragana"): its units in order, and the goal shown to the learner. */
    public record Chapter(String id, String title, String goal, List<String> units) {}


    /** A learner-facing route through some units, e.g. "Lộ trình N5 (Minna bài 1–5)". */
    public record Path(String id, String title, String scope, List<String> units) {}

    /** Kana of one KanaItemProgress section, e.g. hiragana / basic / [あ, い, …]. */
    public record KanaGroup(String script, String section, List<String> chars) {}

    /**
     * A lesson. {@code topic} is its display title ("Hiragana – Hàng K và S"). A unit with {@code reviewOf} and no
     * items of its own is a review lesson over those units ("Ôn Hiragana cơ bản").
     */
    public record Unit(String id, int order, String topic, String kind, Integer minnaLesson,
                       List<KanaGroup> kana, List<String> reviewOf,
                       List<String> grammar, List<Integer> vocabLessons, List<String> kanji,
                       List<String> prerequisites, List<String> notes) {

        public Unit {
            kana = kana == null ? List.of() : kana;
            reviewOf = reviewOf == null ? List.of() : reviewOf;
            grammar = grammar == null ? List.of() : grammar;
            vocabLessons = vocabLessons == null ? List.of() : vocabLessons;
            kanji = kanji == null ? List.of() : kanji;
            prerequisites = prerequisites == null ? List.of() : prerequisites;
            notes = notes == null ? List.of() : notes;
        }

        /** A chapter test: no new items, and it is only done when the learner passes it. */
        public boolean isTest() {
            return "TEST".equals(kind);
        }

        /** Item ids of this unit's kana: "hiragana:か" (matches KanaItemProgress script + kana). */
        public List<String> kanaIds() {
            return kana.stream().flatMap(g -> g.chars().stream().map(ch -> g.script() + ":" + ch)).toList();
        }
    }

    public Unit unit(String id) {
        return units.stream().filter(u -> u.id().equals(id)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown unit " + id));
    }

    /** Units of a path in curriculum order. */
    public List<Unit> unitsOf(Path path) {
        return path.units().stream().map(this::unit)
                .sorted((a, b) -> Integer.compare(a.order(), b.order())).toList();
    }

    /** Kana section of a kana item id, needed to create its KanaItemProgress row. */
    public Map<String, String> kanaSections() {
        Map<String, String> out = new HashMap<>();
        for (Unit u : units) for (KanaGroup g : u.kana()) for (String ch : g.chars()) out.put(g.script() + ":" + ch, g.section());
        return out;
    }

    /**
     * Structural checks that need no content files: unique ids and orders, each item in one unit only,
     * prerequisites and reviewed units known and ordered earlier, path units closed under prerequisites.
     */
    public Curriculum validate() {
        Map<String, Unit> byId = new HashMap<>();
        Set<Integer> orders = new HashSet<>();
        Set<String> kana = new HashSet<>();
        Set<String> grammar = new HashSet<>();
        Set<String> kanji = new HashSet<>();
        Set<Integer> lessons = new HashSet<>();
        for (Unit u : units) {
            require(byId.put(u.id(), u) == null, "duplicate unit id " + u.id());
            require(orders.add(u.order()), "duplicate order " + u.order());
            for (KanaGroup g : u.kana())
                require("hiragana".equals(g.script()) || "katakana".equals(g.script()), u.id() + " has unknown kana script " + g.script());
            for (String k : u.kanaIds()) require(kana.add(k), "kana " + k + " is in more than one unit");
            for (String g : u.grammar()) require(grammar.add(g), "grammar " + g + " is in more than one unit");
            for (String k : u.kanji()) require(kanji.add(k), "kanji " + k + " is in more than one unit");
            for (Integer l : u.vocabLessons()) require(lessons.add(l), "vocab lesson " + l + " is in more than one unit");
        }
        for (Unit u : units) {
            for (String p : u.prerequisites()) {
                Unit pre = byId.get(p);
                require(pre != null, u.id() + " has unknown prerequisite " + p);
                require(pre.order() < u.order(), u.id() + " requires later unit " + p);
            }
            for (String r : u.reviewOf()) {
                Unit rev = byId.get(r);
                require(rev != null, u.id() + " reviews unknown unit " + r);
                require(rev.order() < u.order(), u.id() + " reviews later unit " + r);
            }
        }
        Set<String> pathIds = new HashSet<>();
        for (Path path : paths) {
            require(pathIds.add(path.id()), "duplicate path id " + path.id());
            Set<String> in = new HashSet<>(path.units());
            for (String id : path.units()) {
                require(byId.containsKey(id), path.id() + " has unknown unit " + id);
                for (String p : byId.get(id).prerequisites())
                    require(in.contains(p), path.id() + ": " + id + " needs " + p + ", which is not in the path");
                for (String r : byId.get(id).reviewOf())
                    require(in.contains(r), path.id() + ": " + id + " reviews " + r + ", which is not in the path");
            }
        }
        Set<String> inChapter = new HashSet<>();
        for (Chapter ch : chapters)
            for (String id : ch.units()) {
                require(byId.containsKey(id), "chapter " + ch.id() + " has unknown unit " + id);
                require(inChapter.add(id), "unit " + id + " is in more than one chapter");
            }
        if (!chapters.isEmpty())
            for (Path path : paths)
                for (String id : path.units()) require(inChapter.contains(id), id + " is in no chapter");
        for (Unit u : units)
            if (u.isTest()) require(!u.reviewOf().isEmpty(), "test unit " + u.id() + " must say which units it tests");
        return this;
    }

    private void require(boolean ok, String message) {
        if (!ok) throw new IllegalStateException("Curriculum " + level + ": " + message);
    }
}
