"""Builds src/data/kanji-vi/hanviet.json and docs/KANJI_HANVIET_REPORT.md from Unicode Unihan (kVietnamese).

Usage (stdlib only; re-runnable):
    python -X utf8 -I tools/importHanViet.py <path to Unihan.zip>

Rules (no guessing): a Han Viet reading is written only when Unihan gives one for the kanji itself ("direct")
or for a reading-preserving variant of it ("variant", with the variant chars kept in `via`). English meanings are
never translated. The 71 hand-written entries in src/lib/japanese/kanji.ts always win; differences go to the report.
"""
import hashlib, json, re, sys, unicodedata, zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "kanji-vi" / "hanviet.json"
REPORT = ROOT.parent / "docs" / "KANJI_HANVIET_REPORT.md"
# Variants that keep the reading: traditional <-> simplified and Z-variants. Semantic variants are NOT used.
VARIANT_FIELDS = ("kTraditionalVariant", "kSimplifiedVariant", "kZVariant")
# Unihan readings reviewed and rejected: Nôm words, not Han Viet readings of the kanji. Add only with a reason.
REJECT = {"女": {"NỮA": "từ Nôm (\"nữa\"), Hán Việt là NỮ"}, "年": {"NÊN": "từ Nôm (\"nên\"), Hán Việt là NIÊN"}}
REL = {"kTraditionalVariant": "traditional", "kSimplifiedVariant": "simplified", "kZVariant": "z-variant"}


def unihan(z, name, fields):
    out = {f: defaultdict(list) for f in fields}
    for line in z.read(name).decode("utf-8").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        cp, key, val = line.split("\t", 2)
        if key in out:
            out[key][chr(int(cp[2:], 16))].append(val)
    return out


def cps(vals):
    """'U+5B78' or 'U+5B78<kMainlandTelegraph' -> chars."""
    return [chr(int(m, 16)) for v in vals for m in re.findall(r"U\+([0-9A-F]{4,6})", v)]


def readings(vals):
    seen = []
    for v in vals:
        for r in v.replace(",", " ").split():
            r = unicodedata.normalize("NFC", r).upper()
            if r not in seen:
                seen.append(r)
    return seen


def strip(s):
    s = unicodedata.normalize("NFD", s.replace("Đ", "D").replace("đ", "d"))
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def hand_written():
    text = (ROOT / "src" / "lib" / "japanese" / "kanji.ts").read_text(encoding="utf-8")
    return {c: hv for c, hv in re.findall(r'\{ char: "(.)".*?hanViet: "([^"]+)"', text)}


def main(zip_path: Path):
    z = zipfile.ZipFile(zip_path)
    vn = unihan(z, "Unihan_Readings.txt", ["kVietnamese"])["kVietnamese"]
    var = unihan(z, "Unihan_Variants.txt", VARIANT_FIELDS)
    # variant graph, both directions: (other char, relation)
    links = defaultdict(list)
    for f in VARIANT_FIELDS:
        for a, vals in var[f].items():
            for b in cps(vals):
                if b != a:
                    links[a].append((b, REL[f]))
                    links[b].append((a, REL[f] + " (reverse)"))

    graph = json.loads((ROOT / "src" / "data" / "kanji" / "graph.json").read_text(encoding="utf-8"))["kanji"]
    hand = hand_written()
    result, direct, via_variant, missing, multi, conflicts = {}, [], [], [], [], []

    for c in sorted(graph):
        if c in vn:
            e = {"hv": readings(vn[c]), "status": "direct"}
            direct.append(c)
        else:
            cand = defaultdict(list)
            for b, rel in links.get(c, []):
                if b in vn:
                    cand[b].append(rel)
            if cand:
                hv = readings([v for b in cand for v in vn[b]])
                e = {"hv": hv, "status": "variant", "via": [{"char": b, "relation": r[0]} for b, r in cand.items()]}
                via_variant.append(c)
            else:
                missing.append(c)
                continue
        result[c] = e
        if len(e["hv"]) > 1:
            multi.append(c)

    # Hand-written wins; keep the Unihan readings as extras only when they differ.
    for c, hv in hand.items():
        u = result.get(c)
        if u and strip(hv) not in [strip(r) for r in u["hv"]]:
            conflicts.append((c, hv, u["hv"], u["status"]))
        result[c] = {"hv": [hv] + [r for r in (u["hv"] if u else []) if strip(r) != strip(hv) and r not in REJECT.get(c, {})], "status": "manual"}
        if u and u["status"] == "variant":
            result[c]["via"] = u["via"]
        if c in missing:
            missing.remove(c)

    meta = {"source": "Unicode Unihan kVietnamese (+ kTraditionalVariant, kSimplifiedVariant, kZVariant)",
            "file": zip_path.name, "sha256": hashlib.sha256(zip_path.read_bytes()).hexdigest(),
            "licence": "Unicode License v3 (https://www.unicode.org/license.txt)",
            "note": "status: manual = hand-written in kanji.ts (wins), direct = Unihan for this kanji, variant = via a reading-preserving variant (see via)."}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"meta": meta, "kanji": result}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    total = len(graph)
    nm = [c for c in direct if c not in hand]
    lines = [
        "# Báo cáo nhập Hán Việt (Unihan kVietnamese)", "",
        f"Sinh bởi `tools/importHanViet.py` từ `{zip_path.name}` (sha256 `{meta['sha256'][:16]}…`). Không sửa tay.", "",
        "| Mục | Số kanji |", "|---|---|",
        f"| Tổng kanji trong graph | {total} |",
        f"| Viết tay (kanji.ts, ưu tiên) | {len(hand)} |",
        f"| Unihan trực tiếp (ngoài viết tay) | {len(nm)} |",
        f"| Qua dạng biến thể (ngoài viết tay) | {len([c for c in via_variant if c not in hand])} |",
        f"| Không tìm thấy (để trống) | {len(missing)} |",
        f"| Có nhiều âm | {len(multi) + len([c for c in hand if len(result[c]['hv']) > 1 and c not in multi])} |", "",
        f"Độ phủ: {len(result)}/{total} ({100 * len(result) / total:.1f}%).", "",
        "## Đối chiếu 71 kanji viết tay với Unihan", "",
        "Lệch = âm viết tay không nằm trong Unihan (giữ âm viết tay; cần duyệt).", ""]
    lines += [f"- {c}: viết tay **{h}**, Unihan {', '.join(u)} ({s})" for c, h, u, s in conflicts] or ["- Không có lệch."]
    lines += ["", "## Âm Unihan đã duyệt và loại", ""]
    lines += [f"- {c} {r}: {why}" for c, d in REJECT.items() for r, why in d.items()]
    lines += ["", "## Tra qua biến thể", ""]
    lines += [f"- {c} → {', '.join(x['char'] + ' [' + x['relation'] + ']' for x in result[c]['via'])}: {', '.join(result[c]['hv'])}" for c in via_variant]
    lines += ["", "## Nhiều âm", ""]
    lines += [f"- {c}: {', '.join(result[c]['hv'])}" for c in sorted(result) if len(result[c]["hv"]) > 1]
    lines += ["", f"## Không tìm thấy ({len(missing)})", "", " ".join(missing)]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"graph {total}, covered {len(result)}, direct {len(direct)}, variant {len(via_variant)}, missing {len(missing)}, multi {len(multi)}, conflicts {len(conflicts)}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
