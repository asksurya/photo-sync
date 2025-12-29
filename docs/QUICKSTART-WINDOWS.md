# Photo-Sync Quick Start Guide - Windows

Get photo-sync running on Windows in under 10 minutes.

## Prerequisites

### Required Software

1. **Docker Desktop for Windows**
   - Download: https://www.docker.com/products/docker-desktop/
   - Install with WSL 2 backend (recommended)
   - Minimum: 8GB RAM allocated to Docker
   - Enable "Use the WSL 2 based engine" in Docker Desktop settings

2. **Git for Windows**
   - Download: https://git-scm.com/download/win
   - During installation, select "Git Bash Here" context menu option
   - Use default settings for line endings (CRLF)

3. **Node.js 20+** (for local development)
   - Download: https://nodejs.org/
   - Use LTS version (20.x or later)
   - Verify: Open PowerShell and run `node --version`

4. **Python 3.11+** (for local development)
   - Download: https://www.python.org/downloads/
   - ✅ Check "Add Python to PATH" during installation
   - Verify: `python --version`

### Optional but Recommended

- **Windows Terminal** (modern terminal experience)
  - Install from Microsoft Store
- **WSL 2** (for better Docker performance)
  - Run in PowerShell (Admin): `wsl --install`
  - Restart computer after installation

---

## Installation

### 1. Clone Repository

Open **PowerShell** or **Git Bash**:

```powershell
# Create projects directory
New-Item -ItemType Directory -Path C:\projects -Force
cd C:\projects

# Clone repository
git clone https://github.com/asksurya/photo-sync.git
cd photo-sync
```

### 2. Configure Environment

```powershell
# Copy example environment file
Copy-Item .env.example .env

# Edit with Notepad
notepad .env
```

**Minimum required settings in `.env`:**

```env
# Immich Configuration
IMMICH_UPLOAD_LOCATION=C:/photo-sync-data/upload
IMMICH_DB_PASSWORD=your_secure_password_here

# Analysis Service
IMMICH_API_KEY=your_immich_api_key_here
```

> **Note:** Use forward slashes (`/`) in paths, even on Windows

### 3. Start Services

```powershell
# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

**First startup takes 5-10 minutes** to download images and initialize databases.

### 4. Access Services

Once containers are running:

- **Web UI**: http://localhost:8080
- **Immich**: http://localhost:2283
- **API Gateway**: http://localhost:3000

### 5. Initial Setup

1. Open http://localhost:2283 (Immich)
2. Create admin account
3. Go to Settings → API Keys
4. Generate new API key
5. Copy the API key
6. Update `.env` file:
   ```env
   IMMICH_API_KEY=paste_your_api_key_here
   ```
7. Restart analysis service:
   ```powershell
   docker-compose restart analysis
   ```

---

## Common Windows Issues

### Issue: Docker Desktop Not Starting

**Solution:**
```powershell
# Enable WSL 2 (PowerShell as Admin)
wsl --install
wsl --set-default-version 2

# Enable required Windows features
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform

# Restart computer
```

### Issue: Port Already in Use

**Solution:**
```powershell
# Find what's using port 8080
netstat -ano | findstr :8080

# Stop the process (replace PID with actual process ID)
taskkill /F /PID <PID>
```

### Issue: Permission Denied on Volumes

**Solution:**
- Right-click Docker Desktop tray icon → Settings → Resources → File Sharing
- Add `C:\projects\photo-sync` to shared paths
- Click "Apply & Restart"

### Issue: Database Connection Failed

**Solution:**
```powershell
# Check if PostgreSQL container is healthy
docker-compose ps

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Issue: Slow Performance

**Solution:**
- Increase Docker Desktop memory allocation:
  - Right-click Docker Desktop → Settings → Resources
  - Set Memory to at least 8GB
  - Set CPUs to at least 4
- Move project to WSL 2 filesystem for better performance:
  ```bash
  # In WSL terminal
  cd ~
  git clone https://github.com/asksurya/photo-sync.git
  cd photo-sync
  ```

---

## Development Setup (Windows)

### Python Services (Analysis, Grouping, Deduplication)

```powershell
cd services\analysis

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get execution policy error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest -v --cov=src
```

### Node.js Services (Gateway, Web)

```powershell
cd services\gateway

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

---

## Useful Commands

### Docker Commands

```powershell
# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f analysis

# Restart a service
docker-compose restart analysis

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build
```

### Database Access

```powershell
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d custom_db

# Backup database
docker-compose exec postgres pg_dump -U postgres custom_db > backup.sql

# Restore database
Get-Content backup.sql | docker-compose exec -T postgres psql -U postgres custom_db
```

### Testing

```powershell
# Run all tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Test specific service
cd services\analysis
pytest -v

# Test with coverage
pytest --cov=src --cov-report=html
start htmlcov\index.html  # Opens coverage report in browser
```

---

## File Paths on Windows

### Use Forward Slashes in Configuration

✅ **Correct:**
```env
UPLOAD_LOCATION=C:/photo-sync-data/upload
```

❌ **Incorrect:**
```env
UPLOAD_LOCATION=C:\photo-sync-data\upload
```

### Volume Mounts in docker-compose.yml

Windows paths are automatically converted by Docker Desktop:

```yaml
volumes:
  - ./services/analysis:/app  # Works on Windows
  - C:/photo-sync-data:/data  # Also works
```

---

## Firewall Configuration

If you need to access services from other devices on your network:

1. Open **Windows Defender Firewall**
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" → Specific local ports: `8080, 2283, 3000`
6. Select "Allow the connection" → Next
7. Check all profiles (Domain, Private, Public) → Next
8. Name: "Photo-Sync Services" → Finish

---

## Performance Tips

1. **Use WSL 2 for Docker** (much faster than Hyper-V)
2. **Store project in WSL filesystem** if using WSL 2
3. **Exclude project directory from Windows Defender**:
   - Settings → Update & Security → Windows Security
   - Virus & threat protection → Manage settings
   - Add or remove exclusions → Add folder
   - Select `C:\projects\photo-sync`
4. **Allocate sufficient resources to Docker Desktop**:
   - Memory: 8GB minimum, 16GB recommended
   - CPUs: 4 minimum, 8 recommended
   - Disk: 50GB minimum

---

## Next Steps

1. **Upload Photos**: Use Immich web interface at http://localhost:2283
2. **Import Photos**: Create import batch via API or web UI
3. **Analyze Photos**: Run analysis on imported batches
4. **Review Triage Dashboard**: See quality scores and duplicates
5. **Manage Groups**: View RAW+JPEG pairs and burst sequences

For detailed usage, see [USER_GUIDE.md](USER_GUIDE.md)

---

## Troubleshooting

### Check Service Health

```powershell
# All services
docker-compose ps

# Detailed health status
docker-compose ps -a

# Service logs
docker-compose logs analysis
docker-compose logs postgres
docker-compose logs immich_server
```

### Reset Everything

If something goes wrong and you want to start fresh:

```powershell
# Stop all services
docker-compose down

# Remove volumes (⚠️ deletes all data)
docker-compose down -v

# Remove Docker images
docker-compose down --rmi all

# Clean Docker system
docker system prune -a --volumes

# Start fresh
docker-compose up -d
```

---

## Getting Help

- **GitHub Issues**: https://github.com/asksurya/photo-sync/issues
- **Documentation**: See `docs/` directory
- **Logs**: `docker-compose logs -f <service-name>`

---

## Windows-Specific Notes

### Line Endings

If you encounter issues with shell scripts:

```powershell
# Convert line endings (requires Git)
git config --global core.autocrlf true
```

### Path Length Limit

If you get "path too long" errors:

```powershell
# Enable long path support (PowerShell as Admin)
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### Running Bash Scripts

Use **Git Bash** to run `.sh` scripts:

```bash
# Open Git Bash
cd /c/projects/photo-sync
./scripts/deploy.sh up
```

Or use PowerShell equivalents when available.

---

**Happy photo organizing! 📸**
