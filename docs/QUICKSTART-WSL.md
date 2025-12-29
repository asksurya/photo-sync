# Photo-Sync Quick Start Guide - WSL (Windows Subsystem for Linux)

Get photo-sync running on Windows using WSL 2 for optimal performance.

## Why WSL?

WSL 2 offers significant advantages over native Windows for Docker and development:
- **10-100x faster** file system performance
- **Better Docker compatibility** (native Linux containers)
- **Lower resource usage** compared to Docker Desktop on Windows
- **Native Linux tools** and package managers
- **Seamless integration** with Windows filesystem

---

## Prerequisites

### 1. Enable WSL 2

Open **PowerShell as Administrator** and run:

```powershell
# Enable WSL and Virtual Machine Platform
wsl --install

# This will:
# - Enable WSL
# - Enable Virtual Machine Platform
# - Download and install Ubuntu (default distribution)
# - Set WSL 2 as default version

# Restart your computer when prompted
```

After restart, verify WSL 2 is installed:

```powershell
wsl --list --verbose
```

You should see:
```
  NAME      STATE           VERSION
* Ubuntu    Running         2
```

### 2. Update WSL Kernel

```powershell
wsl --update
```

### 3. Install Docker Desktop for Windows

1. Download: https://www.docker.com/products/docker-desktop/
2. During installation:
   - ✅ **Enable "Use the WSL 2 based engine"**
   - ✅ **Enable "Add to PATH"**
3. After installation:
   - Open Docker Desktop
   - Settings → General → **"Use the WSL 2 based engine"** ✅
   - Settings → Resources → WSL Integration → **Enable for Ubuntu** ✅

### 4. Configure Docker in WSL

Open **Ubuntu** from Start Menu or Windows Terminal:

```bash
# Verify Docker is accessible from WSL
docker --version
docker-compose --version

# Test Docker
docker run hello-world
```

---

## Installation in WSL

### 1. Open WSL Terminal

You can access WSL in several ways:
- **Windows Terminal** → Ubuntu tab
- **Start Menu** → Ubuntu
- **PowerShell** → `wsl`
- **VS Code** → Remote-WSL extension

### 2. Update System Packages

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget build-essential
```

### 3. Install Development Tools

#### Git (if not already installed)

```bash
sudo apt install -y git
git --version

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### Node.js 20+

```bash
# Install Node.js using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### Python 3.11+

```bash
# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Set Python 3.11 as default
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Verify installation
python3 --version
pip3 --version
```

### 4. Clone Repository

```bash
# Clone to WSL filesystem (recommended for best performance)
cd ~
git clone https://github.com/asksurya/photo-sync.git
cd photo-sync

# Alternative: Clone to Windows filesystem (accessible from Windows)
# cd /mnt/c/Users/YourUsername/projects
# git clone https://github.com/asksurya/photo-sync.git
# cd photo-sync
```

> **⚠️ Important:** For best performance, keep project files in WSL filesystem (`~/photo-sync`), not Windows filesystem (`/mnt/c/...`)

### 5. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with nano (beginner-friendly) or vim
nano .env
```

**Minimum required settings in `.env`:**

```env
# Immich Configuration
IMMICH_UPLOAD_LOCATION=/home/yourusername/photo-sync-data/upload
IMMICH_DB_PASSWORD=your_secure_password_here

# Analysis Service
IMMICH_API_KEY=your_immich_api_key_here
```

### 6. Create Data Directories

```bash
# Create upload directory
mkdir -p ~/photo-sync-data/upload

# Set permissions
chmod -R 755 ~/photo-sync-data
```

### 7. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**First startup takes 5-10 minutes** to download images and initialize databases.

### 8. Access Services

Services are accessible from both WSL and Windows:

- **Web UI**: http://localhost:8080
- **Immich**: http://localhost:2283
- **API Gateway**: http://localhost:3000

Open these URLs in your **Windows browser** (Chrome, Edge, Firefox, etc.)

### 9. Initial Setup

1. Open http://localhost:2283 (Immich) in Windows browser
2. Create admin account
3. Go to Settings → API Keys
4. Generate new API key
5. Copy the API key
6. Back in WSL, update `.env`:
   ```bash
   nano .env
   # Add: IMMICH_API_KEY=paste_your_api_key_here
   ```
7. Restart analysis service:
   ```bash
   docker-compose restart analysis
   ```

---

## WSL-Specific Features

### Accessing WSL from Windows Explorer

```bash
# From WSL, open current directory in Windows Explorer
explorer.exe .

# Or access WSL filesystem from Windows:
# \\wsl$\Ubuntu\home\yourusername\photo-sync
```

### Accessing Windows Files from WSL

```bash
# Windows drives are mounted at /mnt/
cd /mnt/c/Users/YourUsername/Pictures
cd /mnt/d/Photos

# Copy files from Windows to WSL
cp /mnt/c/Users/YourUsername/Pictures/*.jpg ~/photo-sync-data/upload/
```

### Using VS Code with WSL

1. Install **Remote - WSL** extension in VS Code
2. Open project in WSL:
   ```bash
   # From WSL terminal
   cd ~/photo-sync
   code .
   ```
3. VS Code will open with full WSL integration

### Windows Terminal Configuration

Add to Windows Terminal settings for better experience:

```json
{
  "defaultProfile": "{Ubuntu}",
  "profiles": {
    "list": [
      {
        "name": "Ubuntu",
        "startingDirectory": "//wsl$/Ubuntu/home/yourusername/photo-sync"
      }
    ]
  }
}
```

---

## Common WSL Issues

### Issue: WSL Not Starting

**Solution:**
```powershell
# In PowerShell (Admin)
wsl --shutdown
wsl --unregister Ubuntu
wsl --install -d Ubuntu
```

### Issue: Docker Daemon Not Running

**Solution:**
```bash
# Check Docker Desktop is running in Windows
# Settings → Resources → WSL Integration → Enable Ubuntu

# Restart Docker from WSL
wsl --shutdown
# Then restart Docker Desktop from Windows
```

### Issue: Permission Denied

**Solution:**
```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Logout and login again
exit
# Close and reopen WSL terminal

# Verify
docker ps
```

### Issue: Slow File Performance

**Solution:**
```bash
# Move project to WSL filesystem (not /mnt/c)
cd ~
mv /mnt/c/Users/YourUsername/photo-sync ~/photo-sync

# Or clone fresh in WSL
cd ~
git clone https://github.com/asksurya/photo-sync.git
```

### Issue: Out of Memory

**Solution:**

Create/edit `%UserProfile%\.wslconfig` in Windows:

```ini
[wsl2]
memory=8GB
processors=4
swap=4GB
```

Then restart WSL:
```powershell
wsl --shutdown
```

### Issue: Cannot Access localhost

**Solution:**
```bash
# Check if ports are forwarded
# In Windows PowerShell
netsh interface portproxy show all

# If ports are not forwarded, Docker Desktop should handle this automatically
# Ensure "Expose daemon on tcp://localhost:2375" is NOT checked in Docker settings
```

### Issue: Line Ending Problems

**Solution:**
```bash
# Configure Git to handle line endings
git config --global core.autocrlf input

# Convert existing files
find . -type f -name "*.sh" -exec dos2unix {} \;
```

---

## Development Setup in WSL

### Python Services (Analysis, Grouping, Deduplication)

```bash
cd ~/photo-sync/services/analysis

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest -v --cov=src

# Deactivate when done
deactivate
```

### Node.js Services (Gateway, Web)

```bash
cd ~/photo-sync/services/gateway

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

---

## Useful WSL Commands

### WSL Management

```powershell
# List installed distributions
wsl --list --verbose

# Stop WSL
wsl --shutdown

# Restart specific distribution
wsl --terminate Ubuntu

# Set default distribution
wsl --set-default Ubuntu

# Update WSL
wsl --update

# Check WSL status
wsl --status
```

### File System Navigation

```bash
# WSL home directory
cd ~
cd /home/yourusername

# Windows C: drive
cd /mnt/c

# Windows user directory
cd /mnt/c/Users/$USER

# List all mounted drives
ls /mnt/
```

### System Information

```bash
# Check WSL version
uname -r

# Check available disk space
df -h

# Check memory usage
free -h

# Check CPU info
lscpu

# Check running processes
top
```

---

## Performance Optimization

### 1. Keep Files in WSL Filesystem

```bash
# ✅ FAST - WSL filesystem
~/photo-sync/

# ❌ SLOW - Windows filesystem
/mnt/c/Users/YourUsername/photo-sync/
```

### 2. Allocate More Resources

Edit `%UserProfile%\.wslconfig`:

```ini
[wsl2]
memory=16GB          # 50-75% of your total RAM
processors=8         # Number of CPU cores
swap=8GB            # Swap space
localhostForwarding=true
```

### 3. Enable Docker BuildKit

```bash
# Add to ~/.bashrc or ~/.zshrc
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

### 4. Use Faster Package Manager

```bash
# Install nala (faster apt frontend)
sudo apt install -y nala

# Use nala instead of apt
sudo nala update
sudo nala install <package>
```

### 5. Optimize Docker

```bash
# Add to docker-compose.yml for better performance
services:
  analysis:
    volumes:
      - ./services/analysis:/app:cached  # Use :cached for better performance
```

---

## Docker Commands in WSL

```bash
# View all running containers
docker ps

# View logs
docker-compose logs -f analysis

# Restart service
docker-compose restart analysis

# Stop all services
docker-compose down

# Remove all containers and volumes
docker-compose down -v

# Rebuild service
docker-compose up -d --build analysis

# Access container shell
docker exec -it photo-sync-analysis-1 bash

# Check Docker disk usage
docker system df

# Clean up Docker
docker system prune -a --volumes
```

---

## Database Management

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d custom_db

# Backup database
docker-compose exec postgres pg_dump -U postgres custom_db > ~/backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres custom_db < ~/backup.sql

# View database size
docker-compose exec postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('custom_db'));"
```

---

## Testing

```bash
# Run all tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Test specific service
cd services/analysis
source venv/bin/activate
pytest -v

# Test with coverage
pytest --cov=src --cov-report=html
# Open in Windows browser
explorer.exe htmlcov/index.html

# Run linting
cd services/analysis
ruff check src/
mypy src/
```

---

## Networking

### Access from Windows

All WSL services are accessible from Windows via `localhost`:
- http://localhost:8080
- http://localhost:2283
- http://localhost:3000

### Access from Other Devices

1. Find your Windows IP:
   ```powershell
   # In PowerShell
   ipconfig
   # Look for "IPv4 Address"
   ```

2. Configure Windows Firewall (PowerShell as Admin):
   ```powershell
   New-NetFirewallRule -DisplayName "Photo-Sync" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080,2283,3000
   ```

3. Access from other devices:
   - http://YOUR_WINDOWS_IP:8080
   - http://YOUR_WINDOWS_IP:2283
   - http://YOUR_WINDOWS_IP:3000

---

## Shell Configuration

### Recommended: Oh My Zsh

```bash
# Install Zsh
sudo apt install -y zsh

# Install Oh My Zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Set as default shell
chsh -s $(which zsh)
```

### Useful Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Photo-sync aliases
alias ps-up='cd ~/photo-sync && docker-compose up -d'
alias ps-down='cd ~/photo-sync && docker-compose down'
alias ps-logs='cd ~/photo-sync && docker-compose logs -f'
alias ps-restart='cd ~/photo-sync && docker-compose restart'
alias ps-rebuild='cd ~/photo-sync && docker-compose up -d --build'
alias ps-test='cd ~/photo-sync && docker-compose -f docker-compose.test.yml up --abort-on-container-exit'

# Docker aliases
alias dps='docker ps'
alias dlog='docker-compose logs -f'
alias dexec='docker exec -it'
alias dclean='docker system prune -a --volumes'

# Navigation
alias photosync='cd ~/photo-sync'
```

Reload configuration:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

---

## Backup and Restore

### Backup WSL Distribution

```powershell
# In PowerShell
wsl --export Ubuntu C:\Users\YourUsername\ubuntu-backup.tar

# Restore if needed
wsl --import Ubuntu C:\WSL\Ubuntu C:\Users\YourUsername\ubuntu-backup.tar
```

### Backup Project Data

```bash
# In WSL
cd ~/photo-sync

# Backup all data
tar -czf ~/photo-sync-backup-$(date +%Y%m%d).tar.gz \
  ~/photo-sync-data \
  ~/photo-sync/.env \
  ~/photo-sync/docs

# Restore
tar -xzf ~/photo-sync-backup-YYYYMMDD.tar.gz -C /
```

---

## Troubleshooting Tools

```bash
# Check service status
docker-compose ps

# View resource usage
docker stats

# Check network
docker network ls
docker network inspect photo-sync_default

# Check volumes
docker volume ls
docker volume inspect photo-sync_postgres-data

# Check logs
docker-compose logs --tail=100 analysis
docker-compose logs --tail=100 postgres

# Interactive debugging
docker exec -it photo-sync-analysis-1 bash
# Inside container:
ls -la
env | grep IMMICH
python -c "from src.config import settings; print(settings.IMMICH_API_URL)"
```

---

## Next Steps

1. **Upload Photos**: Use Immich web interface at http://localhost:2283
2. **Import Photos**: Create import batch via API or web UI
3. **Analyze Photos**: Run analysis on imported batches
4. **Review Triage Dashboard**: See quality scores and duplicates
5. **Manage Groups**: View RAW+JPEG pairs and burst sequences

For detailed usage, see [USER_GUIDE.md](USER_GUIDE.md)

---

## Best Practices

1. **Always keep project in WSL filesystem** (`~/photo-sync`)
2. **Don't edit files in `/mnt/c` from WSL** (performance issues)
3. **Use VS Code Remote-WSL** for development
4. **Configure `.wslconfig`** for optimal resources
5. **Keep WSL updated**: `wsl --update`
6. **Backup regularly** using WSL export
7. **Use Windows Terminal** for best experience
8. **Shutdown WSL when not in use**: `wsl --shutdown` (frees RAM)

---

## Getting Help

- **GitHub Issues**: https://github.com/asksurya/photo-sync/issues
- **WSL Documentation**: https://learn.microsoft.com/en-us/windows/wsl/
- **Docker WSL 2 Docs**: https://docs.docker.com/desktop/wsl/
- **Logs**: `docker-compose logs -f <service-name>`

---

## WSL vs Native Windows

| Feature | WSL 2 | Native Windows |
|---------|-------|----------------|
| File I/O Performance | ⚡ 10-100x faster | 🐌 Slower |
| Docker Compatibility | ✅ Excellent | ⚠️ Good |
| Resource Usage | ✅ Lower | ⚠️ Higher |
| Linux Tools | ✅ Native | ❌ Limited |
| Windows Integration | ✅ Seamless | ✅ Native |
| Setup Complexity | ⚠️ Moderate | ✅ Simple |

**Recommendation:** Use WSL 2 for best performance and compatibility.

---

**Happy photo organizing! 📸**
