import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 sm:p-10">
          <button onClick={(e) => { e.preventDefault(); window.location.pathname = '/'; }} className="flex items-center text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back to Home
          </button>
          {/* Logo */}
          <div className="flex flex-col items-center justify-center gap-4 mb-8">
            <div className="h-20 w-20 bg-slate-50 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
              <img src="/pype-logo.png" alt="PYPE ERM" className="h-14 w-auto drop-shadow-sm" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">PYPE ERM</h1>
            </div>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-xl font-semibold text-slate-800 mb-1">Welcome back</h2>
            <p className="text-sm text-slate-500">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-[#0F172A] focus:ring-[#0F172A] transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-[#0F172A] focus:ring-[#0F172A] transition-colors pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50/80 border border-red-100 text-red-600 text-sm rounded-xl font-medium text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl font-medium shadow-md transition-all active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in to account'}
            </Button>
          </form>
        </div>
        
        {/* Footer decoration */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} PYPE ERM. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
