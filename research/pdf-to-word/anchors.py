# แสดงภาพลอย (wp:anchor) ใน DOCX: ภาพไหน, ขนาด, ตำแหน่ง, ซ้อนหน้า/หลังข้อความ, ลำดับชั้น
import re
import sys
import zipfile

z = zipfile.ZipFile(sys.argv[1])
x = z.read("word/document.xml").decode()
rels = z.read("word/_rels/document.xml.rels").decode()
rid_to = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels)) | {
    a: b for b, a in re.findall(r'Target="([^"]+)"[^>]*Id="([^"]+)"', rels)
}
for i, a in enumerate(re.findall(r"<wp:anchor .*?</wp:anchor>", x, flags=re.S)):
    head = re.search(r"<wp:anchor ([^>]*)>", a).group(1)
    attrs = dict(re.findall(r'(\w+)="([^"]*)"', head))
    ext = re.search(r'<wp:extent cx="(\d+)" cy="(\d+)"', a)
    posh = re.search(r"<wp:positionH[^>]*>.*?<wp:posOffset>(-?\d+)</wp:posOffset>", a, re.S)
    posv = re.search(r"<wp:positionV[^>]*>.*?<wp:posOffset>(-?\d+)</wp:posOffset>", a, re.S)
    rid = re.search(r'r:embed="([^"]+)"', a)
    emu = lambda v: round(int(v) / 12700, 1)
    print(
        f"#{i} {rid_to.get(rid.group(1)) if rid else '?'} behindDoc={attrs.get('behindDoc')} relativeHeight={attrs.get('relativeHeight')}"
        f" size={emu(ext.group(1))}x{emu(ext.group(2))}pt pos=({emu(posh.group(1)) if posh else '?'}, {emu(posv.group(1)) if posv else '?'})"
    )
