// services/web/src/__tests__/components/VersionSwitcherModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VersionSwitcherModal } from '../../components/VersionSwitcherModal';
import { EnrichedAsset } from '../../lib/apiClient';

describe('VersionSwitcherModal', () => {
  const mockAsset: EnrichedAsset = {
    id: 'asset-1',
    path: '/photos/img1.jpg',
    type: 'IMAGE',
    createdAt: '2024-01-01',
    groupId: 'grp-1',
    groupType: 'raw_jpeg',
    isPrimaryVersion: true,
    alternateVersions: ['asset-2', 'asset-3']
  };

  it('should not render when open is false', () => {
    const onOpenChange = vi.fn();
    render(
      <VersionSwitcherModal
        asset={mockAsset}
        open={false}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog when open is true', () => {
    const onOpenChange = vi.fn();
    render(
      <VersionSwitcherModal
        asset={mockAsset}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should show all versions including main asset', () => {
    const onOpenChange = vi.fn();
    render(
      <VersionSwitcherModal
        asset={mockAsset}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Main asset + 2 alternates = 3 images
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
  });

  it('should display main version with primary badge', () => {
    const onOpenChange = vi.fn();
    render(
      <VersionSwitcherModal
        asset={mockAsset}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByText(/primary/i)).toBeInTheDocument();
  });

  it('should call onOpenChange when close button clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <VersionSwitcherModal
        asset={mockAsset}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should show version count in title', () => {
    const onOpenChange = vi.fn();
    render(
      <VersionSwitcherModal
        asset={mockAsset}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByText(/3 versions/i)).toBeInTheDocument();
  });

  it('should render with asset that has no alternateVersions', () => {
    const assetWithoutAlternates: EnrichedAsset = {
      id: 'asset-1',
      path: '/photos/img1.jpg',
      type: 'IMAGE',
      groupId: 'grp-1',
      isPrimaryVersion: true
    };

    const onOpenChange = vi.fn();
    render(
      <VersionSwitcherModal
        asset={assetWithoutAlternates}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/1 version/i)).toBeInTheDocument();
  });

  it('should render thumbnails with correct src URLs', () => {
    const onOpenChange = vi.fn();
    render(
      <VersionSwitcherModal
        asset={mockAsset}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', '/api/immich/assets/asset-1/thumbnail');
    expect(images[1]).toHaveAttribute('src', '/api/immich/assets/asset-2/thumbnail');
    expect(images[2]).toHaveAttribute('src', '/api/immich/assets/asset-3/thumbnail');
  });

  it('should have responsive grid layout classes', () => {
    const onOpenChange = vi.fn();
    render(
      <VersionSwitcherModal
        asset={mockAsset}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Radix Portal renders outside container, so we need to search in document
    const grid = document.querySelector('.grid');
    expect(grid).not.toBeNull();
    expect(grid).toHaveClass('grid-cols-2', 'md:grid-cols-3');
  });
});
