# pdf2docx + แพตช์สำหรับเอกสารไทย:
#  1) เก็บ span ที่เป็นช่องว่างล้วนไว้ (Chrome/Skia มักเก็บช่องว่างเป็น span แยกฟอนต์ละติน — ของเดิมทิ้ง ทำให้คำไทยติดกันหมด)
# แล้วต่อด้วย thai_fix (complex-script) + ฝังฟอนต์
import sys
import time

from pdf2docx import Converter
from pdf2docx.image.ImageSpan import ImageSpan
from pdf2docx.text.Spans import Spans
from pdf2docx.text.TextSpan import TextSpan

sys.path.insert(0, __file__.rsplit("\\", 1)[0])
from embed_fonts import embed  # noqa: E402
from shape_clips import apply as apply_shape_clips  # noqa: E402
from thai_fix import fix_docx  # noqa: E402


def fix_letter_spacing(span: TextSpan) -> None:
    """ตัวอักษรห่าง (CSS letter-spacing) ถูกเก็บเป็นช่องว่างแคบ ๆ คั่นทุกตัว — ถ้าปล่อยไว้ Word จะใช้ช่องว่างเต็มขนาดแทน
    ตัวอักษรเลยห่างเกิน: ถอดช่องว่างแคบออกแล้วใช้ระยะห่างตัวอักษรของ Word แทน (ช่องว่างจริงระหว่างคำยังอยู่)"""
    chars = span.chars
    glyphs = [c for c in chars if c.c.strip()]
    if len(glyphs) < 4:
        return
    width = lambda c: c.bbox[2] - c.bbox[0]
    gw = sorted(width(c) for c in glyphs)[len(glyphs) // 2]
    thin = [c for c in chars if not c.c.strip() and width(c) < 0.45 * gw]
    if len(thin) < 0.6 * (len(glyphs) - 1):
        return
    span.char_spacing = sorted(width(c) for c in thin)[len(thin) // 2]
    thin_ids = {id(c) for c in thin}
    span.chars = [c for c in chars if id(c) not in thin_ids]


def restore(self, raws: list):
    for raw_span in raws:
        span = ImageSpan(raw_span) if "image" in raw_span else TextSpan(raw_span)
        if isinstance(span, TextSpan):
            if not span.text:
                span = None
            else:
                fix_letter_spacing(span)
        self.append(span)
    return self


Spans.restore = restore

#  2) ย่อหน้าที่กว้างเกือบเต็มหน้าและเริ่มชิดซ้าย ไม่ใช่ "จัดกึ่งกลาง" — ของเดิมเดาว่ากึ่งกลางเพราะขอบซ้าย/ขวาเท่ากัน
#     (ข้อความไทยจาก Chrome เต็มบรรทัดเกือบทุกบรรทัด จึงโดนบ่อย)
from pdf2docx.common.share import TextAlignment  # noqa: E402
from pdf2docx.text.TextBlock import TextBlock  # noqa: E402

_orig_parse_alignment = TextBlock._parse_alignment


def parse_alignment(self, bbox, text_direction_param, *args):
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


TextBlock._parse_alignment = parse_alignment

#  3) ความกว้างย่อหน้า: ของเดิมตั้งขอบขวาพอดีบรรทัดที่ยาวที่สุด (ปัดเป็นทีละ 0.1 นิ้ว) แต่ Word วาดตัวไทยกว้างกว่า
#     ต้นฉบับ ~1% → บรรทัดยาวล้นแล้วตัดก่อน ทำให้เนื้อหาเลื่อนทั้งหน้า — ตั้งพื้นที่ = บรรทัดยาวสุด × 1.012 + 1.5pt
from docx.shared import Pt  # noqa: E402

WIDTH_SLACK_RATIO = 1.012
WIDTH_SLACK_PT = 1.5

_orig_hspacing = TextBlock.parse_horizontal_spacing
_orig_make_docx = TextBlock.make_docx


def parse_horizontal_spacing(self, bbox, *args):
    self._layout_bbox = tuple(bbox)
    return _orig_hspacing(self, bbox, *args)


def make_docx(self, p):
    p = _orig_make_docx(self, p)
    bbox = getattr(self, "_layout_bbox", None)
    if bbox and self.is_horizontal_text and self.row_count > 1 and self.alignment in (TextAlignment.LEFT, TextAlignment.JUSTIFY):
        layout_w = bbox[2] - bbox[0]
        left = self.left_space - min(self.first_line_space, 0)
        widest = max(row[-1].bbox[2] for row in self.lines.group_by_physical_rows()) - (bbox[0] + left)
        right = layout_w - left - (widest * WIDTH_SLACK_RATIO + WIDTH_SLACK_PT)
        p.paragraph_format.right_indent = Pt(max(0.0, right))
    return p


TextBlock.parse_horizontal_spacing = parse_horizontal_spacing
TextBlock.make_docx = make_docx

#  4) ระยะบรรทัดแบบตายตัว (exact) ตามต้นฉบับ เฉพาะย่อหน้าที่มีภาษาไทย — แบบ "เท่าของความสูงฟอนต์" เพี้ยนกับฟอนต์ไทย
#     ที่ค่าความสูงต่างกันในแต่ละโปรแกรม ส่วนย่อหน้าละตินวิธีเดิมแม่นอยู่แล้ว (เปลี่ยนแล้วกลับเลื่อน)
#     ย่อหน้าที่มีรูปอยู่ในบรรทัดยังใช้แบบเดิม เพราะระยะตายตัวจะตัดรูป
import re as _re  # noqa: E402

from pdf2docx.layout.Blocks import Blocks  # noqa: E402

_orig_parse_line_spacing = Blocks._parse_line_spacing
_THAI = _re.compile("[฀-๿]")


def parse_line_spacing(self):
    _orig_parse_line_spacing(self)
    for block in self._instances:
        if not block.is_text_block or block.line_space_type == 0 or not _THAI.search(block.text):
            continue
        if any(isinstance(s, ImageSpan) for line in block.lines for s in line.spans):
            continue
        block.line_space_type = 0
        block.parse_exact_line_spacing()


Blocks._parse_line_spacing = parse_line_spacing

src, dst = sys.argv[1], sys.argv[2]
t = time.time()
tmp1, tmp2 = dst + ".raw.docx", dst + ".fix.docx"
cv = Converter(src)
cv.convert(tmp1)
cv.close()
fix_docx(tmp1, tmp2)
tmp3 = dst + ".shape.docx"
apply_shape_clips(src, tmp2, tmp3)
embed(tmp3, dst)
print(f"patched {dst} {time.time() - t:.1f}s")
