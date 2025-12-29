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
