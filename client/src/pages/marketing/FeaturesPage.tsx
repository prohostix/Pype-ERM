import {
  GraduationCap, TrendingUp, IndianRupee, Users, BookOpen, MessageSquare,
  ClipboardCheck, BarChart3, Check, ArrowRight,
} from 'lucide-react';
import { PREMIUM_CARD, ICON_CHIP } from '../cardStyles';
import { MarketingShell, PageHero, SectionHeading } from './MarketingShell';

const FEATURE_GROUPS = [
  {
    icon: GraduationCap, title: 'Admissions & Students',
    body: 'Take applications online and move each student from enquiry to enrollment without paperwork.',
    points: ['Online student application portal', 'Document upload and verification', 'Enrollment review and approval', 'Re-registration, exam registration and marks', 'Student portal'],
  },
  {
    icon: TrendingUp, title: 'Sales & Study Centers',
    body: 'Run your counselor team and partner network from one pipeline.',
    points: ['Lead pipeline and follow-ups', 'Counselor targets and incentives', 'Study-center registration by invitation link', 'Verification and approval workflow'],
  },
  {
    icon: IndianRupee, title: 'Finance & Collections',
    body: 'Built for how institutions collect fees.',
    points: ['Invoices and installment schedules', 'Payment links and reminders', 'GST settings and receipts', 'Study-center wallets', 'Overdue and upcoming receivables dashboard'],
  },
  {
    icon: Users, title: 'HR & Payroll',
    body: 'Attendance, leave and salary in one place, on the web and on mobile.',
    points: ['Biometric and mobile attendance with selfie and location', 'Leave workflows with approvals', 'Salary configuration and payroll batches', 'Early-exit and auto punch-out rules'],
  },
  {
    icon: BookOpen, title: 'Classes & Faculty',
    body: 'Keep academics organized for faculty and students.',
    points: ['Batches and lessons', 'Online sessions', 'Assessments and student progress', 'Faculty attendance'],
  },
  {
    icon: ClipboardCheck, title: 'Operations & Tasks',
    body: 'Make sure work gets done and nothing is lost.',
    points: ['Tasks and escalations', 'Complaints handling', 'Document dispatch and courier tracking', 'Asset management'],
  },
  {
    icon: MessageSquare, title: 'Communication',
    body: 'Reach students, staff and centers on the channel they use.',
    points: ['Email, SMS and WhatsApp', 'Announcements and polls', 'Meetings', 'Push notifications'],
  },
  {
    icon: BarChart3, title: 'Reports & Dashboards',
    body: 'Every role gets the numbers that matter to them.',
    points: ['Role-based dashboards', 'Admissions and conversion reports', 'Collections reports', 'Team performance'],
  },
];

export function FeaturesPage() {
  return (
    <MarketingShell>
      {openInquiry => (
        <>
          <PageHero
            title="Everything your institution needs,"
            accent="in one platform."
            sub="Admissions, sales, finance, HR, academics and operations share the same student and finance data, so teams stop re-entering it."
          >
            <button
              type="button"
              onClick={() => openInquiry()}
              className="inline-flex items-center gap-2 bg-[#54b947] hover:bg-[#439c36] text-white font-bold px-8 py-3.5 rounded-full shadow-lg shadow-[#54b947]/25 transition-colors"
            >
              Request a Demo <ArrowRight className="w-4 h-4" />
            </button>
          </PageHero>

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {FEATURE_GROUPS.map(({ icon: Icon, title, body, points }) => (
                <article key={title} className={`${PREMIUM_CARD} p-6 sm:p-8`}>
                  <div className={`w-12 h-12 mb-4 ${ICON_CHIP}`}><Icon className="w-6 h-6" /></div>
                  <h2 className="font-bold text-xl text-slate-900 mb-2">{title}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{body}</p>
                  <ul className="space-y-2">
                    {points.map(p => (
                      <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="w-4 h-4 text-[#54b947] mt-0.5 shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
            <SectionHeading title="Apps for web and mobile" sub="Staff mark attendance and manage work from the mobile app. Students apply and track progress from the web portal." />
          </section>
        </>
      )}
    </MarketingShell>
  );
}
