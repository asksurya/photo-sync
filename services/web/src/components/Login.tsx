import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-immich-bg flex items-center justify-center">
      <div className="bg-immich-card p-8 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6">Photo Sync</h1>
        <button
          onClick={login}
          className="w-full bg-immich-accent hover:bg-immich-accent/90 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};
