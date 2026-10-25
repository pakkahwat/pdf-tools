# ดู XML ของ run ที่มีอักษรไทยใน DOCX + รายการฟอนต์/ภาพ
import re
import sys
import zipfile

path = sys.argv[1]
z = zipfile.ZipFile(path)
xml = z.read("word/document.xml").decode("utf-8")
runs = re.findall(r"<w:r>.*?</w:r>|<w:r .*?</w:r>", xml, flags=re.S)
thai = [r for r in runs if re.search("[฀-๿]", r)]
print("runs:", len(runs), "thai runs:", len(thai))
for r in thai[:3]:
    print("-" * 60)
    print(r[:700])
print("=" * 60)
print("szCs count:", xml.count("w:szCs"), "| rFonts w:cs count:", xml.count('w:cs="'), "| w:sz count:", xml.count("<w:sz "))
print("media:", [n for n in z.namelist() if n.startswith("word/media")])
print("drawings:", xml.count("<w:drawing>"), "| floating anchors:", xml.count("<wp:anchor"), "| inline:", xml.count("<wp:inline"))
ft = z.read("word/fontTable.xml").decode("utf-8") if "word/fontTable.xml" in z.namelist() else ""
print("fontTable fonts:", re.findall(r'<w:font w:name="([^"]+)"', ft))
