try {
  $r = Invoke-WebRequest http://localhost:3300/health -UseBasicParsing
  Write-Output ("/health -> " + $r.StatusCode + " " + $r.Content)
} catch { Write-Output ("/health FAIL " + $_.Exception.Message) }
try {
  $r2 = Invoke-WebRequest http://localhost:3300/api/config -UseBasicParsing
  Write-Output ("/api/config -> " + $r2.StatusCode)
} catch { Write-Output ("/api/config FAIL " + $_.Exception.Message) }
try {
  $r3 = Invoke-WebRequest http://localhost:3300/admin -UseBasicParsing -MaximumRedirection 5
  Write-Output ("/admin -> " + $r3.StatusCode)
} catch { Write-Output ("/admin FAIL " + $_.Exception.Message) }
# webhook POST (secret token'siz) — 401 kutamiz (handler mount qilingani isboti)
try {
  $body = '{"update_id":1}'
  $r4 = Invoke-WebRequest http://localhost:3300/testsecret -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
  Write-Output ("/testsecret -> " + $r4.StatusCode)
} catch {
  Write-Output ("/testsecret -> " + $_.Exception.Response.StatusCode.value__ + " (secret token'siz rad etildi)")
}
