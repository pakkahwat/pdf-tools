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
from thai_fix import fix_docx  # noqa: E402


def restore(self, raws: list):
    for raw_span in raws:
        span = ImageSpan(raw_span) if "image" in raw_span else TextSpan(raw_span)
        if isinstance(span, TextSpan) and not span.text:
            span = None
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

src, dst = sys.argv[1], sys.argv[2]
t = time.time()
tmp1, tmp2 = dst + ".raw.docx", dst + ".fix.docx"
cv = Converter(src)
cv.convert(tmp1)
cv.close()
fix_docx(tmp1, tmp2)
embed(tmp2, dst)
print(f"patched {dst} {time.time() - t:.1f}s")
