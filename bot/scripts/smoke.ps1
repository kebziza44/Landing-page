$ErrorActionPreference = "Continue"
try {
  $r = Invoke-WebRequest http://localhost:3000/ -UseBasicParsing
  Write-Output ("/: " + $r.StatusCode + " len " + $r.Content.Length)
} catch { Write-Output ("/ FAIL " + $_.Exception.Message) }
try {
  $r2 = Invoke-WebRequest http://localhost:3000/admin -UseBasicParsing -MaximumRedirection 5
  Write-Output ("/admin: " + $r2.StatusCode + " len " + $r2.Content.Length)
} catch { Write-Output ("/admin FAIL " + $_.Exception.Message) }
try {
  $r3 = Invoke-WebRequest http://localhost:3000/api/config -UseBasicParsing
  Write-Output ("/api/config: " + $r3.StatusCode + " " + $r3.Content)
} catch { Write-Output ("/api/config FAIL " + $_.Exception.Message) }
