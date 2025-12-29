import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';

describe('Sidebar', () => {
  it('renders Photos navigation link', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByText('Photos')).toBeInTheDocument();
  });

  it('renders Duplicates navigation link', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByText('Duplicates')).toBeInTheDocument();
  });

  it('renders Photo Sync branding', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByText('Photo Sync')).toBeInTheDocument();
  });
});
