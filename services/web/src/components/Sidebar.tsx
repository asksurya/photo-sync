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
