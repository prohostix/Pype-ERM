import { useState, useEffect, useRef } from 'react';
import { UploadCloud, Upload, Trash2, CheckCircle, GraduationCap, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:6478/api/v1';

const FALLBACK_COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91', country: 'India' },
  { code: '+1', label: '🇺🇸 +1', country: 'USA' },
  { code: '+44', label: '🇬🇧 +44', country: 'UK' },
  { code: '+971', label: '🇦🇪 +971', country: 'UAE' },
  { code: '+966', label: '🇸🇦 +966', country: 'Saudi Arabia' },
  { code: '+974', label: '🇶🇦 +974', country: 'Qatar' },
  { code: '+968', label: '🇴🇲 +968', country: 'Oman' },
  { code: '+973', label: '🇧🇭 +973', country: 'Bahrain' },
  { code: '+965', label: '🇰🇼 +965', country: 'Kuwait' },
  { code: '+60', label: '🇲🇾 +60', country: 'Malaysia' },
  { code: '+65', label: '🇸🇬 +65', country: 'Singapore' },
  { code: '+61', label: '🇦🇺 +61', country: 'Australia' },
  { code: '+49', label: '🇩🇪 +49', country: 'Germany' },
  { code: '+33', label: '🇫🇷 +33', country: 'France' },
  { code: '+39', label: '🇮🇹 +39', country: 'Italy' },
  { code: '+81', label: '🇯🇵 +81', country: 'Japan' },
  { code: '+86', label: '🇨🇳 +86', country: 'China' },
  { code: '+82', label: '🇰🇷 +82', country: 'South Korea' },
  { code: '+7', label: '🇷🇺 +7', country: 'Russia' },
  { code: '+55', label: '🇧🇷 +55', country: 'Brazil' },
  { code: '+27', label: '🇿🇦 +27', country: 'South Africa' },
  { code: '+234', label: '🇳🇬 +234', country: 'Nigeria' },
  { code: '+254', label: '🇰🇪 +254', country: 'Kenya' },
  { code: '+63', label: '🇵🇭 +63', country: 'Philippines' },
  { code: '+92', label: '🇵🇰 +92', country: 'Pakistan' },
  { code: '+880', label: '🇧🇩 +880', country: 'Bangladesh' },
  { code: '+94', label: '🇱🇰 +94', country: 'Sri Lanka' },
  { code: '+977', label: '🇳🇵 +977', country: 'Nepal' },
  { code: '+62', label: '🇮🇩 +62', country: 'Indonesia' },
  { code: '+66', label: '🇹🇭 +66', country: 'Thailand' },
  { code: '+84', label: '🇻🇳 +84', country: 'Vietnam' },
  { code: '+90', label: '🇹🇷 +90', country: 'Turkey' },
  { code: '+20', label: '🇪🇬 +20', country: 'Egypt' },
  { code: '+964', label: '🇮🇶 +964', country: 'Iraq' },
  { code: '+962', label: '🇯🇴 +962', country: 'Jordan' },
  { code: '+961', label: '🇱🇧 +961', country: 'Lebanon' },
  { code: '+98', label: '🇮🇷 +98', country: 'Iran' },
  { code: '+93', label: '🇦🇫 +93', country: 'Afghanistan' },
  { code: '+95', label: '🇲🇲 +95', country: 'Myanmar' },
  { code: '+256', label: '🇺🇬 +256', country: 'Uganda' },
  { code: '+255', label: '🇹🇿 +255', country: 'Tanzania' },
  { code: '+233', label: '🇬🇭 +233', country: 'Ghana' },
  { code: '+34', label: '🇪🇸 +34', country: 'Spain' },
  { code: '+351', label: '🇵🇹 +351', country: 'Portugal' },
  { code: '+31', label: '🇳🇱 +31', country: 'Netherlands' },
  { code: '+46', label: '🇸🇪 +46', country: 'Sweden' },
  { code: '+47', label: '🇳🇴 +47', country: 'Norway' },
  { code: '+45', label: '🇩🇰 +45', country: 'Denmark' },
  { code: '+358', label: '🇫🇮 +358', country: 'Finland' },
  { code: '+48', label: '🇵🇱 +48', country: 'Poland' },
  { code: '+41', label: '🇨🇭 +41', country: 'Switzerland' },
  { code: '+43', label: '🇦🇹 +43', country: 'Austria' },
  { code: '+32', label: '🇧🇪 +32', country: 'Belgium' },
  { code: '+353', label: '🇮🇪 +353', country: 'Ireland' },
  { code: '+64', label: '🇳🇿 +64', country: 'New Zealand' },
  { code: '+52', label: '🇲🇽 +52', country: 'Mexico' },
  { code: '+54', label: '🇦🇷 +54', country: 'Argentina' },
  { code: '+56', label: '🇨🇱 +56', country: 'Chile' },
  { code: '+57', label: '🇨🇴 +57', country: 'Colombia' },
  { code: '+51', label: '🇵🇪 +51', country: 'Peru' },
  { code: '+960', label: '🇲🇻 +960', country: 'Maldives' },
  { code: '+975', label: '🇧🇹 +975', country: 'Bhutan' },
  { code: '+853', label: '🇲🇴 +853', country: 'Macau' },
  { code: '+852', label: '🇭🇰 +852', country: 'Hong Kong' },
  { code: '+886', label: '🇹🇼 +886', country: 'Taiwan' },
];



function useCountryCodes() {
  const [codes, setCodes] = useState<{ code: string; label: string; country: string }[]>(FALLBACK_COUNTRY_CODES);

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API_BASE}/public/countries`)
      .then(res => {
        if (cancelled) return;
        const data = res.data.data;
        if (!data || !Array.isArray(data)) return;
        const parsed = data
          .filter(c => c.idd?.root)
          .map(c => {
            const suffix = c.idd.suffixes?.[0] || '';
            const dialCode = c.idd.root + suffix;
            return {
              code: dialCode,
              label: `${c.flag || ''} ${dialCode}`,
              country: c.name?.common || '',
            };
          })
          .filter(c => c.code.length >= 2)
          .sort((a, b) => {
            if (a.country === 'India') return -1;
            if (b.country === 'India') return 1;
            return a.country.localeCompare(b.country);
          });
        // Remove duplicates by code
        const unique = Array.from(new Map(parsed.map(c => [c.code, c])).values());
        if (unique.length > 0) setCodes(unique);
      })
      .catch(() => { /* keep FALLBACK_COUNTRY_CODES */ });
    return () => { cancelled = true; };
  }, []);

  return codes;
}

function PhoneInput({ value, onChange, required, label, placeholder, countryCodes }: {
  value: string; onChange: (val: string) => void; required?: boolean; label: string; placeholder?: string;
  countryCodes: { code: string; label: string; country: string }[];
}) {
  const [open, setOpen] = useState(false);
  // Parse existing value into code + number
  // Parse existing value into code + number
  const matchedCode = countryCodes.find(c => value.startsWith(c.code));
  const countryCode = matchedCode?.code || '+91';
  const phoneNumber = matchedCode ? value.slice(countryCode.length).replace(/\s/g, '') : value.replace(/^\+?\d{1,3}\s*/, '').replace(/\s/g, '');

  const handleCodeChange = (newCode: string) => {
    onChange(newCode + phoneNumber);
  };

  const handleNumberChange = (num: string) => {
    const digitsOnly = num.replace(/\D/g, '').slice(0, 10);
    onChange(countryCode + digitsOnly);
  };

  return (
    <div className="space-y-2">
      <Label className="text-slate-600 font-medium">{label} {required && <span className="text-red-500">*</span>}</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-11 w-[120px] shrink-0 justify-between border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/50 font-medium px-3"
            >
              {countryCode}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {countryCodes.map((c) => (
                    <CommandItem
                      key={c.code + c.country}
                      value={`${c.country} ${c.code}`}
                      onSelect={() => {
                        handleCodeChange(c.code);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-base">{c.label.split(' ')[0]}</span>
                      <span className="flex-1 truncate">{c.country}</span>
                      <span className="text-muted-foreground ml-auto">{c.code}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          className="h-11 flex-1 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10"
          value={phoneNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={placeholder || '10 digit number'}
          maxLength={10}
          inputMode="numeric"
          pattern="[0-9]*"
        />
      </div>
      {phoneNumber.length > 0 && phoneNumber.length < 10 && (
        <p className="text-xs text-amber-600">Please enter a 10-digit phone number ({10 - phoneNumber.length} more digits needed)</p>
      )}
    </div>
  );
}

const getFileUrl = (path: string | undefined | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const baseUrl = API_BASE.replace(/\/$/, '');

  let origin = '';
  let apiPath = baseUrl;

  if (baseUrl.startsWith('http')) {
    try {
      const parsed = new URL(baseUrl);
      origin = parsed.origin;
      apiPath = parsed.pathname.replace(/\/$/, '');
    } catch (e) { }
  }

  if (apiPath && path.startsWith(apiPath)) {
    return origin ? `${origin}${path}` : path;
  }

  if (path.startsWith('/')) {
    return `${baseUrl}${path}`;
  }
  return `${baseUrl}/${path}`;
};

interface Program {
  id: string;
  name: string;
  code: string;
  courseType: string;
  university: { name: string; code: string; logo?: string | null; enrollmentFormConfig?: any };
  feeStructures?: { allowInitialFee: boolean }[];
  specialisations?: string[];
}

interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface EnrollmentLinkConfig {
  requireDocuments: boolean;
  requirePhoto: boolean;
  [key: string]: any;
}

interface InviteData {
  organizationName: string;
  referrerName: string;
  programs: Program[];
  sessions?: Session[];
  token: string;
  enrollmentLinkConfig?: EnrollmentLinkConfig;
  specializations?: Record<string, string[]>;
}

export default function StudentApplicationPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('student_token') || urlParams.get('token');

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const countryCodes = FALLBACK_COUNTRY_CODES;

  const [form, setForm] = useState({
    studentName: '',
    studentEmail: '',
    studentPhone: '+91',
    studentAddress: '',
    programId: '',
    sessionId: '',
    specialisation: '',
    fatherName: '',
    dob: '',
    altPhone: '+91',
    pinCode: '',
    gender: '',
    category: '',
    religion: '',
    maritalStatus: '',
    employmentStatus: '',
    caste: '',
    motherName: '',
    motherPhone: '+91',
    fatherPhone: '+91',
    guardianName: '',
    familyPhone: '+91',
    paymentPlan: '',
    photo: '',
    documents: [] as any[],
  });
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid link — no token found.');
      setLoading(false);
      return;
    }
    axios.get(`${API_BASE}/public/student-apply/${token}`)
      .then(res => {
        setInviteData(res.data.data);
        if (res.data.data?.programs?.length === 1) {
          setForm(f => ({ ...f, programId: res.data.data.programs[0].id }));
        }
        // Auto-select session if only one exists
        if (res.data.data?.sessions?.length === 1) {
          setForm(f => ({ ...f, sessionId: res.data.data.sessions[0].id }));
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Invalid or expired link.');
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (form.programId && inviteData) {
      const selectedProgram = inviteData.programs.find(p => p.id === form.programId);
      if (selectedProgram?.specialisations && selectedProgram.specialisations.length > 0) {
        let allowedSpecializations = selectedProgram.specialisations;
        if (inviteData.specializations && inviteData.specializations[selectedProgram.id]?.length > 0) {
          allowedSpecializations = inviteData.specializations[selectedProgram.id];
        }

        if (allowedSpecializations.length === 1 && form.specialisation !== allowedSpecializations[0]) {
          setForm(f => ({ ...f, specialisation: allowedSpecializations[0] }));
        }
      }
    }
  }, [form.programId, inviteData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.programId) { setError('Please select a program'); return; }

    // Phone validation — must be exactly 10 digits (after country code)
    const phoneDigits = form.studentPhone.replace(/^\+\d{1,3}/, '').replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    const selectedProgram = inviteData?.programs.find(p => p.id === form.programId);
    if (selectedProgram?.specialisations && selectedProgram.specialisations.length > 0 && !form.specialisation) {
      setError('Please select a specialisation');
      return;
    }


    // Consent validation
    if (inviteData?.enrollmentLinkConfig?.requireConsent && !consentChecked) {
      setError('Please agree to the declaration / consent before submitting.');
      return;
    }


    setSubmitting(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/public/student-apply/${token}`, form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground">
              Your application has been received and is under review by our team. You will be contacted once it's processed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedProgram = inviteData?.programs.find(p => p.id === form.programId) || inviteData?.programs[0];

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 py-12 font-sans selection:bg-primary/20">
      <div className="w-full max-w-4xl relative">
        {/* Decorative background blur */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-pulse" />
        <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-12 flex flex-col items-center">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-slate-900/5 p-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {selectedProgram?.university?.logo ? (
                <img
                  src={getFileUrl(selectedProgram.university.logo)}
                  alt={selectedProgram.university.name}
                  className="w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <GraduationCap className="w-10 h-10 text-primary relative z-10" />
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight max-w-2xl mx-auto leading-tight text-balance break-words">
              {selectedProgram?.university?.name || inviteData?.organizationName}
            </h1>

            <div className="mt-5 flex flex-col items-center gap-4">
              <span className="px-5 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-bold tracking-wide border border-blue-200/60 shadow-sm">
                {selectedProgram?.name} {selectedProgram?.courseType ? `(${selectedProgram.courseType})` : ''}
              </span>

              <div className="inline-flex items-center gap-2 text-sm text-slate-500 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span>Referred by</span>
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200 uppercase">
                    {inviteData?.referrerName?.charAt(0) || 'U'}
                  </div>
                  {inviteData?.referrerName}
                </div>
                <span className="text-slate-300 mx-1">•</span>
                <span className="font-medium text-slate-700">{inviteData?.organizationName}</span>
              </div>
            </div>
          </div>

          <Card className="shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border-0 ring-1 ring-slate-900/5 bg-white/95 backdrop-blur-xl overflow-hidden rounded-3xl">
            <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-primary" />
            <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white border-b border-slate-100/80 pb-8 pt-10 px-10 text-center">
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">Student Application Form</CardTitle>
              <CardDescription className="text-base mt-3 font-medium text-slate-500">Please fill in your details accurately to apply for enrollment</CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-8 md:p-12">
              <form onSubmit={handleSubmit} className="space-y-12">
                {/* Admission Details */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg shadow-sm">
                      1
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">Admission Details</h3>
                      <p className="text-sm text-slate-500 font-medium">Select your program and preferences</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-0 sm:pl-14">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Program <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <select
                          value={form.programId}
                          onChange={e => setForm(f => ({ ...f, programId: e.target.value }))}
                          className="w-full h-11 px-3 py-2 bg-slate-50/50 border border-slate-200/80 rounded-md focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10 outline-none text-sm appearance-none"
                        >
                          <option value="" disabled>Select a program</option>
                          {inviteData?.programs.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {p.university.name} ({p.courseType})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {inviteData?.sessions && inviteData.sessions.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-slate-600 font-medium">Admission Session <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <select
                            value={form.sessionId}
                            onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))}
                            className="w-full h-11 px-3 py-2 bg-slate-50/50 border border-slate-200/80 rounded-md focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10 outline-none text-sm appearance-none"
                          >
                            <option value="" disabled>Select a session</option>
                            {inviteData.sessions.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({new Date(s.startDate).toLocaleDateString()} — {new Date(s.endDate).toLocaleDateString()})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {(() => {
                      if (!selectedProgram?.specialisations || selectedProgram.specialisations.length === 0) return null;

                      let allowedSpecializations = selectedProgram.specialisations;
                      if (inviteData?.specializations && inviteData.specializations[selectedProgram.id]?.length > 0) {
                        allowedSpecializations = inviteData.specializations[selectedProgram.id];
                      }

                      if (allowedSpecializations.length === 0) return null;

                      return (
                        <div className="space-y-2">
                          <Label className="text-slate-600 font-medium">Specialisation <span className="text-red-500">*</span></Label>
                          <div className="relative">
                            <select
                              value={form.specialisation}
                              onChange={e => setForm(f => ({ ...f, specialisation: e.target.value }))}
                              className="w-full h-11 px-3 py-2 bg-slate-50/50 border border-slate-200/80 rounded-md focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10 outline-none text-sm appearance-none"
                            >
                              <option value="" disabled>Select specialisation</option>
                              {allowedSpecializations.map((s: string) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      );
                    })()}
                    {/* {(() => {
                      let fs = selectedProgram?.feeStructures?.find(f => (f as any).specialisation === form.specialisation);
                      if (!fs && form.specialisation) {
                        fs = selectedProgram?.feeStructures?.find(f => !(f as any).specialisation);
                      }
                      if (!fs) fs = selectedProgram?.feeStructures?.[0];
                      return fs?.allowInitialFee;
                    })() && (
                      <div className="space-y-2">
                        <Label className="text-slate-600 font-medium">Payment Plan <span className="text-slate-400 font-normal text-xs ml-1">(Optional)</span></Label>
                        <Select value={form.paymentPlan} onValueChange={v => setForm(f => ({ ...f, paymentPlan: v }))}>
                          <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10">
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                          <SelectContent className="max-w-[85vw] sm:max-w-[400px]">
                            <SelectItem value="lumpsum">One-Time Payment (Lump Sum)</SelectItem>
                            <SelectItem value="installment">Installment Plan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )} */}
                  </div>
                </div>

                {/* Personal Details */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg shadow-sm">
                      2
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">Personal Details</h3>
                      <p className="text-sm text-slate-500 font-medium">Provide your identifying information</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-0 sm:pl-14">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Full Name <span className="text-red-500">*</span></Label>
                      <Input className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10" value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Your full name" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Email Address <span className="text-red-500">*</span></Label>
                      <Input className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10" type="email" value={form.studentEmail} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} placeholder="your@email.com" required />
                    </div>
                    <PhoneInput
                      label="Phone Number"
                      value={form.studentPhone}
                      onChange={(val) => setForm(f => ({ ...f, studentPhone: val }))}
                      required
                      countryCodes={countryCodes}
                    />
                    <PhoneInput
                      label="Alternative Phone"
                      value={form.altPhone}
                      onChange={(val) => setForm(f => ({ ...f, altPhone: val }))}
                      countryCodes={countryCodes}
                    />
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Date of Birth</Label>
                      <Input className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10" type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Gender</Label>
                      <div className="relative">
                        <select
                          value={form.gender}
                          onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                          className="w-full h-11 px-3 py-2 bg-slate-50/50 border border-slate-200/80 rounded-md focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10 outline-none text-sm appearance-none"
                        >
                          <option value="" disabled>Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Category</Label>
                      <div className="relative">
                        <select
                          value={form.category}
                          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                          className="w-full h-11 px-3 py-2 bg-slate-50/50 border border-slate-200/80 rounded-md focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10 outline-none text-sm appearance-none"
                        >
                          <option value="" disabled>Select</option>
                          <option value="General">General</option>
                          <option value="OBC">OBC</option>
                          <option value="SC">SC</option>
                          <option value="ST">ST</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Religion</Label>
                      <Input className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10" value={form.religion} onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} placeholder="e.g. Hindu, Muslim, Christian, etc." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Marital Status</Label>
                      <div className="relative">
                        <select
                          value={form.maritalStatus}
                          onChange={e => setForm(f => ({ ...f, maritalStatus: e.target.value }))}
                          className="w-full h-11 px-3 py-2 bg-slate-50/50 border border-slate-200/80 rounded-md focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10 outline-none text-sm appearance-none"
                        >
                          <option value="" disabled>Select</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Employment Status</Label>
                      <div className="relative">
                        <select
                          value={form.employmentStatus}
                          onChange={e => setForm(f => ({ ...f, employmentStatus: e.target.value }))}
                          className="w-full h-11 px-3 py-2 bg-slate-50/50 border border-slate-200/80 rounded-md focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10 outline-none text-sm appearance-none"
                        >
                          <option value="" disabled>Select</option>
                          <option value="Employed">Employed</option>
                          <option value="Unemployed">Unemployed</option>
                          <option value="Student">Student</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-slate-600 font-medium">Caste</Label>
                      <Input className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10" value={form.caste} onChange={e => setForm(f => ({ ...f, caste: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-0 sm:pl-14 pt-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-slate-600 font-medium">Address</Label>
                      <Input className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10" value={form.studentAddress} onChange={e => setForm(f => ({ ...f, studentAddress: e.target.value }))} placeholder="Your full residential address" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Pin Code</Label>
                      <Input className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10" value={form.pinCode} onChange={e => setForm(f => ({ ...f, pinCode: e.target.value }))} placeholder="Postal Code" />
                    </div>
                  </div>
                </div>

                {/* Family Details */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg shadow-sm">
                      3
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">Family Details</h3>
                      <p className="text-sm text-slate-500 font-medium">Contact info for your parents or guardians</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-0 sm:pl-14">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Father's Name</Label>
                      <Input className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10" value={form.fatherName} onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))} placeholder="Father's full name" />
                    </div>
                    <div className="space-y-2">
                      <PhoneInput
                        label="Father's Phone"
                        value={form.fatherPhone}
                        onChange={(val) => setForm(f => ({ ...f, fatherPhone: val }))}
                        countryCodes={countryCodes}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Mother's Name</Label>
                      <Input className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10" value={form.motherName} onChange={e => setForm(f => ({ ...f, motherName: e.target.value }))} placeholder="Mother's full name" />
                    </div>
                    <div className="space-y-2">
                      <PhoneInput
                        label="Mother's Phone"
                        value={form.motherPhone}
                        onChange={(val) => setForm(f => ({ ...f, motherPhone: val }))}
                        countryCodes={countryCodes}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Guardian's Name</Label>
                      <Input className="h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white hover:border-slate-300 transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] focus:shadow-[0_2px_15px_-3px_rgba(59,130,246,0.1)] focus:ring-4 focus:ring-blue-500/10" value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} placeholder="If applicable" />
                    </div>
                    <div className="space-y-2">
                      <PhoneInput
                        label="Family Phone"
                        value={form.familyPhone}
                        onChange={(val) => setForm(f => ({ ...f, familyPhone: val }))}
                        countryCodes={countryCodes}
                      />
                    </div>
                  </div>
                </div>

                {/* Document & Photo Upload */}
                {(inviteData?.enrollmentLinkConfig?.requirePhoto !== false || inviteData?.enrollmentLinkConfig?.requireDocuments !== false) && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg shadow-sm">
                        4
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Documents & Photo</h3>
                        <p className="text-sm text-slate-500 font-medium">Upload required verification documents</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-8 pl-0 sm:pl-14">

                      {/* Photo Upload */}
                      {inviteData?.enrollmentLinkConfig?.requirePhoto !== false && (
                        <div className="space-y-3 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                          <Label className="text-base font-semibold text-slate-800">Profile Photo</Label>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            {form.photo ? (
                              <div className="relative group cursor-pointer inline-block">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                                  <img src={getFileUrl(form.photo)} alt="Student" className="w-full h-full object-cover" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForm({ ...form, photo: '' })}
                                  className="absolute top-0 right-0 bg-rose-500 text-white rounded-full p-1.5 hover:bg-rose-600 transition-colors shadow-sm z-10 scale-0 group-hover:scale-100 origin-center duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center border-2 border-dashed border-slate-300 shadow-sm text-slate-400 hover:text-primary hover:border-primary/50 transition-colors">
                                <UploadCloud className="w-8 h-8" />
                              </div>
                            )}
                            <div className="flex-1 max-w-sm">
                              <Input
                                type="file"
                                accept="image/*"
                                className="text-sm bg-white h-11 cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const uploadData = new FormData();
                                    uploadData.append('file', e.target.files[0]);
                                    try {
                                      const res = await axios.post(`${API_BASE}/public/upload`, uploadData);
                                      setForm({ ...form, photo: res.data.url });
                                    } catch (err) {
                                      setError('Failed to upload photo');
                                    }
                                  }
                                }}
                              />
                              <p className="text-xs text-muted-foreground mt-2">Upload a clear passport-size photo (JPEG/PNG format, max 5MB)</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Documents Upload */}
                      {inviteData?.enrollmentLinkConfig?.requireDocuments !== false && (
                        <div className="space-y-4">
                          <div>
                            <Label className="text-base font-semibold text-slate-800">Supporting Documents</Label>
                            <p className="text-sm text-muted-foreground mt-1">Please upload the necessary certificates for verification</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'TC / Migration / Affidavit', 'Birth Certificate', 'Degree Certificate', 'Other'].map((docType) => {
                              const existing = (form.documents || []).find((d: any) => d.type === docType);
                              let requiredDocs: string[] = selectedProgram?.university?.enrollmentFormConfig?.requiredDocuments || [];
                              requiredDocs = requiredDocs.map(doc => doc === 'Transfer Certificate' ? 'TC / Migration / Affidavit' : doc);
                              const isMandatory = requiredDocs.includes(docType);
                              return (
                                <div key={docType} className="p-4 rounded-xl border border-slate-200/60 bg-white hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between group">
                                  <div className="flex justify-between items-start mb-4">
                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                                      {docType}
                                    </span>
                                    {existing?.url ? (
                                      <a
                                        href={getFileUrl(existing.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-md font-medium hover:bg-primary/20 flex items-center transition-colors"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Uploaded
                                      </a>
                                    ) : (
                                      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Pending</span>
                                    )}
                                  </div>
                                  <Input
                                    type="file"
                                    className="text-xs bg-slate-50 border-slate-200 h-9 cursor-pointer file:cursor-pointer file:h-full file:mr-2 file:px-3 file:border-0 file:bg-transparent file:text-slate-500 file:font-medium hover:bg-slate-100 transition-colors"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      try {
                                        const uploadData = new FormData();
                                        uploadData.append('file', file);
                                        const res = await axios.post(`${API_BASE}/public/upload`, uploadData);

                                        const newDocs = (form.documents || []).filter((d: any) => d.type !== docType);
                                        newDocs.push({ type: docType, url: res.data.url });
                                        setForm({ ...form, documents: newDocs });
                                      } catch (err) {
                                        setError(`Failed to upload ${docType}`);
                                      }
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}


                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                {inviteData?.enrollmentLinkConfig?.requireConsent && inviteData.enrollmentLinkConfig.consentText?.trim() && (
                  <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{inviteData.enrollmentLinkConfig.consentText}</p>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={consentChecked} 
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="mt-0.5 w-5 h-5 rounded border-amber-300 text-primary focus:ring-primary/30 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                        I have read, understood, and agree to the above declaration.
                      </span>
                    </label>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100/80">
                  <Button type="submit" className="w-full text-lg h-14 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white border-0" disabled={submitting}>
                    {submitting ? 'Submitting Application...' : 'Submit Application Form'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
