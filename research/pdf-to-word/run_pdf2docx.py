# แปลง PDF → DOCX ด้วย pdf2docx (โหมดแก้ไขง่าย)
import sys
import time

from pdf2docx import Converter

src, dst = sys.argv[1], sys.argv[2]
t = time.time()
cv = Converter(src)
cv.convert(dst)
cv.close()
print(f"pdf2docx {dst} {time.time() - t:.1f}s")
