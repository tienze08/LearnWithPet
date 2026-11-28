"""Copies OpenJLPT grammar JSON verbatim into src/data/japanese/grammar/source and writes meta.json.

Usage (stdlib only; network needed):  python -X utf8 -I tools/importGrammar.py N5 [N4 ...]
Source: https://github.com/evanclan/OpenJLPT (CC BY-SA 4.0). Source files are never edited; Vietnamese lives in vi/<level>.json.
Validates the fields src/data/japanese/grammar/types.ts relies on; stops on the first violation.
"""
import hashlib, json, re, sys, urllib.request
from pathlib import Path

REPO = "evanclan/OpenJLPT"
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "japanese" / "grammar"
REQUIRED = ["id", "pattern", "romaji", "level", "meaning", "formation", "examples", "tags"]


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "grammar-import"}), timeout=60) as r:
        return r.read()


def main(levels):
    commit = json.loads(get(f"https://api.github.com/repos/{REPO}/commits/main"))["sha"]
    meta_path = OUT / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {"files": {}}
    (OUT / "source").mkdir(parents=True, exist_ok=True)
    for lv in levels:
        raw = get(f"https://raw.githubusercontent.com/{REPO}/{commit}/data/json/grammar/{lv.lower()}.json")
        data = json.loads(raw.decode("utf-8"))
        ids = [g["id"] for g in data]
        assert len(ids) == len(set(ids)), "duplicate ids"
        for g in data:
            missing = [k for k in REQUIRED if k not in g]
            assert not missing, f"{g.get('id')}: missing {missing}"
            assert g["level"] == lv.upper() and re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", g["id"]), g["id"]
            assert g["examples"] and all("ja" in e and "en" in e for e in g["examples"]), g["id"]
        (OUT / "source" / f"{lv.lower()}.json").write_bytes(raw)
        meta["files"][lv.upper()] = {"count": len(data), "sha256": hashlib.sha256(raw).hexdigest()}
        print(lv.upper(), len(data), "points")
    meta.update({
        "source": "OpenJLPT", "url": f"https://github.com/{REPO}", "commit": commit,
        "licence": "CC BY-SA 4.0", "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
        "note": "source/*.json is verbatim. vi/*.json is VocaPet editorial Vietnamese (see status per entry), also CC BY-SA 4.0.",
    })
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1:] or ["N5"])
