import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '../../components/TopBar';

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
