# แสดง pPr ของย่อหน้าที่มีข้อความตรงกับคำค้น + ข้อความในย่อหน้า + sectPr (ขอบกระดาษ)
import re
import sys
import zipfile

z = zipfile.ZipFile(sys.argv[1])
x = z.read("word/document.xml").decode()
needle = sys.argv[2]
for p in re.findall(r"<w:p[ >].*?</w:p>", x, flags=re.S):
    text = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p))
    if needle in text:
        ppr = re.search(r"<w:pPr>.*?</w:pPr>", p, flags=re.S)
        print("TEXT:", text[:160])
        print("pPr:", ppr.group(0)[:900] if ppr else None)
        tabs = p.count("<w:tab/>")
        print("tabs in para:", tabs, "| runs:", p.count("<w:r>") + p.count("<w:r "))
        first_runs = re.findall(r"<w:r>.*?</w:r>", p, flags=re.S)[:2]
        for r in first_runs:
            print("RUN:", r[:400])
        print("-" * 60)
print("SECT:", re.findall(r"<w:sectPr.*?</w:sectPr>", x, flags=re.S)[:1])
