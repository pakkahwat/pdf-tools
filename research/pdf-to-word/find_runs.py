# หาย่อหน้าที่ข้อความรวม (ไม่นับช่องว่าง) มีคำค้น แล้วแสดง run + rPr แบบย่อ และ pPr
import re
import sys
import zipfile

x = zipfile.ZipFile(sys.argv[1]).read("word/document.xml").decode()
needle = sys.argv[2]
for p in re.findall(r"<w:p[ >].*?</w:p>", x, flags=re.S):
    text = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p))
    if needle in "".join(text.split()):
        print("pPr:", (re.search(r"<w:pPr>.*?</w:pPr>", p, re.S) or [None])[0])
        for r in re.findall(r"<w:r>.*?</w:r>", p, flags=re.S):
            t = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", r))
            sp = re.search(r'<w:spacing w:val="(-?\d+)"', r)
            ww = re.search(r'<w:w w:val="(\d+)"', r)
            font = re.search(r'w:ascii="([^"]+)"', r)
            print(f"  {t!r:20} spacing={sp.group(1) if sp else '-':5} w={ww.group(1) if ww else '-':4} font={font.group(1) if font else '-'} tab={'<w:tab/>' in r}")
        break
