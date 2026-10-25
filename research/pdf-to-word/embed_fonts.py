# ฝังฟอนต์ (TTF ที่อนุญาตให้ฝัง เช่น OFL) ลงใน DOCX ตามมาตรฐาน ECMA-376 §17.8 (obfuscated font, .odttf)
# → เปิดบนเครื่องที่ไม่มีฟอนต์นั้น Word ก็ยังใช้ฟอนต์เดิม หน้าตาไม่เพี้ยน
import re
import sys
import uuid
import zipfile
from pathlib import Path

FONT_DIR = Path(__file__).parent / "fonts"
# ชื่อฟอนต์ในเอกสาร → ไฟล์ (regular, bold)
FONTS = {
    "Noto Sans Thai": ("NotoSansThai-400.ttf", "NotoSansThai-700.ttf"),
    "Inter": ("Inter-400.ttf", "Inter-700.ttf"),
    "JetBrains Mono": ("JetBrainsMono-400.ttf", "JetBrainsMono-700.ttf"),
}
FONT_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font"


def obfuscate(data: bytes, key: str) -> bytes:
    hexkey = key.strip("{}").replace("-", "")
    kb = bytes(int(hexkey[30 - 2 * i: 32 - 2 * i], 16) for i in range(16))  # ไบต์ของ GUID เรียงย้อนหลัง
    head = bytes(data[i] ^ kb[i % 16] for i in range(32))
    return head + data[32:]


def embed(src: str, dst: str) -> list[str]:
    zin = zipfile.ZipFile(src)
    names = set(zin.namelist())
    doc = zin.read("word/document.xml").decode()
    used = [f for f in FONTS if f'"{f}"' in doc]
    parts: dict[str, bytes] = {}
    rels: list[str] = []
    entries: list[str] = []
    n = 0
    for family in used:
        tags = []
        for kind, file in zip(("embedRegular", "embedBold"), FONTS[family]):
            n += 1
            key = "{" + str(uuid.uuid4()).upper() + "}"
            rid = f"rIdFont{n}"
            parts[f"word/fonts/font{n}.odttf"] = obfuscate((FONT_DIR / file).read_bytes(), key)
            rels.append(f'<Relationship Id="{rid}" Type="{FONT_REL}" Target="fonts/font{n}.odttf"/>')
            tags.append(f'<w:{kind} r:id="{rid}" w:fontKey="{key}"/>')
        entries.append(
            f'<w:font w:name="{family}"><w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/>{"".join(tags)}</w:font>'
        )

    zout = zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED)
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == "word/fontTable.xml":
            xml = data.decode()
            for family in used:  # เอาของเดิมที่ชื่อซ้ำออกก่อน
                xml = re.sub(rf'<w:font w:name="{re.escape(family)}">.*?</w:font>', "", xml, flags=re.S)
            data = xml.replace("</w:fonts>", "".join(entries) + "</w:fonts>").encode()
        elif item.filename == "word/settings.xml":
            xml = data.decode()
            if "<w:embedTrueTypeFonts" not in xml:
                if "<w:zoom" in xml:
                    xml = re.sub(r"(<w:zoom[^>]*/>)", r"\1<w:embedTrueTypeFonts/>", xml, count=1)
                else:
                    xml = re.sub(r"(<w:settings[^>]*>)", r"\1<w:embedTrueTypeFonts/>", xml, count=1)
            data = xml.encode()
        elif item.filename == "[Content_Types].xml":
            xml = data.decode()
            if 'Extension="odttf"' not in xml:
                xml = xml.replace(
                    "<Default ",
                    '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/><Default ',
                    1,
                )
            data = xml.encode()
        zout.writestr(item, data)
    rels_name = "word/_rels/fontTable.xml.rels"
    rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + "".join(rels)
        + "</Relationships>"
    )
    if rels_name in names:
        raise SystemExit("fontTable.xml.rels มีอยู่แล้ว — ยังไม่รองรับการรวม")
    zout.writestr(rels_name, rels_xml)
    for name, data in parts.items():
        zout.writestr(name, data)
    zout.close()
    return used


if __name__ == "__main__":
    print("embedded:", embed(sys.argv[1], sys.argv[2]))
