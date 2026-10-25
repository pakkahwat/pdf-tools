// SPDX-License-Identifier: AGPL-3.0-or-later
// Web Worker: PDF → Word ในเบราว์เซอร์ — Pyodide (Python) + PyMuPDF + pdf2docx + แพตช์ไทยใน p2w.py
// ไฟล์ของผู้ใช้อยู่ในเครื่องเท่านั้น สิ่งที่ดาวน์โหลดมีแค่ตัวแปลง (Pyodide จาก CDN ทางการ, PyMuPDF จาก PyPI)
// ไฟล์นี้ไม่ผ่าน bundler (ต้องใช้ importScripts) — สื่อสารกับ lib/pdf2word/client.ts

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/";
// PyMuPDF 1.28.2 ที่สร้างสำหรับ Pyodide (ABI 2025_0) — รุ่นที่มากับ Pyodide (1.26.3) จัดกลุ่มย่อหน้าต่างจนผลไทยเพี้ยน
const PYMUPDF_URL =
  "https://files.pythonhosted.org/packages/58/8c/d897dcd32a25b58186c968b15ce4324ca029e9d96460de12325314e390be/pymupdf-1.28.2-cp313-abi3-pyemscripten_2025_0_wasm32.whl";
const BASE = new URL("./", self.location.href).href; // .../p2w/
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";

// ฟอนต์ OFL ที่ฝังลงไฟล์ Word ได้ (ชื่อตามที่ pdf2docx ใส่ในเอกสาร → ชื่อไฟล์ใน fonts/)
const FONTS = {
  "Noto Sans Thai": "NotoSansThai",
  Sarabun: "Sarabun",
  Kanit: "Kanit",
  Prompt: "Prompt",
  "IBM Plex Sans Thai": "IBMPlexSansThai",
  "Noto Sans": "NotoSans",
  Inter: "Inter",
  Roboto: "Roboto",
  "Open Sans": "OpenSans",
  "JetBrains Mono": "JetBrainsMono",
};

importScripts(PYODIDE_URL + "pyodide.js");

let engine = null;

function post(message, transfer) {
  self.postMessage(message, transfer || []);
}

async function loadEngine(id) {
  post({ id, type: "progress", stage: "runtime" });
  const py = await loadPyodide({ indexURL: PYODIDE_URL });
  post({ id, type: "progress", stage: "packages" });
  await py.loadPackage(["numpy", "opencv-python", "lxml", "fonttools", "typing-extensions"], { messageCallback: () => {} });
  post({ id, type: "progress", stage: "engine" });
  await py.loadPackage(
    [PYMUPDF_URL, BASE + "wheels/python_docx-1.2.0-py3-none-any.whl", BASE + "wheels/pdf2docx-0.5.13-py3-none-any.whl"],
    { messageCallback: () => {} },
  );
  const source = await (await fetch(BASE + "p2w.py?v=" + VERSION)).text();
  py.FS.mkdirTree("/work/fonts");
  py.FS.writeFile("/work/p2w.py", source);
  py.runPython("import sys, json\nsys.path.insert(0, '/work')\nimport p2w");
  return py;
}

async function fetchFont(py, file) {
  const path = "/work/fonts/" + file;
  if (!py.FS.analyzePath(path).exists) {
    const res = await fetch(BASE + "fonts/" + file);
    if (!res.ok) return null;
    py.FS.writeFile(path, new Uint8Array(await res.arrayBuffer()));
  }
  return path;
}

async function convert(id, pdf) {
  const py = await engine;
  py.FS.writeFile("/work/in.pdf", new Uint8Array(pdf));

  const info = JSON.parse(py.runPython("json.dumps(p2w.inspect('/work/in.pdf'))"));
  if (info.encrypted) throw new Error("ENCRYPTED");

  py.globals.set("js_progress", (phase, current, total) => post({ id, type: "progress", stage: phase, current, total }));
  const result = JSON.parse(py.runPython("json.dumps(p2w.convert('/work/in.pdf', '/work/conv.docx', js_progress))"));

  post({ id, type: "progress", stage: "fonts" });
  const embed = {};
  for (const family of result.fonts) {
    const file = FONTS[family];
    if (!file) continue;
    const files = [await fetchFont(py, file + "-400.ttf"), await fetchFont(py, file + "-700.ttf")];
    if (files[0] || files[1]) embed[family] = files;
  }
  py.globals.set("js_fonts", py.toPy(embed));
  const embedded = py.runPython("p2w.embed_fonts('/work/conv.docx', '/work/out.docx', js_fonts)").toJs();

  const docx = py.FS.readFile("/work/out.docx");
  for (const f of ["/work/in.pdf", "/work/conv.docx", "/work/conv.docx.raw.docx", "/work/out.docx"]) {
    if (py.FS.analyzePath(f).exists) py.FS.unlink(f);
  }
  return { docx, pages: result.pages, textChars: info.text_chars, fonts: result.fonts, embedded };
}

self.addEventListener("message", async (event) => {
  const { id, pdf } = event.data;
  try {
    engine = engine || loadEngine(id);
    const out = await convert(id, pdf);
    post({ id, type: "done", ...out }, [out.docx.buffer]);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    // โหลดตัวแปลงไม่สำเร็จ → ครั้งหน้าลองโหลดใหม่
    if (/fetch|network|load/i.test(message)) engine = null;
    post({ id, type: "error", message });
  }
});
