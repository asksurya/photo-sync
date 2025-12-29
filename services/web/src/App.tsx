import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PhotoGridView } from './views/PhotoGridView';
import { DuplicatesView } from './views/DuplicatesView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { isAuthenticated, logout } = useAuth();

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen bg-immich-bg flex">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content area */}
          <div className="flex-1 ml-[220px] flex flex-col">
            {/* Top bar */}
            <TopBar onLogout={logout} />

            {/* Page content */}
            <main className="flex-1 p-8">
              <Routes>
                <Route path="/" element={<PhotoGridView />} />
                <Route path="/duplicates" element={<DuplicatesView />} />
              </Routes>
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
