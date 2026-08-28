
# ─── BioMed CMS — One-Click Setup Script ──────────────────────────────────────
# Run this script in PowerShell AFTER PostgreSQL is installed
# Right-click PowerShell → Run as Administrator

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     BioMed CMS — Database & Server Setup             ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── 1. Find psql ──────────────────────────────────────────────────────────────
$pgBin = $null
foreach ($ver in @("17","16","15","14")) {
    $path = "C:\Program Files\PostgreSQL\$ver\bin"
    if (Test-Path "$path\psql.exe") { $pgBin = $path; $pgVer = $ver; break }
}

if (-not $pgBin) {
    Write-Host "❌ PostgreSQL not found. Please install it first from:" -ForegroundColor Red
    Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found PostgreSQL $pgVer at: $pgBin" -ForegroundColor Green
$env:PATH = "$pgBin;$env:PATH"
$env:PGPASSWORD = "postgres"

# ── 2. Create DB & User ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "📦 Creating database and user..." -ForegroundColor Yellow

$pgPass = Read-Host "Enter your PostgreSQL superuser (postgres) password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPass)
$env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

& "$pgBin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS biomedical_db;" 2>$null
& "$pgBin\psql.exe" -U postgres -c "DROP USER IF EXISTS biomedical_user;" 2>$null
& "$pgBin\psql.exe" -U postgres -c "CREATE USER biomedical_user WITH PASSWORD 'BioMed@Secure2025';"
& "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE biomedical_db OWNER biomedical_user;"
& "$pgBin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE biomedical_db TO biomedical_user;"

Write-Host "✅ Database created!" -ForegroundColor Green

# ── 3. Run Migrations ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "🗄️  Running database migrations..." -ForegroundColor Yellow
$serverDir = "C:\Users\Tharun tk\Downloads\tkd project\server"
Set-Location $serverDir

$env:PGPASSWORD = ""
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_NAME = "biomedical_db"
$env:DB_USER = "biomedical_user"
$env:DB_PASSWORD = "BioMed@Secure2025"

# Run SQL migration directly
$sqlPath = "C:\Users\Tharun tk\Downloads\tkd project\database\migrations\001_initial_schema.sql"
& "$pgBin\psql.exe" -U biomedical_user -d biomedical_db -f $sqlPath
Write-Host "✅ Tables created!" -ForegroundColor Green

# ── 4. Seed Data ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "🌱 Seeding demo data..." -ForegroundColor Yellow
$seedSql = "C:\Users\Tharun tk\Downloads\tkd project\database\seed\seed.sql"
if (Test-Path $seedSql) {
    & "$pgBin\psql.exe" -U biomedical_user -d biomedical_db -f $seedSql
    Write-Host "✅ Demo data loaded!" -ForegroundColor Green
} else {
    Write-Host "⚠️  No seed.sql found, skipping seed." -ForegroundColor Yellow
}

# ── 5. Start Backend ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "🚀 Starting backend server on http://localhost:3001 ..." -ForegroundColor Yellow
Write-Host "   (Open a NEW PowerShell window for the next step)" -ForegroundColor Gray
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ SETUP COMPLETE! Now run in separate windows:     ║" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║  Window 1 (Backend):                                 ║" -ForegroundColor Green
Write-Host "║    cd 'C:\Users\Tharun tk\Downloads\tkd project\server'" -ForegroundColor White
Write-Host "║    npm run dev                                       ║" -ForegroundColor White
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║  Window 2 (Frontend):                                ║" -ForegroundColor Green
Write-Host "║    cd 'C:\Users\Tharun tk\Downloads\tkd project\client'" -ForegroundColor White
Write-Host "║    npm run dev                                       ║" -ForegroundColor White
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║  Browser: http://localhost:5173                      ║" -ForegroundColor Cyan
Write-Host "║  Login:   admin@hospital.com / Admin@123             ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
