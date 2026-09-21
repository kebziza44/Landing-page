$sec = "testsecret"
# 1) Secret'siz -> 401
try {
  Invoke-WebRequest http://localhost:3300/$sec -Method POST -Body '{"update_id":1}' -ContentType "application/json" -UseBasicParsing | Out-Null
  Write-Output "1) secret'siz: KUTILMAGAN 200"
} catch { Write-Output ("1) secret'siz -> " + $_.Exception.Response.StatusCode.value__) }

# 2) Secret bilan, valid update -> 200 kutilmoqda
try {
  $r = Invoke-WebRequest ("http://localhost:3300/" + $sec) -Method POST -Body '{"update_id":123}' -ContentType "application/json" -Headers @{ "X-Telegram-Bot-Api-Secret-Token" = $sec } -UseBasicParsing
  Write-Output ("2) valid update -> " + $r.StatusCode)
} catch { Write-Output ("2) valid update FAIL " + $_.Exception.Message) }

# 3) Noto'g'ri body -> 400 kutilmoqda
try {
  $r3 = Invoke-WebRequest ("http://localhost:3300/" + $sec) -Method POST -Body 'salom dunyo' -ContentType "text/plain" -Headers @{ "X-Telegram-Bot-Api-Secret-Token" = $sec } -UseBasicParsing
  Write-Output ("3) notogri body -> " + $r3.StatusCode)
} catch { Write-Output ("3) notogri body -> " + $_.Exception.Response.StatusCode.value__) }

# 4) update_id'siz JSON -> 400 kutilmoqda
try {
  Invoke-WebRequest ("http://localhost:3300/" + $sec) -Method POST -Body '{"foo":1}' -ContentType "application/json" -Headers @{ "X-Telegram-Bot-Api-Secret-Token" = $sec } -UseBasicParsing | Out-Null
  Write-Output "4) update_id'siz: KUTILMAGAN 200"
} catch { Write-Output ("4) update_id'siz -> " + $_.Exception.Response.StatusCode.value__) }

foreach ($p in @("/health", "/api/config", "/admin", "/")) {
  try {
    $r = Invoke-WebRequest ("http://localhost:3300" + $p) -UseBasicParsing -MaximumRedirection 5
    Write-Output ($p + " -> " + $r.StatusCode)
  } catch { Write-Output ($p + " FAIL " + $_.Exception.Message) }
}
