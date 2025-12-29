# Photo Sync Visual Redesign: Matching Immich Standards

**Date:** December 28, 2025
**Status:** Approved
**Goal:** Transform Photo Sync's UI to match Immich's visual design and user experience standards

## Executive Summary

Photo Sync will be redesigned to visually match Immich's design system, creating a consistent and professional experience. The redesign covers all aspects: dark theme, navigation structure, photo grid, typography, and interactive components.

**Key Changes:**
- Pure black dark theme (from gray theme)
- Left sidebar navigation (from top horizontal nav)
- Larger photo thumbnails with better spacing
- Material Design Icons integration
- Immich-style login page with gradient background

## Design System

### 1. Color Palette

#### Background Colors
```css
--bg-primary: #000000         /* Main background - pure black */
--bg-sidebar: #0f0f0f         /* Sidebar background */
--bg-card: #1a1a1a            /* Card/panel backgrounds */
--bg-hover: #2a2a2a           /* Hover states */
--bg-input: #374151           /* Input field backgrounds */
```

#### Text Colors
```css
--text-primary: #ffffff       /* Primary text - white */
--text-secondary: #d1d5db     /* Secondary text - light gray */
--text-muted: #9ca3af         /* Muted text - medium gray */
--text-disabled: #6b7280      /* Disabled text - darker gray */
```

#### Accent Colors
```css
--accent-primary: #3b82f6     /* Blue - buttons, active states */
--accent-success: #10b981     /* Green - success states */
--accent-warning: #eab308     /* Yellow - warnings, duplicate badges */
--accent-error: #ef4444       /* Red - errors, danger actions */
```

#### Semantic Colors
```css
--border-default: #374151     /* Default borders */
--border-focus: #3b82f6       /* Focus rings */
--overlay: rgba(0,0,0,0.75)   /* Modal overlays */
```

### 2. Typography

#### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             Oxygen, Ubuntu, Cantarell, sans-serif;
```

#### Type Scale
- **Page Titles:** 28px / font-weight: 700 / color: white
- **Section Headers:** 20px / font-weight: 600 / color: white
- **Body Text:** 14px / font-weight: 400 / color: #d1d5db
- **Small Text:** 12px / font-weight: 400 / color: #9ca3af
- **Button Text:** 14px / font-weight: 500 / color: white

#### Line Heights
- Headings: 1.2
- Body text: 1.5
- Buttons: 1.4

### 3. Spacing System

Based on 4px base unit:
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px

### 4. Border Radius
- **Small:** 4px (badges, small buttons)
- **Medium:** 6px (cards, inputs, buttons)
- **Large:** 8px (modals, large cards)
- **Full:** 9999px (avatars, icon buttons)

### 5. Shadows
Minimal shadows in dark theme:
- **Card:** `0 1px 3px rgba(0,0,0,0.3)`
- **Modal:** `0 10px 25px rgba(0,0,0,0.5)`
- **Hover:** `0 2px 8px rgba(0,0,0,0.4)`

## Layout Structure

### Navigation System

#### Left Sidebar
**Dimensions:**
- Width: 220px (fixed)
- Background: #0f0f0f
- Border right: 1px solid #262626

**Components:**
1. **Logo Area** (top)
   - Immich flower logo icon
   - "Photo Sync" text
   - Padding: 16px

2. **Primary Navigation**
   - Photos (default view)
   - Duplicates
   - Icon size: 20px
   - Active state: lighter background (#2a2a2a), rounded corners (6px)

3. **Library Section** (if needed)
   - Albums
   - Favorites
   - Header: "LIBRARY" in small gray text

4. **Storage Indicator** (bottom)
   - Storage usage bar
   - Text: "X.X GiB of XX.X GiB used"
   - Progress bar: blue fill

**Navigation Item Styling:**
```css
.nav-item {
  padding: 10px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #d1d5db;
  transition: background 150ms;
}

.nav-item:hover {
  background: #262626;
}

.nav-item.active {
  background: #2a2a2a;
  color: #ffffff;
}
```

#### Top Bar
**Dimensions:**
- Height: 64px
- Background: #000000
- Border bottom: 1px solid #1a1a1a (subtle)

**Left Section:**
- Search bar: Rounded input (600px max-width)
- Placeholder: "Search your photos"
- Icon: Magnifying glass (left side)

**Right Section:**
- Upload button (if applicable)
- Theme toggle (optional - already dark)
- Notifications bell icon
- User avatar (circle, blue background, white initials)
- Spacing: 12px gap between items

### Main Content Area

**Layout:**
- Position: Right of sidebar
- Padding: 32px
- Background: #000000
- Max-width: none (full width)

**Content Structure:**
```
┌─────────────────────────────────────┐
│ Page Title (28px, bold)              │
├─────────────────────────────────────┤
│                                      │
│ Photo Grid / Content                 │
│                                      │
│ Date Headers (white, 16px, bold)     │
│ Photos (grid, 250-300px thumbnails)  │
│                                      │
└─────────────────────────────────────┘
```

## Component Designs

### Photo Grid

**Grid Configuration:**
```css
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  width: 100%;
}
```

**Photo Card:**
```css
.photo-card {
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  background: #1a1a1a; /* Loading state */
  transition: transform 150ms;
}

.photo-card:hover {
  transform: scale(1.02);
}

.photo-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

**Badges:**
- Position: Absolute, top corners
- Background: rgba(0,0,0,0.7)
- Padding: 4px 8px
- Border-radius: 4px
- Font-size: 12px
- Backdrop-filter: blur(4px)

**Date Headers:**
```css
.date-header {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin-top: 24px;
  margin-bottom: 12px;
}
```

### Login Page

**Layout:**
- Centered card (max-width: 400px)
- Gradient background: Dark with color tints
  - `background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f1419 100%)`

**Card Styling:**
```css
.login-card {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
```

**Components:**
1. **Logo**: Immich flower icon (centered, 64px)
2. **Title**: "Login" or "Photo Sync" (24px, centered)
3. **Subtitle**: Optional description (14px, gray)
4. **Input Fields**:
   - Background: #374151
   - Border: 1px solid #4b5563 (default), #3b82f6 (focus)
   - Padding: 12px 16px
   - Border-radius: 6px
   - Color: white
   - Placeholder: #9ca3af

5. **Submit Button**:
   - Background: #3b82f6
   - Color: white
   - Width: 100%
   - Padding: 12px
   - Border-radius: 6px
   - Font-weight: 500
   - Hover: brightness(110%)

6. **Help Text**: Link to API token instructions

### Empty States

**Structure:**
```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 32px;
  min-height: 400px;
}

.empty-state-icon {
  width: 96px;
  height: 96px;
  color: #4b5563;
  margin-bottom: 16px;
}

.empty-state-text {
  font-size: 14px;
  color: #9ca3af;
  text-align: center;
  max-width: 400px;
}
```

### Buttons

**Primary Button:**
```css
.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  transition: all 150ms;
}

.btn-primary:hover {
  background: #2563eb;
}
```

**Secondary Button:**
```css
.btn-secondary {
  background: #374151;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
}

.btn-secondary:hover {
  background: #4b5563;
}
```

**Icon Button:**
```css
.btn-icon {
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #d1d5db;
  transition: background 150ms;
}

.btn-icon:hover {
  background: #262626;
}
```

### Modals

**Overlay:**
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
```

**Modal Content:**
```css
.modal-content {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}
```

## Iconography

### Icon Library
**Package:** `react-icons/md` (Material Design Icons)

**Installation:**
```bash
npm install react-icons
```

### Icon Mapping

| Component | Icon | Import |
|-----------|------|--------|
| Photos | `MdPhoto` | `react-icons/md` |
| Duplicates | `MdContentCopy` | `react-icons/md` |
| Search | `MdSearch` | `react-icons/md` |
| Upload | `MdCloudUpload` | `react-icons/md` |
| User | `MdAccountCircle` | `react-icons/md` |
| Settings | `MdSettings` | `react-icons/md` |
| Favorites | `MdFavorite` | `react-icons/md` |
| Albums | `MdPhotoAlbum` | `react-icons/md` |
| Logout | `MdLogout` | `react-icons/md` |
| Close | `MdClose` | `react-icons/md` |

### Icon Sizing
- Navigation: 20px
- Buttons: 18px
- Small icons: 16px
- Large icons (empty states): 64-96px

## Animations & Transitions

### Timing Functions
```css
--ease-out: cubic-bezier(0.33, 1, 0.68, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

### Transitions
- **Fast:** 100ms (hover effects)
- **Medium:** 150ms (color changes, backgrounds)
- **Slow:** 200ms (modals, page transitions)

### Examples
```css
/* Hover transitions */
transition: background 150ms var(--ease-out);

/* Scale animations */
transition: transform 150ms var(--ease-out);

/* Modal animations */
transition: opacity 200ms var(--ease-in-out),
            transform 200ms var(--ease-in-out);
```

## Responsive Design

### Breakpoints
```css
--mobile: 640px
--tablet: 768px
--desktop: 1024px
--wide: 1280px
```

### Layout Adaptations

**Mobile (< 768px):**
- Collapse sidebar to bottom navigation bar
- Reduce padding to 16px
- Smaller thumbnails (150-200px)
- Stack search and actions vertically

**Tablet (768px - 1024px):**
- Sidebar remains visible
- Medium thumbnails (200-250px)
- Adjusted content padding (24px)

**Desktop (> 1024px):**
- Full sidebar (220px)
- Large thumbnails (250-300px)
- Maximum content padding (32-48px)

## Implementation Plan

### Phase 1: Dependencies & Setup
1. Install `react-icons` package
2. Update Tailwind config with custom colors
3. Create design tokens file

### Phase 2: Core Components
1. Create Sidebar component
2. Create TopBar component
3. Update App layout structure

### Phase 3: Photo Grid
1. Update PhotoGridView with new styling
2. Redesign PhotoCard component
3. Add date headers
4. Implement hover animations

### Phase 4: Login & Auth
1. Redesign Login component
2. Add gradient background
3. Update input styling
4. Add Immich-style branding

### Phase 5: Polish
1. Add loading states
2. Add empty states
3. Add transitions and animations
4. Test responsive behavior

### Phase 6: Testing
1. Visual comparison with Immich
2. Test all interactive states
3. Verify accessibility (contrast ratios)
4. Cross-browser testing

## Success Criteria

✅ Photo Sync visually matches Immich's design language
✅ Dark theme uses pure black backgrounds
✅ Left sidebar navigation is functional
✅ Photo grid displays with proper spacing and sizing
✅ All interactive components have proper hover/focus states
✅ Login page matches Immich's aesthetic
✅ Typography and iconography are consistent
✅ Responsive design works on mobile, tablet, desktop
✅ Smooth animations and transitions
✅ User feedback is that it "looks like Immich"

## Technical Considerations

### Performance
- Use CSS transforms for animations (GPU-accelerated)
- Lazy load images in photo grid
- Minimize re-renders with React.memo where appropriate
- Use CSS Grid for layout (better performance than Flexbox for grids)

### Accessibility
- Maintain WCAG AA contrast ratios (4.5:1 for normal text)
- Keyboard navigation support
- Focus indicators visible
- Screen reader friendly labels

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- No IE11 support needed

## Files to Modify

### New Files
- `services/web/src/components/Sidebar.tsx`
- `services/web/src/components/TopBar.tsx`
- `services/web/src/styles/design-tokens.css`

### Modified Files
- `services/web/src/App.tsx` - Layout restructure
- `services/web/src/components/Login.tsx` - Complete redesign
- `services/web/src/components/PhotoCard.tsx` - Styling updates
- `services/web/src/views/PhotoGridView.tsx` - Layout and styling
- `services/web/src/views/DuplicatesView.tsx` - Styling updates
- `services/web/tailwind.config.js` - Custom theme
- `services/web/package.json` - Add react-icons

## Notes

- Immich uses Svelte + Tailwind; we're using React + Tailwind
- Visual parity is the goal, not code parity
- Focus on user-facing design, not internal architecture
- Maintain existing functionality while updating visuals
- Logo: Can use a colored circle icon or simple text branding instead of Immich's flower logo to differentiate

## References

- Immich GitHub: https://github.com/immich-app/immich
- Immich local instance: http://localhost:2283
- Material Design Icons: https://react-icons.github.io/react-icons/icons/md/
- Tailwind CSS: https://tailwindcss.com/docs
