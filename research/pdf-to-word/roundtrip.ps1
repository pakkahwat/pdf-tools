# DOCX → PDF ด้วย Word (กันค้างด้วย timeout) แล้วให้คะแนนเทียบกับ PDF ต้นฉบับ
param(
  [Parameter(Mandatory)][string]$Original,
  [Parameter(Mandatory)][string]$Docx,
  [Parameter(Mandatory)][string]$Label
)
$w = $PSScriptRoot
$rt = [System.IO.Path]::ChangeExtension($Docx, ".rt.pdf")
$job = Start-Job -ScriptBlock { param($s, $i, $o) & $s -Mode topdf -In $i -Out $o } -ArgumentList "$w\word.ps1", $Docx, $rt
if (-not (Wait-Job $job -Timeout 120)) {
  Stop-Job $job
  Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { -not $_.MainWindowTitle } | Stop-Process -Force
  Remove-Job $job -Force
  "TIMEOUT $Label"
  return
}
Remove-Job $job -Force
$env:PYTHONIOENCODING = "utf-8"
& "$w\venv\Scripts\python.exe" -W ignore "$w\score.py" $Original $rt $Label "$w\cmp"
