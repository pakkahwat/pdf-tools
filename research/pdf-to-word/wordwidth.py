# ความกว้างของคำ/วลีเดียวกันในต้นฉบับกับผลลัพธ์ (จากตำแหน่งตัวอักษร) — หาว่าส่วนไหนที่ Word วาดกว้างกว่า
import sys

import pymupdf


def chars_of(path):
    out = []
    for b in pymupdf.open(path)[0].get_text("rawdict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                for c in s["chars"]:
                    if c["c"].strip() and c["c"] != "​":
                        out.append((c["c"], c["bbox"][0], c["bbox"][2], s["font"], s["size"]))
    return out


def width_of(chars, phrase):
    text = "".join(c[0] for c in chars)
    i = text.find(phrase)
    if i < 0:
        return None
    seg = chars[i: i + len(phrase)]
    if abs(seg[-1][2] - seg[0][1]) > 400:  # ข้ามบรรทัด
        return None
    return seg[-1][2] - seg[0][1], seg[0][3], seg[0][4]


a, b = chars_of(sys.argv[1]), chars_of(sys.argv[2])
for phrase in sys.argv[3:]:
    wa, wb = width_of(a, phrase), width_of(b, phrase)
    if wa and wb:
        print(f"{phrase:28} orig {wa[0]:7.2f} ({wa[1]} {wa[2]:.2f}) | word {wb[0]:7.2f} ({wb[1]} {wb[2]:.2f}) | ratio {wb[0] / wa[0]:.4f}")
    else:
        print(f"{phrase:28} not found ({bool(wa)}, {bool(wb)})")
