$ErrorActionPreference = 'Stop'
$dir = 'D:\tools'
$zip = Join-Path $dir 'node.zip'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
if (-not (Test-Path 'D:\tools\node\node.exe')) {
  Write-Output 'Downloading Node.js v20.18.1...'
  Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.1/node-v20.18.1-win-x64.zip' -OutFile $zip -UseBasicParsing -TimeoutSec 600
  Expand-Archive -Path $zip -DestinationPath $dir -Force
  $extracted = Get-ChildItem $dir -Directory | Where-Object Name -like 'node-v*win-x64' | Select-Object -First 1
  Move-Item $extracted.FullName 'D:\tools\node'
  Remove-Item $zip -Force
}
& 'D:\tools\node\node.exe' --version
& 'D:\tools\node\npm.cmd' --version
