import { useState, useEffect } from 'react';
import { Palette, Globe, Upload, Save, Lock, Link as LinkIcon, Edit2, Code2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/lib/api';

export function LoginCustomizationPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  
  const [branding, setBranding] = useState({
    mode: 'normal',
    customHtml: '',
    primaryColor: '#0052CC',
    welcomeText: 'Welcome to our Portal',
    logoUrl: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.data?.organization) {
        const org = res.data.data.organization;
        setSlug(org.customLoginSlug || null);
        setOrgLogo(org.logo ? api.getFileUrl(org.logo) : null);
        if (org.loginBranding) {
          setBranding(prev => ({ ...prev, ...org.loginBranding }));
        }
      }
    } catch (err) {
      toast.error('Failed to load login branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInit = async () => {
    try {
      setSaving(true);
      const res = await api.post('/organizations/login-branding/init');
      if (res.data.success) {
        setSlug(res.data.data.customLoginSlug);
        setBranding(prev => ({ ...prev, ...res.data.data.loginBranding }));
        toast.success('Custom login page created successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initialize custom login');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    
    try {
      setSaving(true);
      const res = await api.put('/organizations/login-branding', { branding });
      if (res.data.success) {
        toast.success('Branding updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 150;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      if (height > MAX_HEIGHT) {
        width *= MAX_HEIGHT / height;
        height = MAX_HEIGHT;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
      setBranding(prev => ({ ...prev, logoUrl: compressedBase64 }));
    };
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const loginUrl = slug ? `${window.location.origin}/login/${slug}` : '';

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {!slug ? (
        <Card className="border-indigo-100 dark:border-indigo-900/50 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background">
          <CardHeader className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
              <Palette className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl mb-2">Create Your Custom Login Page</CardTitle>
            <CardDescription className="text-base max-w-lg mx-auto">
              Give your team and students a branded login experience. This will generate a unique, permanent link just for your organization.
            </CardDescription>
            <div className="mt-8">
              <Button onClick={handleInit} disabled={saving} size="lg" className="px-8 shadow-md">
                {saving ? 'Creating...' : 'Create Custom Login'}
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <Card className="border-green-100 dark:border-green-900/30 shadow-sm">
              <CardHeader className="pb-4 bg-green-50/50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-900/30">
                <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Lock className="w-4 h-4" /> Your Unique Login URL
                </CardTitle>
                <CardDescription>
                  This link is permanently assigned to your organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="flex-1 bg-muted px-4 py-3 rounded-md text-sm font-medium border break-all flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  {loginUrl}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(loginUrl);
                    toast.success('Link copied to clipboard!');
                  }}
                >
                  Copy
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-500" /> Branding Design
                </CardTitle>
                <CardDescription>Customize colors, logos, and welcome messages.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs value={branding.mode || 'normal'} onValueChange={(val) => setBranding({...branding, mode: val})} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="normal">Normal Mode</TabsTrigger>
                    <TabsTrigger value="developer">Developer Mode</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="normal">
                    <form onSubmit={handleSave} className="space-y-6">
                      
                      <div className="space-y-4">
                        <Label>Organization Logo</Label>
                        <div className="flex items-start gap-4">
                          <div className="w-24 h-24 rounded-lg border border-dashed flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                            {orgLogo ? (
                              <img src={orgLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                              <Globe className="w-8 h-8 text-muted-foreground/50" />
                            )}
                          </div>
                          <div className="space-y-2 py-2">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Logo is managed in your Organization Settings.
                            </div>
                            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                              If you want to update this image, please navigate to the{' '}
                              <button 
                                type="button"
                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                onClick={() => window.location.href = '/?table=settings'}
                              >
                                general organization settings page
                              </button>.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Primary Theme Color</Label>
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 rounded-md shadow-sm border overflow-hidden shrink-0 relative">
                            <input 
                              type="color" 
                              className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer"
                              value={branding.primaryColor}
                              onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                            />
                          </div>
                          <Input 
                            value={branding.primaryColor}
                            onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                            className="font-mono uppercase w-32"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Welcome Text</Label>
                        <Input 
                          value={branding.welcomeText}
                          onChange={(e) => setBranding({...branding, welcomeText: e.target.value})}
                          placeholder="e.g. Welcome to Acme Corp Portal"
                        />
                      </div>

                      <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={saving}>
                          <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Design'}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="developer">
                    <form onSubmit={handleSave} className="space-y-6">
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 mb-4 text-sm text-amber-800 dark:text-amber-300">
                        <strong>Important Rules for Developer Mode:</strong>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>You must include an input with <code>id="pype-email"</code></li>
                          <li>You must include an input with <code>id="pype-password"</code></li>
                          <li>You must include a submit button with <code>id="pype-submit"</code></li>
                          <li><strong>Optional:</strong> Use <code>&lt;img id="pype-logo" /&gt;</code> to automatically display your organization logo.</li>
                        </ul>
                        <p className="mt-2 text-xs opacity-80">Scripts are strictly forbidden for security.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Code2 className="w-4 h-4" /> Custom HTML & CSS
                        </Label>
                        <Textarea 
                          className="font-mono text-xs h-[400px]" 
                          placeholder="<style>
  .custom-container { padding: 2rem; background: #f0f0f0; }
  .btn { background: blue; color: white; }
</style>
<div class='custom-container'>
  <h2>Login</h2>
  <input type='email' id='pype-email' placeholder='Email' />
  <input type='password' id='pype-password' placeholder='Password' />
  <button id='pype-submit' class='btn'>Submit</button>
</div>"
                          value={branding.customHtml || ''}
                          onChange={(e) => setBranding({...branding, customHtml: e.target.value})}
                        />
                      </div>

                      <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={saving}>
                          <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Design'}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="hidden lg:block relative">
            <div className="sticky top-6 rounded-xl border bg-muted/30 p-2 overflow-hidden shadow-sm aspect-[4/5] flex flex-col justify-center items-center">
              <div className="absolute top-2 left-2 right-2 bg-background/50 backdrop-blur-sm rounded-lg p-2 text-xs text-center text-muted-foreground border">
                Live Preview
              </div>
              
              <div className="w-full h-full max-h-full max-w-sm bg-background border rounded-xl shadow-lg overflow-hidden flex flex-col relative">
                {branding.mode === 'developer' ? (
                  <div className="w-full h-full overflow-auto" dangerouslySetInnerHTML={{ __html: branding.customHtml || '<div class="p-4 text-center text-muted-foreground text-sm">Waiting for custom HTML...</div>' }} />
                ) : (
                  <div className="p-8 text-center flex-1 flex flex-col items-center justify-center space-y-6 overflow-y-auto">
                    {orgLogo ? (
                      <img src={orgLogo} className="h-12 max-w-full object-contain" alt="Logo" />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                        <Globe className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="space-y-2 w-full">
                      <h2 className="text-xl font-semibold tracking-tight">{branding.welcomeText}</h2>
                      <p className="text-sm text-muted-foreground">Sign in to your account</p>
                    </div>

                    <div className="w-full space-y-3 text-left">
                      <div className="space-y-1">
                        <div className="h-4 w-12 bg-muted rounded"></div>
                        <div className="h-9 w-full bg-muted/50 rounded-md border"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-4 w-16 bg-muted rounded"></div>
                        <div className="h-9 w-full bg-muted/50 rounded-md border"></div>
                      </div>
                      
                      <div 
                        className="h-10 w-full rounded-md mt-6 flex items-center justify-center text-sm font-medium text-white shadow"
                        style={{ backgroundColor: branding.primaryColor }}
                      >
                        Sign In
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
