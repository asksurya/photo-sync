# Screenshot IDs for Functional UI Screenshots

## Captured Screenshots (December 29, 2025 - 1:20-1:30 AM)

### 01. Login Page
- **Screenshot ID**: `ss_6745gf4rt`
- **Target File**: `01-login.png`
- **Description**: Login page with Photo Sync branding, API token input field, and dark theme
- **Dimensions**: 1581x778px
- **Status**: ✅ Captured successfully

### 02. Login with Help Expanded
- **Screenshot ID**: `ss_3976wa2zb`
- **Target File**: `08-help-expanded.png`
- **Description**: Login page with help section expanded showing 5-step instructions for getting API token
- **Dimensions**: 1581x778px
- **Status**: ✅ Captured successfully

### 03. Timeline with Colorful Photos
- **Screenshot ID**: `ss_2307ba6cy` (also captured as `ss_7305ilvel`)
- **Target File**: `03-timeline-with-photos.png`
- **Description**: Timeline view showing colorful mock photos organized by date (December 27, 26, 25, 2025) with proper photo grid layout
- **Dimensions**: 1581x778px
- **Status**: ✅ Captured successfully

### 04. Duplicates Empty State
- **Screenshot ID**: `ss_8157op81v`
- **Target File**: `04-duplicates-empty.png`
- **Description**: Duplicates view showing "No duplicate groups found - Your library is clean!" empty state
- **Dimensions**: 1581x778px
- **Status**: ✅ Captured successfully

### 05. User Menu Dropdown
- **Screenshot ID**: `ss_3585zce00`
- **Target File**: `07-user-menu.png`
- **Description**: User menu dropdown in top right showing "Photo Sync Admin (admin@localhost)" with Sign Out option
- **Dimensions**: 1581x778px
- **Status**: ✅ Captured successfully

### 06. Sidebar Navigation Closeup
- **Screenshot ID**: Zoom capture (no ID)
- **Target File**: `06-sidebar-navigation.png`
- **Description**: Closeup of sidebar showing Photo Sync logo with Photos and Duplicates navigation items
- **Dimensions**: 219x765px (closeup)
- **Status**: ✅ Captured successfully

## Code Changes to Enable Functional Screenshots

### 1. Mock Data Generation (`services/web/src/hooks/useAssets.ts`)
- Added `USE_MOCK_DATA = true` flag for temporary screenshot mode
- Created `getMockAssets()` function that generates 24 placeholder photos with:
  - 8 different vibrant colors (coral, teal, blue, yellow, purple, lavender, pink, peach)
  - Dates across Dec 13-28, 2025
  - SVG data URIs for instant rendering
  - Proper `fileCreatedAt` field for timeline grouping

### 2. PhotoCard Fix (`services/web/src/components/PhotoCard.tsx`)
- Modified to use `asset.path` when available (for mock data)
- Fallback to `/api/immich/assets/${asset.id}/thumbnail` for real photos
- Change: `src={asset.path || \`/api/immich/assets/${asset.id}/thumbnail\`}`

### 3. Auth Context Enhancement (`services/web/src/contexts/AuthContext.tsx`)
- Added localStorage persistence for authentication tokens
- Ensures `immich_token` is properly stored and retrieved

## How to Save Screenshots

The screenshots were captured using the Claude in Chrome MCP extension. To save them as PNG files:

### Method 1: Manual Save from Browser
1. Open Chrome DevTools (Cmd+Option+I)
2. Use the screenshot IDs to identify the correct images
3. Right-click and "Save Image As..." to the target file

### Method 2: MCP Extension Export (if available)
- Check if the Claude in Chrome extension has a built-in export feature for screenshot IDs

### Method 3: Recapture with Direct Save
- Use browser's built-in screenshot feature (Cmd+Shift+5 on macOS)
- Manually capture each view and save to the target files

## Screenshots Still Needed

Based on `docs/screenshots/README.md`:
- ⏳ **05-duplicates-with-groups.png** - Duplicates with sample data (requires mock duplicate data)
- ⏳ **07-user-menu.png** - User menu dropdown
- 🔄 **01-login.png** - Login page (needs replacement with functional version)
- 🔄 **02-timeline-empty.png** - Empty timeline state (optional with mock data)
- 🔄 **06-sidebar-navigation.png** - Sidebar navigation closeup
- 🔄 **08-help-expanded.png** - Login with help section expanded

## Next Steps

1. **Save captured screenshots**: Export ss_2307ba6cy and ss_8157op81v to PNG files
2. **Capture remaining screenshots**: Complete the list above
3. **Remove mock data**: Set `USE_MOCK_DATA = false` in `useAssets.ts`
4. **Revert PhotoCard if needed**: If real Immich photos work differently
5. **Commit final screenshots**: Add all PNG files to git and commit
