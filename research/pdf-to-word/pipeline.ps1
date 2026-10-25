# กระบวนการเต็ม: pdf2docx (+แพตช์) → thai_fix → ฝังฟอนต์ → ZWSP ระหว่างคำไทย → Word พิมพ์เป็น PDF → ให้คะแนน
param(
  [Parameter(Mandatory)][string]$Name,
  [Parameter(Mandatory)][string]$Tag
)
$w = $PSScriptRoot
$env:PYTHONIOENCODING = "utf-8"
$stage = "$w\out\$Name.$Tag.stage.docx"
$final = "$w\out\$Name.$Tag.docx"
& "$w\venv\Scripts\python.exe" -W ignore "$w\run_patched.py" "$w\in\$Name.pdf" $stage | Out-Null
node "$w\zwsp.mjs" $stage $final | Out-Null
& "$w\roundtrip.ps1" -Original "$w\in\$Name.pdf" -Docx $final -Label "$Name-$Tag"
& "$w\venv\Scripts\python.exe" -W ignore "$w\linecheck.py" "$w\in\$Name.pdf" ([System.IO.Path]::ChangeExtension($final, ".rt.pdf")) 0 | Select-Object -First 1
