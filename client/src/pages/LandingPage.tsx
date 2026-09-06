import { useState } from 'react';
import { ArrowRight, Shield, Users, GraduationCap, DollarSign, Activity, FileText, CheckCircle, Play, Smartphone } from 'lucide-react';
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
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#7b68ee] selection:text-white overflow-hidden">
      
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 max-w-full w-full">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
              <img src="/pype-logo.png" alt="PYPE ERM Logo" className="w-6 h-6 object-contain invert brightness-0" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              PYPE<span className="text-[#7b68ee]">.</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Product</a>
            <a href="#solutions" className="hover:text-slate-900 transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/download"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 px-3 py-2 rounded-xl transition-all shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Get Mobile App</span>
            </a>
            <Button 
              variant="ghost" 
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-sm"
              onClick={onGoToLogin}
            >
              Log in
            </Button>
            <Button 
              className="bg-[#7b68ee] hover:bg-[#6a5acd] text-white font-bold px-6 rounded-xl shadow-lg shadow-[#7b68ee]/30 transition-transform active:scale-95"
              onClick={() => setOpenModal(true)}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 text-center flex-1 flex flex-col items-center justify-center">
        
        {/* Playful top badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-bold mb-8 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-[#7b68ee]"></span>
          The all-in-one ERM for Education
        </div>
        
        <h1 className="text-6xl md:text-[5.5rem] font-black tracking-tight text-slate-900 mb-8 leading-[1.1] max-w-5xl">
          One app to <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7b68ee] to-[#ff007f]">replace them all.</span>
        </h1>
        
        <p className="text-slate-500 text-xl md:text-2xl max-w-3xl mb-12 font-medium leading-relaxed">
          All your admissions, sales, HR, and fee collections in one beautifully simple platform. Tailor-made for Indian educational institutions.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-16 w-full sm:w-auto">
          <Button 
            className="bg-[#7b68ee] hover:bg-[#6a5acd] text-white text-lg font-bold px-10 py-7 rounded-2xl shadow-xl shadow-[#7b68ee]/25 hover:shadow-[#7b68ee]/40 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
            onClick={() => setOpenModal(true)}
          >
            Get Started <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button 
            variant="outline" 
            className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-lg font-bold px-10 py-7 rounded-2xl shadow-sm transition-all w-full sm:w-auto"
            onClick={onGoToLogin}
          >
            <Play className="w-5 h-5 mr-2 fill-current" /> Watch Demo
          </Button>
        </div>

        <div className="text-sm font-semibold text-slate-400 mb-12">
          TRUSTED BY 200+ INSTITUTIONS IN INDIA
        </div>

        {/* Dashboard Preview mockup (Light theme) */}
        <div className="relative w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/80 mx-auto transform hover:scale-[1.01] transition-transform duration-500">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#7b68ee] to-[#ff007f] rounded-3xl opacity-10 blur-xl pointer-events-none" />
          <div className="aspect-[16/9] bg-slate-50 rounded-2xl overflow-hidden flex flex-col border border-slate-100">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-100">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="ml-4 w-64 h-6 bg-slate-100 rounded-md"></div>
            </div>
            
            <div className="flex flex-1">
              {/* Sidebar */}
              <div className="w-64 bg-white border-r border-slate-100 p-4 hidden md:flex flex-col gap-3">
                <div className="h-8 w-32 bg-slate-100 rounded-lg mb-6"></div>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 w-full bg-slate-50 rounded-lg flex items-center px-3 gap-3">
                    <div className="w-5 h-5 rounded bg-slate-200"></div>
                    <div className="h-4 w-24 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
              
              {/* Main Content */}
              <div className="flex-1 p-8 bg-slate-50/50 flex flex-col text-left">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <div className="h-8 w-48 bg-slate-200 rounded-lg mb-2"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-10 w-32 bg-[#7b68ee] rounded-lg"></div>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { color: 'bg-blue-500' }, { color: 'bg-purple-500' }, { color: 'bg-emerald-500' }, { color: 'bg-amber-500' }
                  ].map((card, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3">
                      <div className={`w-10 h-10 rounded-xl ${card.color} bg-opacity-10 flex items-center justify-center mb-2`}>
                        <div className={`w-5 h-5 rounded-md ${card.color}`}></div>
                      </div>
                      <div className="h-6 w-16 bg-slate-200 rounded"></div>
                      <div className="h-3 w-24 bg-slate-100 rounded"></div>
                    </div>
                  ))}
                </div>

                {/* Table Mockup */}
                <div className="flex-1 rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
                   <div className="flex justify-between mb-6">
                     <div className="h-5 w-32 bg-slate-200 rounded"></div>
                     <div className="flex gap-2">
                       <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
                       <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
                     </div>
                   </div>
                   <div className="space-y-4">
                     {[1, 2, 3, 4].map(i => (
                       <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                         <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                           <div className="space-y-2">
                             <div className="h-4 w-32 bg-slate-200 rounded"></div>
                             <div className="h-3 w-20 bg-slate-100 rounded"></div>
                           </div>
                         </div>
                         <div className="h-6 w-24 bg-emerald-100 rounded-full"></div>
                         <div className="h-4 w-16 bg-slate-200 rounded"></div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
              Save time and get more done.
            </h2>
            <p className="text-slate-500 text-lg md:text-xl font-medium">
              Everything you need to manage your institution, brought together in a single intuitive workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <GraduationCap className="w-6 h-6 text-white" />,
                bg: 'bg-blue-500',
                title: 'Student Admissions',
                desc: 'Automated 4-step wizard for candidate profiles, document validation, and session-based class assignment.'
              },
              {
                icon: <Activity className="w-6 h-6 text-white" />,
                bg: 'bg-[#ff007f]',
                title: 'Sales & Leads',
                desc: 'Track student leads, generate referral links, check conversions, and secure enrollments seamlessly.'
              },
              {
                icon: <Users className="w-6 h-6 text-white" />,
                bg: 'bg-emerald-500',
                title: 'HR & Attendance',
                desc: 'Punch-in/out widgets, live leave request handling, and real-time headcounts across all your branches.'
              },
              {
                icon: <DollarSign className="w-6 h-6 text-white" />,
                bg: 'bg-amber-500',
                title: 'Fee Collections',
                desc: 'Generate customized invoice schedules, track overdue payments, and send automatic WhatsApp reminders.'
              },
              {
                icon: <FileText className="w-6 h-6 text-white" />,
                bg: 'bg-[#7b68ee]',
                title: 'Compliant Payroll',
                desc: 'Indian-compliant basic salary configs, automated allowances, deductions, and bulk monthly payslips.'
              },
              {
                icon: <Shield className="w-6 h-6 text-white" />,
                bg: 'bg-slate-800',
                title: 'Granular Security',
                desc: 'Enforce operational boundaries with custom permissions for Superadmin, Org Admin, Finance, and HR.'
              }
            ].map(feat => (
              <div key={feat.title} className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl ${feat.bg} flex items-center justify-center mb-6 shadow-md`}>
                  {feat.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{feat.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* India localization segment */}
      <section className="py-24 bg-slate-50 overflow-hidden relative">
        {/* Decorative background circle */}
        <div className="absolute -right-64 -top-64 w-[600px] h-[600px] bg-[#7b68ee]/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="bg-[#7b68ee] rounded-[3rem] p-10 md:p-16 flex flex-col lg:flex-row items-center gap-12 text-white shadow-2xl shadow-[#7b68ee]/20">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur text-white text-sm font-bold uppercase tracking-wider">
                <CheckCircle className="w-4 h-4" /> Built For India
              </div>
              <h2 className="text-4xl md:text-6xl font-black leading-tight">
                Designed for the way you work.
              </h2>
              <p className="text-white/80 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
                PYPE ERM integrates natively with local operational structures: support for the Indian Rupee (₹), Indian-standard salary structures, university affiliations, and localized study centre modules.
              </p>
              
              <ul className="space-y-4 pt-4">
                {[
                  'Standard Rupee (₹) local currency symbols',
                  'HRA, Travel, and Special Allowances built-in',
                  'WhatsApp integration for fee notifications',
                  'Dual-layered Study Centre and Affiliate branch mapping'
                ].map(item => (
                  <li key={item} className="flex items-center gap-4 text-white text-lg font-medium">
                    <div className="w-6 h-6 rounded-full bg-white text-[#7b68ee] flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              {[
                { val: '₹12Cr+', label: 'Fees Tracked' },
                { val: '20k+', label: 'Admissions' },
                { val: '99.9%', label: 'Uptime SLA' },
                { val: '100%', label: 'Cloud Hosted' }
              ].map(stat => (
                <div key={stat.label} className="p-8 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 text-center flex flex-col justify-center gap-2 aspect-square hover:bg-white/20 transition-colors">
                  <div className="text-4xl md:text-5xl font-black">{stat.val}</div>
                  <div className="text-sm md:text-base font-bold text-white/80 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-white text-center px-6">
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-8">Ready to get started?</h2>
        <p className="text-xl text-slate-500 font-medium mb-10 max-w-2xl mx-auto">Join hundreds of institutions that use PYPE ERM to manage their entire operation.</p>
        <Button 
          className="bg-[#7b68ee] hover:bg-[#6a5acd] text-white text-xl font-bold px-12 py-8 rounded-2xl shadow-xl shadow-[#7b68ee]/30 hover:shadow-[#7b68ee]/40 transition-all hover:-translate-y-1"
          onClick={() => setOpenModal(true)}
        >
          Sign up for free
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 pt-20 pb-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#7b68ee] flex items-center justify-center">
                  <img src="/pype-logo.png" alt="PYPE ERM Logo" className="w-5 h-5 object-contain invert brightness-0" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  PYPE.
                </span>
              </div>
              <p className="text-slate-500 font-medium max-w-xs">
                One app to replace them all. The ultimate ERM platform for modern educational institutions.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-3 text-slate-500 font-medium">
                <li><a href="#" className="hover:text-[#7b68ee]">Features</a></li>
                <li><a href="#" className="hover:text-[#7b68ee]">Pricing</a></li>
                <li><a href="#" className="hover:text-[#7b68ee]">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-3 text-slate-500 font-medium">
                <li><a href="#" className="hover:text-[#7b68ee]">About Us</a></li>
                <li><a href="#" className="hover:text-[#7b68ee]">Contact</a></li>
                <li><a href="#" className="hover:text-[#7b68ee]">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200 gap-4 text-slate-400 font-medium text-sm">
            <p>© {new Date().getFullYear()} PYPE ERM. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-600">Twitter</a>
              <a href="#" className="hover:text-slate-600">LinkedIn</a>
              <a href="#" className="hover:text-slate-600">Facebook</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Manage Organisation Form Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md bg-white border-slate-200 rounded-3xl p-8 shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black text-slate-900 text-left">Get Started</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-left mt-2">
              Fill in the details below to request setup assistance for your institution.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="orgName" className="text-slate-700 font-bold">Organisation Name</Label>
              <Input 
                id="orgName"
                placeholder="e.g. EduTech International"
                value={formData.orgName}
                onChange={e => setFormData(prev => ({ ...prev, orgName: e.target.value }))}
                className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#7b68ee] focus:ring-[#7b68ee]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adminName" className="text-slate-700 font-bold">Admin Name</Label>
              <Input 
                id="adminName"
                placeholder="e.g. Rajesh Kumar"
                value={formData.adminName}
                onChange={e => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#7b68ee] focus:ring-[#7b68ee]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 font-bold">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="rajesh@company.com"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#7b68ee] focus:ring-[#7b68ee]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-slate-700 font-bold">Phone Number</Label>
                <Input 
                  id="phone"
                  placeholder="e.g. +91 9876543210"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#7b68ee] focus:ring-[#7b68ee]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message" className="text-slate-700 font-bold">Additional Message (Optional)</Label>
              <Textarea 
                id="message"
                placeholder="Describe your requirements..."
                value={formData.message}
                onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="bg-slate-50 border-slate-200 focus:bg-white focus:border-[#7b68ee] focus:ring-[#7b68ee] min-h-[100px] resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => setOpenModal(false)}
                className="text-slate-500 hover:text-slate-700 font-bold h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={submitting}
                className="bg-[#7b68ee] hover:bg-[#6a5acd] text-white font-bold h-12 px-8 rounded-xl shadow-md active:scale-95 transition-all"
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
