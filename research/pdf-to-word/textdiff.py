# แสดงส่วนของข้อความที่ต่างกันระหว่างต้นฉบับกับผลลัพธ์ (ไม่นับช่องว่าง/ZWSP)
import difflib
import sys

import pymupdf


def text(path):
    s = "".join(p.get_text() for p in pymupdf.open(path))
    return "".join(s.replace("​", "").split())


a, b = text(sys.argv[1]), text(sys.argv[2])
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
print("ratio", round(sm.ratio(), 4))
for op, i1, i2, j1, j2 in sm.get_opcodes():
    if op != "equal":
        print(f"{op:8} orig={a[i1:i2][:60]!r:64} out={b[j1:j2][:60]!r}")
