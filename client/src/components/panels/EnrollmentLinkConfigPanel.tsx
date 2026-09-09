import { useState, useEffect } from 'react';
import { Settings, Save, Link, FormInput } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import api from '@/lib/api';

interface EnrollmentLinkConfig {
  universityStep: 'mandatory' | 'optional' | 'hidden';
  programStep: 'mandatory' | 'optional' | 'hidden';
  specializationStep: 'mandatory' | 'optional' | 'hidden';
  sessionStep: 'mandatory' | 'optional' | 'hidden';
  expiryDays: number;
  allowMultipleUse: boolean;
  requireDocuments: boolean;
  requirePhoto: boolean;
  requireConsent: boolean;
  consentText: string;
}

const DEFAULT_CONFIG: EnrollmentLinkConfig = {
  universityStep: 'mandatory',
  programStep: 'optional',
  specializationStep: 'optional',
  sessionStep: 'optional',
  expiryDays: 7,
  allowMultipleUse: false,
  requireDocuments: true,
  requirePhoto: true,
  requireConsent: false,
  consentText: '',
};

export function EnrollmentLinkConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<EnrollmentLinkConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/organizations/enrollment-link-config');
      if (res.data.success && res.data.data) {
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load enrollment link configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/organizations/enrollment-link-config', config);
      toast.success('Configuration saved successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Enrollment Link Configuration</h2>
        <p className="text-muted-foreground text-sm mt-1">Configure how sales users generate invite links and what fields are required from students.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                  <Link className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Invite Generation Flow</CardTitle>
                  <CardDescription>Control steps for sales users</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="space-y-3">
                <Label className="text-base font-semibold">University Selection Step</Label>
                <RadioGroup 
                  value={config.universityStep} 
                  onValueChange={(val: any) => setConfig({ ...config, universityStep: val })}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mandatory" id="uni-mandatory" />
                    <Label htmlFor="uni-mandatory" className="font-normal cursor-pointer">Mandatory (Required)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optional" id="uni-optional" />
                    <Label htmlFor="uni-optional" className="font-normal cursor-pointer">Optional (Can be skipped)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hidden" id="uni-hidden" />
                    <Label htmlFor="uni-hidden" className="font-normal cursor-pointer">Hidden (All universities available)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Program Selection Step</Label>
                <RadioGroup 
                  value={config.programStep} 
                  onValueChange={(val: any) => setConfig({ ...config, programStep: val })}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mandatory" id="prog-mandatory" />
                    <Label htmlFor="prog-mandatory" className="font-normal cursor-pointer">Mandatory (Required)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optional" id="prog-optional" />
                    <Label htmlFor="prog-optional" className="font-normal cursor-pointer">Optional (Can be skipped)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hidden" id="prog-hidden" />
                    <Label htmlFor="prog-hidden" className="font-normal cursor-pointer">Hidden (All programs available)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Specialization Selection Step</Label>
                <p className="text-xs text-muted-foreground mb-2">Only appears if selected programs have specializations.</p>
                <RadioGroup 
                  value={config.specializationStep} 
                  onValueChange={(val: any) => setConfig({ ...config, specializationStep: val })}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mandatory" id="spec-mandatory" />
                    <Label htmlFor="spec-mandatory" className="font-normal cursor-pointer">Mandatory (Required)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optional" id="spec-optional" />
                    <Label htmlFor="spec-optional" className="font-normal cursor-pointer">Optional (Can be skipped)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hidden" id="spec-hidden" />
                    <Label htmlFor="spec-hidden" className="font-normal cursor-pointer">Hidden (Do not ask)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Session Selection Step</Label>
                <p className="text-xs text-muted-foreground mb-2">Only appears if admission sessions exist.</p>
                <RadioGroup 
                  value={config.sessionStep} 
                  onValueChange={(val: any) => setConfig({ ...config, sessionStep: val })}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mandatory" id="sess-mandatory" />
                    <Label htmlFor="sess-mandatory" className="font-normal cursor-pointer">Mandatory (Required)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optional" id="sess-optional" />
                    <Label htmlFor="sess-optional" className="font-normal cursor-pointer">Optional (Can be skipped)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hidden" id="sess-hidden" />
                    <Label htmlFor="sess-hidden" className="font-normal cursor-pointer">Hidden (Use default session)</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/30">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Link Settings</CardTitle>
                    <CardDescription>Configure invite expiration and limits</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label>Default Expiration (Days)</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="90" 
                    required
                    value={config.expiryDays}
                    onChange={(e) => setConfig({ ...config, expiryDays: parseInt(e.target.value) || 7 })}
                  />
                  <p className="text-xs text-muted-foreground">How many days until the invite link expires automatically.</p>
                </div>
                
                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-0.5">
                    <Label>Allow Multiple Uses</Label>
                    <p className="text-xs text-muted-foreground">If enabled, multiple students can apply using the same link.</p>
                  </div>
                  <Switch 
                    checked={config.allowMultipleUse} 
                    onCheckedChange={(val) => setConfig({ ...config, allowMultipleUse: val })} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50 text-green-600 dark:bg-green-950/30">
                    <FormInput className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Student Application Form</CardTitle>
                    <CardDescription>Requirements for applicants</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-0.5">
                    <Label>Require Documents</Label>
                    <p className="text-xs text-muted-foreground">Student must upload identity and academic documents.</p>
                  </div>
                  <Switch 
                    checked={config.requireDocuments} 
                    onCheckedChange={(val) => setConfig({ ...config, requireDocuments: val })} 
                  />
                </div>
                
                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-0.5">
                    <Label>Require Passport Photo</Label>
                    <p className="text-xs text-muted-foreground">Student must upload a profile photo.</p>
                  </div>
                  <Switch 
                    checked={config.requirePhoto} 
                    onCheckedChange={(val) => setConfig({ ...config, requirePhoto: val })} 
                  />
                </div>

                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-0.5">
                    <Label>Require Consent / Declaration</Label>
                    <p className="text-xs text-muted-foreground">Student must agree to a declaration before submitting.</p>
                  </div>
                  <Switch 
                    checked={config.requireConsent} 
                    onCheckedChange={(val) => setConfig({ ...config, requireConsent: val })} 
                  />
                </div>

                {config.requireConsent && (
                  <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                    <Label>Consent / Declaration Text</Label>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={config.consentText}
                      onChange={(e) => setConfig({ ...config, consentText: e.target.value })}
                      placeholder="e.g. I hereby declare that all information provided is true and correct to the best of my knowledge..."
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving} size="lg">
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
}
