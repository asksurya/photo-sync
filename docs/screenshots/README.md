# Photo Sync Screenshots

This directory contains screenshots for documentation and user guides showing the Immich UI redesign.

## Quick Reference

**Detailed documentation**: See [SCREENSHOTS.md](SCREENSHOTS.md) for complete screenshot catalog

### Captured (December 28, 2025)

✅ **01-login.png** - Login page with Immich dark theme (ss_3656dkayg)
✅ **Immich reference screenshots** - For design comparison (ss_06528dr52, ss_07947gr9d, ss_8304est2i)

### Captured (December 29, 2025)

✅ **02-timeline-empty.png** - Initial/empty application state (1622x757)
✅ **03-timeline-with-photos.png** - Timeline with photo grid (1622x757)
✅ **04-duplicates-empty.png** - Duplicates empty state (1622x757)
✅ **06-sidebar-navigation.png** - Sidebar navigation closeup (300x700)
✅ **08-help-expanded.png** - Login with help section expanded (1622x757)

### Still Needed

⏳ **05-duplicates-with-groups.png** - Duplicates with sample data (requires mock duplicate data)
⏳ **07-user-menu.png** - User menu dropdown

## How to Capture

### Using Mock Data (for screenshots without real Immich backend)

1. Enable mock data in `services/web/src/hooks/useAssets.ts`:
   ```typescript
   const USE_MOCK_DATA = true;
   ```
2. Start dev server: `cd services/web && npm run dev`
3. Open http://localhost:5173
4. Navigate and capture screenshots (PNG, ~1622x757px)
5. Disable mock data when done: `const USE_MOCK_DATA = false;`

### Using Real Immich Backend

1. Ensure Immich is running with test photos
2. Get API token from Immich (User Settings → API Keys)
3. Start dev server: `cd services/web && npm run dev`
4. Open http://localhost:5173, login with API token
5. Navigate and capture screenshots

## Specifications

- **Format**: PNG (lossless quality)
- **Dimensions**: Full viewport (~1622x757)
- **Theme**: Pure black Immich dark theme
- **Quality**: High resolution, crisp text
