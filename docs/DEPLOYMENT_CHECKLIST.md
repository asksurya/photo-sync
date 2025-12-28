# Deployment Checklist

Use this checklist when deploying to a new server or performing major updates.

## Pre-Deployment

- [ ] Server meets minimum requirements (16GB RAM, 4 CPU cores, 100GB disk)
- [ ] Docker and Docker Compose installed
- [ ] Domain DNS configured and propagating
- [ ] Firewall allows ports 80 and 443
- [ ] SSH access configured
- [ ] Backup storage configured
- [ ] NAS/media storage mounted

## Initial Deployment

- [ ] Repository cloned to server
- [ ] `.env.prod` created from template
- [ ] All passwords in `.env.prod` are strong and unique
- [ ] `DOMAIN` configured correctly
- [ ] `ACME_EMAIL` configured for Let's Encrypt
- [ ] `MEDIA_PATH` points to correct location
- [ ] `.env.prod` has 600 permissions
- [ ] Production Caddyfile linked (`ln -sf Caddyfile.prod config/Caddyfile`)
- [ ] Test data directory created if needed
- [ ] Database initialization script verified

## Build and Start

- [ ] `./scripts/deploy.sh --prod build` completes successfully
- [ ] No errors in build output
- [ ] `./scripts/deploy.sh --prod up` starts all services
- [ ] All containers show "healthy" status
- [ ] `docker-compose ps` shows all services running

## Verification

- [ ] Health endpoint responds: `curl https://DOMAIN/health`
- [ ] Web UI loads: `curl https://DOMAIN/`
- [ ] SSL certificate valid (check in browser)
- [ ] API gateway accessible
- [ ] Immich login works
- [ ] Can upload test photo
- [ ] Grouping service processes photos
- [ ] Deduplication service detects duplicates
- [ ] No errors in logs: `./scripts/deploy.sh --prod logs`

## Post-Deployment

- [ ] Backup script tested: `./scripts/backup.sh`
- [ ] Backup location verified and accessible
- [ ] Cron job configured for daily backups
- [ ] Monitoring/alerting configured (optional)
- [ ] Documentation updated with server details
- [ ] Team notified of deployment
- [ ] Admin credentials securely stored

## Ongoing Maintenance

- [ ] Weekly log review scheduled
- [ ] Monthly update check scheduled
- [ ] Quarterly restore test scheduled
- [ ] Backup retention policy defined
- [ ] Incident response plan documented

## Rollback Plan

If deployment fails:

1. Stop services: `./scripts/deploy.sh --prod down`
2. Restore from backup (see docs/RESTORE.md)
3. Review logs for errors
4. Fix issues in staging first
5. Re-deploy with fixes

## Contacts

- Server admin: _____________
- Domain registrar: _____________
- SSL certificate issues: support@letsencrypt.org
- Docker support: https://docs.docker.com/
