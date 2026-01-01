// services/web/src/__tests__/contexts/AuthContext.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Helper component that uses the auth context
function TestConsumer() {
  const { isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</span>
      <button onClick={() => login('test-token')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('AuthProvider', () => {
    it('should render children', () => {
      render(
        <AuthProvider>
          <div data-testid="child">Child Content</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should initialize as not authenticated when no token in localStorage', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
    });

    it('should initialize as authenticated when token exists in localStorage', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('existing-token');

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(localStorage.getItem).toHaveBeenCalledWith('immich_token');
    });

    it('should initialize as authenticated when token is any truthy value', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('a');

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });
  });

  describe('login', () => {
    it('should set isAuthenticated to true and store token in localStorage', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Initially not authenticated
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');

      // Click login button
      await user.click(screen.getByRole('button', { name: 'Login' }));

      // Now authenticated
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(localStorage.setItem).toHaveBeenCalledWith('immich_token', 'test-token');
    });

    it('should update context value after login', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await user.click(screen.getByRole('button', { name: 'Login' }));

      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });
  });

  describe('logout', () => {
    it('should set isAuthenticated to false and remove token from localStorage', async () => {
      const user = userEvent.setup();
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('existing-token');

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Initially authenticated
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');

      // Click logout button
      await user.click(screen.getByRole('button', { name: 'Logout' }));

      // Now not authenticated
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      expect(localStorage.removeItem).toHaveBeenCalledWith('immich_token');
    });

    it('should handle logout when already logged out', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Initially not authenticated
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');

      // Click logout button (should not throw)
      await user.click(screen.getByRole('button', { name: 'Logout' }));

      // Still not authenticated
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      expect(localStorage.removeItem).toHaveBeenCalledWith('immich_token');
    });
  });

  describe('login and logout flow', () => {
    it('should handle full login/logout cycle', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Start not authenticated
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');

      // Login
      await user.click(screen.getByRole('button', { name: 'Login' }));
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');

      // Logout
      await user.click(screen.getByRole('button', { name: 'Logout' }));
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');

      // Login again
      await user.click(screen.getByRole('button', { name: 'Login' }));
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide isAuthenticated, login, and logout', async () => {
      const user = userEvent.setup();

      // Component that verifies all context values exist
      function ContextVerifier() {
        const auth = useAuth();
        return (
          <div>
            <span data-testid="has-isAuthenticated">{typeof auth.isAuthenticated === 'boolean' ? 'yes' : 'no'}</span>
            <span data-testid="has-login">{typeof auth.login === 'function' ? 'yes' : 'no'}</span>
            <span data-testid="has-logout">{typeof auth.logout === 'function' ? 'yes' : 'no'}</span>
          </div>
        );
      }

      render(
        <AuthProvider>
          <ContextVerifier />
        </AuthProvider>
      );

      expect(screen.getByTestId('has-isAuthenticated')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-login')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-logout')).toHaveTextContent('yes');
    });
  });

  describe('multiple consumers', () => {
    it('should share auth state across multiple consumers', async () => {
      const user = userEvent.setup();

      function Consumer1() {
        const { isAuthenticated, login } = useAuth();
        return (
          <div>
            <span data-testid="consumer1-status">{isAuthenticated ? 'auth' : 'no-auth'}</span>
            <button onClick={() => login('token')}>Consumer1 Login</button>
          </div>
        );
      }

      function Consumer2() {
        const { isAuthenticated, logout } = useAuth();
        return (
          <div>
            <span data-testid="consumer2-status">{isAuthenticated ? 'auth' : 'no-auth'}</span>
            <button onClick={logout}>Consumer2 Logout</button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <Consumer1 />
          <Consumer2 />
        </AuthProvider>
      );

      // Both start as not authenticated
      expect(screen.getByTestId('consumer1-status')).toHaveTextContent('no-auth');
      expect(screen.getByTestId('consumer2-status')).toHaveTextContent('no-auth');

      // Login from Consumer1
      await user.click(screen.getByRole('button', { name: 'Consumer1 Login' }));

      // Both should now be authenticated
      expect(screen.getByTestId('consumer1-status')).toHaveTextContent('auth');
      expect(screen.getByTestId('consumer2-status')).toHaveTextContent('auth');

      // Logout from Consumer2
      await user.click(screen.getByRole('button', { name: 'Consumer2 Logout' }));

      // Both should now be not authenticated
      expect(screen.getByTestId('consumer1-status')).toHaveTextContent('no-auth');
      expect(screen.getByTestId('consumer2-status')).toHaveTextContent('no-auth');
    });
  });
});
