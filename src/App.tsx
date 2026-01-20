import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import Login from './pages/Login';
import { AppLayout } from './components/layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { hasSupabaseConfig } from './lib/supabase';

// Lazy-loaded page components for code splitting
const Journal = lazy(() => import('./pages/Journal'));
const Objectives = lazy(() => import('./pages/Objectives'));
const Map = lazy(() => import('./pages/Map'));
const Ideate = lazy(() => import('./pages/Ideate'));
const IdeaDetail = lazy(() => import('./pages/IdeaDetail'));
const Tracking = lazy(() => import('./pages/Tracking'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (!hasSupabaseConfig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('errors.configError')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              {t('errors.supabaseNotConfigured')}
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-left mb-4">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
{`VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key_here`}
              </pre>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              After adding the environment variables, restart the development server.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/ideate/:id" element={
          <ErrorBoundary section="Idea Detail">
            <IdeaDetail />
          </ErrorBoundary>
        } />
        <Route path="/reset-password" element={<Login />} />
        <Route path="*" element={
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/journal" replace />} />
                <Route path="/journal" element={
                  <ErrorBoundary section="Journal">
                    <Journal />
                  </ErrorBoundary>
                } />
                <Route path="/vision" element={
                  <ErrorBoundary section="Vision">
                    <Objectives />
                  </ErrorBoundary>
                } />
                <Route path="/goals" element={
                  <ErrorBoundary section="Goals">
                    <Objectives />
                  </ErrorBoundary>
                } />
                <Route path="/objectives" element={
                  <ErrorBoundary section="Objectives">
                    <Objectives />
                  </ErrorBoundary>
                } />
                <Route path="/tasks" element={
                  <ErrorBoundary section="Tasks">
                    <Objectives />
                  </ErrorBoundary>
                } />
                <Route path="/boards" element={
                  <ErrorBoundary section="Strategic Map">
                    <Map />
                  </ErrorBoundary>
                } />
                <Route path="/mindmap" element={
                  <ErrorBoundary section="Mind Map">
                    <Map />
                  </ErrorBoundary>
                } />
                <Route path="/ideate" element={
                  <ErrorBoundary section="Ideation">
                    <Ideate />
                  </ErrorBoundary>
                } />
                <Route path="/track" element={
                  <ErrorBoundary section="Tracking">
                    <Tracking />
                  </ErrorBoundary>
                } />
                <Route path="*" element={<Navigate to="/journal" replace />} />
              </Routes>
            </Suspense>
          </AppLayout>
        } />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
