import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import Login from './pages/Login';
import Journal from './pages/Journal';
import Objectives from './pages/Objectives';
import Map from './pages/Map';
import Ideate from './pages/Ideate';
import IdeaDetail from './pages/IdeaDetail';
import Tracking from './pages/Tracking';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { hasSupabaseConfig } from './lib/supabase';

function AppContent() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  // Show configuration error if Supabase is not configured
  if (!hasSupabaseConfig) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20" />
        </div>
        <div className="max-w-md w-full glass-strong rounded-3xl shadow-2xl p-6 border border-border-primary animate-scale-in">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">{t('errors.configError')}</h1>
            <p className="text-text-secondary mb-4">
              {t('errors.supabaseNotConfigured')}
            </p>
            <div className="bg-bg-tertiary rounded-xl p-4 text-left mb-4">
              <pre className="text-sm text-text-primary whitespace-pre-wrap">
{`VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key_here`}
              </pre>
            </div>
            <p className="text-sm text-text-secondary">
              After adding the environment variables, restart the development server.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/ideate/:id" element={
        <ErrorBoundary section="Idea Detail">
          <IdeaDetail />
        </ErrorBoundary>
      } />
      <Route path="/reset-password" element={<Login />} />
      <Route path="*" element={
        <Layout>
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
        </Layout>
      } />
    </Routes>
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
