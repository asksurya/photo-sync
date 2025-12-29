// services/web/src/__tests__/components/PhotoTimeline.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoTimeline } from '../../components/PhotoTimeline';

describe('PhotoTimeline', () => {
  it('should render empty state when no assets', () => {
    render(<PhotoTimeline assets={[]} />);
    expect(screen.getByText(/no photos/i)).toBeInTheDocument();
  });

  it('should group assets by date', () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const assets = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', fileCreatedAt: today },
      { id: '2', path: '/photo2.jpg', type: 'IMAGE', fileCreatedAt: today },
      { id: '3', path: '/photo3.jpg', type: 'IMAGE', fileCreatedAt: yesterday }
    ];

    render(<PhotoTimeline assets={assets} />);

    // Should display formatted dates instead of "Today" and "Yesterday"
    const todayFormatted = new Date(today).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const yesterdayFormatted = new Date(yesterday).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    expect(screen.getByText(todayFormatted)).toBeInTheDocument();
    expect(screen.getByText(yesterdayFormatted)).toBeInTheDocument();
  });

  it('should format date headers correctly', () => {
    const specificDate = new Date('2024-01-15T10:00:00Z').toISOString();

    const assets = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', fileCreatedAt: specificDate }
    ];

    render(<PhotoTimeline assets={assets} />);

    expect(screen.getByText(/January 15, 2024/i)).toBeInTheDocument();
  });

  it('should render PhotoCard for each asset', () => {
    const assets = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() },
      { id: '2', path: '/photo2.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() }
    ];

    const { container } = render(<PhotoTimeline assets={assets} />);

    const images = container.querySelectorAll('img');
    expect(images.length).toBe(2);
  });

  it('should handle assets without fileCreatedAt dates', () => {
    const assets = [
      { id: '1', path: '/photo1.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() },
      { id: '2', path: '/photo2.jpg', type: 'IMAGE' }, // No fileCreatedAt
      { id: '3', path: '/photo3.jpg', type: 'IMAGE', fileCreatedAt: new Date().toISOString() }
    ];

    const { container } = render(<PhotoTimeline assets={assets} />);

    // Should only render the 2 assets with fileCreatedAt
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(2);
  });
});
