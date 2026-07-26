"""
CopyDesk logo generator.

Concept: two overlapping "sheets" (the copy-trading duplication motif —
master account -> follower account) with a rising trend line + candlestick
wick drawn across the front sheet (the trading motif). Palette pulled
directly from the app's own design tokens (styles.css):

  background / bg-navy   #0b0f1a  (root.tsx theme-color)
  card                   #101419
  border                 #232a30
  primary / accent (cyan)#25c0e6
  profit (green)         #43c251
"""
from PIL import Image, ImageDraw, ImageFilter
import math

BG_NAVY   = (11, 15, 26, 255)     # #0b0f1a
CARD      = (16, 20, 25, 255)     # #101419
BORDER    = (35, 42, 48, 255)     # #232a30
CYAN      = (37, 192, 230, 255)   # #25c0e6
CYAN_DIM  = (37, 192, 230, 110)
GREEN     = (67, 194, 81, 255)    # #43c251

CANVAS = 1024


def rounded_square_bg(size, radius_pct, fill):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_pct)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=fill)
    return img


def draw_mark(draw_target_size, content_scale):
    """Draw the copy-trading glyph centered in a square of draw_target_size,
    scaled by content_scale (0-1) to control padding (used for maskable
    safe-zone vs standard icons)."""
    S = draw_target_size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    c = S / 2
    unit = S * content_scale  # side length of the glyph bounding box

    # --- Back sheet (the "master" account) — offset up-left, outline only
    back_w, back_h = unit * 0.62, unit * 0.62
    back_r = back_w * 0.22
    bx0, by0 = c - unit * 0.42, c - unit * 0.42
    bx1, by1 = bx0 + back_w, by0 + back_h
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=back_r,
                         outline=CYAN_DIM, width=max(2, int(S * 0.014)))

    # --- Front sheet (the "follower" account) — filled card, offset down-right
    front_w, front_h = unit * 0.72, unit * 0.72
    front_r = front_w * 0.20
    fx0, fy0 = c - unit * 0.30 + unit * 0.14, c - unit * 0.30 + unit * 0.14
    fx1, fy1 = fx0 + front_w, fy0 + front_h
    d.rounded_rectangle([fx0, fy0, fx1, fy1], radius=front_r,
                         fill=CARD, outline=CYAN, width=max(3, int(S * 0.018)))

    # --- Trend line + candlestick wick drawn across the front sheet
    pad = front_w * 0.16
    lx0, ly0 = fx0 + pad, fy0 + pad
    lx1, ly1 = fx1 - pad, fy1 - pad

    # 3-point ascending trend polyline (dip then rise, like a real chart)
    p0 = (lx0, ly1 - (ly1 - ly0) * 0.30)
    p1 = (lx0 + (lx1 - lx0) * 0.42, ly1 - (ly1 - ly0) * 0.10)
    p2 = (lx0 + (lx1 - lx0) * 0.70, ly1 - (ly1 - ly0) * 0.62)
    p3 = (lx1, ly1 - (ly1 - ly0) * 0.92)

    line_w = max(4, int(S * 0.026))
    d.line([p0, p1, p2, p3], fill=CYAN, width=line_w, joint="curve")

    # small candlestick wick + body sitting on the second segment
    body_cx = lx0 + (lx1 - lx0) * 0.42
    body_w = (lx1 - lx0) * 0.09
    body_top = p1[1] - (ly1 - ly0) * 0.16
    body_bot = p1[1] + (ly1 - ly0) * 0.10
    wick_top = body_top - (ly1 - ly0) * 0.08
    wick_bot = body_bot + (ly1 - ly0) * 0.08
    d.line([(body_cx, wick_top), (body_cx, wick_bot)], fill=GREEN,
           width=max(3, int(S * 0.012)))
    d.rectangle([body_cx - body_w / 2, body_top, body_cx + body_w / 2, body_bot],
                fill=GREEN)

    # endpoint marker (live dot) at the peak, with a soft glow
    r_dot = max(6, int(S * 0.028))
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([p3[0] - r_dot * 2.4, p3[1] - r_dot * 2.4,
                p3[0] + r_dot * 2.4, p3[1] + r_dot * 2.4], fill=(37, 192, 230, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=S * 0.02))
    img = Image.alpha_composite(img, glow)
    d = ImageDraw.Draw(img)
    d.ellipse([p3[0] - r_dot, p3[1] - r_dot, p3[0] + r_dot, p3[1] + r_dot],
               fill=(255, 255, 255, 255), outline=CYAN, width=max(2, int(S * 0.01)))

    return img


def draw_simple_mark(S, content_scale):
    """Simplified glyph for tiny sizes (16/32/48px) where the full two-sheet
    mark turns to mush: single sheet + bold ascending arrow only."""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = S / 2
    unit = S * content_scale

    w = h = unit
    x0, y0 = c - w / 2, c - h / 2
    x1, y1 = x0 + w, y0 + h
    d.rounded_rectangle([x0, y0, x1, y1], radius=w * 0.22,
                         fill=CARD, outline=CYAN, width=max(2, round(S * 0.05)))

    pad = w * 0.20
    lx0, ly0 = x0 + pad, y0 + pad
    lx1, ly1 = x1 - pad, y1 - pad
    p0 = (lx0, ly1)
    p1 = (lx0 + (lx1 - lx0) * 0.45, ly0 + (ly1 - ly0) * 0.45)
    p2 = (lx1, ly0)
    line_w = max(2, round(S * 0.09))
    d.line([p0, p1, p2], fill=CYAN, width=line_w, joint="curve")

    # arrowhead at the tip
    ah = (lx1 - lx0) * 0.16
    d.polygon([
        (p2[0], p2[1]),
        (p2[0] - ah, p2[1]),
        (p2[0], p2[1] + ah),
    ], fill=CYAN)
    return img


def build_icon(size, radius_pct, content_scale, transparent_bg=False, simple=False):
    if transparent_bg:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        canvas = rounded_square_bg(size, radius_pct, BG_NAVY)
    mark = draw_simple_mark(size, content_scale) if simple else draw_mark(size, content_scale)
    canvas = Image.alpha_composite(canvas, mark)
    return canvas


def hi_res_then_resize(builder, out_size, **kwargs):
    hi = builder(CANVAS, **kwargs)
    return hi.resize((out_size, out_size), Image.LANCZOS)


if __name__ == "__main__":
    import sys
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."

    # Tiny sizes: simplified single-sheet + arrow glyph (the full two-sheet
    # mark degrades to mush below ~64px)
    for size in [16, 32, 48]:
        img = hi_res_then_resize(build_icon, size, radius_pct=0.22, content_scale=0.66,
                                  simple=True)
        img.save(f"{out_dir}/icon-{size}.png")

    # Larger sizes: full two-sheet "copy" mark + trend line
    for size in [192, 512]:
        img = hi_res_then_resize(build_icon, size, radius_pct=0.22, content_scale=0.62)
        img.save(f"{out_dir}/icon-{size}.png")

    # apple-touch-icon: iOS applies its own corner mask, so ship a flat
    # (non-rounded) full-bleed square, no transparency
    apple = hi_res_then_resize(build_icon, 180, radius_pct=0.0, content_scale=0.58)
    apple.save(f"{out_dir}/apple-touch-icon.png")

    # Maskable icon for Android adaptive icons — full-bleed bg, glyph kept
    # inside the ~80% safe zone so OS masks (circle/squircle/etc.) don't clip it
    for size in [192, 512]:
        img = hi_res_then_resize(build_icon, size, radius_pct=0.0, content_scale=0.46,
                                  transparent_bg=False)
        img.save(f"{out_dir}/maskable-icon-{size}.png")

    # Transparent-background square mark (for social/press use, dark UIs, etc.)
    img = hi_res_then_resize(build_icon, 1024, radius_pct=0.22, content_scale=0.62,
                              transparent_bg=True)
    img.save(f"{out_dir}/logo-transparent-1024.png")

    print("done")