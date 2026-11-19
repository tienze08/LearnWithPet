package com.vocabpet.backend.service.learningpath;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * One level's curriculum (resources/curriculum/&lt;level&gt;.json). It only references content by id:
 * grammar slugs and kanji characters from the frontend data, Tango lessons by lesson number.
 * Adding a level or a Minna lesson means editing data, not this code.
 */
public record Curriculum(String level, int version, List<Path> paths, List<Unit> units) {

    /** A learner-facing route through some units, e.g. "Lộ trình N5 (Minna bài 1–5)". */
    public record Path(String id, String title, String scope, List<String> units) {}

    public record Unit(String id, int order, String topic, Integer minnaLesson,
                       List<String> grammar, List<Integer> vocabLessons, List<String> kanji,
                       List<String> prerequisites, List<String> notes) {}

    public Unit unit(String id) {
        return units.stream().filter(u -> u.id().equals(id)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown unit " + id));
    }

    /** Units of a path in curriculum order. */
    public List<Unit> unitsOf(Path path) {
        return path.units().stream().map(this::unit)
                .sorted((a, b) -> Integer.compare(a.order(), b.order())).toList();
    }

    /**
     * Structural checks that need no content files: unique ids and orders, each item in one unit only,
     * prerequisites known and ordered earlier, path units known and closed under prerequisites.
     */
    public Curriculum validate() {
        Map<String, Unit> byId = new HashMap<>();
        Set<Integer> orders = new HashSet<>();
        Set<String> grammar = new HashSet<>();
        Set<String> kanji = new HashSet<>();
        Set<Integer> lessons = new HashSet<>();
        for (Unit u : units) {
            require(byId.put(u.id(), u) == null, "duplicate unit id " + u.id());
            require(orders.add(u.order()), "duplicate order " + u.order());
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
        }
        Set<String> pathIds = new HashSet<>();
        for (Path path : paths) {
            require(pathIds.add(path.id()), "duplicate path id " + path.id());
            Set<String> in = new HashSet<>(path.units());
            for (String id : path.units()) {
                require(byId.containsKey(id), path.id() + " has unknown unit " + id);
                for (String p : byId.get(id).prerequisites())
                    require(in.contains(p), path.id() + ": " + id + " needs " + p + ", which is not in the path");
            }
        }
        return this;
    }

    private void require(boolean ok, String message) {
        if (!ok) throw new IllegalStateException("Curriculum " + level + ": " + message);
    }
}
