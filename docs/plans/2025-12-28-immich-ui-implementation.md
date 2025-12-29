# Immich UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Photo Sync's UI to match Immich's visual design with pure black dark theme, left sidebar navigation, and modern component styling.

**Architecture:** React + Tailwind CSS with new component structure featuring left sidebar navigation and top action bar. Pure black theme with Material Design Icons. Maintain all existing functionality while updating visual presentation.

**Tech Stack:** React 18, Tailwind CSS 4, react-icons (Material Design), React Router DOM 6, TanStack Query

---

## Task 1: Install Dependencies

**Files:**
- Modify: `services/web/package.json`

**Step 1: Install react-icons package**

Run: `npm install react-icons`

Expected: Package added to dependencies

**Step 2: Verify installation**

Run: `npm list react-icons`

Expected: Shows react-icons version installed

**Step 3: Commit dependency update**

```bash
git add package.json package-lock.json
git commit -m "feat: add react-icons for Material Design Icons

Install react-icons to support Immich-style Material Design Icons
throughout the UI redesign."
```

---

## Task 2: Configure Tailwind Theme

**Files:**
- Modify: `services/web/tailwind.config.js`

**Step 1: Update Tailwind config with Immich color palette**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Immich-inspired dark theme
        immich: {
          'bg': '#000000',           // Pure black background
          'sidebar': '#0f0f0f',      // Sidebar background
          'card': '#1a1a1a',         // Card backgrounds
          'hover': '#2a2a2a',        // Hover states
          'input': '#374151',        // Input backgrounds
          'border': '#262626',       // Borders
          'text': '#ffffff',         // Primary text
          'text-secondary': '#d1d5db', // Secondary text
          'text-muted': '#9ca3af',   // Muted text
          'accent': '#3b82f6',       // Blue accent
          'success': '#10b981',      // Green success
          'warning': '#eab308',      // Yellow warning
          'error': '#ef4444',        // Red error
        },
      },
    },
  },
  plugins: [],
}
```

**Step 2: Commit Tailwind config**

```bash
git add tailwind.config.js
git commit -m "feat: configure Tailwind with Immich color palette

Add custom Immich color palette to Tailwind config:
- Pure black backgrounds
- Gray scale for UI elements
- Blue accent colors
- Semantic colors for states"
```

---

## Task 3: Create Sidebar Component

**Files:**
- Create: `services/web/src/components/Sidebar.tsx`
- Create: `services/web/src/__tests__/components/Sidebar.test.tsx`

**Step 1: Write failing test for Sidebar**

```typescript
// services/web/src/__tests__/components/Sidebar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders Photos navigation link', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByText('Photos')).toBeInTheDocument();
  });

  it('renders Duplicates navigation link', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByText('Duplicates')).toBeInTheDocument();
  });

  it('renders Photo Sync branding', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByText('Photo Sync')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- Sidebar.test.tsx`

Expected: FAIL - "Cannot find module '../Sidebar'"

**Step 3: Create Sidebar component**

```typescript
// services/web/src/components/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdPhoto, MdContentCopy } from 'react-icons/md';

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Photos', icon: MdPhoto },
    { path: '/duplicates', label: 'Duplicates', icon: MdContentCopy },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-immich-sidebar border-r border-immich-border flex flex-col">
      {/* Logo/Branding */}
      <div className="p-4 border-b border-immich-border">
        <Link to="/" className="flex items-center gap-3 text-immich-text">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-full" />
          <span className="text-lg font-semibold">Photo Sync</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-lg
                transition-colors duration-150
                ${isActive
                  ? 'bg-immich-hover text-immich-text'
                  : 'text-immich-text-secondary hover:bg-immich-card'
                }
              `}
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- Sidebar.test.tsx`

Expected: PASS - All 3 tests passing

**Step 5: Commit Sidebar component**

```bash
git add src/components/Sidebar.tsx src/__tests__/components/Sidebar.test.tsx
git commit -m "feat: add Sidebar navigation component

Create left sidebar with:
- Photo Sync branding with gradient icon
- Navigation links (Photos, Duplicates)
- Active state styling
- Material Design Icons"
```

---

## Task 4: Create TopBar Component

**Files:**
- Create: `services/web/src/components/TopBar.tsx`
- Create: `services/web/src/__tests__/components/TopBar.test.tsx`

**Step 1: Write failing test for TopBar**

```typescript
// services/web/src/__tests__/components/TopBar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '../TopBar';

describe('TopBar', () => {
  it('renders search input', () => {
    render(<TopBar onLogout={() => {}} />);
    expect(screen.getByPlaceholderText('Search your photos')).toBeInTheDocument();
  });

  it('renders user avatar with initials', () => {
    render(<TopBar onLogout={() => {}} />);
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('calls onLogout when sign out button clicked', () => {
    const mockLogout = vi.fn();
    render(<TopBar onLogout={mockLogout} />);

    const userButton = screen.getByRole('button', { name: /Photo Sync Admin/i });
    fireEvent.click(userButton);

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    expect(mockLogout).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- TopBar.test.tsx`

Expected: FAIL - "Cannot find module '../TopBar'"

**Step 3: Create TopBar component**

```typescript
// services/web/src/components/TopBar.tsx
import React, { useState } from 'react';
import { MdSearch, MdLogout } from 'react-icons/md';

interface TopBarProps {
  onLogout: () => void;
}

export function TopBar({ onLogout }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 bg-immich-bg border-b border-immich-border flex items-center justify-between px-8">
      {/* Search */}
      <div className="relative max-w-[600px] flex-1">
        <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-immich-text-muted" size={20} />
        <input
          type="search"
          placeholder="Search your photos"
          className="w-full bg-immich-card text-immich-text pl-12 pr-4 py-2.5 rounded-lg
                     border border-immich-border focus:border-immich-accent
                     focus:outline-none focus:ring-2 focus:ring-immich-accent/30
                     transition-colors"
        />
      </div>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 text-immich-text hover:bg-immich-card
                     rounded-full transition-colors"
          aria-label="Photo Sync Admin (admin@localhost)"
        >
          <div className="w-10 h-10 bg-immich-accent rounded-full flex items-center justify-center
                          text-white font-semibold text-sm">
            P
          </div>
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-immich-card border border-immich-border
                          rounded-lg shadow-lg overflow-hidden z-50">
            <div className="p-3 border-b border-immich-border">
              <p className="text-sm font-medium text-immich-text">Photo Sync Admin</p>
              <p className="text-xs text-immich-text-muted">admin@localhost</p>
            </div>
            <button
              onClick={() => {
                setShowUserMenu(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-immich-text-secondary
                         hover:bg-immich-hover transition-colors"
            >
              <MdLogout size={16} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- TopBar.test.tsx`

Expected: PASS - All 3 tests passing

**Step 5: Commit TopBar component**

```bash
git add src/components/TopBar.tsx src/__tests__/components/TopBar.test.tsx
git commit -m "feat: add TopBar component with search and user menu

Create top action bar with:
- Search input with icon
- User avatar with dropdown menu
- Sign out functionality
- Immich-style dark theme"
```

---

## Task 5: Update App Layout

**Files:**
- Modify: `services/web/src/App.tsx`
- Modify: `services/web/src/__tests__/App.test.tsx`

**Step 1: Update App test for new layout**

```typescript
// services/web/src/__tests__/App.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with Immich-style layout', async () => {
    render(<App />);

    // Should render sidebar
    await waitFor(() => {
      expect(screen.getByText('Photo Sync')).toBeInTheDocument();
    });

    // Should render navigation
    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByText('Duplicates')).toBeInTheDocument();
  });

  it('renders search in top bar', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search your photos')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- App.test.tsx`

Expected: FAIL - Layout elements not found

**Step 3: Update App.tsx with new layout**

```typescript
// services/web/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PhotoGridView } from './views/PhotoGridView';
import { DuplicatesView } from './views/DuplicatesView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { isAuthenticated, logout } = useAuth();

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen bg-immich-bg flex">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content area */}
          <div className="flex-1 ml-[220px] flex flex-col">
            {/* Top bar */}
            <TopBar onLogout={logout} />

            {/* Page content */}
            <main className="flex-1 p-8">
              <Routes>
                <Route path="/" element={<PhotoGridView />} />
                <Route path="/duplicates" element={<DuplicatesView />} />
              </Routes>
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
```

**Step 4: Run test to verify it passes**

Run: `npm test -- App.test.tsx`

Expected: PASS - All tests passing

**Step 5: Commit App layout update**

```bash
git add src/App.tsx src/__tests__/App.test.tsx
git commit -m "feat: restructure App with Immich-style layout

Replace horizontal nav with:
- Fixed left sidebar navigation
- Top bar with search and user menu
- Main content area (right of sidebar)
- Pure black background theme"
```

---

## Task 6: Update Login Page

**Files:**
- Modify: `services/web/src/components/Login.tsx`
- Modify: `services/web/src/__tests__/components/Login.test.tsx` (if exists, otherwise create)

**Step 1: Update Login component with Immich styling**

```typescript
// services/web/src/components/Login.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (!token.trim()) {
        setError('Please enter an API token');
        return;
      }
      login(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-immich-bg via-gray-900 to-immich-sidebar
                    flex items-center justify-center p-4">
      <div className="bg-immich-card rounded-lg shadow-2xl p-8 max-w-md w-full
                      border border-immich-border">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500
                          rounded-full" />
          <h1 className="text-3xl font-bold text-immich-text mb-2">Photo Sync</h1>
          <p className="text-immich-text-muted">Photo Management System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-immich-text-secondary mb-2">
              Immich API Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Immich API token"
              className="w-full px-4 py-3 bg-immich-input text-immich-text
                         border border-immich-border rounded-lg
                         focus:ring-2 focus:ring-immich-accent/30 focus:border-immich-accent
                         outline-none transition"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-immich-error">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-immich-accent text-white py-3 px-4 rounded-lg
                       hover:brightness-110 focus:ring-4 focus:ring-immich-accent/30
                       transition font-medium"
          >
            Sign In
          </button>
        </form>

        {/* Instructions */}
        <div className="mt-6">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-sm text-immich-accent hover:text-blue-400 font-medium
                       flex items-center gap-1 mx-auto"
          >
            {showInstructions ? '▼' : '▶'} How to get an API token
          </button>

          {showInstructions && (
            <div className="mt-4 p-4 bg-immich-sidebar rounded-lg text-sm text-immich-text-secondary
                            space-y-2 border border-immich-border">
              <p className="font-medium text-immich-text">To generate an Immich API token:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Open your Immich instance</li>
                <li>Go to <strong>Settings</strong> (gear icon)</li>
                <li>Navigate to <strong>Account Settings</strong></li>
                <li>Scroll to <strong>API Keys</strong> section</li>
                <li>Click <strong>New API Key</strong></li>
                <li>Give it a name (e.g., "Photo Sync")</li>
                <li>Copy the generated token</li>
                <li>Paste it above and sign in</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-immich-border text-center">
          <p className="text-xs text-immich-text-muted">
            Photo Sync requires a valid Immich API token to access your photos.
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit Login redesign**

```bash
git add src/components/Login.tsx
git commit -m "feat: redesign Login page with Immich styling

Update login page with:
- Gradient background (dark with color tints)
- Centered card design with border
- Gradient logo icon
- Dark input fields with blue focus ring
- Immich-style typography and spacing"
```

---

## Task 7: Update PhotoCard Component

**Files:**
- Modify: `services/web/src/components/PhotoCard.tsx`
- Modify: `services/web/src/__tests__/components/PhotoCard.test.tsx`

**Step 1: Update PhotoCard test**

```typescript
// services/web/src/__tests__/components/PhotoCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoCard } from '../PhotoCard';
import { EnrichedAsset } from '../../lib/apiClient';

describe('PhotoCard', () => {
  const mockAsset: EnrichedAsset = {
    id: '123',
    path: '/photos/test.jpg',
    checksum: 'abc123',
    fileCreatedAt: '2024-01-01',
    fileModifiedAt: '2024-01-01',
    type: 'IMAGE',
  };

  it('renders photo with proper styling', () => {
    const { container } = render(<PhotoCard asset={mockAsset} />);
    const card = container.firstChild as HTMLElement;

    expect(card).toHaveClass('aspect-square');
    expect(card).toHaveClass('rounded-lg');
  });

  it('displays group badge when asset has groupId', () => {
    const assetWithGroup = {
      ...mockAsset,
      groupId: 'group-1',
      alternateVersions: [{ id: '456' }],
    };

    render(<PhotoCard asset={assetWithGroup} />);
    expect(screen.getByText(/2 versions/)).toBeInTheDocument();
  });

  it('displays duplicate badge when asset has duplicateGroupId', () => {
    const assetWithDuplicate = {
      ...mockAsset,
      duplicateGroupId: 'dup-1',
    };

    render(<PhotoCard asset={assetWithDuplicate} />);
    expect(screen.getByText(/Similar/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify current state**

Run: `npm test -- PhotoCard.test.tsx`

Expected: Tests should pass but we'll update styling

**Step 3: Update PhotoCard with Immich styling**

```typescript
// services/web/src/components/PhotoCard.tsx
import { EnrichedAsset } from '../lib/apiClient';

export interface PhotoCardProps {
  asset: EnrichedAsset;
}

export function PhotoCard({ asset }: PhotoCardProps) {
  const hasGroup = !!asset.groupId;
  const hasDuplicate = !!asset.duplicateGroupId;
  const versionCount = hasGroup ? (asset.alternateVersions?.length || 0) + 1 : 1;

  return (
    <div className="relative rounded-lg overflow-hidden bg-immich-card aspect-square
                    group hover:scale-102 transition-transform duration-150 cursor-pointer">
      <img
        src={`/api/immich/assets/${asset.id}/thumbnail`}
        alt={asset.path}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Group/Versions Badge */}
      {hasGroup && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm
                        text-white text-xs rounded flex items-center gap-1">
          <span>📁</span>
          <span>{versionCount} versions</span>
        </div>
      )}

      {/* Duplicate Badge */}
      {hasDuplicate && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-immich-warning/90 backdrop-blur-sm
                        text-white text-xs rounded flex items-center gap-1">
          <span>⚠️</span>
          <span>Similar</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                      transition-colors duration-150" />
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- PhotoCard.test.tsx`

Expected: PASS - All tests passing

**Step 5: Commit PhotoCard update**

```bash
git add src/components/PhotoCard.tsx src/__tests__/components/PhotoCard.test.tsx
git commit -m "feat: update PhotoCard with Immich styling

Enhance photo cards with:
- Darker backgrounds (immich-card)
- Hover scale animation
- Backdrop blur on badges
- Smooth transitions
- Hover overlay effect"
```

---

## Task 8: Update PhotoGridView

**Files:**
- Modify: `services/web/src/views/PhotoGridView.tsx`

**Step 1: Update PhotoGridView with Immich styling**

```typescript
// services/web/src/views/PhotoGridView.tsx
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useAssets } from '../hooks/useAssets';
import { PhotoTimeline } from '../components/PhotoTimeline';
import { EnrichedAsset } from '../lib/apiClient';

export function PhotoGridView() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useAssets();

  const { ref, inView } = useInView({
    threshold: 0,
  });

  // Fetch next page when sentinel comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-immich-text-muted">Loading photos...</div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-immich-error">
          Error loading photos: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  // Flatten all pages into single array
  const allAssets: EnrichedAsset[] = data?.pages.flat() || [];

  // Empty state
  if (allAssets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-24 h-24 text-immich-text-muted mb-4">
          {/* Empty state icon */}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </div>
        <p className="text-immich-text-muted text-sm">No photos to display</p>
        <p className="text-immich-text-muted text-xs mt-2">Upload photos to your Immich library to get started</p>
      </div>
    );
  }

  return (
    <div>
      <PhotoTimeline assets={allAssets} />

      {/* Infinite scroll sentinel */}
      {hasNextPage && (
        <div ref={ref} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <div className="text-immich-text-muted">Loading more photos...</div>
          ) : (
            <div className="text-immich-text-muted text-sm">Scroll for more</div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit PhotoGridView update**

```bash
git add src/views/PhotoGridView.tsx
git commit -m "feat: update PhotoGridView with Immich styling

Update view with:
- Immich color classes
- Enhanced empty state with icon
- Better loading/error states
- Improved typography"
```

---

## Task 9: Update PhotoTimeline Component

**Files:**
- Modify: `services/web/src/components/PhotoTimeline.tsx`

**Step 1: Update PhotoTimeline with Immich styling**

```typescript
// services/web/src/components/PhotoTimeline.tsx
import React from 'react';
import { PhotoCard } from './PhotoCard';
import { EnrichedAsset } from '../lib/apiClient';

export interface PhotoTimelineProps {
  assets: EnrichedAsset[];
}

export function PhotoTimeline({ assets }: PhotoTimelineProps) {
  // Group assets by date
  const groupedAssets = React.useMemo(() => {
    const groups: Record<string, EnrichedAsset[]> = {};

    assets.forEach((asset) => {
      const date = new Date(asset.fileCreatedAt);
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(asset);
    });

    return groups;
  }, [assets]);

  return (
    <div className="space-y-8">
      {Object.entries(groupedAssets).map(([date, dateAssets]) => (
        <div key={date}>
          {/* Date Header */}
          <h2 className="text-base font-semibold text-immich-text mb-3 sticky top-0
                         bg-immich-bg/95 backdrop-blur-sm py-2 z-10">
            {date}
          </h2>

          {/* Photo Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {dateAssets.map((asset) => (
              <PhotoCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Commit PhotoTimeline update**

```bash
git add src/components/PhotoTimeline.tsx
git commit -m "feat: update PhotoTimeline with Immich styling

Enhance timeline with:
- Immich color classes for headers
- Sticky date headers with backdrop blur
- Responsive grid (2-5 columns)
- Smaller grid gap (12px)
- Better visual hierarchy"
```

---

## Task 10: Update DuplicatesView

**Files:**
- Modify: `services/web/src/views/DuplicatesView.tsx`

**Step 1: Update DuplicatesView with Immich styling**

```typescript
// services/web/src/views/DuplicatesView.tsx
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { DuplicateGroupCard } from '../components/DuplicateGroupCard';

export function DuplicatesView() {
  const { data: groups, isLoading, isError, error } = useQuery({
    queryKey: ['duplicates'],
    queryFn: () => apiClient.getDuplicateGroups(),
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-immich-text-muted">Loading duplicates...</div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-immich-error">
          Error loading duplicates: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  // Empty state
  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-24 h-24 text-immich-text-muted mb-4">
          {/* Empty state icon */}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </div>
        <p className="text-immich-text-muted text-sm">No duplicate groups found</p>
        <p className="text-immich-text-muted text-xs mt-2">Your library is clean!</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-immich-text mb-6">Duplicates</h1>
      <div className="space-y-6">
        {groups.map((group) => (
          <DuplicateGroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit DuplicatesView update**

```bash
git add src/views/DuplicatesView.tsx
git commit -m "feat: update DuplicatesView with Immich styling

Update duplicates view with:
- Immich color classes
- Page title styling
- Enhanced empty state with icon
- Better loading/error states
- Improved spacing"
```

---

## Task 11: Update DuplicateGroupCard Component

**Files:**
- Modify: `services/web/src/components/DuplicateGroupCard.tsx`

**Step 1: Update DuplicateGroupCard styling**

```typescript
// services/web/src/components/DuplicateGroupCard.tsx
import React from 'react';
import { DuplicateGroup } from '../lib/apiClient';

export interface DuplicateGroupCardProps {
  group: DuplicateGroup;
}

export function DuplicateGroupCard({ group }: DuplicateGroupCardProps) {
  const totalSize = group.assets.reduce((sum, asset) => sum + (asset.size || 0), 0);
  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="bg-immich-card border border-immich-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-immich-text">
          {group.assets.length} similar photos
        </h3>
        <span className="text-sm text-immich-text-muted">
          {formatSize(totalSize)} total
        </span>
      </div>

      {/* Similarity Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-immich-text-secondary">Similarity</span>
          <span className="text-immich-text font-medium">
            {(group.similarity * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-immich-hover rounded-full h-2">
          <div
            className="bg-immich-accent h-2 rounded-full transition-all"
            style={{ width: `${group.similarity * 100}%` }}
          />
        </div>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {group.assets.map((asset) => (
          <div
            key={asset.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-immich-hover
                       group hover:scale-102 transition-transform cursor-pointer"
          >
            <img
              src={`/api/immich/assets/${asset.id}/thumbnail`}
              alt={asset.path}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                            transition-colors duration-150" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit DuplicateGroupCard update**

```bash
git add src/components/DuplicateGroupCard.tsx
git commit -m "feat: update DuplicateGroupCard with Immich styling

Enhance duplicate cards with:
- Card backgrounds and borders
- Immich color classes
- Hover effects on thumbnails
- Progress bar for similarity
- Better spacing and layout"
```

---

## Task 12: Add Global Styles

**Files:**
- Modify: `services/web/src/index.css`

**Step 1: Update global styles**

```css
/* services/web/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-immich-border;
  }

  body {
    @apply bg-immich-bg text-immich-text antialiased;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                 Oxygen, Ubuntu, Cantarell, sans-serif;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    @apply w-2;
  }

  ::-webkit-scrollbar-track {
    @apply bg-immich-bg;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-immich-hover rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-immich-card;
  }
}

@layer utilities {
  .hover\:scale-102:hover {
    transform: scale(1.02);
  }
}
```

**Step 2: Commit global styles**

```bash
git add src/index.css
git commit -m "feat: add Immich global styles

Add global styling for:
- Pure black background
- System font stack
- Custom scrollbar styling
- Utility classes for hover effects"
```

---

## Task 13: Run Full Test Suite

**Step 1: Run all tests**

Run: `npm test`

Expected: All tests passing with 100% coverage

**Step 2: Fix any failing tests**

If any tests fail, update them to work with new styling classes.

**Step 3: Build the application**

Run: `npm run build`

Expected: Successful build with no errors

**Step 4: Commit any test fixes**

```bash
git add .
git commit -m "test: update tests for Immich UI redesign

Ensure all tests pass with new component structure and styling."
```

---

## Task 14: Visual Testing & Verification

**Step 1: Start development server**

Run: `npm run dev`

Expected: App starts on http://localhost:5173

**Step 2: Manual visual verification checklist**

- [ ] Login page matches Immich design (gradient background, centered card)
- [ ] Sidebar appears on left with Photo Sync branding
- [ ] Top bar shows search and user menu
- [ ] Photo grid displays with proper spacing and dark theme
- [ ] Date headers are sticky and readable
- [ ] Photo cards have hover effects
- [ ] Empty states look professional
- [ ] Duplicates view matches design
- [ ] All colors match Immich palette
- [ ] Navigation works correctly
- [ ] Logout functionality works

**Step 3: Cross-browser testing**

Test in:
- Chrome
- Firefox
- Safari (if on Mac)

**Step 4: Responsive testing**

Test breakpoints:
- Mobile (< 768px)
- Tablet (768px - 1024px)
- Desktop (> 1024px)

---

## Task 15: Documentation & Cleanup

**Step 1: Update README or docs with new UI info**

Document any new features or changes in user-facing documentation.

**Step 2: Create summary commit**

```bash
git add .
git commit -m "feat: complete Immich UI redesign

Transform Photo Sync UI to match Immich visual standards:

Components:
- New Sidebar navigation with Material Design Icons
- TopBar with search and user menu
- Updated Login page with gradient background
- Enhanced PhotoCard, PhotoTimeline, DuplicatesView

Design System:
- Pure black dark theme
- Immich color palette in Tailwind config
- Material Design Icons via react-icons
- System font stack
- Responsive layout with breakpoints

Layout:
- Fixed left sidebar (220px)
- Top action bar
- Main content area with proper spacing
- Sticky date headers

All existing functionality preserved with 100% test coverage."
```

---

## Success Criteria

✅ All tests passing (92+ tests)
✅ 100% code coverage maintained
✅ Visual match with Immich design
✅ Pure black dark theme implemented
✅ Left sidebar navigation functional
✅ Material Design Icons integrated
✅ Responsive design working
✅ All existing features working
✅ Build succeeds with no errors
✅ Cross-browser compatible

---

## Plan Complete

**Next Steps:**

This plan is ready for execution. Choose your implementation approach:

1. **Subagent-Driven Development** (this session) - Execute tasks with fresh subagents, review between tasks
2. **Parallel Session** (separate session) - Use executing-plans skill in new session for batch execution

**Estimated Time:** 2-3 hours for full implementation and testing
