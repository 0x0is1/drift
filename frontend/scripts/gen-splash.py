from PIL import Image, ImageDraw, ImageFont

CANVAS = 1024
mark = Image.open('assets/images/android-icon-foreground.png').convert('RGBA')
bbox = mark.getbbox()
mark = mark.crop(bbox)
print("mark content size:", mark.size)

target_w = int(CANVAS * 0.22)
scale = target_w / mark.width
target_h = int(mark.height * scale)
mark_big = mark.resize((target_w, target_h), Image.LANCZOS)
print("scaled mark size:", mark_big.size)

canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))

font_path = 'node_modules/@expo-google-fonts/racing-sans-one/400Regular/RacingSansOne_400Regular.ttf'
font_size = 56
font = ImageFont.truetype(font_path, font_size)

text = "DRIFT"
letter_spacing = 10
draw_tmp = ImageDraw.Draw(canvas)
char_widths = []
for ch in text:
    b = draw_tmp.textbbox((0, 0), ch, font=font)
    char_widths.append(b[2] - b[0])
text_w = sum(char_widths) + letter_spacing * (len(text) - 1)
asc, desc = font.getmetrics()
text_h = asc + desc

gap = 40
total_h = mark_big.height + gap + text_h
start_y = (CANVAS - total_h) // 2

mark_x = (CANVAS - mark_big.width) // 2
mark_y = start_y
canvas.paste(mark_big, (mark_x, mark_y), mark_big)

text_y = mark_y + mark_big.height + gap
x = (CANVAS - text_w) // 2
teal = (56, 201, 153, 255)
for ch, w in zip(text, char_widths):
    draw_tmp.text((x, text_y), ch, font=font, fill=teal)
    x += w + letter_spacing

canvas.save('assets/images/splash-icon.png')
print("saved, final size", canvas.size)
