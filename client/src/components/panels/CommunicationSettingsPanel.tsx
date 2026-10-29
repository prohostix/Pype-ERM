import { useState, useEffect } from 'react';
import {
  Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Eye, EyeOff,
  Save, RefreshCw, Sparkles, ShieldCheck, PhoneCall, ExternalLink,
  FileText, Check, Copy, HelpCircle, Layers, Palette, Smartphone, Monitor,
  History, RotateCcw, Search, Filter, Clock, ChevronLeft, ChevronRight, Info, X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';

const SMTP_PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  sendgrid: { host: 'smtp.sendgrid.net', port: 587, secure: false },
  ses: { host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false },
  outlook: { host: 'smtp.office365.com', port: 587, secure: false },
  zoho_in: { host: 'smtp.zoho.in', port: 587, secure: false },
  zoho: { host: 'smtp.zoho.com', port: 587, secure: false },
};

interface TemplateConfig {
  enabled: boolean;
  templateId: string;
  exampleText?: string;
}

const TEMPLATE_DEFINITIONS = [
  {
    key: 'admission_confirmation',
    title: 'Student Admission Confirmation',
    description: 'Sent to student/parent upon successful admission enrollment.',
    params: [
      { placeholder: '{{1}}', label: 'Student Full Name' },
      { placeholder: '{{2}}', label: 'Enrolled Program / Course' },
      { placeholder: '{{3}}', label: 'Admission / Roll Number' },
    ],
    sampleText: 'Dear {{1}}, congratulations! Your admission for {{2}} is confirmed. Your Student ID is {{3}}. Welcome aboard!',
    sampleParams: ['Rahul Sharma', 'B.Tech Computer Science', 'ADM-2026-0891']
  },
  {
    key: 'fee_receipt',
    title: 'Fee Payment Receipt',
    description: 'Sent automatically when an installment or tuition payment is recorded. Attaches the PDF receipt.',
    params: [
      { placeholder: '{{1}}', label: 'Student Full Name' },
      { placeholder: '{{2}}', label: 'Paid Amount (e.g. 25000)' },
      { placeholder: '{{3}}', label: 'Receipt / Transaction ID' },
      { placeholder: '{{4}}', label: 'Receipt PDF Download Link' },
    ],
    sampleText: 'Dear {{1}}, payment of Rs. {{2}} against receipt #{{3}} has been received successfully. Download your receipt: {{4}} Thank you!',
    sampleParams: ['Rahul Sharma', '25,000', 'REC-90823', 'https://portal.pypecrm.com/api/v1/public/receipt/REC-90823/pdf']
  },
  {
    key: 'payment_reminder',
    title: 'Upcoming / Overdue Fee Reminder',
    description: 'Sent prior to or on fee schedule due date to avoid late penalties.',
    params: [
      { placeholder: '{{1}}', label: 'Student Full Name' },
      { placeholder: '{{2}}', label: 'Due Amount (e.g. 15000)' },
      { placeholder: '{{3}}', label: 'Due Date' },
    ],
    sampleText: 'Dear {{1}}, your fee installment of Rs. {{2}} is due on {{3}}. Please clear payment to avoid late fees.',
    sampleParams: ['Rahul Sharma', '15,000', '15 Nov 2026']
  },
  {
    key: 'lead_welcome',
    title: 'New Lead / Inquiry Welcome',
    description: 'Sent immediately when an inquiry or admission lead is submitted.',
    params: [
      { placeholder: '{{1}}', label: 'Applicant / Lead Name' },
      { placeholder: '{{2}}', label: 'Organization / Course Name' },
    ],
    sampleText: 'Hello {{1}}, thank you for inquiring with {{2}}. Our admissions team will reach out to you shortly.',
    sampleParams: ['Rahul Sharma', 'Pype Institute']
  }
];

export function CommunicationSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [activeTab, setActiveTab] = useState('smtp');

  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showWaApiKey, setShowWaApiKey] = useState(false);

  // SMTP State
  const [smtp, setSmtp] = useState({
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: '',
    fromEmail: '',
    replyTo: '',
    hasStoredPassword: false,
  });

  // Gupshup WhatsApp State
  const [whatsapp, setWhatsapp] = useState<{
    enabled: boolean;
    apiKey: string;
    appName: string;
    sourceNumber: string;
    hasStoredApiKey: boolean;
    templates: Record<string, TemplateConfig>;
  }>({
    enabled: false,
    apiKey: '',
    appName: 'ProHostix',
    sourceNumber: '',
    hasStoredApiKey: false,
    templates: {
      admission_confirmation: { enabled: true, templateId: '' },
      fee_receipt: { enabled: true, templateId: '' },
      payment_reminder: { enabled: true, templateId: '' },
      lead_welcome: { enabled: true, templateId: '' },
    }
  });

  // Test states
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testPhoneTarget, setTestPhoneTarget] = useState('');
  const [testMode, setTestMode] = useState<'text' | 'template'>('template');
  const [selectedTemplateForTest, setSelectedTemplateForTest] = useState('admission_confirmation');

  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [waTestResult, setWaTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email Template Preview States
  const [previewTemplateType, setPreviewTemplateType] = useState<'credentials' | 'admission' | 'receipt'>('credentials');
  const [templatePreview, setTemplatePreview] = useState<{ subject: string; text: string; html: string; brandInfo: any } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [sendingSampleEmail, setSendingSampleEmail] = useState(false);

  // Delivery & Audit Logs States
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [logFilterType, setLogFilterType] = useState('all');
  const [logFilterStatus, setLogFilterStatus] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logPagination, setLogPagination] = useState({ total: 0, totalPages: 1 });
  const [logStats, setLogStats] = useState({ total: 0, sent: 0, failed: 0, emailCount: 0, whatsappCount: 0 });
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/organizations/communication-logs', {
        params: {
          type: logFilterType,
          status: logFilterStatus,
          search: logSearch,
          page: logPage,
          limit: 15
        }
      });
      if (res.data?.success) {
        setLogs(res.data.data.logs || []);
        setLogPagination(res.data.data.pagination || { total: 0, totalPages: 1 });
        setLogStats(res.data.data.stats || { total: 0, sent: 0, failed: 0, emailCount: 0, whatsappCount: 0 });
      }
    } catch (err: any) {
      console.error('Failed to load communication logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleResend = async (logItem: any) => {
    setResendingId(logItem.id);
    try {
      const res = await api.post(`/organizations/communication-logs/${logItem.id}/resend`);
      if (res.data?.success) {
        toast.success(res.data.message || `Message resent successfully to ${logItem.recipientName || logItem.recipient}!`);
        fetchLogs();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to resend message');
    } finally {
      setResendingId(null);
    }
  };

  useEffect(() => {
    fetchSettings();
    // Load initial stats to show badge count
    api.get('/organizations/communication-logs?limit=1')
      .then(res => {
        if (res.data?.success && res.data.data?.stats) {
          setLogStats(res.data.data.stats);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'audit_logs') {
      fetchLogs();
    }
  }, [activeTab, logFilterType, logFilterStatus, logPage]);

  const fetchTemplatePreview = async (type = previewTemplateType) => {
    setLoadingPreview(true);
    try {
      const res = await api.get(`/organizations/communication-settings/email-template-preview?type=${type}`);
      if (res.data.success && res.data.data) {
        setTemplatePreview(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load email preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'email_templates') {
      fetchTemplatePreview(previewTemplateType);
    }
  }, [activeTab, previewTemplateType]);

  const handleSendSampleBrandedEmail = async () => {
    if (!testEmailTarget) {
      toast.error('Please enter a target recipient email address first');
      return;
    }
    setSendingSampleEmail(true);
    try {
      const res = await api.post('/organizations/communication-settings/test-smtp', {
        ...smtp,
        targetEmail: testEmailTarget
      });
      toast.success(res.data.message || `Sample branded email dispatched to ${testEmailTarget}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch sample email');
    } finally {
      setSendingSampleEmail(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations/communication-settings');
      if (res.data.success && res.data.data) {
        const { smtp: s, whatsapp: w } = res.data.data;
        if (s) setSmtp(prev => ({ ...prev, ...s }));
        if (w) {
          setWhatsapp(prev => ({
            ...prev,
            ...w,
            templates: {
              ...prev.templates,
              ...(w.templates || {})
            }
          }));
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load communication settings');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (presetKey: string) => {
    const p = SMTP_PRESETS[presetKey];
    if (p) {
      setSmtp(prev => ({
        ...prev,
        host: p.host,
        port: p.port,
        secure: p.secure,
      }));
      toast.info(`Applied ${presetKey.toUpperCase()} preset`);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await api.put('/organizations/communication-settings', { smtp, whatsapp });
      toast.success('Communication settings saved successfully!');
      fetchSettings();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await api.post('/organizations/communication-settings/test-smtp', {
        ...smtp,
        targetEmail: testEmailTarget || undefined,
      });
      setSmtpTestResult({ success: true, message: res.data.message });
      toast.success(res.data.message);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'SMTP Connection Test Failed';
      setSmtpTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestWhatsApp = async (overrideTemplateKey?: string) => {
    if (!testPhoneTarget) {
      toast.error('Please enter a target phone number to receive the test message.');
      return;
    }

    const tplKey = overrideTemplateKey || selectedTemplateForTest;
    const tplDef = TEMPLATE_DEFINITIONS.find(t => t.key === tplKey);
    const configuredTpl = whatsapp.templates?.[tplKey];

    const isTemplateTest = testMode === 'template' || Boolean(overrideTemplateKey);

    if (isTemplateTest && !configuredTpl?.templateId) {
      toast.error(`Please enter a Gupshup Template ID for ${tplDef?.title || tplKey} before testing it.`);
      return;
    }

    setTestingWa(true);
    setWaTestResult(null);
    try {
      const res = await api.post('/organizations/communication-settings/test-whatsapp', {
        ...whatsapp,
        targetPhone: testPhoneTarget,
        testMode: isTemplateTest ? 'template' : 'text',
        templateId: isTemplateTest ? configuredTpl?.templateId : undefined,
        templateParams: isTemplateTest ? tplDef?.sampleParams : undefined,
      });
      setWaTestResult({ success: true, message: res.data.message });
      toast.success(res.data.message);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gupshup Test Message Failed';
      setWaTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTestingWa(false);
    }
  };

  const updateTemplate = (key: string, updates: Partial<TemplateConfig>) => {
    setWhatsapp(prev => ({
      ...prev,
      templates: {
        ...prev.templates,
        [key]: {
          ...(prev.templates?.[key] || { enabled: true, templateId: '' }),
          ...updates
        }
      }
    }));
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
        <p className="text-muted-foreground text-sm">Loading communication settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Organization Communication Settings</h2>
          <p className="text-muted-foreground text-sm">
            Configure custom SMTP outgoing mail and Gupshup WhatsApp Enterprise templates for student and staff notifications.
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving} className="self-start sm:self-auto">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-[680px] grid-cols-4">
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>SMTP Server</span>
            {smtp.enabled && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px] px-1.5 py-0 h-4">Active</Badge>}
          </TabsTrigger>
          <TabsTrigger value="email_templates" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span>Email Templates</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp</span>
            {whatsapp.enabled && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px] px-1.5 py-0 h-4">Active</Badge>}
          </TabsTrigger>
          <TabsTrigger value="audit_logs" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>Delivery & Audit</span>
            {logStats.failed > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 animate-pulse">
                {logStats.failed} failed
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─────────────────── SMTP TAB ─────────────────── */}
        <TabsContent value="smtp" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Custom SMTP Outgoing Mail Server
                </CardTitle>
                <CardDescription>
                  Route all system transactional emails (admissions, fee receipts, password resets, reminders) through your organization's custom mail server.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {smtp.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={smtp.enabled}
                  onCheckedChange={(val) => setSmtp({ ...smtp, enabled: val })}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Presets bar */}
              <div className="p-3.5 bg-muted/40 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Quick Server Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleApplyPreset('gmail')}>Gmail / Workspace</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleApplyPreset('zoho_in')}>Zoho (India .in)</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleApplyPreset('zoho')}>Zoho (.com)</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleApplyPreset('outlook')}>Outlook / O365</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleApplyPreset('sendgrid')}>SendGrid</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleApplyPreset('ses')}>AWS SES</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label>SMTP Host</Label>
                  <Input
                    placeholder="e.g. smtp.gmail.com"
                    value={smtp.host}
                    onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>SMTP Port</Label>
                  <Input
                    type="number"
                    placeholder="587"
                    value={smtp.port || ''}
                    onChange={(e) => {
                      const newPort = Number(e.target.value) || 0;
                      setSmtp(prev => ({
                        ...prev,
                        port: newPort,
                        secure: newPort === 465 ? true : (newPort === 587 || newPort === 25 ? false : prev.secure)
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Username / Auth Email</Label>
                  <Input
                    placeholder="notifications@yourdomain.com"
                    value={smtp.user}
                    onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Password / App Password</Label>
                    {smtp.hasStoredPassword && (
                      <span className="text-[11px] text-emerald-600 font-medium">✓ Password saved</span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showSmtpPass ? 'text' : 'password'}
                      placeholder={smtp.hasStoredPassword ? '••••••••' : 'Enter SMTP password or App Password'}
                      value={smtp.pass}
                      onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    For Gmail / Google Workspace, you must generate and paste a 16-character <strong className="text-foreground">App Password</strong> from your Google Account settings, not your regular password.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sender Display Name</Label>
                  <Input
                    placeholder="e.g. Acme Institute Portal"
                    value={smtp.fromName}
                    onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>From Email Address</Label>
                  <Input
                    placeholder="no-reply@yourdomain.com"
                    value={smtp.fromEmail}
                    onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smtp-secure"
                    checked={smtp.secure}
                    onCheckedChange={(val) => setSmtp({ ...smtp, secure: val })}
                  />
                  <Label htmlFor="smtp-secure" className="cursor-pointer text-sm font-normal">
                    Use Direct SSL/TLS (Enable for <strong>Port 465</strong>; keep OFF for STARTTLS on <strong>Port 587</strong>)
                  </Label>
                </div>
                {smtp.port === 587 && smtp.secure && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md p-2">
                    ⚠️ <strong>SSL Warning:</strong> Port 587 expects STARTTLS, not direct SSL/TLS. Please turn this switch OFF to avoid the OpenSSL "wrong version number" error.
                  </p>
                )}
              </div>
            </CardContent>

            {/* Diagnostics & Testing Footer */}
            <div className="border-t bg-muted/20 p-5 rounded-b-xl space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Test SMTP Connection & Send Verification Email
              </h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Enter email to receive test message (e.g. you@example.com)"
                  value={testEmailTarget}
                  onChange={(e) => setTestEmailTarget(e.target.value)}
                  className="bg-background max-w-md h-9 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp || !smtp.host || !smtp.user}
                  className="h-9 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {testingSmtp ? 'Verifying & Sending...' : 'Test Connection'}
                </Button>
              </div>

              {smtpTestResult && (
                <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  smtpTestResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900'
                }`}>
                  {smtpTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <p className="flex-1 font-medium">{smtpTestResult.message}</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ─────────────────── BRANDED EMAIL TEMPLATES TAB ─────────────────── */}
        <TabsContent value="email_templates" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-600" />
                  Institutional Email Branding & Live Preview
                </CardTitle>
                <CardDescription>
                  All system-generated emails automatically include your institution's official logo, brand color accents, sender details, and registered address.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTemplatePreview(previewTemplateType)}
                  disabled={loadingPreview}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingPreview ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Organization Brand Information Bar */}
              <div className="p-4 rounded-xl border bg-muted/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-1">Organization Name</span>
                  <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    {templatePreview?.brandInfo?.name || 'Loading...'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Brand Accent Color</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border shadow-sm"
                      style={{ backgroundColor: templatePreview?.brandInfo?.brandColor || '#1e40af' }}
                    />
                    <span className="font-mono font-medium text-foreground">
                      {templatePreview?.brandInfo?.brandColor || '#1e40af'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Sender From Name</span>
                  <span className="font-medium text-foreground">
                    {templatePreview?.brandInfo?.fromName || smtp.fromName || 'System Admin'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Campus / Registered Address</span>
                  <span className="text-muted-foreground truncate block max-w-full" title={templatePreview?.brandInfo?.address || ''}>
                    {templatePreview?.brandInfo?.address ? templatePreview.brandInfo.address.split('\n')[0] : 'Configured in Org Settings'}
                  </span>
                </div>
              </div>

              {/* Template Switcher & Preview Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t">
                {/* Template Type Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={previewTemplateType === 'credentials' ? 'default' : 'outline'}
                    onClick={() => setPreviewTemplateType('credentials')}
                    className="text-xs"
                  >
                    🎓 Student Credentials
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={previewTemplateType === 'admission' ? 'default' : 'outline'}
                    onClick={() => setPreviewTemplateType('admission')}
                    className="text-xs"
                  >
                    📜 Admission Confirmation
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={previewTemplateType === 'receipt' ? 'default' : 'outline'}
                    onClick={() => setPreviewTemplateType('receipt')}
                    className="text-xs"
                  >
                    💳 Fee Receipt
                  </Button>
                </div>

                {/* Viewport & Live Test Email Controls */}
                <div className="flex items-center gap-2">
                  <div className="border rounded-lg p-0.5 flex bg-muted/40">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${
                        previewDevice === 'desktop' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Desktop view"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${
                        previewDevice === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Mobile view"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Mobile</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Send sample to your email..."
                      value={testEmailTarget}
                      onChange={(e) => setTestEmailTarget(e.target.value)}
                      className="h-8 text-xs w-48 hidden sm:block"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSendSampleBrandedEmail}
                      disabled={sendingSampleEmail}
                      className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      {sendingSampleEmail ? 'Sending...' : 'Send Live Sample'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Email Subject Header */}
              {templatePreview && (
                <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border rounded-lg text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">
                    <strong>Subject:</strong> {templatePreview.subject}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground bg-background">
                    HTML Preview
                  </Badge>
                </div>
              )}

              {/* Sandboxed Email Canvas */}
              <div className="bg-slate-200/70 dark:bg-slate-950 p-4 sm:p-8 rounded-2xl flex justify-center border min-h-[520px] overflow-hidden">
                {loadingPreview ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-xs">Rendering institutional email preview...</p>
                  </div>
                ) : templatePreview?.html ? (
                  <div
                    className={`transition-all duration-300 shadow-2xl rounded-xl overflow-hidden bg-white ${
                      previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-[620px]'
                    }`}
                  >
                    <iframe
                      title="Email Preview"
                      srcDoc={templatePreview.html}
                      className="w-full h-[620px] border-0"
                    />
                  </div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground text-xs">
                    No preview available. Click Refresh to render.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────── GUPSHUP WHATSAPP TAB ─────────────────── */}
        <TabsContent value="whatsapp" className="space-y-6">
          {/* Card 1: API Credentials */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  Gupshup API Credentials
                </CardTitle>
                <CardDescription>
                  Configure your official Gupshup WhatsApp Enterprise connection details to enable outbound messaging.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {whatsapp.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={whatsapp.enabled}
                  onCheckedChange={(val) => setWhatsapp({ ...whatsapp, enabled: val })}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    GS
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Gupshup WhatsApp Enterprise Gateway</p>
                    <p className="text-xs text-muted-foreground">Endpoint: https://api.gupshup.io/wa/api/v1/msg</p>
                  </div>
                </div>
                <a
                  href="https://enterprise.smsgupshup.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Gupshup Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Gupshup App Name (src.name)</Label>
                  <Input
                    placeholder="e.g. PypeERMPortal"
                    value={whatsapp.appName}
                    onChange={(e) => setWhatsapp({ ...whatsapp, appName: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">The registered App Name in your Gupshup WhatsApp dashboard.</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Source WhatsApp Phone Number</Label>
                  <Input
                    placeholder="e.g. 917834811114"
                    value={whatsapp.sourceNumber}
                    onChange={(e) => setWhatsapp({ ...whatsapp, sourceNumber: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Your verified sender number registered with Gupshup (including country code, digits only).</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Gupshup API Key (apikey)</Label>
                  {whatsapp.hasStoredApiKey && (
                    <span className="text-[11px] text-emerald-600 font-medium">✓ API Key saved</span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showWaApiKey ? 'text' : 'password'}
                    placeholder={whatsapp.hasStoredApiKey ? '••••••••' : 'Enter your Gupshup API Key'}
                    value={whatsapp.apiKey}
                    onChange={(e) => setWhatsapp({ ...whatsapp, apiKey: e.target.value })}
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWaApiKey(!showWaApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showWaApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Found under Account Settings / API Credentials in your Gupshup Enterprise console.</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Notification Templates (HSM) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" />
                    WhatsApp Notification Templates (HSM)
                  </CardTitle>
                  <CardDescription className="mt-1">
                    WhatsApp Business policy requires pre-approved templates for system-initiated notifications. Register these templates in your Gupshup console, then paste the approved <strong>Template ID</strong> below.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl text-xs space-y-1 text-muted-foreground">
                <p className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  How Template Parameters Work:
                </p>
                <p>
                  When your template is approved on Gupshup, WhatsApp matches dynamic variables in order: <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>, <code>{"{{3}}"}</code>. Pype-ERM automatically populates these variables with real student and fee data before sending.
                </p>
              </div>

              <div className="space-y-4">
                {TEMPLATE_DEFINITIONS.map(tpl => {
                  const currentVal = whatsapp.templates?.[tpl.key] || { enabled: true, templateId: '' };
                  return (
                    <div
                      key={tpl.key}
                      className="p-4 rounded-xl border bg-card hover:border-primary/30 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-foreground">{tpl.title}</h4>
                            <Badge variant="outline" className="text-[10px] font-mono">{tpl.key}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-primary"
                            onClick={() => handleTestWhatsApp(tpl.key)}
                            title="Test this template with sample data"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Test Template
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Gupshup Template ID</Label>
                          <Input
                            placeholder="e.g. 70912384-xxxx-xxxx or admission_confirm_v1"
                            value={currentVal.templateId}
                            onChange={(e) => updateTemplate(tpl.key, { templateId: e.target.value })}
                            className="font-mono text-xs h-9 bg-background"
                          />
                          <p className="text-[10px] text-muted-foreground">The Template ID assigned in your Gupshup template library.</p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Parameter Mapping Reference</Label>
                          <div className="p-2 bg-muted/40 rounded-lg border text-[11px] space-y-1">
                            {tpl.params.map(p => (
                              <div key={p.placeholder} className="flex items-center justify-between">
                                <span className="font-mono font-semibold text-primary">{p.placeholder}:</span>
                                <span className="text-muted-foreground">{p.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted/20 p-2.5 rounded-lg border text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Template Format Example: </span>
                        <span>"{tpl.sampleText}"</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>

            {/* Test WhatsApp Footer */}
            <div className="border-t bg-muted/20 p-5 rounded-b-xl space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                Live Gupshup WhatsApp Dispatch Tester
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Recipient Phone Number</Label>
                  <Input
                    placeholder="e.g. 919876543210 (with country code)"
                    value={testPhoneTarget}
                    onChange={(e) => setTestPhoneTarget(e.target.value)}
                    className="bg-background h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Message Type</Label>
                  <select
                    value={testMode}
                    onChange={(e) => setTestMode(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="text">Session Text Message (24h Window)</option>
                    <option value="template">Approved Template (HSM)</option>
                  </select>
                </div>

                {testMode === 'template' ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Select Template to Test</Label>
                    <select
                      value={selectedTemplateForTest}
                      onChange={(e) => setSelectedTemplateForTest(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {TEMPLATE_DEFINITIONS.map(t => (
                        <option key={t.key} value={t.key}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs">Test Note / Custom Text</Label>
                    <Input
                      value="Hello from Pype-ERM Gupshup integration!"
                      disabled
                      className="bg-muted h-9 text-xs"
                    />
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestWhatsApp()}
                disabled={testingWa || !whatsapp.sourceNumber}
                className="h-9 shrink-0"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {testingWa ? 'Dispatching Message...' : `Send Test ${testMode === 'template' ? 'Template' : 'Message'} via Gupshup`}
              </Button>

              {waTestResult && (
                <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  waTestResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900'
                }`}>
                  {waTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <p className="flex-1 font-medium">{waTestResult.message}</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ─────────────────── DELIVERY & AUDIT LOGS TAB ─────────────────── */}
        <TabsContent value="audit_logs" className="space-y-6">
          {/* Top Stat Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Dispatched</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{logStats.total}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">All outgoing channels</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                  <Send className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Delivered / Sent</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{logStats.sent}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {logStats.total > 0 ? `${Math.round((logStats.sent / logStats.total) * 100)}% success rate` : 'No dispatches yet'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className={`border shadow-sm ${logStats.failed > 0 ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20' : 'border-slate-200 dark:border-slate-800'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Failed Messages</div>
                  <div className="text-2xl font-bold text-rose-600 mt-1">{logStats.failed}</div>
                  <div className="text-[11px] text-rose-500 font-medium mt-0.5">
                    {logStats.failed > 0 ? 'Action required: Click Resend below' : 'All messages healthy'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Channels</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {logStats.emailCount} <span className="text-xs font-normal text-slate-500">Email</span> • {logStats.whatsappCount} <span className="text-xs font-normal text-slate-500">WA</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">SMTP & Gupshup</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
                  <Layers className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Logs Main Card */}
          <Card>
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    Delivery Logs & Real-time Audit
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Complete institutional audit trail for every student credential, fee payment receipt, and reminder. Org Admins can 1-click resend failed messages.
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  className="shrink-0 h-9"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                  Refresh Logs
                </Button>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-3 pt-4">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search by recipient name, email, phone, or receipt #..."
                    value={logSearch}
                    onChange={(e) => {
                      setLogSearch(e.target.value);
                      setLogPage(1);
                    }}
                    className="pl-9 h-9 text-xs"
                  />
                  {logSearch && (
                    <button
                      onClick={() => setLogSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Channel Filter */}
                <div className="w-[140px]">
                  <Select value={logFilterType} onValueChange={(val) => { setLogFilterType(val); setLogPage(1); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      <SelectItem value="email">Email (SMTP)</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="w-[140px]">
                  <Select value={logFilterStatus} onValueChange={(val) => { setLogFilterStatus(val); setLogPage(1); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="failed">Failed Only</SelectItem>
                      <SelectItem value="sent">Sent / Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingLogs ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs font-medium">Fetching communication audit logs...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <History className="w-8 h-8 text-slate-300" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">No communication logs found</span>
                  <span className="text-xs text-slate-400">
                    {logSearch || logFilterType !== 'all' || logFilterStatus !== 'all'
                      ? 'Try adjusting your filters or search term'
                      : 'Trigger an enrollment verification or payment to see real-time delivery logs here'}
                  </span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Channel</th>
                        <th className="py-3 px-4">Recipient</th>
                        <th className="py-3 px-4">Purpose</th>
                        <th className="py-3 px-4">Subject / Message</th>
                        <th className="py-3 px-4">Dispatched At</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {logs.map((log) => {
                        const isFailed = log.status === 'failed';
                        const isEmail = log.type === 'email';
                        const isWhatsApp = log.type === 'whatsapp';

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                            {/* Channel */}
                            <td className="py-3 px-4">
                              {isEmail ? (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 gap-1.5 font-medium">
                                  <Mail className="w-3 h-3" />
                                  <span>Email</span>
                                </Badge>
                              ) : isWhatsApp ? (
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 gap-1.5 font-medium">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline">{log.type}</Badge>
                              )}
                            </td>

                            {/* Recipient */}
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {log.recipientName || 'Student'}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                {log.recipient || 'N/A'}
                              </div>
                            </td>

                            {/* Purpose / Category */}
                            <td className="py-3 px-4">
                              {log.category === 'FEE_RECEIPT' ? (
                                <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 hover:bg-purple-100 text-[10px]">
                                  Fee Receipt
                                </Badge>
                              ) : log.category === 'STUDENT_CREDENTIALS' ? (
                                <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 hover:bg-blue-100 text-[10px]">
                                  Student Credentials
                                </Badge>
                              ) : log.category === 'PAYMENT_REMINDER' ? (
                                <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 hover:bg-amber-100 text-[10px]">
                                  Fee Reminder
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">{log.category || 'Notification'}</Badge>
                              )}
                            </td>

                            {/* Subject / Message preview */}
                            <td className="py-3 px-4 max-w-[280px]">
                              <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={log.subject || log.content || ''}>
                                {log.subject || log.content || 'System Notification'}
                              </div>
                              {log.content && log.subject && (
                                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {log.content}
                                </div>
                              )}
                            </td>

                            {/* Dispatched Date */}
                            <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                              <div>{new Date(log.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {log.retryCount > 0 && (
                                  <span className="text-amber-600 font-medium">({log.retryCount}x resent)</span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isFailed ? (
                                <div>
                                  <Badge variant="destructive" className="gap-1 font-semibold text-[11px] py-0.5">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Failed</span>
                                  </Badge>
                                  {log.errorMessage && (
                                    <div className="text-[10px] text-rose-600 font-medium truncate max-w-[180px] mt-1" title={log.errorMessage}>
                                      {log.errorMessage}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 gap-1 font-semibold text-[11px] py-0.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Delivered</span>
                                </Badge>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Resend Button */}
                                <Button
                                  size="sm"
                                  variant={isFailed ? 'default' : 'outline'}
                                  onClick={() => handleResend(log)}
                                  disabled={resendingId === log.id}
                                  className={`h-7 px-2.5 text-xs font-semibold ${
                                    isFailed
                                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                                      : 'hover:bg-slate-100 text-slate-700'
                                  }`}
                                  title={isFailed ? 'Click to resend this failed message immediately' : 'Resend another copy'}
                                >
                                  <RotateCcw className={`w-3 h-3 mr-1 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                                  {resendingId === log.id ? 'Sending...' : 'Resend'}
                                </Button>

                                {/* View Payload Details */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedLog(log)}
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                                  title="View audit details & payload"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {logPagination.totalPages > 1 && (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Page {logPage} of {logPagination.totalPages} ({logPagination.total} total logs)
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      disabled={logPage <= 1 || loadingLogs}
                      className="h-7 px-2 text-xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogPage((p) => Math.min(logPagination.totalPages, p + 1))}
                      disabled={logPage >= logPagination.totalPages || loadingLogs}
                      className="h-7 px-2 text-xs"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selected Log Details Modal */}
      {selectedLog && (
        <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Info className="w-4 h-4 text-blue-600" />
                Communication Audit Log Details
              </DialogTitle>
              <DialogDescription className="text-xs">
                Log ID: <span className="font-mono text-slate-700">{selectedLog.id}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Channel & Status</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="uppercase font-bold text-[10px]">{selectedLog.type}</Badge>
                    <Badge variant={selectedLog.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {selectedLog.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Recipient</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedLog.recipientName || 'Student'}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{selectedLog.recipient}</div>
                </div>

                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Purpose</div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">{selectedLog.category}</div>
                </div>

                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Dispatched</div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </div>
                  {selectedLog.retryCount > 0 && (
                    <div className="text-amber-600 text-[10px] mt-0.5">Resent {selectedLog.retryCount} time(s)</div>
                  )}
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900">
                  <div className="font-semibold text-[11px] flex items-center gap-1.5 mb-1 text-rose-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Delivery Failure Reason
                  </div>
                  <div className="font-mono text-[11px] whitespace-pre-wrap">{selectedLog.errorMessage}</div>
                </div>
              )}

              <div>
                <div className="text-slate-500 font-semibold mb-1 text-[11px]">Message Subject / Preview</div>
                <div className="p-2.5 bg-slate-100/70 dark:bg-slate-900 rounded border text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-pre-wrap">
                  {selectedLog.subject ? `Subject: ${selectedLog.subject}\n\n` : ''}
                  {selectedLog.content || '(No preview content)'}
                </div>
              </div>

              {selectedLog.metadata && (
                <div>
                  <div className="text-slate-500 font-semibold mb-1 text-[11px]">Dispatch Parameters (Payload)</div>
                  <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[10px] overflow-x-auto max-h-40 font-mono">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)} className="h-8">
                  Close
                </Button>
                <Button
                  size="sm"
                  variant={selectedLog.status === 'failed' ? 'default' : 'secondary'}
                  onClick={() => {
                    handleResend(selectedLog);
                    setSelectedLog(null);
                  }}
                  disabled={resendingId === selectedLog.id}
                  className={`h-8 font-semibold ${selectedLog.status === 'failed' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Resend Message Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
