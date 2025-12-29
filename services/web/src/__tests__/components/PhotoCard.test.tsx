// services/web/src/__tests__/components/PhotoCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoCard } from '../../components/PhotoCard';

describe('PhotoCard', () => {
  it('should render photo thumbnail with Immich styling', () => {
    const asset = {
      id: 'asset-1',
      path: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01'
    };

    const { container } = render(<PhotoCard asset={asset} />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/api/immich/assets/asset-1/thumbnail');
    expect(img).toHaveAttribute('alt', 'img1.jpg');

    // Verify container has Immich dark theme styling
    const cardContainer = container.firstChild as HTMLElement;
    expect(cardContainer).toHaveClass('aspect-square');
    expect(cardContainer).toHaveClass('rounded-[6px]');
    expect(cardContainer).toHaveClass('bg-immich-card');
    expect(cardContainer).toHaveClass('group');
    expect(cardContainer).toHaveClass('cursor-pointer');
  });

  it('should show group badge with versions text', () => {
    const asset = {
      id: 'asset-1',
      path: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01',
      groupId: 'grp-1',
      groupType: 'raw_jpeg',
      alternateVersions: ['/photos/img1.cr2']
    };

    const { container } = render(<PhotoCard asset={asset} />);

    const versionText = screen.getByText(/2 versions/i);
    expect(versionText).toBeInTheDocument();

    // Find the badge container and verify it has the icon
    const badge = versionText.parentElement;
    expect(badge).toBeInTheDocument();
    expect(badge?.querySelector('svg')).toBeInTheDocument();
  });

  it('should show duplicate badge with Similar text', () => {
    const asset = {
      id: 'asset-1',
      path: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01',
      duplicateGroupId: 'dup-1',
      similarityScore: 0.97
    };

    const { container } = render(<PhotoCard asset={asset} />);

    const similarText = screen.getByText(/similar/i);
    expect(similarText).toBeInTheDocument();

    // Find the badge container and verify it has the icon
    const badge = similarText.parentElement;
    expect(badge).toBeInTheDocument();
    expect(badge?.querySelector('svg')).toBeInTheDocument();
  });

  it('should show 1 version when grouped without alternateVersions', () => {
    const asset = {
      id: 'asset-1',
      path: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01',
      groupId: 'grp-1',
      groupType: 'raw_jpeg'
    };

    render(<PhotoCard asset={asset} />);

    expect(screen.getByText(/1 version/i)).toBeInTheDocument();
  });

  it('should have hover effect classes', () => {
    const asset = {
      id: 'asset-1',
      path: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01'
    };

    const { container } = render(<PhotoCard asset={asset} />);

    const cardContainer = container.firstChild as HTMLElement;
    expect(cardContainer).toHaveClass('transition-transform');
    expect(cardContainer).toHaveClass('duration-150');
  });
});
