# Photo-Sync Quick Start Guide - macOS

Get photo-sync running on macOS in under 10 minutes.

## Prerequisites

### Required Software

1. **Docker Desktop for Mac**
   - Download: https://www.docker.com/products/docker-desktop/
   - Requires macOS 11 or later
   - Apple Silicon (M1/M2/M3) or Intel
   - Minimum: 8GB RAM allocated to Docker

2. **Homebrew** (package manager)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. **Git**
   ```bash
   brew install git
   ```

4. **Node.js 20+** (for local development)
   ```bash
   brew install node@20
   node --version  # Verify installation
   ```

5. **Python 3.11+** (for local development)
   ```bash
   brew install python@3.11
   python3 --version  # Verify installation
   ```

---

## Installation

### 1. Clone Repository

```bash
# Create projects directory
mkdir -p ~/projects
cd ~/projects

# Clone repository
git clone https://github.com/asksurya/photo-sync.git
cd photo-sync
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your preferred editor
nano .env
# or
vim .env
# or
open -e .env  # Opens in TextEdit
```

**Minimum required settings in `.env`:**

```env
# Immich Configuration
IMMICH_UPLOAD_LOCATION=/Users/yourusername/photo-sync-data/upload
IMMICH_DB_PASSWORD=your_secure_password_here

# Analysis Service
IMMICH_API_KEY=your_immich_api_key_here
```

### 3. Start Services

```bash
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
   ```bash
   echo "IMMICH_API_KEY=paste_your_api_key_here" >> .env
   ```
7. Restart analysis service:
   ```bash
   docker-compose restart analysis
   ```

---

## Common macOS Issues

### Issue: Docker Desktop Not Starting

**Solution:**
```bash
# Check if Docker daemon is running
docker info

# Restart Docker Desktop
killall Docker && open -a Docker

# Check Docker Desktop logs
tail -f ~/Library/Containers/com.docker.docker/Data/log/host/*.log
```

### Issue: Port Already in Use

**Solution:**
```bash
# Find what's using port 8080
lsof -i :8080

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
```

### Issue: Permission Denied on Volumes

**Solution:**
```bash
# Fix permissions
sudo chown -R $USER:staff ~/projects/photo-sync

# Or for upload directory
sudo chown -R $USER:staff ~/photo-sync-data
```

### Issue: Apple Silicon (M1/M2/M3) Compatibility

**Solution:**
- Docker Desktop for Mac automatically handles ARM64/AMD64 translation
- If you see platform warnings, add to docker-compose.yml:
  ```yaml
  platform: linux/amd64  # or linux/arm64
  ```
- Some images may run slower under emulation

### Issue: Database Connection Failed

**Solution:**
```bash
# Check if PostgreSQL container is healthy
docker-compose ps

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

---

## Development Setup (macOS)

### Python Services (Analysis, Grouping, Deduplication)

```bash
cd services/analysis

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest -v --cov=src
```

### Node.js Services (Gateway, Web)

```bash
cd services/gateway

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

```bash
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

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d custom_db

# Backup database
docker-compose exec postgres pg_dump -U postgres custom_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres custom_db < backup.sql
```

### Testing

```bash
# Run all tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Test specific service
cd services/analysis
pytest -v

# Test with coverage
pytest --cov=src --cov-report=html
open htmlcov/index.html  # Opens coverage report in browser
```

---

## macOS-Specific Optimizations

### 1. Increase Docker Resources

Docker Desktop → Settings → Resources:
- **Memory**: 8GB minimum, 16GB recommended
- **CPUs**: 4 minimum, 8 recommended
- **Disk**: 50GB minimum

### 2. Use VirtioFS (Faster File Sharing)

Docker Desktop → Settings → General:
- ✅ Enable "VirtioFS accelerated directory sharing"
- ✅ Enable "Use containerd for pulling and storing images"

### 3. File System Performance

```bash
# Use :delegated mount for better performance
# In docker-compose.yml:
volumes:
  - ./services/analysis:/app:delegated
```

### 4. Disable Spotlight Indexing

```bash
# Prevent Spotlight from indexing Docker containers
sudo mdutil -i off ~/Library/Containers/com.docker.docker
```

---

## Performance Tips

1. **Keep Docker Desktop updated** (check for updates weekly)
2. **Use .dockerignore** to exclude unnecessary files
3. **Prune unused Docker resources** regularly:
   ```bash
   docker system prune -a --volumes
   ```
4. **Monitor resource usage**:
   ```bash
   docker stats
   ```
5. **Use Apple Silicon native images** when available (M1/M2/M3)

---

## Keyboard Shortcuts

Useful macOS shortcuts for development:

- **⌘ + K**: Clear terminal
- **⌘ + T**: New terminal tab
- **⌘ + W**: Close terminal tab
- **⌘ + ,**: Open preferences (in most apps)
- **⌘ + Q**: Quit application
- **Ctrl + C**: Stop running process
- **Ctrl + D**: Exit shell/container

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

```bash
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

```bash
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

## Homebrew Useful Commands

```bash
# Update Homebrew
brew update

# Upgrade all packages
brew upgrade

# Search for package
brew search <package>

# Install package
brew install <package>

# Uninstall package
brew uninstall <package>

# List installed packages
brew list

# Show package info
brew info <package>
```

---

## Environment Variables

macOS-specific environment setup:

```bash
# Add to ~/.zshrc (or ~/.bash_profile for bash)
export PATH="/opt/homebrew/bin:$PATH"  # For Apple Silicon
export PATH="/usr/local/bin:$PATH"     # For Intel

# Python
export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"

# Node.js
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Reload shell configuration
source ~/.zshrc
```

---

## Getting Help

- **GitHub Issues**: https://github.com/asksurya/photo-sync/issues
- **Documentation**: See `docs/` directory
- **Logs**: `docker-compose logs -f <service-name>`

---

## macOS-Specific Notes

### Using .zshrc vs .bash_profile

macOS Catalina+ uses **zsh** by default:
- Configuration file: `~/.zshrc`
- Check shell: `echo $SHELL`

Older macOS uses **bash**:
- Configuration file: `~/.bash_profile`

### Gatekeeper Issues

If you get "cannot be opened because the developer cannot be verified":

```bash
# For a specific file
xattr -d com.apple.quarantine /path/to/file

# Or temporarily disable Gatekeeper (not recommended)
sudo spctl --master-disable
```

### Firewall Configuration

Allow incoming connections:
1. System Preferences → Security & Privacy → Firewall
2. Click "Firewall Options"
3. Add Docker Desktop to allowed apps
4. Allow incoming connections on ports 8080, 2283, 3000

---

**Happy photo organizing! 📸**
