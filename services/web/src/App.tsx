import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import { PhotoGridView } from './views/PhotoGridView';
import { DuplicatesView } from './views/DuplicatesView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ErrorBoundary>
          <div className="min-h-screen bg-gray-100">
            {/* Header Navigation */}
            <header className="bg-gray-800 text-white shadow-md">
              <nav className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <Link to="/" className="text-2xl font-bold hover:text-gray-300 transition-colors">
                    Photo Sync
                  </Link>
                  <div className="flex gap-6">
                    <Link
                      to="/"
                      className="hover:text-gray-300 transition-colors font-medium"
                    >
                      Timeline
                    </Link>
                    <Link
                      to="/duplicates"
                      className="hover:text-gray-300 transition-colors font-medium"
                    >
                      Duplicates
                    </Link>
                  </div>
                </div>
              </nav>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<PhotoGridView />} />
                <Route path="/duplicates" element={<DuplicatesView />} />
              </Routes>
            </main>
          </div>
        </ErrorBoundary>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
