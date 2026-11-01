# Rol de Turnos: instala dependencias, compila y crea el acceso directo del escritorio.
# Se ejecuta con INSTALAR.bat (doble clic). Se puede repetir sin perder datos.

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot

function Paso($texto) { Write-Host "`n>> $texto" -ForegroundColor Cyan }

Write-Host '==============================================' -ForegroundColor Red
Write-Host '   ROL DE TURNOS - Distrito Fiscal de Canete'
Write-Host '==============================================' -ForegroundColor Red

Paso 'Verificando Node.js'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host 'Falta Node.js. Descargue la version LTS (22 o superior) de https://nodejs.org e instalela.' -ForegroundColor Yellow
  exit 1
}
$version = [version]((node --version).TrimStart('v'))
if ($version -lt [version]'22.13.0') {
  Write-Host "Node.js $version es muy antiguo. Instale la version 22.13 o superior de https://nodejs.org" -ForegroundColor Yellow
  exit 1
}
Write-Host "Node.js $version OK"

Paso 'Instalando y compilando el servidor (backend)'
Push-Location "$raiz\backend"
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'No se pudo instalar el backend.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el backend.' }
Pop-Location

Paso 'Instalando y compilando la pantalla (frontend)'
Push-Location "$raiz\frontend"
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'No se pudo instalar el frontend.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el frontend.' }
Pop-Location

Paso 'Creando el acceso directo en el escritorio'
New-Item -ItemType Directory -Force "$raiz\datos" | Out-Null
$escritorio = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell
$acceso = $ws.CreateShortcut("$escritorio\Rol de Turnos.lnk")
$acceso.TargetPath = "$env:SystemRoot\System32\wscript.exe"
$acceso.Arguments = "`"$raiz\scripts\iniciar.vbs`""
$acceso.WorkingDirectory = $raiz
$acceso.IconLocation = "$raiz\scripts\rol-turnos.ico"
$acceso.Description = 'Abrir el Rol de Turnos'
$acceso.Save()

Write-Host "`nListo. Use el icono 'Rol de Turnos' del escritorio para abrir el sistema." -ForegroundColor Green
