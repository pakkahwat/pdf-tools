# ใช้ Microsoft Word จริงผ่าน COM
#   -Mode topdf  : เปิด .docx แล้ว export เป็น PDF (ใช้วัดว่า DOCX ที่ได้ แสดงผลใน Word เหมือนต้นฉบับแค่ไหน)
#   -Mode import : ให้ Word เปิด PDF เอง (PDF Reflow) แล้ว save เป็น .docx — ใช้เป็นเกณฑ์เทียบ
param(
  [Parameter(Mandatory)][ValidateSet("topdf", "import")][string]$Mode,
  [Parameter(Mandatory)][string]$In,
  [Parameter(Mandatory)][string]$Out
)
$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0 # wdAlertsNone
try {
  $doc = $word.Documents.Open($In, $false, $true) # FileName, ConfirmConversions, ReadOnly
  if ($Mode -eq "topdf") {
    $doc.ExportAsFixedFormat($Out, 17) # wdExportFormatPDF
  } else {
    $doc.SaveAs2($Out, 16) # wdFormatXMLDocument
  }
  $doc.Close($false)
  "ok $Out"
} finally {
  $word.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
