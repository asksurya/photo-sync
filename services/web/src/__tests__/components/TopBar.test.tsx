import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('closes menu when clicking outside', async () => {
    const { container } = render(<TopBar onLogout={() => {}} />);

    const userButton = screen.getByRole('button', { name: /Photo Sync Admin/i });
    fireEvent.click(userButton);

    expect(screen.getByText('Sign Out')).toBeInTheDocument();

    fireEvent.mouseDown(container);

    await waitFor(() => {
      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    });
  });

  it('closes menu when pressing Escape', async () => {
    render(<TopBar onLogout={() => {}} />);

    const userButton = screen.getByRole('button', { name: /Photo Sync Admin/i });
    fireEvent.click(userButton);

    expect(screen.getByText('Sign Out')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    });
  });
});
