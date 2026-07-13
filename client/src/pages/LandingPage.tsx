import { useState } from 'react';
import { ArrowRight, Shield, Users, GraduationCap, DollarSign, Activity, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';

export function LandingPage({ onGoToLogin }: { onGoToLogin: () => void }) {
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    orgName: '',
    adminName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/public/org-inquiry', formData);
      toast.success('Inquiry submitted successfully! Our team will contact you shortly.');
      setOpenModal(false);
      setFormData({ orgName: '', adminName: '', email: '', phone: '', message: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <img src="/pype-logo.png" alt="PYPE ERM Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            PYPE ERM
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            className="text-slate-300 hover:text-white hover:bg-slate-800/50 font-medium"
            onClick={onGoToLogin}
          >
            Sign In
          </Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 shadow-lg shadow-indigo-600/35 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            onClick={() => setOpenModal(true)}
          >
            Manage your Organisation
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
          <Activity className="w-3.5 h-3.5" /> Next-Gen Institution Management
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight max-w-4xl">
          Scale Your Educational Institution with{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
            AI-Ready ERM
          </span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          PYPE ERM streamlines student admissions, sales pipelines, HR, payroll, finance, and automated fee collections for colleges, schools, and coaching centres in India.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Button 
            className="bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-base font-bold px-8 py-6 h-auto shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:scale-[1.02] transition-all"
            onClick={onGoToLogin}
          >
            Launch Dashboard <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button 
            variant="outline" 
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/80 text-base font-bold px-8 py-6 h-auto"
            onClick={() => setOpenModal(true)}
          >
            Manage your Organisation
          </Button>
        </div>

        {/* Dashboard Preview mockup */}
        <div className="relative w-full max-w-5xl rounded-2xl border border-slate-700/80 bg-slate-950/80 p-3 shadow-2xl shadow-indigo-500/5">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-2xl opacity-10 blur-xl pointer-events-none" />
          <div className="flex items-center gap-2 px-3 pb-3 border-b border-slate-800">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <div className="text-xs text-slate-500 ml-4 font-mono select-none">https://pypeerm.com/dashboard</div>
          </div>
          <div className="aspect-[16/10] bg-slate-900 rounded-lg overflow-hidden flex flex-col p-6 text-left border border-slate-800/60">
            {/* Minimal mockup structure */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div className="h-6 w-32 bg-slate-800 rounded-md animate-pulse" />
              <div className="h-8 w-24 bg-indigo-600/20 text-indigo-400 rounded-md border border-indigo-500/20 text-xs font-extrabold flex items-center justify-center">PUBLIC PREVIEW</div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-6">
              {[
                { title: 'Total Headcount', val: '1,280', desc: 'Active students', color: 'text-indigo-400' },
                { title: 'Open Vacancies', val: '12', desc: 'Hiring positions', color: 'text-sky-400' },
                { title: 'Absent Today', val: '4', desc: 'Not checked in', color: 'text-amber-400' },
                { title: 'Present Today', val: '182', desc: 'Staff checked in', color: 'text-emerald-400' }
              ].map(card => (
                <div key={card.title} className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{card.title}</div>
                  <div className={`text-2xl font-black ${card.color}`}>{card.val}</div>
                  <div className="text-[10px] text-slate-500">{card.desc}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 flex-1">
              <div className="col-span-2 p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 flex flex-col justify-between">
                <div className="h-4 w-40 bg-slate-800 rounded animate-pulse" />
                <div className="space-y-2 mt-4">
                  <div className="h-3 w-full bg-slate-800/60 rounded" />
                  <div className="h-3 w-[90%] bg-slate-800/60 rounded" />
                  <div className="h-3 w-[95%] bg-slate-800/60 rounded" />
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 flex flex-col justify-between">
                <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
                <div className="h-20 w-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 mx-auto mt-4 animate-spin flex items-center justify-center">
                  <div className="text-[10px] text-slate-400 font-mono">92%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Unified Institutional Management
          </h2>
          <p className="text-slate-400 text-base md:text-lg">
            Say goodbye to fragmented tools. PYPE ERM unites every department under a single high-performance system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: <GraduationCap className="w-6 h-6 text-indigo-400" />,
              title: 'Student Admissions',
              desc: 'Automated 4-step wizard for candidate profiles, document validation, session-based class assignment, and onboarding.'
            },
            {
              icon: <Activity className="w-6 h-6 text-sky-400" />,
              title: 'Sales & BDE Pipeline',
              desc: 'Enables sales agents to track student leads, generate referral links, check conversions, and secure enrollments.'
            },
            {
              icon: <Users className="w-6 h-6 text-emerald-400" />,
              title: 'HR & Attendance Portal',
              desc: 'Punch-in/out widgets, live leave request handling, department manager assignment, and real-time headcounts.'
            },
            {
              icon: <DollarSign className="w-6 h-6 text-amber-400" />,
              title: 'Fee & Payment Collections',
              desc: 'Generate customized invoice schedules, track overdue payments, log follow-up remarks, and send notifications via WhatsApp.'
            },
            {
              icon: <FileText className="w-6 h-6 text-rose-400" />,
              title: 'Compliant Payroll System',
              desc: 'Indian-compliant basic salary configs, automated allowances, deduction counters, and bulk monthly payslip batches.'
            },
            {
              icon: <Shield className="w- purple-400" />,
              title: 'Role-Based Authorization',
              desc: 'Enforce operational boundaries with custom permissions for Superadmin, Org Admin, Finance, HR, Sales, and Collections.'
            }
          ].map(feat => (
            <div key={feat.title} className="p-6 rounded-2xl border border-slate-800 bg-slate-950/20 hover:border-slate-700/60 hover:bg-slate-900/30 transition-all duration-300 group">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 w-fit group-hover:scale-110 transition-transform mb-4">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* India localization segment */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-slate-800/60 bg-gradient-to-b from-transparent via-indigo-950/5 to-transparent rounded-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CheckCircle className="w-3.5 h-3.5" /> Specially Built For India
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
              Compliant with Indian Educational Workflows
            </h2>
            <p className="text-slate-400 leading-relaxed text-base">
              PYPE ERM integrates natively with local operational structures: support for the Indian Rupee (₹), Indian-standard salary structures (Basic + HRA + Deductions), university affiliations, and localized study centre modules.
            </p>
            <ul className="space-y-3">
              {[
                'Standard Rupee (₹) local currency symbols',
                'HRA, Travel, and Special Allowances built-in',
                'WhatsApp integration for fee notifications',
                'Dual-layered Study Centre and Affiliate branch mapping'
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-slate-300 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { val: '₹12Cr+', label: 'Fee Invoices Tracked' },
              { val: '20,000+', label: 'Student Admissions' },
              { val: '99.9%', label: 'Uptime SLA' },
              { val: '100%', label: 'Indian Cloud RDS Hosted' }
            ].map(stat => (
              <div key={stat.label} className="p-6 rounded-2xl border border-slate-850 bg-slate-950/40 text-center space-y-1">
                <div className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">{stat.val}</div>
                <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-10 mt-auto border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} PYPE ERM. All rights reserved. Designed for Indian educational organizations.
        </p>
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a>
          <a href="mailto:admin@pypeerm.com" className="hover:text-indigo-400 transition-colors">Support Email</a>
        </div>
      </footer>

      {/* Manage Organisation Form Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Manage your Organisation</DialogTitle>
            <DialogDescription className="text-slate-400">
              Fill in the details below to request setup or onboarding assistance for your educational institution.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="orgName" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Organisation Name</Label>
              <Input 
                id="orgName"
                placeholder="e.g. EduTech International"
                value={formData.orgName}
                onChange={e => setFormData(prev => ({ ...prev, orgName: e.target.value }))}
                className="mt-1 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="adminName" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Admin Name</Label>
              <Input 
                id="adminName"
                placeholder="e.g. Rajesh Kumar"
                value={formData.adminName}
                onChange={e => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                className="mt-1 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="rajesh@company.com"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Phone Number</Label>
                <Input 
                  id="phone"
                  placeholder="e.g. +91 9876543210"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="message" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Additional Message (Optional)</Label>
              <Textarea 
                id="message"
                placeholder="Describe your university affiliations, branches, or student capacity..."
                value={formData.message}
                onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="mt-1 bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500 min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => setOpenModal(false)}
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
