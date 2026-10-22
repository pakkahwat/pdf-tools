import { describe, expect, it } from "vitest";
import { chunkPages, compressRanges, everyPage, parsePageList, parseRanges, rangeLabel } from "@/lib/pdf/ranges";
import { formatLabel, needsTextImage, pageLabels } from "@/lib/pdf/labels";

describe("parseRanges", () => {
  it("แปลงช่วงหน้าหลายแบบ", () => {
    expect(parseRanges("1-3, 5, 8-", 10)).toEqual([[0, 1, 2], [4], [7, 8, 9]]);
    expect(parseRanges("-2", 10)).toEqual([[0, 1]]);
    expect(parseRanges(" 2 - 4 ;6", 10)).toEqual([[1, 2, 3], [5]]);
  });

  it("แจ้ง error ภาษาไทยเมื่อรูปแบบผิดหรือเกินจำนวนหน้า", () => {
    expect(() => parseRanges("", 5)).toThrow(/กรุณาระบุหน้า/);
    expect(() => parseRanges("1 2", 5)).toThrow(/ไม่ถูกต้อง/);
    expect(() => parseRanges("abc", 5)).toThrow(/ไม่ถูกต้อง/);
    expect(() => parseRanges("-", 5)).toThrow(/ไม่ถูกต้อง/);
    expect(() => parseRanges("0", 5)).toThrow(/หน้าแรกคือหน้า 1/);
    expect(() => parseRanges("4-9", 5)).toThrow(/เกินจำนวนหน้า/);
    expect(() => parseRanges("4-2", 5)).toThrow(/ไม่มากกว่า/);
  });

  it("parsePageList ตัดหน้าซ้ำและคงลำดับที่พิมพ์", () => {
    expect(parsePageList("3, 1-3", 5)).toEqual([2, 0, 1]);
  });
});

describe("ตัวช่วยแบ่งหน้า", () => {
  it("everyPage / chunkPages", () => {
    expect(everyPage(3)).toEqual([[0], [1], [2]]);
    expect(chunkPages(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
    expect(() => chunkPages(5, 0)).toThrow();
  });

  it("compressRanges และ rangeLabel", () => {
    expect(compressRanges([7, 0, 1, 2, 4, 8])).toBe("1-3, 5, 8-9");
    expect(compressRanges([])).toBe("");
    expect(rangeLabel([3])).toBe("4");
    expect(rangeLabel([3, 4, 5])).toBe("4-6");
  });
});

describe("เลขหน้า", () => {
  it("formatLabel / needsTextImage", () => {
    expect(formatLabel("{n} / {total}", 3, 9)).toBe("3 / 9");
    expect(needsTextImage("Page 1 of 3")).toBe(false);
    expect(needsTextImage("หน้า 1")).toBe(true);
  });

  it("pageLabels ข้ามหน้าปกและนับต่อจากเลขแรก", () => {
    expect(pageLabels(4, { format: "{n}/{total}", startAt: 1, fromPage: 2 })).toEqual([
      { index: 1, text: "1/3" },
      { index: 2, text: "2/3" },
      { index: 3, text: "3/3" },
    ]);
    expect(pageLabels(2, { format: "{n}", startAt: 5, fromPage: 1, total: 99 })[1]).toEqual({ index: 1, text: "6" });
  });
});
