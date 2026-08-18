#!/usr/bin/env python3
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pdf_engine import write_book, META_DIR, ROOT
from volumes_01_04 import vol01, vol02, vol03, vol04
from volumes_05_08 import vol05, vol06, vol07, vol08
from volumes_extra import extra_01, extra_02, extra_03, extra_04, extra_05, extra_06, extra_07, extra_08

def merge(base, extra):
    spec = base()
    spec["chapters"] = spec["chapters"] + extra()
    return spec

def main():
    metas = []
    for spec in (
        merge(vol01, extra_01), merge(vol02, extra_02), merge(vol03, extra_03), merge(vol04, extra_04),
        merge(vol05, extra_05), merge(vol06, extra_06), merge(vol07, extra_07), merge(vol08, extra_08),
    ):
        metas.append(write_book(spec))
    catalog = {
        "serie": "Investigação Crítica",
        "conta": "shay",
        "volumes": [
            {
                "slug": m["slug"],
                "title": m["title"],
                "author": m["author"],
                "genre": m["genre"],
                "description": m["description"],
                "pages": m["pages"],
                "file": m["file"],
                "cover": m.get("cover"),
                "chapters": [{"title": c["title"], "text": c["text"]} for c in m["chapters"]],
            }
            for m in metas
        ],
    }
    out = META_DIR / "catalogo.json"
    out.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print("catálogo:", out, "livros:", len(metas))

if __name__ == "__main__":
    main()
