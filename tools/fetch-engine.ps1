# Downloads the official Stockfish 19 Windows build into app\engine (the binary is too large for Git).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$engine = Join-Path $root 'app\engine'
$tmp = Join-Path $env:TEMP ('sf-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $engine, $tmp | Out-Null
$zip = Join-Path $tmp 'sf.zip'
Invoke-WebRequest 'https://github.com/official-stockfish/Stockfish/releases/download/sf_19/stockfish-windows-x86-64-universal.zip' -OutFile $zip
Expand-Archive -Force $zip $tmp
$src = Join-Path $tmp 'stockfish'
Copy-Item (Join-Path $src 'stockfish-windows-x86-64-universal.exe') (Join-Path $engine 'stockfish.exe') -Force
Copy-Item (Join-Path $src 'Copying.txt'), (Join-Path $src 'AUTHORS'), (Join-Path $src 'README.md') $engine -Force
Remove-Item -Recurse -Force $tmp
Write-Host "Stockfish installed in $engine"
