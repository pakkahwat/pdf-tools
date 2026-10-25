# SPDX-License-Identifier: AGPL-3.0-or-later
"""PDF → DOCX (โหมดแก้ไขง่าย) สำหรับรันใน Pyodide (ในเบราว์เซอร์) และ Python ปกติ

pdf2docx + แพตช์สำหรับเอกสารไทย แล้วแก้ DOCX ให้ Microsoft Word แสดงตรงต้นฉบับ
(ที่มาและผลวัดของแต่ละข้อ: research/pdf-to-word/README.md)

ขั้นตอน:  convert(pdf, docx) → ได้รายชื่อฟอนต์ที่ใช้  →  embed_fonts(docx, out, {ชื่อฟอนต์: [regular, bold]})
(การใส่ zero-width space ระหว่างคำไทยทำฝั่ง JavaScript ด้วย Intl.Segmenter — lib/pdf2word/thai-breaks.ts)
"""
import logging
import re
import uuid
import zipfile

import pymupdf
from docx.shared import Pt
from pdf2docx import Converter
from pdf2docx.common.share import TextAlignment
from pdf2docx.image.ImageSpan import ImageSpan
from pdf2docx.layout.Blocks import Blocks
from pdf2docx.text.Spans import Spans
from pdf2docx.text.TextBlock import TextBlock
from pdf2docx.text.TextSpan import TextSpan

THAI = re.compile("[฀-๿]")

# ---------------------------------------------------------------------------------------------
# แพตช์ pdf2docx
# ---------------------------------------------------------------------------------------------


def _fix_letter_spacing(span):
    """ตัวอักษรห่าง (CSS letter-spacing) ถูกเก็บเป็นช่องว่างแคบ ๆ คั่นทุกตัว — ถ้าปล่อยไว้ Word ใช้ช่องว่างเต็มขนาดแทน
    ตัวอักษรเลยห่างเกิน: ถอดช่องว่างแคบออกแล้วใช้ระยะห่างตัวอักษรของ Word แทน (ช่องว่างจริงระหว่างคำยังอยู่)"""
    chars = span.chars
    glyphs = [c for c in chars if c.c.strip()]
    if len(glyphs) < 4:
        return
    width = lambda c: c.bbox[2] - c.bbox[0]  # noqa: E731
    gw = sorted(width(c) for c in glyphs)[len(glyphs) // 2]
    thin = [c for c in chars if not c.c.strip() and width(c) < 0.45 * gw]
    if len(thin) < 0.6 * (len(glyphs) - 1):
        return
    span.char_spacing = sorted(width(c) for c in thin)[len(thin) // 2]
    thin_ids = {id(c) for c in thin}
    span.chars = [c for c in chars if id(c) not in thin_ids]


def _restore_spans(self, raws):
    """เก็บ span ที่เป็นช่องว่างล้วนไว้ — Chrome/Skia มักเก็บช่องว่างเป็น span แยกฟอนต์ละติน ของเดิมทิ้ง ทำให้คำไทยติดกันหมด"""
    for raw_span in raws:
        span = ImageSpan(raw_span) if "image" in raw_span else TextSpan(raw_span)
        if isinstance(span, TextSpan):
            if not span.text:
                span = None
            else:
                _fix_letter_spacing(span)
        self.append(span)
    return self


_orig_parse_alignment = TextBlock._parse_alignment


def _parse_alignment(self, bbox, text_direction_param, *args):
    """ย่อหน้าที่กว้างเกือบเต็มหน้าและเริ่มชิดซ้ายไม่ใช่ "จัดกึ่งกลาง" (ของเดิมเดาจากขอบซ้าย=ขวา โดนบ่อยกับข้อความไทยเต็มบรรทัด)"""
    alignment = _orig_parse_alignment(self, bbox, text_direction_param, *args)
    if alignment == TextAlignment.CENTER:
        idx0, idx1, f = text_direction_param
        W = abs(bbox[idx1] - bbox[idx0])
        width = abs(self.bbox[idx1] - self.bbox[idx0])
        d_left = (self.bbox[idx0] - bbox[idx0]) * f
        if W and width >= 0.85 * W and d_left <= 0.05 * W:
            alignment = TextAlignment.LEFT
            self.first_line_space = 0
    return alignment


# ของเดิมตั้งขอบขวาพอดีบรรทัดที่ยาวที่สุด (ปัดทีละ 0.1 นิ้ว) แต่ Word วาดตัวไทยกว้างกว่าต้นฉบับ ~1% → บรรทัดล้นแล้วตัดก่อน
WIDTH_SLACK_RATIO = 1.012
WIDTH_SLACK_PT = 1.5
_orig_hspacing = TextBlock.parse_horizontal_spacing
_orig_make_docx = TextBlock.make_docx


def _parse_horizontal_spacing(self, bbox, *args):
    self._layout_bbox = tuple(bbox)
    return _orig_hspacing(self, bbox, *args)


def _make_docx(self, p):
    p = _orig_make_docx(self, p)
    bbox = getattr(self, "_layout_bbox", None)
    if bbox and self.is_horizontal_text and self.row_count > 1 and self.alignment in (TextAlignment.LEFT, TextAlignment.JUSTIFY):
        layout_w = bbox[2] - bbox[0]
        left = self.left_space - min(self.first_line_space, 0)
        widest = max(row[-1].bbox[2] for row in self.lines.group_by_physical_rows()) - (bbox[0] + left)
        right = layout_w - left - (widest * WIDTH_SLACK_RATIO + WIDTH_SLACK_PT)
        p.paragraph_format.right_indent = Pt(max(0.0, right))
    return p


_orig_parse_line_spacing = Blocks._parse_line_spacing


def _parse_line_spacing(self):
    """ย่อหน้าไทยใช้ระยะบรรทัดตายตัวตามต้นฉบับ — แบบ "เท่าของความสูงฟอนต์" เพี้ยนกับฟอนต์ไทย (ย่อหน้าละตินคงเดิม)
    ย่อหน้าที่มีรูปในบรรทัดคงแบบเดิม เพราะระยะตายตัวจะตัดรูป"""
    _orig_parse_line_spacing(self)
    for block in self._instances:
        if not block.is_text_block or block.line_space_type == 0 or not THAI.search(block.text):
            continue
        if any(isinstance(s, ImageSpan) for line in block.lines for s in line.spans):
            continue
        block.line_space_type = 0
        block.parse_exact_line_spacing()


Spans.restore = _restore_spans
TextBlock._parse_alignment = _parse_alignment
TextBlock.parse_horizontal_spacing = _parse_horizontal_spacing
TextBlock.make_docx = _make_docx
Blocks._parse_line_spacing = _parse_line_spacing

# ---------------------------------------------------------------------------------------------
# แก้ XML ของ DOCX
# ---------------------------------------------------------------------------------------------


def _fix_rpr(rpr):
    """Word ถือว่าอักษรไทยเป็น complex script → ใช้ฟอนต์ w:cs และขนาด w:szCs (pdf2docx ตั้งแค่ของละติน)"""
    m = re.search(r"<w:rFonts ([^>]*?)/>", rpr)
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
    # สเกล/ระยะห่างตัวอักษรต้องเป็นจำนวนเต็มตามสเปก — pdf2docx เขียนทศนิยม ซึ่ง Word ไม่สนใจ
    rpr = re.sub(r'<w:w w:val="([\d.]+)"/>', lambda mm: f'<w:w w:val="{max(1, min(600, round(float(mm.group(1)))))}"/>', rpr)
    rpr = re.sub(r'<w:spacing w:val="(-?[\d.]+)"/>', lambda mm: f'<w:spacing w:val="{round(float(mm.group(1)))}"/>', rpr)
    if "<w:lang" not in rpr:
        rpr = rpr.replace("</w:rPr>", '<w:lang w:bidi="th-TH"/></w:rPr>')
    return rpr


_RUN_RE = re.compile(r'<w:r>(<w:rPr>.*?</w:rPr>)<w:t(?: xml:space="preserve")?>([^<]*)</w:t></w:r>', re.S)


def _merge_runs(xml):
    """รวม run ติดกันที่รูปแบบเหมือนกัน — Word ตัดคำไทยข้ามรอยต่อ run ไม่ได้ และไฟล์แก้ไขง่ายขึ้น"""

    def merge_block(m):
        out = []
        for rpr, text in _RUN_RE.findall(m.group(0)):
            if out and out[-1][0] == rpr:
                out[-1][1] += text
            else:
                out.append([rpr, text])
        return "".join(f'<w:r>{rpr}<w:t xml:space="preserve">{text}</w:t></w:r>' for rpr, text in out)

    return re.sub(rf"(?:{_RUN_RE.pattern})+", merge_block, xml, flags=re.S)


def _fix_anchor_order(xml):
    """ภาพลอยทุกภาพได้ relativeHeight=0 → ภาพหลังทับภาพแรก (เช่นพื้นหลังทับรูป) — ภาพใหญ่ชั้นล่าง ภาพเล็กชั้นบน"""
    areas = [
        (int(m.group(2)) * int(m.group(3)), m.start(1))
        for m in re.finditer(r'(<wp:anchor [^>]*>).*?<wp:extent cx="(\d+)" cy="(\d+)"', xml, flags=re.S)
    ]
    if len(areas) < 2:
        return xml
    order = {pos: rank for rank, (_, pos) in enumerate(sorted(areas, key=lambda a: -a[0]))}
    return re.sub(
        r"<wp:anchor [^>]*>",
        lambda m: re.sub(r'relativeHeight="\d+"', f'relativeHeight="{251658240 + order.get(m.start(), 0) * 1024}"', m.group(0)),
        xml,
    )


def _ellipse_image_boxes(pdf_path, tol=1.5):
    """รูปที่ PDF ครอปเป็นวงกลม/วงรี: clip path เป็นเส้นโค้งล้วนและครอบพอดีขอบรูป → [(หน้า, Rect)]"""
    found = []
    for pno, page in enumerate(pymupdf.open(pdf_path)):
        boxes = [page.get_image_bbox(i) for i in page.get_images(full=True)]
        if not boxes:
            continue
        for d in page.get_drawings(extended=True):
            if d.get("type") != "clip" or not d.get("items") or any(it[0] != "c" for it in d["items"]):
                continue
            sc = d["scissor"]
            found += [(pno, b) for b in boxes if all(abs(a - c) <= tol for a, c in zip(b, sc))]
    return found


def _apply_ellipse_clips(xml, targets, tol=1.5):
    if not targets:
        return xml
    emu = lambda v: int(v) / 12700  # noqa: E731

    def repl(m):
        a = m.group(0)
        ext = re.search(r'<wp:extent cx="(\d+)" cy="(\d+)"', a)
        ph = re.search(r'<wp:positionH relativeFrom="page">\s*<wp:posOffset>(-?\d+)</wp:posOffset>', a)
        pv = re.search(r'<wp:positionV relativeFrom="page">\s*<wp:posOffset>(-?\d+)</wp:posOffset>', a)
        if not (ext and ph and pv):
            return a
        x0, y0 = emu(ph.group(1)), emu(pv.group(1))
        box = (x0, y0, x0 + emu(ext.group(1)), y0 + emu(ext.group(2)))
        # TODO: เอกสารหลายหน้า — ตอนนี้จับคู่ด้วยตำแหน่งบนหน้าอย่างเดียว (รูปวงกลมตำแหน่งเดียวกันคนละหน้าก็ได้วงกลมเหมือนกัน)
        if any(all(abs(p - q) <= tol for p, q in zip(box, b)) for _, b in targets):
            return a.replace('prst="rect"', 'prst="ellipse"')
        return a

    return re.sub(r"<wp:anchor .*?</wp:anchor>", repl, xml, flags=re.S)


def _rewrite(src, dst, edit):
    """คัดลอก DOCX โดยแก้ไฟล์ข้างในผ่าน edit(name, bytes) -> bytes | None"""
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            new = edit(item.filename, data)
            zout.writestr(item, data if new is None else new)


def used_fonts(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    return sorted(set(re.findall(r'w:ascii="([^"]+)"', xml)))


# ---------------------------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------------------------


class _Progress(logging.Handler):
    """pdf2docx รายงานความคืบหน้าผ่าน logging "(3/10) Page 3" — แปลงเป็น callback(phase, current, total)"""

    def __init__(self, callback):
        super().__init__()
        self.callback = callback
        self.phase = "parse"

    def emit(self, record):
        msg = record.getMessage()
        if "Creating pages" in msg:
            self.phase = "create"
        m = re.search(r"\((\d+)/(\d+)\) Page", msg)
        if m and self.callback:
            self.callback(self.phase, int(m.group(1)), int(m.group(2)))


def inspect(pdf_path):
    """ข้อมูลก่อนแปลง: จำนวนหน้า, จำนวนตัวอักษรที่ดึงได้ (0 = ภาพสแกน ต้อง OCR ก่อน), ถูกล็อกไหม"""
    doc = pymupdf.open(pdf_path)
    if doc.needs_pass:
        return {"pages": doc.page_count, "text_chars": 0, "encrypted": True}
    chars = sum(len("".join(page.get_text().split())) for page in doc)
    return {"pages": doc.page_count, "text_chars": chars, "encrypted": False}


def convert(pdf_path, docx_path, on_progress=None):
    """แปลง PDF → DOCX พร้อมแก้ทั้งหมด (ยกเว้นฝังฟอนต์) — คืน {"pages": n, "fonts": [...]}"""
    raw = docx_path + ".raw.docx"
    handler = _Progress(on_progress)
    logger = logging.getLogger()
    logger.addHandler(handler)
    previous_level = logger.level
    logger.setLevel(logging.INFO)
    try:
        cv = Converter(pdf_path)
        pages = len(cv.fitz_doc)
        cv.convert(raw)
        cv.close()
    finally:
        logger.removeHandler(handler)
        logger.setLevel(previous_level)

    ellipses = _ellipse_image_boxes(pdf_path)

    def edit(name, data):
        if name == "word/document.xml" or name == "word/styles.xml" or name.startswith(("word/header", "word/footer")):
            xml = data.decode("utf-8")
            xml = re.sub(r"<w:rPr>.*?</w:rPr>", lambda m: _fix_rpr(m.group(0)), xml, flags=re.S)
            xml = _merge_runs(xml)
            if name == "word/document.xml":
                xml = _fix_anchor_order(xml)
                xml = _apply_ellipse_clips(xml, ellipses)
            return xml.encode("utf-8")
        return None

    _rewrite(raw, docx_path, edit)
    return {"pages": pages, "fonts": used_fonts(docx_path)}


FONT_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font"


def _obfuscate(data, key):
    """ECMA-376 §17.8.1: XOR 32 ไบต์แรกของฟอนต์ด้วย GUID (เรียงไบต์ย้อนหลัง)"""
    hexkey = key.strip("{}").replace("-", "")
    kb = bytes(int(hexkey[30 - 2 * i: 32 - 2 * i], 16) for i in range(16))
    return bytes(data[i] ^ kb[i % 16] for i in range(32)) + data[32:]


def embed_fonts(docx_path, out_path, fonts):
    """ฝังฟอนต์ (TTF ที่อนุญาตให้ฝัง เช่น OFL) ลง DOCX — fonts = {ชื่อฟอนต์ในเอกสาร: [ไฟล์ regular, ไฟล์ bold หรือ None]}
    เปิดบนเครื่องที่ไม่มีฟอนต์นั้น Word ก็ยังใช้ฟอนต์เดิม หน้าตาไม่เพี้ยน"""
    with zipfile.ZipFile(docx_path) as z:
        names = set(z.namelist())
    if "word/_rels/fontTable.xml.rels" in names:
        raise ValueError("DOCX มีฟอนต์ฝังอยู่แล้ว")
    parts, rels, entries, n = {}, [], [], 0
    for family, files in fonts.items():
        tags = []
        for kind, path in zip(("embedRegular", "embedBold"), files):
            if not path:
                continue
            n += 1
            key = "{" + str(uuid.uuid4()).upper() + "}"
            rid = f"rIdFont{n}"
            with open(path, "rb") as f:
                parts[f"word/fonts/font{n}.odttf"] = _obfuscate(f.read(), key)
            rels.append(f'<Relationship Id="{rid}" Type="{FONT_REL}" Target="fonts/font{n}.odttf"/>')
            tags.append(f'<w:{kind} r:id="{rid}" w:fontKey="{key}"/>')
        if tags:
            entries.append(
                f'<w:font w:name="{family}"><w:charset w:val="00"/><w:family w:val="swiss"/>'
                f'<w:pitch w:val="variable"/>{"".join(tags)}</w:font>'
            )
    if not entries:
        _rewrite(docx_path, out_path, lambda name, data: None)
        return []

    def edit(name, data):
        if name == "word/fontTable.xml":
            xml = data.decode("utf-8")
            for family in fonts:
                xml = re.sub(rf'<w:font w:name="{re.escape(family)}">.*?</w:font>', "", xml, flags=re.S)
            return xml.replace("</w:fonts>", "".join(entries) + "</w:fonts>").encode("utf-8")
        if name == "word/settings.xml":
            xml = data.decode("utf-8")
            if "<w:embedTrueTypeFonts" not in xml:
                pattern = r"(<w:zoom[^>]*/>)" if "<w:zoom" in xml else r"(<w:settings[^>]*>)"
                xml = re.sub(pattern, r"\1<w:embedTrueTypeFonts/>", xml, count=1)
            return xml.encode("utf-8")
        if name == "[Content_Types].xml":
            xml = data.decode("utf-8")
            if 'Extension="odttf"' not in xml:
                xml = xml.replace(
                    "<Default ",
                    '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/><Default ',
                    1,
                )
            return xml.encode("utf-8")
        return None

    _rewrite(docx_path, out_path, edit)
    rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(rels) + "</Relationships>"
    )
    with zipfile.ZipFile(out_path, "a", zipfile.ZIP_DEFLATED) as z:
        z.writestr("word/_rels/fontTable.xml.rels", rels_xml)
        for name, data in parts.items():
            z.writestr(name, data)
    return [f for f in fonts if any(fonts[f])]
