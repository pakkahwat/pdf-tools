# วิเคราะห์ PDF: หน้า ฟอนต์ ข้อความไทย (หา PUA) ภาพ เส้น
import sys
import unicodedata
import pymupdf

PUA = range(0xE000, 0xF900)


def thai_issues(text: str) -> dict:
    pua = [c for c in text if ord(c) in PUA]
    # วรรณยุกต์/สระบนที่ไม่มีพยัญชนะนำหน้า = ลำดับเพี้ยน
    marks = set("ัิีึืฺุู็่้๊๋์ํ")
    orphan = 0
    for i, c in enumerate(text):
        if c in marks and (i == 0 or not ("ก" <= text[i - 1] <= "๎")):
            orphan += 1
    return {"pua": len(pua), "pua_sample": "".join(sorted(set(pua)))[:20], "orphan_marks": orphan}


for path in sys.argv[1:]:
    doc = pymupdf.open(path)
    print("=" * 80)
    print(path.split("\\")[-1], "| pages:", doc.page_count, "| encrypted:", doc.is_encrypted, "| producer:", doc.metadata.get("producer"), "| creator:", doc.metadata.get("creator"))
    for pno, page in enumerate(doc):
        text = page.get_text()
        fonts = page.get_fonts(full=True)
        imgs = page.get_images(full=True)
        drawings = page.get_drawings()
        print(f"-- page {pno + 1}: size {page.rect.width:.0f}x{page.rect.height:.0f} rot {page.rotation} | chars {len(text)} | images {len(imgs)} | vector paths {len(drawings)}")
        for f in fonts:
            # (xref, ext, type, basefont, name, encoding, referencer)
            print(f"   font: {f[3]} type={f[2]} ext={f[1]} enc={f[5]}")
        print("   thai:", thai_issues(text))
        sample = " ".join(text.split())[:300]
        print("   text:", sample)
        if pno >= 2:
            print("   ...")
            break
