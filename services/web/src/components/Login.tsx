import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError('Please enter an API token');
      return;
    }

    setError('');
    login(token);
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
    if (error) {
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0f1419] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-immich-card p-8 rounded-lg border border-immich-border shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          {/* Gradient Logo Circle */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-immich-accent to-purple-600 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {/* Title and Subtitle */}
          <h1 className="text-2xl font-bold text-immich-text text-center mb-2">
            Photo Sync
          </h1>
          <p className="text-sm text-immich-text-muted text-center mb-8">
            Photo Management System
          </p>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Token Input */}
            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium text-immich-text-secondary mb-2"
              >
                API Token
              </label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={handleTokenChange}
                placeholder="Enter your API token"
                className="w-full px-4 py-3 bg-immich-input border border-immich-border text-immich-text placeholder-immich-text-muted rounded-md focus:outline-none focus:ring-2 focus:ring-immich-accent/30 focus:border-immich-border-focus transition-colors"
                aria-describedby="token-error"
                aria-invalid={!!error}
                autoComplete="off"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div id="token-error" className="text-sm text-immich-error">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-immich-accent text-white font-medium py-3 px-4 rounded-md hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-immich-accent/30 transition-all"
            >
              Sign In
            </button>
          </form>

          {/* Help/Instructions Toggle */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-sm text-immich-accent hover:text-immich-accent/80 transition-colors"
              aria-expanded={showInstructions}
              aria-controls="help-instructions"
            >
              {showInstructions ? '▼' : '▶'} Need help finding your API token?
            </button>

            {/* Collapsible Instructions */}
            {showInstructions && (
              <div id="help-instructions" className="mt-4 p-4 bg-immich-sidebar rounded-md border border-immich-border">
                <h3 className="text-sm font-semibold text-immich-text mb-2">
                  How to get your API token:
                </h3>
                <ol className="text-sm text-immich-text-secondary space-y-2 list-decimal list-inside">
                  <li>Log in to your Immich server</li>
                  <li>Go to Account Settings</li>
                  <li>Navigate to the API Keys section</li>
                  <li>Click "New API Key"</li>
                  <li>Copy the generated token and paste it above</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
