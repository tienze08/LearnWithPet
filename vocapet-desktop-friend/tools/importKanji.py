"""Builds src/data/kanji/graph.json and strokes/*.json from KANJIDIC2, KRADFILE and KanjiVG.

Usage (stdlib only; run in an isolated interpreter):
    python -X utf8 -I tools/importKanji.py <dir containing kanjidic2.xml.gz, kradzip.zip, kanjivg-*-main.zip>

Universe: the kanji VocaPet teaches (src/lib/japanese/kanji.ts) plus every kanji in KANJIDIC2 with
school/jōyō grade 1-8, plus the direct components of those that are themselves in KANJIDIC2.
The output is an adaptation of CC BY-SA data (see src/data/kanji/LICENSE-DATA.md).
"""
import gzip, hashlib, json, re, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "kanji"
KVG = "{https://kanjivg.tagaini.net/}"
MAX_DEPTH = 2          # component levels kept below a kanji
MAX_USED_IN = 40       # "used in" list cap per component


def taught_chars():
    text = (ROOT / "src" / "lib" / "japanese" / "kanji.ts").read_text(encoding="utf-8")
    return re.findall(r'\{ char: "(.)"', text)


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def read_kanjidic2(path: Path):
    xml = gzip.open(path).read().decode("utf-8")
    header = re.search(r"<header>.*?</header>", xml, re.S).group(0)
    root = ET.fromstring(xml[xml.index("<kanjidic2>"):])
    out = {}
    for ch in root.iter("character"):
        lit = ch.findtext("literal")
        rad = ch.find("radical/rad_value[@rad_type='classical']")
        misc = ch.find("misc")
        num = lambda tag: int(misc.findtext(tag)) if misc is not None and misc.findtext(tag) else None
        rm = ch.find("reading_meaning")
        on, kun, en = [], [], []
        if rm is not None:
            for g in rm.findall("rmgroup"):
                on += [r.text for r in g.findall("reading[@r_type='ja_on']")]
                kun += [r.text for r in g.findall("reading[@r_type='ja_kun']")]
                en += [m.text for m in g.findall("meaning") if m.get("m_lang") is None]
        out[lit] = {
            "en": ", ".join(en[:3]) or None, "on": on, "kun": kun,
            "strokes": num("stroke_count"), "grade": num("grade"), "jlptOld": num("jlpt"), "freq": num("freq"),
            "radN": int(rad.text) if rad is not None else None,
        }
    version = {
        "databaseVersion": re.search(r"<database_version>(.*?)</database_version>", header).group(1),
        "dateOfCreation": re.search(r"<date_of_creation>(.*?)</date_of_creation>", header).group(1),
    }
    return out, version


def read_krad(path: Path):
    z = zipfile.ZipFile(path)
    out = {}
    for name in ("kradfile", "kradfile2"):
        for line in z.read(name).decode("euc-jp").splitlines():
            if line.startswith("#") or " : " not in line:
                continue
            lit, parts = line.split(" : ", 1)
            out[lit] = parts.split()
    return out


def parts_of(group, depth):
    """Named sub-groups of a KanjiVG group, using the canonical character when a variant form is drawn."""
    out = []
    for c in group:
        if not c.tag.endswith("}g"):
            continue
        el = c.get(KVG + "element")
        kids = parts_of(c, depth)
        if el:
            out.append({"c": c.get(KVG + "original") or el, "k": parts_of(c, depth + 1) if depth + 1 < MAX_DEPTH else []})
        else:
            out.extend(kids)
    return out


def read_kanjivg_char(zf, names, ch):
    n = f"kanji/{ord(ch):05x}.svg"
    if n not in names:
        return None
    svg = zf.read(n).decode("utf-8")
    root = ET.fromstring(svg[svg.index("<svg"):])
    top = next((g for g in root.iter() if g.tag.endswith("}g") and g.get(KVG + "element") == ch), None)
    paths = re.findall(r'<path id="kvg:%05x-s\d+"[^>]*? d="([^"]+)"' % ord(ch), svg)
    rad = None
    for g in root.iter():
        if g.tag.endswith("}g") and g.get(KVG + "radical") in ("general", "nelson", "tradit") and g.get(KVG + "element"):
            rad = g.get(KVG + "original") or g.get(KVG + "element")
            break
    return {"parts": parts_of(top, 0) if top is not None else [], "paths": paths, "radC": rad}


def main(src: Path):
    taught = taught_chars()
    kd, version = read_kanjidic2(src / "kanjidic2.xml.gz")
    krad = read_krad(src / "kradzip.zip")
    vg_path = next(src.glob("kanjivg-*-main.zip"))
    zf = zipfile.ZipFile(vg_path)
    names = set(zf.namelist())

    universe = set(taught) | {c for c, v in kd.items() if v["grade"] is not None and 1 <= v["grade"] <= 8}
    vg = {c: read_kanjivg_char(zf, names, c) for c in universe}

    def flat(parts):
        for p in parts:
            yield p["c"]
            yield from flat(p["k"])

    # One extra ring: components that are themselves kanji in KANJIDIC2.
    for c in list(universe):
        if vg[c]:
            for p in set(flat(vg[c]["parts"])):
                if p in kd and p not in vg:
                    vg[p] = read_kanjivg_char(zf, names, p)
    chars = sorted(c for c in vg if vg[c] and c in kd)

    graph, used_in = {}, {}
    for c in chars:
        d, g = kd[c], vg[c]
        graph[c] = {**{k: v for k, v in d.items() if v not in (None, [])}, "radC": g["radC"], "parts": g["parts"], "krad": krad.get(c)}
        for p in {x["c"] for x in g["parts"]}:  # direct components only
            used_in.setdefault(p, []).append(c)
    for p, lst in used_in.items():
        lst.sort(key=lambda x: (kd[x]["freq"] or 9999, kd[x]["grade"] or 99, x))
        used_in[p] = lst[:MAX_USED_IN]

    OUT.mkdir(parents=True, exist_ok=True)
    meta = {
        "kanjidic2": {**version, "sha256": sha256(src / "kanjidic2.xml.gz")},
        "kradfile": {"sha256": sha256(src / "kradzip.zip")},
        "kanjivg": {"file": vg_path.name, "sha256": sha256(vg_path)},
        "note": "Adaptation of CC BY-SA data. See LICENSE-DATA.md.",
    }
    (OUT / "graph.json").write_text(json.dumps({"meta": meta, "kanji": graph, "usedIn": used_in}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    # Stroke paths are bucketed by code point (cp >> 8) so the app loads only a small file per kanji.
    (OUT / "strokes.json").unlink(missing_ok=True)
    sdir = OUT / "strokes"
    sdir.mkdir(exist_ok=True)
    for old in sdir.glob("*.json"):
        old.unlink()
    buckets = {}
    for c in chars:
        if vg[c]["paths"]:
            buckets.setdefault(ord(c) >> 8, {})[c] = vg[c]["paths"]
    for b, data in buckets.items():
        (sdir / f"{b:x}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT / "source.json").unlink(missing_ok=True)  # superseded by graph.json
    print(f"universe {len(universe)}, kanji in graph {len(chars)}, with usedIn {len(used_in)}; taught missing: {[c for c in taught if c not in graph]}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
