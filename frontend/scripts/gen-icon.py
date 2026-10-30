"""One-off icon generator — redesign of Drift's app icon as a simple
equalizer/soundwave glyph in brand colors. Run with: python scripts/gen-icon.py
Not part of the app build; throwaway tool, safe to delete after use.
"""
from PIL import Image, ImageDraw

BG = (10, 10, 10)          # #0a0a0a, matches app.json splash/adaptive-icon bg
GREEN_TOP = (56, 201, 153)  # #38c999
GREEN_BOT = (42, 156, 117)  # #2a9c75
SIZE = 1024

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def draw_bars(draw, cx, cy, scale, color_top, color_bot, gradient=True):
    """5-bar equalizer glyph, rounded caps, centered at (cx, cy)."""
    n = 5
    bar_w = 64 * scale
    gap = 36 * scale
    heights = [0.45, 0.72, 1.0, 0.72, 0.45]
    max_h = 420 * scale
    total_w = n * bar_w + (n - 1) * gap
    x0 = cx - total_w / 2
    radius = bar_w / 2
    for i, h_frac in enumerate(heights):
        h = max_h * h_frac
        x = x0 + i * (bar_w + gap)
        y0 = cy - h / 2
        y1 = cy + h / 2
        color = lerp(color_top, color_bot, i / (n - 1)) if gradient else color_top
        draw.rounded_rectangle([x, y0, x + bar_w, y1], radius=radius, fill=color)

def make_full_icon(path):
    img = Image.new("RGB", (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(img)
    draw_bars(draw, SIZE / 2, SIZE / 2, scale=1.0, color_top=GREEN_TOP, color_bot=GREEN_BOT)
    img.save(path)

def make_foreground(path):
    # Adaptive icon foreground: transparent bg, glyph scaled to the safe zone
    # (roughly center 66% of 1024, per Android adaptive-icon spec).
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_bars(draw, SIZE / 2, SIZE / 2, scale=0.62, color_top=GREEN_TOP + (255,), color_bot=GREEN_BOT + (255,))
    img.save(path)

def make_monochrome(path):
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    white = (255, 255, 255, 255)
    draw_bars(draw, SIZE / 2, SIZE / 2, scale=0.62, color_top=white, color_bot=white, gradient=False)
    img.save(path)

def make_favicon(path):
    img = Image.new("RGB", (196, 196), BG)
    draw = ImageDraw.Draw(img)
    draw_bars(draw, 98, 98, scale=196 / 1024, color_top=GREEN_TOP, color_bot=GREEN_BOT)
    img.save(path)

def make_splash(path):
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_bars(draw, SIZE / 2, SIZE / 2, scale=0.62, color_top=GREEN_TOP + (255,), color_bot=GREEN_BOT + (255,))
    img.save(path)

if __name__ == "__main__":
    base = "D:/codes/drift/frontend/assets/images"
    make_full_icon(f"{base}/icon.png")
    make_foreground(f"{base}/android-icon-foreground.png")
    make_monochrome(f"{base}/android-icon-monochrome.png")
    make_favicon(f"{base}/favicon.png")
    make_splash(f"{base}/splash-icon.png")
    print("done")
