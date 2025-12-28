// services/web/src/__tests__/components/PhotoCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoCard } from '../../components/PhotoCard';

describe('PhotoCard', () => {
  it('should render photo thumbnail', () => {
    const asset = {
      id: 'asset-1',
      path: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01'
    };

    render(<PhotoCard asset={asset} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should show group badge when grouped', () => {
    const asset = {
      id: 'asset-1',
      path: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01',
      groupId: 'grp-1',
      groupType: 'raw_jpeg',
      alternateVersions: ['/photos/img1.cr2']
    };

    render(<PhotoCard asset={asset} />);

    expect(screen.getByText(/2 versions/i)).toBeInTheDocument();
  });

  it('should show duplicate badge when duplicate', () => {
    const asset = {
      id: 'asset-1',
      path: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01',
      duplicateGroupId: 'dup-1',
      similarityScore: 0.97
    };

    render(<PhotoCard asset={asset} />);

    expect(screen.getByText(/similar/i)).toBeInTheDocument();
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
});
