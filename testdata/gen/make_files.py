#!/usr/bin/env python3
"""Make the test files: XLSX workbooks and pictures, each with typical edits.

Deterministic (fixed seeds, fixed document dates) so the files and the
benchmark numbers are the same on every run. Needs openpyxl and Pillow.
"""
import datetime, io, os, random, sys
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
FIXED = datetime.datetime(2026, 10, 1, 12, 0, 0)

def save(wb, name, when=FIXED):
    wb.properties.created = FIXED
    wb.properties.modified = when
    wb.save(os.path.join(OUT, "xlsx", name))

def base_workbook():
    rnd = random.Random(1)
    wb = Workbook()
    ws = wb.active
    ws.title = "Sales"
    ws.append(["Region", "Product", "Month", "Units", "Price", "Revenue", "Rep", "Note"])
    regions = ["North", "South", "East", "West", "Central"]
    products = ["Widget", "Gadget", "Doohickey", "Gizmo", "Thingamajig", "Sprocket"]
    reps = ["Aino", "Bertil", "Carla", "Dmitri", "Eero", "Fatima", "Gustav"]
    for r in range(2, 2002):
        units = rnd.randint(1, 500)
        price = round(rnd.uniform(2, 90), 2)
        ws.append([rnd.choice(regions), rnd.choice(products), "2026-%02d" % rnd.randint(1, 12),
                   units, price, f"=D{r}*E{r}", rnd.choice(reps), "ok" if rnd.random() < 0.9 else "check"])
    ws2 = wb.create_sheet("Summary")
    ws2.append(["Region", "Revenue"])
    for i, reg in enumerate(regions):
        ws2.append([reg, f'=SUMIF(Sales!A:A,"{reg}",Sales!F:F)'])
    ws3 = wb.create_sheet("Targets")
    for r in range(1, 201):
        ws3.append([f"T{r}"] + [rnd.randint(100, 9999) for _ in range(12)])
    return wb

def fix_formulas(ws):
    # openpyxl moves cells but not the references in formulas; Excel does
    for r in range(2, ws.max_row + 1):
        if isinstance(ws[f"F{r}"].value, str) and ws[f"F{r}"].value.startswith("="):
            ws[f"F{r}"] = f"=D{r}*E{r}"
        elif ws[f"A{r}"].value == "Inserted":
            ws[f"F{r}"] = f"=D{r}*E{r}"

def xlsx():
    os.makedirs(os.path.join(OUT, "xlsx"), exist_ok=True)
    save(base_workbook(), "base.xlsx")
    # one cell
    wb = base_workbook(); wb["Sales"]["D500"] = 4242
    save(wb, "edit-cell.xlsx", FIXED + datetime.timedelta(minutes=5))
    # a row of values changed
    wb = base_workbook()
    for c, v in zip("ABCDEFGH", ["West", "Gizmo", "2026-07", 77, 12.5, "=D900*E900", "Aino", "fixed"]):
        wb["Sales"][f"{c}900"] = v
    save(wb, "edit-row.xlsx", FIXED + datetime.timedelta(minutes=6))
    # 50 rows inserted in the middle: everything below moves
    wb = base_workbook(); ws = wb["Sales"]; ws.insert_rows(1000, 50)
    for r in range(1000, 1050):
        ws[f"A{r}"] = "Inserted"; ws[f"D{r}"] = r
    fix_formulas(ws)
    save(wb, "insert-rows.xlsx", FIXED + datetime.timedelta(minutes=7))
    # 100 rows deleted
    wb = base_workbook(); wb["Sales"].delete_rows(300, 100); fix_formulas(wb["Sales"])
    save(wb, "delete-rows.xlsx", FIXED + datetime.timedelta(minutes=8))
    # a new sheet
    wb = base_workbook(); ws = wb.create_sheet("Notes")
    for r in range(1, 31):
        ws.append([f"Note {r}", "Lorem ipsum dolor sit amet " * 3])
    save(wb, "add-sheet.xlsx", FIXED + datetime.timedelta(minutes=9))
    # styling: header bold and filled
    wb = base_workbook(); ws = wb["Sales"]
    for c in "ABCDEFGH":
        ws[f"{c}1"].font = Font(bold=True)
        ws[f"{c}1"].fill = PatternFill("solid", fgColor="FFDDEEFF")
    save(wb, "style-header.xlsx", FIXED + datetime.timedelta(minutes=10))
    # many scattered edits (a pasted column)
    wb = base_workbook(); ws = wb["Sales"]; rnd = random.Random(9)
    for r in range(2, 2002, 7):
        ws[f"E{r}"] = round(rnd.uniform(2, 90), 2)
    save(wb, "edit-column.xlsx", FIXED + datetime.timedelta(minutes=11))

def photo(w=1600, h=1067, seed=3):
    rnd = random.Random(seed)
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(0, w):
            n = rnd.randint(-12, 12)
            px[x, y] = (max(0, min(255, int(90 + 120 * x / w) + n)),
                        max(0, min(255, int(140 + 80 * y / h) + n)),
                        max(0, min(255, int(200 - 100 * x / w + 30 * ((x // 40 + y // 40) % 2)) + n)))
    d = ImageDraw.Draw(img)
    for i in range(30):
        x, y = rnd.randint(0, w), rnd.randint(0, h)
        r = rnd.randint(10, 80)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(rnd.randint(0, 255), rnd.randint(0, 255), rnd.randint(0, 255)))
    return img.filter(ImageFilter.GaussianBlur(1.2))

def screenshot(w=1280, h=800):
    img = Image.new("RGB", (w, h), (246, 247, 250))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, 48], fill=(40, 44, 52))
    for i in range(14):
        y = 80 + i * 48
        d.rectangle([40, y, w - 40, y + 36], outline=(200, 205, 215), fill=(255, 255, 255))
        d.text((56, y + 10), f"Row {i + 1}: quarterly figures and a note", fill=(30, 30, 30))
    return img

def images():
    out = os.path.join(OUT, "images")
    os.makedirs(out, exist_ok=True)
    p = photo()
    p.save(os.path.join(out, "photo.jpg"), quality=88)
    ImageEnhance.Brightness(p).enhance(1.15).save(os.path.join(out, "photo-brighter.jpg"), quality=88)
    p.crop((100, 80, 1500, 1000)).save(os.path.join(out, "photo-cropped.jpg"), quality=88)
    p.save(os.path.join(out, "photo-resaved.jpg"), quality=88)
    s = screenshot()
    s.save(os.path.join(out, "shot.png"), optimize=False)
    a = s.copy(); ImageDraw.Draw(a).rectangle([300, 300, 700, 420], outline=(230, 30, 30), width=4)
    a.save(os.path.join(out, "shot-annotated.png"), optimize=False)
    b = s.copy(); ImageDraw.Draw(b).text((56, 90), "Row 1: EDITED", fill=(200, 0, 0))
    b.save(os.path.join(out, "shot-text.png"), optimize=False)

if __name__ == "__main__":
    xlsx()
    images()
    print("ok")
