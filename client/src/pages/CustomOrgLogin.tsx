import { useState, useEffect } from 'react';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export function CustomOrgLogin() {
  // Extract slug from URL: /login/slug
  const pathParts = window.location.pathname.split('/');
  const orgSlug = pathParts[pathParts.length - 1];
  const { login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [orgData, setOrgData] = useState<any>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!orgSlug) return;
    
    api.get(`/organizations/login-branding/${orgSlug}`)
      .then(res => {
        if (res.data.success) {
          setOrgData(res.data.data);
        } else {
          window.location.href = '/login';
        }
      })
      .catch(() => {
        toast.error('Invalid organization login URL');
        window.location.href = '/login';
      })
      .finally(() => setLoading(false));
  }, [orgSlug]);

  // Hook for Developer Mode Custom HTML
  useEffect(() => {
    if (orgData?.loginBranding?.mode === 'developer') {
      const submitBtn = document.getElementById('pype-submit');
      
      const handleClick = async (e: Event) => {
        e.preventDefault();
        const em = (document.getElementById('pype-email') as HTMLInputElement)?.value;
        const pw = (document.getElementById('pype-password') as HTMLInputElement)?.value;
        
        if (em && pw) {
          try {
            setLoggingIn(true);
            const res = await api.post('/auth/login', { 
              email: em, 
              password: pw,
              organizationId: orgData.id 
            });

            if (res.data.success) {
              toast.success('Logged in successfully');
              localStorage.setItem('token', res.data.data.token);
              window.location.href = '/';
            }
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Invalid credentials');
          } finally {
            setLoggingIn(false);
          }
        } else {
           toast.error('Please fill in both email and password');
        }
      };

      if (submitBtn) {
        submitBtn.addEventListener('click', handleClick);
      }

      // Inject logo if requested
      const logoImg = document.getElementById('pype-logo') as HTMLImageElement;
      if (logoImg && orgData?.logo) {
        logoImg.src = api.getFileUrl(orgData.logo);
      }

      // Add enter key support
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleClick(e);
        }
      };

      const emailInput = document.getElementById('pype-email');
      const passInput = document.getElementById('pype-password');
      if (emailInput) emailInput.addEventListener('keydown', handleKeyDown);
      if (passInput) passInput.addEventListener('keydown', handleKeyDown);

      return () => {
        if (submitBtn) submitBtn.removeEventListener('click', handleClick);
        if (emailInput) emailInput.removeEventListener('keydown', handleKeyDown);
        if (passInput) passInput.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [orgData, login, loggingIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoggingIn(true);
      
      // Call standard login endpoint. 
      // The backend should ensure the user belongs to orgData.id
      // (This requires backend logic change to restrict login by orgId, 
      // but passing it here ensures context if needed)
      const res = await api.post('/auth/login', { 
        email, 
        password,
        organizationId: orgData.id 
      });

      if (res.data.success) {
        toast.success('Logged in successfully');
        localStorage.setItem('token', res.data.data.token);
        window.location.href = '/';
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const branding = orgData?.loginBranding || {};
  const isDeveloperMode = branding.mode === 'developer';
  const primaryColor = branding.primaryColor || '#0052CC';
  const welcomeText = branding.welcomeText || `Welcome to ${orgData?.name} Portal`;
  const logoUrl = orgData?.logo ? api.getFileUrl(orgData.logo) : branding.logoUrl;

  if (isDeveloperMode) {
    return (
      <>
        {loggingIn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <div 
          className="w-full min-h-screen" 
          dangerouslySetInnerHTML={{ __html: branding.customHtml || '' }} 
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 relative overflow-hidden">
      
      {/* Decorative Background using the primary color */}
      <div 
        className="absolute top-0 left-0 w-full h-1/2 opacity-20 dark:opacity-10 pointer-events-none" 
        style={{ 
          background: `linear-gradient(to bottom, ${primaryColor}, transparent)` 
        }} 
      />

      <div className="w-full max-w-md p-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <Card className="shadow-2xl border-0 overflow-hidden bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center mb-8 text-center space-y-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-16 max-w-full object-contain" />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-muted">
                  <Globe className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{welcomeText}</h1>
                <p className="text-sm text-muted-foreground">Sign in to your account</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white dark:bg-zinc-950"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs font-medium hover:underline" style={{ color: primaryColor }}>
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white dark:bg-zinc-950"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full text-white mt-2 font-medium h-11"
                disabled={loggingIn}
                style={{ backgroundColor: primaryColor }}
              >
                {loggingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">ProHostix</span>
        </div>
      </div>
    </div>
  );
}
