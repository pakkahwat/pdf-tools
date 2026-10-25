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
    # ระยะห่างตัวอักษร (twips) ต้องเป็นจำนวนเต็ม — pdf2docx เขียน "20.0" ซึ่ง Word ไม่สนใจ
    rpr = re.sub(r'<w:spacing w:val="(-?[\d.]+)"/>', lambda mm: f'<w:spacing w:val="{round(float(mm.group(1)))}"/>', rpr)
    # ภาษาของ complex script = ไทย → Word ตัดคำไทยตามพจนานุกรม (ถ้าไม่ระบุ Word ตัดได้แค่ตรงช่องว่าง บรรทัดจึงขาดก่อนเวลา)
    if "<w:lang" not in rpr:
        rpr = rpr.replace("</w:rPr>", '<w:lang w:bidi="th-TH"/></w:rPr>')
    return rpr


RUN_RE = re.compile(r'<w:r>(<w:rPr>.*?</w:rPr>)<w:t(?: xml:space="preserve")?>([^<]*)</w:t></w:r>', re.S)


def merge_runs(xml: str) -> str:
    """รวม run ที่อยู่ติดกันและรูปแบบเหมือนกันเป็น run เดียว — Word ตัดคำไทยข้ามรอยต่อ run ไม่ได้
    (pdf2docx แยกข้อความเป็นก้อนตามที่อยู่ใน PDF) และไฟล์ที่ได้ก็แก้ไขง่ายขึ้น"""
    def merge_block(m: re.Match) -> str:
        runs = RUN_RE.findall(m.group(0))
        out: list[list[str]] = []
        for rpr, text in runs:
            if out and out[-1][0] == rpr:
                out[-1][1] += text
            else:
                out.append([rpr, text])
        return "".join(f'<w:r>{rpr}<w:t xml:space="preserve">{text}</w:t></w:r>' for rpr, text in out)

    # เฉพาะกลุ่ม run ที่อยู่ติดกันจริง (ไม่มี element อื่นคั่น)
    return re.sub(rf"(?:{RUN_RE.pattern})+", merge_block, xml, flags=re.S)


def fix_anchor_order(xml: str) -> str:
    """ภาพลอยทุกภาพได้ relativeHeight=0 เท่ากัน → Word วาดภาพหลังทับภาพแรก (เช่นพื้นหลังส่วนหัวทับรูปโปรไฟล์)
    ให้ภาพใหญ่ (มักเป็นพื้นหลัง/กราฟิกที่ถูกแปลงเป็นภาพ) อยู่ชั้นล่าง ภาพเล็กที่ซ้อนอยู่บนสุด"""
    anchors = re.findall(r"<wp:anchor [^>]*>", xml)
    if len(anchors) < 2:
        return xml
    areas = []
    for m in re.finditer(r"(<wp:anchor [^>]*>).*?<wp:extent cx=\"(\d+)\" cy=\"(\d+)\"", xml, flags=re.S):
        areas.append((int(m.group(2)) * int(m.group(3)), m.start(1)))
    order = {pos: rank for rank, (_, pos) in enumerate(sorted(areas, key=lambda a: -a[0]))}

    def repl(m: re.Match) -> str:
        rank = order.get(m.start(), 0)
        return re.sub(r'relativeHeight="\d+"', f'relativeHeight="{251658240 + rank * 1024}"', m.group(0))

    return re.sub(r"<wp:anchor [^>]*>", repl, xml)


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
            before = xml.count("<w:r>")
            xml = merge_runs(xml)
            stats["runs_merged"] = stats.get("runs_merged", 0) + before - xml.count("<w:r>")
            xml = fix_anchor_order(xml)
            data = xml.encode("utf-8")
        zout.writestr(item, data)
    zout.close()
    return stats


if __name__ == "__main__":
    print(fix_docx(sys.argv[1], sys.argv[2]))
