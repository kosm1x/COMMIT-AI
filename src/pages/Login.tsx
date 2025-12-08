import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      setError(error.message);
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
          <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/50 shadow-glass rounded-3xl p-8 sm:p-10 animate-scale-in">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-3">
                <img 
                  src="/logo-icon.png" 
                  alt="COMMIT" 
                  className="h-60 w-60 object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                {isSignUp ? 'Create an account' : 'Welcome back'}
              </h2>
              <p className="text-text-tertiary">
                {isSignUp ? 'Start your journey today' : 'Enter your details to access your journal'}
              </p>
          </div>

            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Email</label>
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
                <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Password</label>
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
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
            </button>
          </form>

            <div className="mt-8 pt-6 border-t border-border-secondary text-center">
              <p className="text-sm text-text-secondary">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-2 font-medium text-accent-primary hover:text-accent-hover transition-colors"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
