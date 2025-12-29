// services/web/src/__tests__/components/DuplicateGroupCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DuplicateGroupCard } from '../../components/DuplicateGroupCard';
import { EnrichedAsset } from '../../lib/apiClient';

describe('DuplicateGroupCard', () => {
  const mockDuplicates: EnrichedAsset[] = [
    {
      id: 'asset-1',
      path: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01',
      duplicateGroupId: 'dup-1',
      duplicateType: 'perceptual_hash',
      similarityScore: 0.98,
      isPrimaryVersion: true
    },
    {
      id: 'asset-2',
      path: '/photos/img2.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-02',
      duplicateGroupId: 'dup-1',
      duplicateType: 'perceptual_hash',
      similarityScore: 0.98,
      isPrimaryVersion: false
    }
  ];

  it('should render all duplicate assets', () => {
    render(<DuplicateGroupCard duplicates={mockDuplicates} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
  });

  it('should display thumbnails side-by-side in grid', () => {
    const { container } = render(<DuplicateGroupCard duplicates={mockDuplicates} />);

    const grid = container.querySelector('.grid');
    expect(grid).not.toBeNull();
    expect(grid).toHaveClass('grid-cols-2');
  });

  it('should show similarity score', () => {
    render(<DuplicateGroupCard duplicates={mockDuplicates} />);

    expect(screen.getByText(/98%/i)).toBeInTheDocument();
  });

  it('should highlight primary asset', () => {
    render(<DuplicateGroupCard duplicates={mockDuplicates} />);

    expect(screen.getByText(/primary/i)).toBeInTheDocument();
  });

  it('should render correct thumbnail URLs', () => {
    render(<DuplicateGroupCard duplicates={mockDuplicates} />);

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', '/api/immich/assets/asset-1/thumbnail');
    expect(images[1]).toHaveAttribute('src', '/api/immich/assets/asset-2/thumbnail');
  });

  it('should show file paths', () => {
    render(<DuplicateGroupCard duplicates={mockDuplicates} />);

    expect(screen.getByText(/img1.jpg/i)).toBeInTheDocument();
    expect(screen.getByText(/img2.jpg/i)).toBeInTheDocument();
  });

  it('should handle single duplicate', () => {
    const singleDuplicate = [mockDuplicates[0]];
    render(<DuplicateGroupCard duplicates={singleDuplicate} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
  });

  it('should handle duplicates without similarityScore', () => {
    const duplicatesWithoutScore: EnrichedAsset[] = [
      {
        id: 'asset-1',
        path: '/photos/img1.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1'
      },
      {
        id: 'asset-2',
        path: '/photos/img2.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1'
      }
    ];

    render(<DuplicateGroupCard duplicates={duplicatesWithoutScore} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
  });

  it('should handle duplicates without primary marker', () => {
    const duplicatesWithoutPrimary: EnrichedAsset[] = [
      {
        id: 'asset-1',
        path: '/photos/img1.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.95
      },
      {
        id: 'asset-2',
        path: '/photos/img2.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.95
      }
    ];

    render(<DuplicateGroupCard duplicates={duplicatesWithoutPrimary} />);

    expect(screen.queryByText(/primary/i)).not.toBeInTheDocument();
  });

  it('should have responsive layout classes', () => {
    const { container } = render(<DuplicateGroupCard duplicates={mockDuplicates} />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('md:grid-cols-3');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });

  it('should show duplicate type', () => {
    render(<DuplicateGroupCard duplicates={mockDuplicates} />);

    expect(screen.getByText(/perceptual_hash/i)).toBeInTheDocument();
  });

  it('should handle assets without path by using id', () => {
    const duplicatesWithoutPath: EnrichedAsset[] = [
      {
        id: 'asset-1',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      },
      {
        id: 'asset-2',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        similarityScore: 0.98
      }
    ];

    render(<DuplicateGroupCard duplicates={duplicatesWithoutPath} />);

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('alt', 'asset-1');
    expect(images[1]).toHaveAttribute('alt', 'asset-2');
  });
});
