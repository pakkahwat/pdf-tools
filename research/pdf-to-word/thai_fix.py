# แก้ DOCX ให้ Word แสดงภาษาไทยถูก: Word ถือว่าอักษรไทยเป็น complex script → ใช้ฟอนต์ w:cs และขนาด w:szCs
# (ตัวแปลงต่างประเทศตั้งแค่ ascii/hAnsi + w:sz ไทยจึงออกมาผิดฟอนต์และผิดขนาด) และปัด w:w (สเกลตัวอักษร) ให้เป็นจำนวนเต็ม
import re
import sys
import zipfile


def fix_rpr(rpr: str) -> str:
    m = re.search(r'<w:rFonts ([^>]*?)/>', rpr)
    if m:
        attrs = m.group(1)
        font = re.search(r'w:ascii="([^"]+)"', attrs)
        if font and 'w:cs="' not in attrs:
            rpr = rpr.replace(m.group(0), f'<w:rFonts {attrs} w:cs="{font.group(1)}"/>')
    sz = re.search(r'<w:sz w:val="(\d+)"/>', rpr)
    if sz and "<w:szCs" not in rpr:
        rpr = rpr.replace(sz.group(0), sz.group(0) + f'<w:szCs w:val="{sz.group(1)}"/>')
    b = re.search(r'<w:b(?: w:val="(?:1|true|on)")?/>', rpr)
    if b and "<w:bCs" not in rpr:
        rpr = rpr.replace(b.group(0), b.group(0) + "<w:bCs/>")
    i = re.search(r'<w:i(?: w:val="(?:1|true|on)")?/>', rpr)
    if i and "<w:iCs" not in rpr:
        rpr = rpr.replace(i.group(0), i.group(0) + "<w:iCs/>")
    rpr = re.sub(r'<w:w w:val="([\d.]+)"/>', lambda mm: f'<w:w w:val="{max(1, min(600, round(float(mm.group(1)))))}"/>', rpr)
    return rpr


def fix_docx(src: str, dst: str) -> dict:
    zin = zipfile.ZipFile(src)
    zout = zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED)
    stats = {"rpr": 0}
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename in ("word/document.xml", "word/styles.xml") or item.filename.startswith(("word/header", "word/footer")):
            xml = data.decode("utf-8")
            def repl(m):
                stats["rpr"] += 1
                return fix_rpr(m.group(0))
            xml = re.sub(r"<w:rPr>.*?</w:rPr>", repl, xml, flags=re.S)
            data = xml.encode("utf-8")
        zout.writestr(item, data)
    zout.close()
    return stats


if __name__ == "__main__":
    print(fix_docx(sys.argv[1], sys.argv[2]))
