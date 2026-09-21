$ErrorActionPreference = "Continue"
foreach ($p in @("/health", "/api/config", "/admin", "/")) {
  try {
    $r = Invoke-WebRequest ("http://localhost:3000" + $p) -UseBasicParsing -MaximumRedirection 5
    Write-Output ($p + " -> " + $r.StatusCode + " " + $r.Content.Substring(0, [Math]::Min(80, $r.Content.Length)))
  } catch { Write-Output ($p + " FAIL " + $_.Exception.Message) }
}
