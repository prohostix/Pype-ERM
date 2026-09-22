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
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
    } else {
      window.history.replaceState({}, '', '/');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4 sm:p-8 font-sans text-slate-900">
      {/* Main Container Card */}
      <div className="w-full max-w-[1100px] h-[750px] max-h-[90vh] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex relative">
        
        {/* Left Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 h-full bg-white relative z-10">
          
          {/* Top Bar: Logo and Back Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-slate-900 rounded flex items-center justify-center">
                <img src="/pype-logo.png" alt="Pype ERM" className="h-5 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
              </div>
              <span className="font-bold text-lg tracking-tight">PYPE ERM</span>
            </div>
            <button 
              onClick={(e) => { e.preventDefault(); window.location.pathname = '/'; }} 
              className="flex items-center text-sm font-medium text-slate-400 hover:text-slate-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Back
            </button>
          </div>

          {/* Form Content */}
          <div className="w-full max-w-[400px] mx-auto my-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">Welcome back</h1>
              <p className="text-slate-500 text-sm">Welcome back! Please enter your details.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 shadow-sm transition-colors text-base"
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 shadow-sm transition-colors pr-10 text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer" 
                  />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Remember for 30 days</span>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>

            </form>
          </div>
          
          {/* Footer Copyright */}
          <div className="text-xs text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} PYPE ERM. All rights reserved.
          </div>
        </div>

        {/* Right Panel - Abstract CSS Graphic */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#F8FAFC] items-center justify-center relative overflow-hidden border-l border-slate-100">
          <div className="relative">
            {/* The top half-circle */}
            <div className="w-[340px] h-[170px] bg-gradient-to-br from-indigo-500 to-purple-600 rounded-t-full relative z-10 shadow-inner"></div>
            
            {/* The horizontal surface line */}
            <div className="absolute top-[170px] left-1/2 -translate-x-1/2 w-[440px] h-[2px] bg-white z-20 shadow-[0_-1px_3px_rgba(255,255,255,0.8)]"></div>
            
            {/* The shadow/reflection below the line */}
            <div className="w-[340px] h-[170px] bg-indigo-900/30 rounded-b-full filter blur-2xl relative z-0 mt-2 opacity-80 mix-blend-multiply"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

