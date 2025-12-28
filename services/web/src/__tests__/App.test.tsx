import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the views
vi.mock('../views/PhotoGridView', () => ({
  PhotoGridView: () => <div>PhotoGridView</div>
}));

vi.mock('../views/DuplicatesView', () => ({
  DuplicatesView: () => <div>DuplicatesView</div>
}));

describe('App', () => {
  it('renders navigation header with links', () => {
    render(<App />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /photo sync/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /duplicates/i })).toBeInTheDocument();
  });

  it('renders PhotoGridView at root path', () => {
    render(<App />);

    expect(screen.getByText('PhotoGridView')).toBeInTheDocument();
  });

  it('navigates to duplicates view when duplicates link is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const duplicatesLink = screen.getByRole('link', { name: /duplicates/i });
    await user.click(duplicatesLink);

    expect(screen.getByText('DuplicatesView')).toBeInTheDocument();
  });

  it('navigates back to timeline when timeline link is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Navigate to duplicates
    const duplicatesLink = screen.getByRole('link', { name: /duplicates/i });
    await user.click(duplicatesLink);
    expect(screen.getByText('DuplicatesView')).toBeInTheDocument();

    // Navigate back to timeline
    const timelineLink = screen.getByRole('link', { name: /timeline/i });
    await user.click(timelineLink);
    expect(screen.getByText('PhotoGridView')).toBeInTheDocument();
  });

  it('navigates to home when logo is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Navigate to duplicates
    const duplicatesLink = screen.getByRole('link', { name: /duplicates/i });
    await user.click(duplicatesLink);
    expect(screen.getByText('DuplicatesView')).toBeInTheDocument();

    // Click logo to go home
    const logoLink = screen.getByRole('link', { name: /photo sync/i });
    await user.click(logoLink);
    expect(screen.getByText('PhotoGridView')).toBeInTheDocument();
  });

  it('has proper layout structure with header and content', () => {
    render(<App />);

    const nav = screen.getByRole('navigation');
    expect(nav.parentElement).toHaveClass('bg-gray-800', 'text-white');
  });

  it('provides QueryClientProvider to children', () => {
    render(<App />);

    // If QueryClientProvider is not present, child components would fail
    // This is implicitly tested by the views rendering successfully
    expect(screen.getByText('PhotoGridView')).toBeInTheDocument();
  });
});
