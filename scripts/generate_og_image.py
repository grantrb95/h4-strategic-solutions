#!/usr/bin/env python3
"""Regenerates og-image.png (1200x630 Open Graph share image) from repo assets.

Run from anywhere: python3 scripts/generate_og_image.py
Requires: Pillow, fonttools, brotli (for woff2 -> ttf conversion; the site
only ships woff2, so this script converts the two faces it needs into a
temp dir each run rather than checking in duplicate font files).
"""
import os
import tempfile

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_DIR = os.path.join(REPO_ROOT, "fonts")
LOGO_SRC = os.path.join(REPO_ROOT, "logo-512.webp")
OUT_PATH = os.path.join(REPO_ROOT, "og-image.png")

W, H = 1200, 630
BG = (0x33, 0x33, 0x33)
ORANGE = (0xE8, 0x52, 0x1E)
OLIVE_GOLD = (0x8A, 0x8A, 0x3C)
WHITE = (255, 255, 255)

LOGO_DIAMETER = 260
LOGO_MARGIN_LEFT = 90
TEXT_X = LOGO_MARGIN_LEFT + LOGO_DIAMETER + 60


def woff2_to_ttf(name, tmpdir):
    src = os.path.join(FONTS_DIR, name)
    dst = os.path.join(tmpdir, name.replace(".woff2", ".ttf"))
    f = TTFont(src)
    f.flavor = None
    f.save(dst)
    return dst


def circular_logo(diameter):
    """Extracts the circular badge from logo-512.webp (which has a flat
    white square background baked in) and returns an RGBA image with
    everything outside the circle made transparent, resized to `diameter`.
    """
    src = Image.open(LOGO_SRC).convert("RGB")
    size = src.size[0]
    # The circle badge is inscribed with a small margin inside the square;
    # measured empirically (see scripts/ commit message) at roughly r=198
    # around the square's center on a 512px source.
    radius = int(size * 0.387)
    cx = cy = size // 2

    mask = Image.new("L", src.size, 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(2))

    out = src.convert("RGBA")
    out.putalpha(mask)
    out = out.resize((diameter, diameter), Image.LANCZOS)
    return out


def main():
    with tempfile.TemporaryDirectory() as tmpdir:
        bebas_path = woff2_to_ttf("bebas-neue-400.woff2", tmpdir)
        jakarta_500_path = woff2_to_ttf("plus-jakarta-sans-500.woff2", tmpdir)

        headline_font = ImageFont.truetype(bebas_path, 74)
        subline_font = ImageFont.truetype(jakarta_500_path, 30)
        footer_font = ImageFont.truetype(jakarta_500_path, 20)

        img = Image.new("RGB", (W, H), BG)
        draw = ImageDraw.Draw(img, "RGBA")

        logo = circular_logo(LOGO_DIAMETER)
        logo_y = (H - LOGO_DIAMETER) // 2
        img.paste(logo, (LOGO_MARGIN_LEFT, logo_y), logo)

        headline = "H-4 STRATEGIC SOLUTIONS"
        subline = "Air-Ride Hotshot Flatbed Carrier · Fort Gibson, OK"

        headline_bbox = draw.textbbox((0, 0), headline, font=headline_font)
        headline_h = headline_bbox[3] - headline_bbox[1]
        subline_bbox = draw.textbbox((0, 0), subline, font=subline_font)
        subline_h = subline_bbox[3] - subline_bbox[1]

        rule_h = 6
        gap_above_rule = 26
        gap_below_rule = 22
        block_h = headline_h + gap_above_rule + rule_h + gap_below_rule + subline_h
        block_top = (H - block_h) // 2

        headline_y = block_top - headline_bbox[1]
        draw.text((TEXT_X, headline_y), headline, font=headline_font, fill=WHITE)

        rule_y = block_top + headline_h + gap_above_rule
        rule_w = 480
        draw.rectangle((TEXT_X, rule_y, TEXT_X + rule_w, rule_y + rule_h), fill=ORANGE)

        subline_y = rule_y + rule_h + gap_below_rule - subline_bbox[1]
        draw.text((TEXT_X, subline_y), subline, font=subline_font, fill=OLIVE_GOLD)

        footer = "USDOT 4486529 · MC 1772833"
        footer_bbox = draw.textbbox((0, 0), footer, font=footer_font)
        footer_w = footer_bbox[2] - footer_bbox[0]
        margin = 36
        fx = W - margin - footer_w
        fy = H - margin - (footer_bbox[3] - footer_bbox[1])
        draw.text((fx, fy), footer, font=footer_font, fill=(255, 255, 255, 178))

        img.save(OUT_PATH, "PNG", optimize=True)
        print(f"Wrote {OUT_PATH} ({os.path.getsize(OUT_PATH)} bytes, {img.size})")


if __name__ == "__main__":
    main()
