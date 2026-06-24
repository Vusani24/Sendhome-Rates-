$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot
$env:PORT = "3200"
& "C:\Program Files\nodejs\node.exe" server.js
