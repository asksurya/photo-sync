import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Login } from '../../components/Login';
import { useAuth } from '../../contexts/AuthContext';

// Mock the AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Login', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      logout: vi.fn(),
    });
  });

  it('renders with dark theme gradient background', () => {
    const { container } = render(<Login />);
    const wrapper = container.querySelector('.min-h-screen');
    expect(wrapper).toHaveClass('bg-gradient-to-br');
  });

  it('renders dark Immich card styling', () => {
    const { container } = render(<Login />);
    const card = container.querySelector('.bg-immich-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-lg', 'p-8', 'border', 'border-immich-border');
  });

  it('renders gradient logo circle', () => {
    const { container } = render(<Login />);
    const logo = container.querySelector('.bg-gradient-to-br.from-immich-accent.to-purple-600');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveClass('w-16', 'h-16', 'rounded-full');
  });

  it('renders Photo Sync title and subtitle', () => {
    render(<Login />);
    expect(screen.getByText('Photo Sync')).toBeInTheDocument();
    expect(screen.getByText('Photo Management System')).toBeInTheDocument();
  });

  it('renders token input field with Immich styling', () => {
    render(<Login />);
    const input = screen.getByPlaceholderText(/Enter your API token/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('bg-immich-input', 'border-immich-border', 'text-immich-text');
  });

  it('renders submit button with Immich accent styling', () => {
    render(<Login />);
    const button = screen.getByRole('button', { name: /Sign In/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-immich-accent', 'text-white', 'w-full');
  });

  it('toggles instructions panel when help button is clicked', () => {
    render(<Login />);
    const helpButton = screen.getByText(/Need help/i);

    // Instructions should be hidden initially
    expect(screen.queryByText(/How to get your API token:/i)).not.toBeInTheDocument();

    // Click to show instructions
    fireEvent.click(helpButton);
    expect(screen.getByText(/How to get your API token:/i)).toBeInTheDocument();

    // Click to hide instructions
    fireEvent.click(helpButton);
    expect(screen.queryByText(/How to get your API token:/i)).not.toBeInTheDocument();
  });

  it('displays error message with Immich error styling', () => {
    const { container } = render(<Login />);
    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    // Submit with empty token
    fireEvent.click(submitButton);

    const errorMessage = screen.getByText(/Please enter an API token/i);
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('text-immich-error');
  });

  it('calls login with token when form is submitted', () => {
    render(<Login />);
    const input = screen.getByPlaceholderText(/Enter your API token/i);
    const button = screen.getByRole('button', { name: /Sign In/i });

    // Enter token
    fireEvent.change(input, { target: { value: 'test-api-token-123' } });

    // Submit form
    fireEvent.click(button);

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith('test-api-token-123');
  });

  it('clears error message when user starts typing', () => {
    render(<Login />);
    const input = screen.getByPlaceholderText(/Enter your API token/i);
    const button = screen.getByRole('button', { name: /Sign In/i });

    // Submit empty form to show error
    fireEvent.click(button);
    expect(screen.getByText(/Please enter an API token/i)).toBeInTheDocument();

    // Start typing
    fireEvent.change(input, { target: { value: 'a' } });
    expect(screen.queryByText(/Please enter an API token/i)).not.toBeInTheDocument();
  });

  it('renders instructions panel with dark Immich styling', () => {
    const { container } = render(<Login />);
    const helpButton = screen.getByText(/Need help/i);

    // Show instructions
    fireEvent.click(helpButton);

    const instructionsPanel = container.querySelector('.bg-immich-sidebar');
    expect(instructionsPanel).toBeInTheDocument();
  });
});
