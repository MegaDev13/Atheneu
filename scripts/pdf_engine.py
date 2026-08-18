#!/usr/bin/env python3
"""Gera PDFs acadêmicos em português brasileiro (série Investigação Crítica)."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
OUT_DIR = ROOT / "public" / "library"
META_DIR = ROOT / "pesquisa" / "volumes"

WINE = (110, 31, 43)
INK = (32, 24, 20)
MUTE = (90, 78, 68)
GOLD = (168, 132, 72)
RULE = (196, 180, 156)
BOX_BG = (248, 242, 230)
BOX_LINE = (176, 140, 80)


class BookPDF(FPDF):
    def __init__(self, volume_no: int, title: str, subtitle: str):
        super().__init__(format="A4", unit="mm")
        self.volume_no = volume_no
        self.book_title = title
        self.book_subtitle = subtitle
        self.set_auto_page_break(auto=True, margin=22)
        self.set_margins(20, 18, 20)
        self.add_font("DejaVu", "", str(FONT_DIR / "DejaVuSerif.ttf"))
        self.add_font("DejaVu", "B", str(FONT_DIR / "DejaVuSerif-Bold.ttf"))
        self.add_font("DejaVuI", "", str(FONT_DIR / "DejaVuSerif.ttf"))
        self.add_font("Sans", "", str(FONT_DIR / "DejaVuSans.ttf"))
        self.add_font("Sans", "B", str(FONT_DIR / "DejaVuSans-Bold.ttf"))
        self.alias_nb_pages()

    def header(self):
        if self.page_no() <= 1:
            return
        self.set_font("Sans", "", 8)
        self.set_text_color(*GOLD)
        self.cell(0, 6, f"INVESTIGAÇÃO CRÍTICA  ·  VOLUME {self.volume_no:02d}", align="L")
        self.ln(2)
        self.set_draw_color(*RULE)
        self.set_line_width(0.2)
        self.line(20, 14, 190, 14)
        self.ln(6)

    def footer(self):
        if self.page_no() <= 1:
            return
        self.set_y(-16)
        self.set_draw_color(*RULE)
        self.line(20, self.get_y(), 190, self.get_y())
        self.set_y(-13)
        self.set_font("Sans", "", 8)
        self.set_text_color(*MUTE)
        self.cell(80, 6, "Atheneu  ·  cadastro Shay", align="L")
        self.cell(0, 6, f"{self.page_no() - 1}", align="R")

    def title_page(self, cover_path: str | None, blurb: str):
        self.add_page()
        self.set_fill_color(*WINE)
        self.rect(0, 0, 210, 297, "F")
        self.set_fill_color(84, 20, 31)
        self.rect(0, 0, 14, 297, "F")
        self.set_text_color(233, 196, 120)
        self.set_font("Sans", "", 10)
        self.set_xy(28, 28)
        self.cell(0, 8, "SÉRIE  ·  INVESTIGAÇÃO CRÍTICA")
        self.set_text_color(247, 240, 226)
        self.set_font("DejaVu", "B", 11)
        self.set_xy(28, 42)
        self.cell(0, 8, f"VOLUME {self.volume_no:02d}")
        self.set_font("DejaVu", "B", 28)
        self.set_xy(28, 58)
        self.multi_cell(154, 12, self.book_title)
        self.set_font("DejaVu", "", 13)
        self.set_text_color(233, 196, 120)
        y = self.get_y() + 4
        self.set_xy(28, y)
        self.multi_cell(154, 7, self.book_subtitle)
        if cover_path and Path(cover_path).exists():
            self.image(cover_path, x=28, y=min(self.get_y() + 10, 120), w=62)
        self.set_xy(28, 248)
        self.set_font("Sans", "", 9)
        self.set_text_color(233, 223, 201)
        self.multi_cell(154, 5, blurb)
        self.set_xy(28, 276)
        self.set_font("Sans", "", 8)
        self.set_text_color(201, 169, 106)
        self.cell(0, 5, "Pesquisa histórica, filosófica, econômica e sociológica  ·  2026")

    def h1(self, text: str):
        self.ln(4)
        if self.get_y() > 250:
            self.add_page()
        self.set_font("DejaVu", "B", 16)
        self.set_text_color(*WINE)
        self.multi_cell(0, 8, text)
        self.set_draw_color(*GOLD)
        self.set_line_width(0.5)
        y = self.get_y() + 1
        self.line(20, y, 78, y)
        self.ln(6)

    def h2(self, text: str):
        self.ln(3)
        if self.get_y() > 258:
            self.add_page()
        self.set_font("DejaVu", "B", 12.5)
        self.set_text_color(*INK)
        self.multi_cell(0, 7, text)
        self.ln(2)

    def h3(self, text: str):
        if self.get_y() > 262:
            self.add_page()
        self.set_font("Sans", "B", 10.5)
        self.set_text_color(*GOLD)
        self.multi_cell(0, 6, text.upper())
        self.ln(1.5)

    def body(self, text: str):
        self.set_font("DejaVu", "", 10.5)
        self.set_text_color(*INK)
        self.multi_cell(0, 5.6, text)
        self.ln(2.4)

    def quote(self, text: str, source: str):
        if self.get_y() > 240:
            self.add_page()
        x, y = 24, self.get_y()
        self.set_fill_color(*BOX_BG)
        self.set_draw_color(*GOLD)
        # estimate height
        self.set_font("DejaVu", "", 10)
        self.set_xy(30, y + 3)
        start = self.get_y()
        self.set_text_color(*INK)
        self.multi_cell(154, 5.4, f"“{text}”")
        self.set_font("Sans", "", 8)
        self.set_text_color(*MUTE)
        self.set_x(30)
        self.multi_cell(154, 4.5, source)
        end = self.get_y() + 3
        self.set_draw_color(*GOLD)
        self.set_line_width(1.1)
        self.line(24, y + 2, 24, end - 2)
        self.set_y(end)
        self.ln(2)

    def note_box(self, title: str, items: list[str]):
        if self.get_y() > 220:
            self.add_page()
        self.set_fill_color(*BOX_BG)
        self.set_draw_color(*BOX_LINE)
        self.set_line_width(0.3)
        y0 = self.get_y()
        self.set_xy(22, y0 + 3)
        self.set_font("Sans", "B", 9)
        self.set_text_color(*WINE)
        self.multi_cell(166, 5, title)
        self.set_font("DejaVu", "", 9.2)
        self.set_text_color(*INK)
        for it in items:
            self.set_x(24)
            self.multi_cell(164, 4.8, f"•  {it}")
        y1 = self.get_y() + 3
        self.rect(20, y0, 170, y1 - y0)
        self.set_y(y1)
        self.ln(3)

    def source_line(self, text: str):
        self.set_font("Sans", "", 8)
        self.set_text_color(*MUTE)
        self.multi_cell(0, 4.2, text)
        self.ln(1.5)


def write_book(spec: dict) -> dict:
    """spec: volume, title, subtitle, blurb, cover, chapters[{title, blocks}]
    block types: p, h2, h3, quote{text,source}, box{title,items}, src
    """
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    META_DIR.mkdir(parents=True, exist_ok=True)
    pdf = BookPDF(spec["volume"], spec["title"], spec["subtitle"])
    pdf.title_page(spec.get("cover"), spec["blurb"])
    chapters_out = []
    for ch in spec["chapters"]:
        pdf.add_page()
        pdf.h1(ch["title"])
        texts = [ch["title"]]
        for b in ch["blocks"]:
            kind = b[0]
            if kind == "p":
                pdf.body(b[1])
                texts.append(b[1])
            elif kind == "h2":
                pdf.h2(b[1])
                texts.append(b[1])
            elif kind == "h3":
                pdf.h3(b[1])
                texts.append(b[1])
            elif kind == "quote":
                pdf.quote(b[1], b[2])
                texts.append(b[1])
            elif kind == "box":
                pdf.note_box(b[1], b[2])
                texts.extend(b[2])
            elif kind == "src":
                pdf.source_line(b[1])
        chapters_out.append({"title": ch["title"], "text": "\n\n".join(texts)})
    slug = spec["slug"]
    out = OUT_DIR / f"{slug}.pdf"
    pdf.output(str(out))
    meta = {
        "slug": slug,
        "title": spec["title"],
        "subtitle": spec["subtitle"],
        "author": spec.get("author", "Investigação Crítica — Atheneu"),
        "genre": spec.get("genre", "História"),
        "description": spec["blurb"],
        "volume": spec["volume"],
        "pages": max(1, pdf.page_no() - 1),
        "file": f"library/{slug}.pdf",
        "cover": spec.get("cover_public"),
        "chapters": chapters_out,
    }
    (META_DIR / f"{slug}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK  vol {spec['volume']:02d}  {out.name}  ({meta['pages']} págs., {len(chapters_out)} caps.)")
    return meta
