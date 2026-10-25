# ให้คะแนนความเหมือน: PDF ต้นฉบับ vs PDF ที่ Word พิมพ์ออกมาจาก DOCX ที่แปลงได้
#   ภาพ (visual): เทียบ "หมึก" ทีละหน้าแบบยอมคลาดเคลื่อน ±TOL px (F1 ของพิกเซลหมึก) → 0–100
#   ข้อความ (text): ความเหมือนของลำดับข้อความทั้งไฟล์ (difflib) → 0–100
#   ยังบันทึกภาพเทียบ ต้นฉบับ | ผลลัพธ์ | จุดต่าง ไว้ใน out/ ให้ดูด้วยตา
import difflib
import sys
from pathlib import Path

import cv2
import numpy as np
import pymupdf

DPI = 72
TOL = 3


def page_ink(page) -> np.ndarray:
    pix = page.get_pixmap(dpi=DPI, colorspace=pymupdf.csGRAY, alpha=False)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
    return img


def ink_f1(a: np.ndarray, b: np.ndarray) -> float:
    h, w = max(a.shape[0], b.shape[0]), max(a.shape[1], b.shape[1])
    pa = np.full((h, w), 255, np.uint8)
    pb = np.full((h, w), 255, np.uint8)
    pa[: a.shape[0], : a.shape[1]] = a
    pb[: b.shape[0], : b.shape[1]] = b
    ia, ib = pa < 200, pb < 200
    if not ia.any() and not ib.any():
        return 1.0
    k = np.ones((2 * TOL + 1, 2 * TOL + 1), np.uint8)
    da = cv2.dilate(ia.astype(np.uint8), k) > 0
    db = cv2.dilate(ib.astype(np.uint8), k) > 0
    precision = (ib & da).sum() / max(1, ib.sum())
    recall = (ia & db).sum() / max(1, ia.sum())
    return 0.0 if precision + recall == 0 else 2 * precision * recall / (precision + recall)


def norm_text(doc) -> str:
    return "".join("".join(p.get_text().split()) for p in doc)


def save_compare(a: np.ndarray, b: np.ndarray, path: Path):
    h = max(a.shape[0], b.shape[0])
    pad = lambda x: np.vstack([x, np.full((h - x.shape[0], x.shape[1]), 255, np.uint8)]) if x.shape[0] < h else x
    a2, b2 = pad(a), pad(b)
    w = max(a2.shape[1], b2.shape[1])
    a2 = np.hstack([a2, np.full((h, w - a2.shape[1]), 255, np.uint8)]) if a2.shape[1] < w else a2
    b2 = np.hstack([b2, np.full((h, w - b2.shape[1]), 255, np.uint8)]) if b2.shape[1] < w else b2
    diff = np.dstack([b2, a2, np.minimum(a2, b2)])  # แดง = มีแต่ผลลัพธ์, เขียว = มีแต่ต้นฉบับ
    row = np.hstack([cv2.cvtColor(a2, cv2.COLOR_GRAY2BGR), np.full((h, 8, 3), 160, np.uint8),
                     cv2.cvtColor(b2, cv2.COLOR_GRAY2BGR), np.full((h, 8, 3), 160, np.uint8), diff])
    cv2.imwrite(str(path), row)


def score(original: str, roundtrip: str, label: str, compare_dir: Path | None = None) -> dict:
    a, b = pymupdf.open(original), pymupdf.open(roundtrip)
    pages = []
    for i in range(max(a.page_count, b.page_count)):
        if i >= a.page_count or i >= b.page_count:
            pages.append(0.0)
            continue
        ia, ib = page_ink(a[i]), page_ink(b[i])
        pages.append(ink_f1(ia, ib))
        if compare_dir and i < 2:
            save_compare(ia, ib, compare_dir / f"{label}-p{i + 1}.png")
    text = difflib.SequenceMatcher(None, norm_text(a), norm_text(b), autojunk=False).ratio()
    return {
        "label": label,
        "pages": f"{b.page_count}/{a.page_count}",
        "visual": round(100 * sum(pages) / len(pages), 1),
        "text": round(100 * text, 1),
        "per_page": [round(100 * p) for p in pages],
    }


if __name__ == "__main__":
    original, roundtrip, label = sys.argv[1], sys.argv[2], sys.argv[3]
    out = Path(sys.argv[4]) if len(sys.argv) > 4 else None
    print(score(original, roundtrip, label, out))
