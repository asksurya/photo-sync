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
