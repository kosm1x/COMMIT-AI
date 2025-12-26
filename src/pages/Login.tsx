import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Mail, Lock, Globe } from 'lucide-react';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();

  // Check if we're coming from a password reset email
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const type = searchParams.get('type');
    if (accessToken && type === 'recovery') {
      setShowResetForm(true);
      setShowResetPassword(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleResetPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email) {
      setError(t('login.enterEmail'));
      setLoading(false);
      return;
    }

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(t('login.passwordResetSent'));
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (newPassword.length < 6) {
      setError(t('login.passwordMinLength'));
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('login.passwordsDontMatch'));
      setLoading(false);
      return;
    }

    const { error } = await updatePassword(newPassword);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(t('login.passwordUpdated'));
      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-bg-secondary relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <div className="w-full flex z-10">
        {/* Left Side - Hero Content */}
        <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 xl:px-24 relative">
          <div className="max-w-lg">
            <div className="mb-6 animate-scale-in">
              <img 
                src="/logo-dark.png" 
                alt="COMMIT - Personal Growth Framework" 
                className="h-80 w-auto object-contain"
              />
            </div>
            <h1 className="text-5xl font-heading font-bold text-text-primary leading-tight mb-6 animate-slide-up">
              Design Your Life,<br />
              <span className="text-accent-primary">Achieve Your Goals</span>
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed mb-8 animate-fade-in delay-100">
              The COMMIT framework helps you gain clarity, track progress, and unlock your potential through structured journaling and AI-powered insights.
            </p>
            
            <div className="flex gap-4 animate-fade-in delay-200">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-lg border border-white/20">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-text-secondary">AI Analysis</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-lg border border-white/20">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm font-medium text-text-secondary">Mind Mapping</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-lg border border-white/20">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span className="text-sm font-medium text-text-secondary">Goal Tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 sm:px-8">
          <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/50 shadow-glass rounded-3xl p-8 sm:p-10 animate-scale-in relative">
            {/* Language Selector Button */}
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/40 hover:bg-white/70 transition-all"
                title={t('language.selectLanguage')}
              >
                <Globe className="w-4 h-4 text-text-secondary" />
                <span className="text-sm font-medium text-text-secondary">
                  {language === 'en' ? 'EN' : language === 'es' ? 'ES' : 'ZH'}
                </span>
              </button>
            </div>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-3">
                <img 
                  src="/logo-icon.png" 
                  alt="COMMIT" 
                  className="h-60 w-60 object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                {showResetForm 
                  ? t('login.setNewPassword')
                  : showResetPassword 
                    ? t('login.resetPassword')
                    : isSignUp 
                      ? t('login.createAccount')
                      : t('login.welcomeBack')}
              </h2>
              <p className="text-text-tertiary">
                {showResetForm
                  ? t('login.setNewPasswordDescription')
                  : showResetPassword
                    ? t('login.resetPasswordDescription')
                    : isSignUp 
                      ? t('login.startJourney')
                      : t('login.enterDetails')}
              </p>
          </div>

            {showResetForm ? (
              // Password Reset Form (after clicking email link)
              <form onSubmit={handlePasswordUpdate} className="space-y-5">
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                    <Lock className="w-4 h-4" />
                    <span className="font-medium text-sm">{t('login.setNewPassword')}</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {t('login.setNewPasswordDescription')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">{t('login.newPassword')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-modern"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">{t('login.confirmPassword')}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-modern"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2 animate-fade-in">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600 flex items-center gap-2 animate-fade-in">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary h-12 text-base group"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {t('login.updatePassword')}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResetForm(false);
                    navigate('/');
                  }}
                  className="w-full text-sm text-text-tertiary hover:text-text-primary transition-colors"
                >
                  {t('common.back')} {t('login.signIn')}
                </button>
              </form>
            ) : showResetPassword ? (
              // Password Reset Request Form
              <form onSubmit={handleResetPasswordRequest} className="space-y-5">
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium text-sm">{t('login.resetPassword')}</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {t('login.resetPasswordDescription')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">{t('login.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-modern"
                    placeholder="name@example.com"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2 animate-fade-in">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600 flex items-center gap-2 animate-fade-in">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary h-12 text-base group"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {t('login.sendResetLink')}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="w-full text-sm text-text-tertiary hover:text-text-primary transition-colors"
                >
                  {t('common.back')} {t('login.signIn')}
                </button>
              </form>
            ) : (
              // Regular Sign In / Sign Up Form
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">{t('login.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-modern"
                    placeholder="name@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">{t('login.password')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-modern"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                {!isSignUp && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPassword(true);
                        setError('');
                        setSuccess('');
                      }}
                      className="text-sm text-accent-primary hover:text-accent-hover transition-colors"
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2 animate-fade-in">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary h-12 text-base group"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isSignUp ? t('login.signUp') : t('login.signIn')}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-border-secondary text-center">
              <p className="text-sm text-text-secondary">
                {isSignUp ? t('login.alreadyHaveAccount') : t('login.dontHaveAccount')}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-2 font-medium text-accent-primary hover:text-accent-hover transition-colors"
                >
                  {isSignUp ? t('login.signIn') : t('login.signUp')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Click outside to close language selector */}
      {showLanguageSelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={(e) => {
            console.log('Backdrop clicked, target:', e.target);
            setShowLanguageSelector(false);
          }}
        />
      )}
      {/* Language Selector Dropdown */}
      {showLanguageSelector && (
        <div className="fixed top-20 right-8 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-border-primary overflow-hidden z-50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Setting language to EN, current:', language);
              setLanguage('en');
              setShowLanguageSelector(false);
            }}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-bg-tertiary transition-colors ${
              language === 'en' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
            }`}
          >
            {t('language.english')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Setting language to ES, current:', language);
              setLanguage('es');
              setShowLanguageSelector(false);
            }}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-bg-tertiary transition-colors ${
              language === 'es' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
            }`}
          >
            {t('language.spanish')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Setting language to ZH, current:', language);
              setLanguage('zh');
              setShowLanguageSelector(false);
            }}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-bg-tertiary transition-colors ${
              language === 'zh' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
            }`}
          >
            {t('language.chinese')}
          </button>
        </div>
      )}
    </div>
  );
}
