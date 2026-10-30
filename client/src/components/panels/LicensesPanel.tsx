import { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Building2, 
  Users, 
  School, 
  Search, 
  FileText, 
  Printer, 
  Sliders, 
  TrendingUp, 
  Check, 
  X,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Eye,
  Info,
  UserCheck,
  Download,
  History,
  Loader2
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import api from '@/lib/api';

export interface MonthEnrollmentItem {
  id: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  enrollmentNumber: string;
  programName: string;
  studyCenterId?: string | null;
  studyCenterName?: string | null;
  isPartnerEnrollment: boolean;
  enrollmentType: 'Academic Partner' | 'Direct Admission';
  enrolledAt: string;
  status: string;
  source: 'enrollment' | 'student';
}

export interface GeneratedBillItem {
  id: string;
  billNo: string;
  organizationId: string;
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  organizationAddress?: string;
  billingMonth: string; // e.g. "2026-10"
  billingMonthLabel: string; // e.g. "October 2026"
  generatedAt: string;
  status: 'paid' | 'unpaid';
  studentCount: number;
  partnerStudentCount?: number;
  directStudentCount?: number;
  totalStudentCount?: number;
  enrollments?: MonthEnrollmentItem[];
  academicPartner: {
    enabled: boolean;
    basePrice: number;
    perEnrollmentFee: number;
    studentCount?: number;
    enrollmentTotal: number;
    subtotal: number;
  };
  directEnrollment?: {
    perEnrollmentFee: number;
    studentCount: number;
    enrollmentTotal: number;
    subtotal: number;
  };
  academicCenter: {
    enabled: boolean;
    basePrice: number;
    subtotal: number;
  };
  totalAmount: number;
}

export interface OrganizationPlanItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string | null;
  status: string;
  licenseId?: string | null;
  license?: {
    id: string;
    name: string;
    tag?: string | null;
    price: number;
    perEnrollmentFee: number;
    features: string[];
    status: string;
  } | null;
  metadata?: {
    planConfig?: {
      planName?: string;
      academicPartnerBasePrice?: number;
      academicPartnerPerEnrollmentFee?: number;
      directPerEnrollmentFee?: number;
      academicCenterBasePrice?: number;
      features?: string[];
      status?: string;
    };
    billingConfig?: {
      academicPartnerBasePrice?: number;
      academicPartnerPerEnrollmentFee?: number;
      directPerEnrollmentFee?: number;
      academicCenterBasePrice?: number;
      features?: string[];
    };
    billHistory?: GeneratedBillItem[];
    [key: string]: any;
  } | null;
  selectedMonth?: string;
  monthEnrollmentCount?: number;
  monthPartnerEnrollmentCount?: number;
  monthDirectEnrollmentCount?: number;
  monthTotalEnrollmentCount?: number;
  _count?: {
    students?: number;
    enrollments?: number;
    users?: number;
    academicCenters?: number;
    studyCenters?: number;
  };
}

// Generate Month Options (Past 12 months, current, next 2)
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = -11; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${yyyy}-${mm}`;
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
};

export function LicensesPanel() {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [organizations, setOrganizations] = useState<OrganizationPlanItem[]>([]);
  const [billHistory, setBillHistory] = useState<GeneratedBillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Month selection for billing cycle (Defaults to current YYYY-MM)
  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthValue);
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const selectedMonthLabel = useMemo(() => {
    return monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
  }, [selectedMonth, monthOptions]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');

  // Configure Plan Dialog State
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationPlanItem | null>(null);
  const [planForm, setPlanForm] = useState({
    planName: '',
    academic_partners: true,
    academicPartnerBasePrice: '0',
    academicPartnerPerEnrollmentFee: '0',
    directPerEnrollmentFee: '0',
    academic_centers: true,
    academicCenterBasePrice: '0',
  });

  // Statement / Invoice Dialog State
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [statementData, setStatementData] = useState<{
    orgName: string;
    orgEmail: string;
    orgPhone: string;
    orgAddress: string;
    invoiceNo: string;
    billingMonthLabel: string;
    generatedAt: string;
    partnerEnabled: boolean;
    partnerBase: number;
    partnerPerEnrollment: number;
    partnerEnrollmentTotal: number;
    partnerSubtotal: number;
    directPerEnrollment: number;
    directEnrollmentTotal: number;
    centerEnabled: boolean;
    centerBase: number;
    centerSubtotal: number;
    studentCount: number;
    partnerStudentCount: number;
    directStudentCount: number;
    totalStudentCount: number;
    totalAmount: number;
    status: 'paid' | 'unpaid';
    enrollments?: MonthEnrollmentItem[];
  } | null>(null);

  // Month Enrollments Dialog State
  const [enrollmentsDialogOpen, setEnrollmentsDialogOpen] = useState(false);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentsSearch, setEnrollmentsSearch] = useState('');
  const [enrollmentsTypeFilter, setEnrollmentsTypeFilter] = useState<'all' | 'partner' | 'direct'>('all');
  const [activeOrgEnrollments, setActiveOrgEnrollments] = useState<{
    org: OrganizationPlanItem;
    month: string;
    monthLabel: string;
    partnerCount: number;
    directCount: number;
    list: MonthEnrollmentItem[];
  } | null>(null);

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth]);

  const fetchData = async (targetMonth = selectedMonth) => {
    setLoading(true);
    try {
      const [orgsRes, historyRes] = await Promise.all([
        api.get(`/organizations?month=${targetMonth}`),
        api.get('/organizations/bills/history'),
      ]);
      setOrganizations(orgsRes.data.data || []);
      setBillHistory(historyRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
      toast.error('Failed to load organization plans & bill history');
    } finally {
      setLoading(false);
    }
  };

  // Extract organization plan details for the selected billing month
  const getOrgPlanDetails = (org: OrganizationPlanItem) => {
    const planConfig = org.metadata?.planConfig || {};
    const billingConfig = org.metadata?.billingConfig || {};

    const planName = planConfig.planName || org.license?.name || `${org.name} Plan`;

    const features = Array.isArray(planConfig.features) 
      ? planConfig.features 
      : (Array.isArray(billingConfig.features) ? billingConfig.features : (Array.isArray(org.license?.features) ? org.license.features : ['academic_partners', 'academic_centers']));

    const hasAcademicPartners = features.includes('academic_partners');
    const hasAcademicCenters = features.includes('academic_centers');

    // Academic Partner: Base value + Per enrollment value
    const academicPartnerBasePrice = planConfig.academicPartnerBasePrice !== undefined
      ? Number(planConfig.academicPartnerBasePrice)
      : (billingConfig.academicPartnerBasePrice !== undefined ? Number(billingConfig.academicPartnerBasePrice) : 0);

    const academicPartnerPerEnrollmentFee = planConfig.academicPartnerPerEnrollmentFee !== undefined 
      ? Number(planConfig.academicPartnerPerEnrollmentFee) 
      : (billingConfig.academicPartnerPerEnrollmentFee !== undefined 
          ? Number(billingConfig.academicPartnerPerEnrollmentFee) 
          : Number(org.license?.perEnrollmentFee || 0));

    // Direct Admissions: Per enrollment value
    const directPerEnrollmentFee = planConfig.directPerEnrollmentFee !== undefined
      ? Number(planConfig.directPerEnrollmentFee)
      : (billingConfig.directPerEnrollmentFee !== undefined ? Number(billingConfig.directPerEnrollmentFee) : 0);

    // Academic Center: Base value
    const academicCenterBasePrice = planConfig.academicCenterBasePrice !== undefined
      ? Number(planConfig.academicCenterBasePrice)
      : (billingConfig.academicCenterBasePrice !== undefined ? Number(billingConfig.academicCenterBasePrice) : 0);

    // Check if bill for selected month has already been generated
    const orgHistory = org.metadata?.billHistory || [];
    const generatedBillForSelectedMonth = orgHistory.find(b => b.billingMonth === selectedMonth);

    // Partner students strictly billed under Academic Partner
    const partnerStudentCount = generatedBillForSelectedMonth 
      ? (generatedBillForSelectedMonth.partnerStudentCount ?? (generatedBillForSelectedMonth.academicPartner?.studentCount ?? generatedBillForSelectedMonth.studentCount))
      : (org.monthPartnerEnrollmentCount !== undefined ? org.monthPartnerEnrollmentCount : 0);

    const directStudentCount = generatedBillForSelectedMonth
      ? (generatedBillForSelectedMonth.directStudentCount ?? (generatedBillForSelectedMonth.directEnrollment?.studentCount ?? 0))
      : (org.monthDirectEnrollmentCount !== undefined ? org.monthDirectEnrollmentCount : 0);

    const totalStudentCount = generatedBillForSelectedMonth
      ? (generatedBillForSelectedMonth.totalStudentCount ?? (partnerStudentCount + directStudentCount))
      : (org.monthTotalEnrollmentCount !== undefined ? org.monthTotalEnrollmentCount : (partnerStudentCount + directStudentCount));

    // Calculations
    const partnerEnrollmentTotal = partnerStudentCount * academicPartnerPerEnrollmentFee;
    const effectivePartnerTotal = hasAcademicPartners ? (academicPartnerBasePrice + partnerEnrollmentTotal) : 0;
    const directEnrollmentTotal = directStudentCount * directPerEnrollmentFee;
    const effectiveCenterTotal = hasAcademicCenters ? academicCenterBasePrice : 0;
    const totalBill = effectivePartnerTotal + directEnrollmentTotal + effectiveCenterTotal;

    return {
      planName,
      academicPartnerBasePrice,
      academicPartnerPerEnrollmentFee,
      directPerEnrollmentFee,
      academicCenterBasePrice,
      hasAcademicPartners,
      hasAcademicCenters,
      studentCount: totalStudentCount,
      partnerStudentCount,
      directStudentCount,
      totalStudentCount,
      partnerEnrollmentTotal,
      directEnrollmentTotal,
      effectivePartnerTotal,
      effectiveCenterTotal,
      totalBill,
      generatedBillForSelectedMonth,
    };
  };

  // Open Configure Plan Dialog
  const handleOpenConfigure = (org: OrganizationPlanItem) => {
    setSelectedOrg(org);
    const details = getOrgPlanDetails(org);
    setPlanForm({
      planName: details.planName,
      academic_partners: details.hasAcademicPartners,
      academicPartnerBasePrice: details.academicPartnerBasePrice.toString(),
      academicPartnerPerEnrollmentFee: details.academicPartnerPerEnrollmentFee.toString(),
      directPerEnrollmentFee: details.directPerEnrollmentFee.toString(),
      academic_centers: details.hasAcademicCenters,
      academicCenterBasePrice: details.academicCenterBasePrice.toString(),
    });
    setConfigDialogOpen(true);
  };

  // Save Plan specifically for this Organization
  const handleSaveOrgPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    const features: string[] = [];
    if (planForm.academic_partners) features.push('academic_partners');
    if (planForm.academic_centers) features.push('academic_centers');

    const payload = {
      planName: planForm.planName.trim() || `${selectedOrg.name} Plan`,
      academicPartnerBasePrice: Number(planForm.academicPartnerBasePrice || 0),
      academicPartnerPerEnrollmentFee: Number(planForm.academicPartnerPerEnrollmentFee || 0),
      directPerEnrollmentFee: Number(planForm.directPerEnrollmentFee || 0),
      academicCenterBasePrice: Number(planForm.academicCenterBasePrice || 0),
      features,
    };

    try {
      await api.put(`/organizations/${selectedOrg.id}/license`, payload);
      toast.success(`Plan and pricing updated for ${selectedOrg.name}`);
      setConfigDialogOpen(false);
      fetchData(selectedMonth);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update organization plan');
    }
  };

  // Open Month Enrollments Dialog
  const handleOpenMonthEnrollments = async (org: OrganizationPlanItem) => {
    setActiveOrgEnrollments({
      org,
      month: selectedMonth,
      monthLabel: selectedMonthLabel,
      partnerCount: 0,
      directCount: 0,
      list: [],
    });
    setEnrollmentsDialogOpen(true);
    setEnrollmentsLoading(true);
    setEnrollmentsSearch('');
    setEnrollmentsTypeFilter('all');

    try {
      const res = await api.get(`/organizations/${org.id}/month-enrollments?month=${selectedMonth}`);
      const rawList: MonthEnrollmentItem[] = res.data.data || [];
      const partnerCount = res.data.partnerCount ?? rawList.filter(e => e.isPartnerEnrollment).length;
      const directCount = res.data.directCount ?? rawList.filter(e => !e.isPartnerEnrollment).length;

      setActiveOrgEnrollments({
        org,
        month: selectedMonth,
        monthLabel: res.data.billingMonthLabel || selectedMonthLabel,
        partnerCount,
        directCount,
        list: rawList,
      });
    } catch (err) {
      console.error('Failed to load month enrollments:', err);
      toast.error('Failed to load enrollments for this month');
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  // Generate Bill for Selected Month
  const handleGenerateBill = async (org: OrganizationPlanItem) => {
    setGeneratingId(org.id);
    try {
      const res = await api.post(`/organizations/${org.id}/generate-bill`, {
        billingMonth: selectedMonth,
      });
      const generatedBill: GeneratedBillItem = res.data.data;
      toast.success(`Bill generated for ${org.name} (${selectedMonthLabel})!`);

      // Open Statement Dialog for this bill
      handleViewStatementFromBill(generatedBill, org);
      fetchData(selectedMonth);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to generate bill');
    } finally {
      setGeneratingId(null);
    }
  };

  // Update Status of a historical bill
  const handleToggleBillStatus = async (bill: GeneratedBillItem) => {
    const nextStatus = bill.status === 'paid' ? 'unpaid' : 'paid';
    try {
      await api.patch(`/organizations/${bill.organizationId}/bills/${bill.id}/status`, {
        status: nextStatus,
      });
      toast.success(`Bill ${bill.billNo} marked as ${nextStatus.toUpperCase()}`);
      fetchData(selectedMonth);
    } catch (err) {
      console.error('Failed to update bill status:', err);
      toast.error('Failed to update status');
    }
  };

  // View Statement from Organization (Live preview or latest bill)
  const handleViewStatementFromOrg = async (org: OrganizationPlanItem) => {
    const details = getOrgPlanDetails(org);
    const existingBill = details.generatedBillForSelectedMonth;

    if (existingBill) {
      handleViewStatementFromBill(existingBill, org);
      return;
    }

    let enrollments: MonthEnrollmentItem[] = [];
    let partnerCount = details.partnerStudentCount;
    let directCount = details.directStudentCount;

    try {
      const res = await api.get(`/organizations/${org.id}/month-enrollments?month=${selectedMonth}`);
      enrollments = res.data.data || [];
      partnerCount = res.data.partnerCount ?? enrollments.filter(e => e.isPartnerEnrollment).length;
      directCount = res.data.directCount ?? enrollments.filter(e => !e.isPartnerEnrollment).length;
    } catch (err) {
      console.warn('Failed to load month enrollments for preview:', err);
    }

    const partnerTotal = partnerCount * details.academicPartnerPerEnrollmentFee;
    const directTotal = directCount * details.directPerEnrollmentFee;

    setStatementData({
      orgName: org.name,
      orgEmail: org.email,
      orgPhone: org.phone,
      orgAddress: org.address,
      invoiceNo: `PREVIEW-${selectedMonth.replace('-', '')}-${org.id.slice(0, 4).toUpperCase()}`,
      billingMonthLabel: selectedMonthLabel,
      generatedAt: new Date().toLocaleDateString(),
      partnerEnabled: details.hasAcademicPartners,
      partnerBase: details.academicPartnerBasePrice,
      partnerPerEnrollment: details.academicPartnerPerEnrollmentFee,
      partnerEnrollmentTotal: partnerTotal,
      partnerSubtotal: details.effectivePartnerTotal,
      directPerEnrollment: details.directPerEnrollmentFee,
      directEnrollmentTotal: directTotal,
      centerEnabled: details.hasAcademicCenters,
      centerBase: details.academicCenterBasePrice,
      centerSubtotal: details.effectiveCenterTotal,
      studentCount: partnerCount + directCount,
      partnerStudentCount: partnerCount,
      directStudentCount: directCount,
      totalStudentCount: partnerCount + directCount,
      totalAmount: details.totalBill,
      status: 'unpaid',
      enrollments,
    });
    setStatementDialogOpen(true);
  };

  // View Statement from exact Generated Bill
  const handleViewStatementFromBill = async (bill: GeneratedBillItem, orgFallback?: OrganizationPlanItem) => {
    let enrollments: MonthEnrollmentItem[] = bill.enrollments || [];

    if (!enrollments.length && bill.studentCount > 0) {
      try {
        const res = await api.get(`/organizations/${bill.organizationId}/month-enrollments?month=${bill.billingMonth}`);
        enrollments = res.data.data || [];
      } catch (err) {
        console.warn('Could not fetch enrollment fallback for bill:', err);
      }
    }

    const partnerCount = bill.partnerStudentCount ?? (bill.academicPartner?.studentCount ?? enrollments.filter(e => e.isPartnerEnrollment).length);
    const directCount = bill.directStudentCount ?? (bill.directEnrollment?.studentCount ?? enrollments.filter(e => !e.isPartnerEnrollment).length);
    const totalCount = bill.totalStudentCount ?? (partnerCount + directCount);

    const directFee = bill.directEnrollment?.perEnrollmentFee ?? 0;
    const directTotal = bill.directEnrollment?.enrollmentTotal ?? (directCount * directFee);

    setStatementData({
      orgName: bill.organizationName || orgFallback?.name || 'Institution',
      orgEmail: bill.organizationEmail || orgFallback?.email || '',
      orgPhone: bill.organizationPhone || orgFallback?.phone || '',
      orgAddress: bill.organizationAddress || orgFallback?.address || '',
      invoiceNo: bill.billNo,
      billingMonthLabel: bill.billingMonthLabel,
      generatedAt: new Date(bill.generatedAt).toLocaleDateString(),
      partnerEnabled: bill.academicPartner.enabled,
      partnerBase: bill.academicPartner.basePrice,
      partnerPerEnrollment: bill.academicPartner.perEnrollmentFee,
      partnerEnrollmentTotal: bill.academicPartner.enrollmentTotal,
      partnerSubtotal: bill.academicPartner.subtotal,
      directPerEnrollment: directFee,
      directEnrollmentTotal: directTotal,
      centerEnabled: bill.academicCenter.enabled,
      centerBase: bill.academicCenter.basePrice,
      centerSubtotal: bill.academicCenter.subtotal,
      studentCount: totalCount,
      partnerStudentCount: partnerCount,
      directStudentCount: directCount,
      totalStudentCount: totalCount,
      totalAmount: bill.totalAmount,
      status: bill.status,
      enrollments,
    });
    setStatementDialogOpen(true);
  };

  // 1-Click PDF Download directly from historical bill row
  const handleDownloadBillPDFFromRow = async (bill: GeneratedBillItem) => {
    await handleViewStatementFromBill(bill);
    setTimeout(() => {
      handleDownloadStatementPDF(bill.billNo);
    }, 400);
  };

  // Download PDF of the rendered statement
  const handleDownloadStatementPDF = (invoiceNo: string) => {
    const content = document.getElementById('statement-print-area');
    if (!content) {
      toast.error('Statement content not found');
      return;
    }

    const opt = {
      margin:       8,
      filename:     `Invoice_${invoiceNo || 'Statement'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      (html2pdf as any)().set(opt).from(content).save();
      toast.success(`Downloading PDF for invoice ${invoiceNo}...`);
    } catch (err) {
      console.error('PDF export error:', err);
      window.print();
    }
  };

  // Download CSV of itemized students
  const handleDownloadEnrollmentsCSV = (list: MonthEnrollmentItem[], fileName = 'Enrollments_List.csv') => {
    if (!list || list.length === 0) {
      toast.error('No enrollments to export');
      return;
    }
    const headers = ['#', 'Student Name', 'Email', 'Phone', 'Enrollment Number', 'Admission Channel', 'Study Center', 'Program', 'Enrolled Date', 'Status'];
    const rows = list.map((st, idx) => [
      idx + 1,
      `"${(st.studentName || '').replace(/"/g, '""')}"`,
      `"${(st.studentEmail || '').replace(/"/g, '""')}"`,
      `"${(st.studentPhone || '').replace(/"/g, '""')}"`,
      `"${(st.enrollmentNumber || '').replace(/"/g, '""')}"`,
      `"${st.isPartnerEnrollment ? 'Academic Partner' : 'Direct Admission'}"`,
      `"${(st.studyCenterName || (st.isPartnerEnrollment ? 'Partner Center' : 'Direct Admission')).replace(/"/g, '""')}"`,
      `"${(st.programName || '').replace(/"/g, '""')}"`,
      `"${st.enrolledAt ? new Date(st.enrolledAt).toLocaleDateString() : ''}"`,
      `"${st.status || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Enrollments list downloaded as CSV!');
  };

  // Aggregated Metrics
  const totalOrgs = organizations.length;
  const totalPartnerEnrollments = organizations.reduce((acc, org) => acc + getOrgPlanDetails(org).partnerStudentCount, 0);
  const totalDirectEnrollments = organizations.reduce((acc, org) => acc + getOrgPlanDetails(org).directStudentCount, 0);
  const totalCalculatedBilling = organizations.reduce((acc, org) => acc + getOrgPlanDetails(org).totalBill, 0);

  // Filtered Organizations
  const filteredOrgs = organizations.filter(org => {
    const details = getOrgPlanDetails(org);
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          org.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          details.planName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (featureFilter === 'partners' && !details.hasAcademicPartners) return false;
    if (featureFilter === 'centers' && !details.hasAcademicCenters) return false;
    if (featureFilter === 'both' && (!details.hasAcademicPartners || !details.hasAcademicCenters)) return false;

    return true;
  });

  // Filtered Bill History
  const filteredHistory = billHistory.filter(b => {
    if (historyMonthFilter !== 'all' && b.billingMonth !== historyMonthFilter) return false;
    if (historyStatusFilter !== 'all' && b.status !== historyStatusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return b.organizationName.toLowerCase().includes(q) || b.billNo.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Receipt className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Monthly Billing Cycles</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Pricings and Bills</h2>
          <p className="text-muted-foreground text-sm">
            Configure partner & direct pricing, generate monthly institutional bills, and review/download historical invoices.
          </p>
        </div>

        {/* Month Selector Control */}
        <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-xl border border-border/80">
          <Calendar className="w-4 h-4 text-primary ml-1 shrink-0" />
          <span className="text-xs font-semibold text-foreground shrink-0">Billing Month:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-8 text-xs font-bold w-[165px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label} {m.value === currentMonthValue && '(Current)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => fetchData(selectedMonth)}
            title="Refresh billing data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={val => setActiveTab(val as 'current' | 'history')}>
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="current" className="text-xs font-semibold">
            <Receipt className="w-3.5 h-3.5 mr-1.5" />
            Organizations & Plans ({selectedMonthLabel})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-semibold relative">
            <History className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            Bill History & Invoices
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {billHistory.length} bills
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Current Month Billing */}
        <TabsContent value="current" className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Organizations</p>
                  <p className="text-xl font-bold tracking-tight mt-0.5">{totalOrgs}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    Partner Students
                  </p>
                  <p className="text-xl font-bold tracking-tight mt-0.5 text-indigo-600 dark:text-indigo-400">
                    {totalPartnerEnrollments.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Via franchise study centers</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    Direct Admissions
                  </p>
                  <p className="text-xl font-bold tracking-tight mt-0.5 text-foreground">
                    {totalDirectEnrollments.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Enrolled directly at institution</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    {selectedMonthLabel} Volume
                  </p>
                  <p className="text-xl font-bold tracking-tight mt-0.5 text-emerald-600 dark:text-emerald-400">
                    ₹{totalCalculatedBilling.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Monthly total billing volume</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Feature Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border border-border/60">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search organization or email..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={featureFilter} onValueChange={setFeatureFilter}>
                <SelectTrigger className="h-9 text-xs w-[190px] bg-background">
                  <SelectValue placeholder="Filter Feature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  <SelectItem value="partners">Academic Partners Enabled</SelectItem>
                  <SelectItem value="centers">Academic Centers Enabled</SelectItem>
                  <SelectItem value="both">Both Features Enabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Organizations Table */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : filteredOrgs.length === 0 ? (
            <Card className="border-dashed p-12 text-center text-muted-foreground space-y-2">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-base font-semibold text-foreground">No organizations found</p>
              <p className="text-xs">Adjust your search query or filters.</p>
            </Card>
          ) : (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold text-xs">Organization</TableHead>
                    <TableHead className="font-semibold text-xs">Plan</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Academic Partner</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Direct Admissions</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Academic Center</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Enrollments ({selectedMonthLabel})</TableHead>
                    <TableHead className="font-semibold text-xs text-right">{selectedMonthLabel} Bill</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Cycle Status</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map(org => {
                    const details = getOrgPlanDetails(org);
                    const existingBill = details.generatedBillForSelectedMonth;
                    const orgHistory = (org.metadata as any)?.billHistory || [];

                    return (
                      <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                        {/* Organization info */}
                        <TableCell>
                          <div className="font-medium text-foreground text-sm flex items-center gap-2">
                            <span>{org.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[180px] mt-0.5">
                            {org.email}
                          </div>
                        </TableCell>

                        {/* Plan Name */}
                        <TableCell>
                          <Badge variant="outline" className="font-semibold text-xs border-indigo-200 text-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40 dark:text-indigo-300">
                            {details.planName}
                          </Badge>
                        </TableCell>

                        {/* Academic Partner */}
                        <TableCell className="text-center">
                          {details.hasAcademicPartners ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                                <Check className="w-3 h-3 text-indigo-600" /> Enabled
                              </span>
                              <span className="text-xs font-semibold text-foreground mt-0.5">
                                Base: ₹{details.academicPartnerBasePrice.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                + ₹{details.academicPartnerPerEnrollmentFee}/partner student
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-500">
                              <X className="w-3 h-3" /> Disabled
                            </span>
                          )}
                        </TableCell>

                        {/* Direct Admissions Fee */}
                        <TableCell className="text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-xs font-semibold text-foreground">
                              ₹{details.directPerEnrollmentFee}/student
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {details.directStudentCount} enrolled
                            </span>
                          </div>
                        </TableCell>

                        {/* Academic Center */}
                        <TableCell className="text-center">
                          {details.hasAcademicCenters ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <Check className="w-3 h-3 text-emerald-600" /> Enabled
                              </span>
                              <span className="text-xs font-semibold text-foreground mt-0.5">
                                Base: ₹{details.academicCenterBasePrice.toLocaleString('en-IN')}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-500">
                              <X className="w-3 h-3" /> Disabled
                            </span>
                          )}
                        </TableCell>

                        {/* Month Enrollments Breakdown */}
                        <TableCell className="text-right">
                          <div className="font-semibold text-xs text-foreground flex items-center justify-end gap-1.5">
                            <span className="text-indigo-600 dark:text-indigo-400">{details.partnerStudentCount} partner</span>
                            <span className="text-muted-foreground">+</span>
                            <span>{details.directStudentCount} direct</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Total: <strong>{details.totalStudentCount} students</strong>
                          </div>
                          <Button 
                            variant="link" 
                            size="sm"
                            className="h-auto p-0 text-[11px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium inline-flex items-center gap-1 mt-0.5"
                            onClick={() => handleOpenMonthEnrollments(org)}
                            title={`View itemized list for ${selectedMonthLabel}`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>View List</span>
                          </Button>
                        </TableCell>

                        {/* Total Bill & Subtotals */}
                        <TableCell className="text-right">
                          <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            ₹{details.totalBill.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                            P: ₹{details.effectivePartnerTotal.toLocaleString('en-IN')} | D: ₹{details.directEnrollmentTotal.toLocaleString('en-IN')} | C: ₹{details.effectiveCenterTotal.toLocaleString('en-IN')}
                          </div>
                        </TableCell>

                        {/* Bill Cycle Status */}
                        <TableCell className="text-center">
                          {existingBill ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Generated
                              </Badge>
                              <Badge 
                                variant={existingBill.status === 'paid' ? 'default' : 'secondary'} 
                                className={`text-[10px] px-1.5 py-0 capitalize ${
                                  existingBill.status === 'paid' 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}
                              >
                                {existingBill.status}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="text-[11px] text-muted-foreground font-normal">
                              Pending Generation
                            </Badge>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Generate / Regenerate Bill Button */}
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="h-8 text-xs px-2.5 shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => handleGenerateBill(org)}
                              disabled={generatingId === org.id}
                              title={`Generate Bill for ${selectedMonthLabel}`}
                            >
                              <Receipt className="w-3.5 h-3.5 mr-1" />
                              {existingBill ? 'Regenerate Bill' : 'Generate Bill'}
                            </Button>

                            {/* View History Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs px-2 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                              onClick={() => {
                                setSearchQuery(org.name);
                                setHistoryMonthFilter('all');
                                setActiveTab('history');
                              }}
                              title={`View all past bills for ${org.name}`}
                            >
                              <History className="w-3.5 h-3.5 mr-1" />
                              History ({orgHistory.length})
                            </Button>

                            {/* Configure Plan Button */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs px-2.5"
                              onClick={() => handleOpenConfigure(org)}
                              title="Configure pricing per feature and student enrollment"
                            >
                              <Sliders className="w-3.5 h-3.5 mr-1" /> Configure
                            </Button>

                            {/* View Statement Button */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => handleViewStatementFromOrg(org)}
                              title="View statement & invoice"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Historical Bills & Invoices */}
        <TabsContent value="history" className="space-y-4">
          {/* History Header & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border border-border/60">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search bill no or organization..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={historyMonthFilter} onValueChange={setHistoryMonthFilter}>
                <SelectTrigger className="h-9 text-xs w-[170px] bg-background">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Billing Months</SelectItem>
                  {monthOptions.map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                <SelectTrigger className="h-9 text-xs w-[130px] bg-background">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <Card className="border-dashed p-12 text-center text-muted-foreground space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-base font-semibold text-foreground">No historical bills found</p>
              <p className="text-xs">Generated monthly bills will be listed here with payment tracking and download options.</p>
            </Card>
          ) : (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold text-xs">Bill / Invoice #</TableHead>
                    <TableHead className="font-semibold text-xs">Organization</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Billing Month</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Academic Partner</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Direct Admissions</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Academic Center</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Total Amount</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Payment Status</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map(bill => {
                    const partnerCount = bill.partnerStudentCount ?? (bill.academicPartner?.studentCount ?? 0);
                    const directCount = bill.directStudentCount ?? (bill.directEnrollment?.studentCount ?? 0);
                    const directTotal = bill.directEnrollment?.enrollmentTotal ?? 0;

                    return (
                      <TableRow key={bill.id} className="hover:bg-muted/30">
                        {/* Bill No */}
                        <TableCell>
                          <div className="font-mono font-bold text-xs text-foreground">{bill.billNo}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(bill.generatedAt).toLocaleDateString()}
                          </div>
                        </TableCell>

                        {/* Organization */}
                        <TableCell>
                          <div className="font-medium text-xs text-foreground">
                            {bill.organizationName}
                          </div>
                          {bill.organizationEmail && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {bill.organizationEmail}
                            </div>
                          )}
                        </TableCell>

                        {/* Billing Month */}
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-medium text-xs bg-muted/60">
                            {bill.billingMonthLabel}
                          </Badge>
                        </TableCell>

                        {/* Academic Partner */}
                        <TableCell className="text-right">
                          {bill.academicPartner.enabled ? (
                            <div>
                              <div className="font-semibold text-xs text-indigo-700 dark:text-indigo-300">
                                ₹{bill.academicPartner.subtotal.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Base: ₹{bill.academicPartner.basePrice} + Usage ({partnerCount} sts): ₹{bill.academicPartner.enrollmentTotal}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Disabled</span>
                          )}
                        </TableCell>

                        {/* Direct Admissions */}
                        <TableCell className="text-right">
                          <div className="font-semibold text-xs text-foreground">
                            ₹{directTotal.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {directCount} direct students @ ₹{bill.directEnrollment?.perEnrollmentFee ?? 0}
                          </div>
                        </TableCell>

                        {/* Academic Center */}
                        <TableCell className="text-right">
                          {bill.academicCenter.enabled ? (
                            <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-300">
                              ₹{bill.academicCenter.subtotal.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Disabled</span>
                          )}
                        </TableCell>

                        {/* Total Amount */}
                        <TableCell className="text-right">
                          <span className="font-bold text-sm text-foreground">
                            ₹{bill.totalAmount.toLocaleString('en-IN')}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          <button 
                            onClick={() => handleToggleBillStatus(bill)}
                            title="Click to toggle Paid / Unpaid"
                            className="focus:outline-none"
                          >
                            <Badge 
                              variant={bill.status === 'paid' ? 'default' : 'secondary'} 
                              className={`cursor-pointer capitalize text-[10px] px-2 py-0.5 ${
                                bill.status === 'paid' 
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {bill.status}
                            </Badge>
                          </button>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs px-2.5"
                              onClick={() => handleViewStatementFromBill(bill)}
                              title="View Invoice Statement"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" /> View Invoice
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs px-2 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                              onClick={() => handleDownloadBillPDFFromRow(bill)}
                              title="Download Invoice as PDF"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" /> PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: Configure Plan Per Organization */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Plan: {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Configure base pricing and per-enrollment fees for Academic Partners, Direct Admissions, and Academic Centers.
            </DialogDescription>
          </DialogHeader>

          {selectedOrg && (() => {
            const partnerCount = selectedOrg.monthPartnerEnrollmentCount ?? 0;
            const directCount = selectedOrg.monthDirectEnrollmentCount ?? 0;

            const partnerBase = planForm.academic_partners ? Number(planForm.academicPartnerBasePrice || 0) : 0;
            const partnerPerFee = planForm.academic_partners ? Number(planForm.academicPartnerPerEnrollmentFee || 0) : 0;
            const partnerEnrollmentTotal = partnerCount * partnerPerFee;
            const partnerSubtotal = partnerBase + partnerEnrollmentTotal;

            const directPerFee = Number(planForm.directPerEnrollmentFee || 0);
            const directEnrollmentTotal = directCount * directPerFee;

            const centerBase = planForm.academic_centers ? Number(planForm.academicCenterBasePrice || 0) : 0;
            const previewTotalBill = partnerSubtotal + directEnrollmentTotal + centerBase;

            return (
              <form onSubmit={handleSaveOrgPlan} className="space-y-4 pt-1">
                {/* Organization Snapshot Bar */}
                <div className="p-3 rounded-xl border bg-muted/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">{selectedMonthLabel} Enrollments:</span>
                    <span className="font-bold text-foreground ml-1.5 text-sm">
                      {partnerCount} partner + {directCount} direct ({partnerCount + directCount} total)
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Campus Centers:</span>
                    <span className="font-semibold text-foreground ml-1.5">{selectedOrg._count?.academicCenters || 0}</span>
                  </div>
                </div>

                {/* Plan Identifier */}
                <div className="space-y-1.5">
                  <Label>Plan Name / Tier Identifier *</Label>
                  <Input 
                    value={planForm.planName} 
                    onChange={e => setPlanForm({ ...planForm, planName: e.target.value })} 
                    placeholder="e.g. Standard Academic Plan, Franchise Growth Tier" 
                    required 
                  />
                </div>

                {/* FEATURE 1: Academic Partner (Base Value + Value Per Partner Enrollment) */}
                <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/30 dark:bg-indigo-950/20 dark:border-indigo-900/60 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Academic Partner</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Franchise study center portal, student allocations, and center wallet top-ups
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={planForm.academic_partners} 
                      onCheckedChange={checked => setPlanForm({ ...planForm, academic_partners: checked })} 
                    />
                  </div>

                  {planForm.academic_partners && (
                    <div className="pt-3 border-t border-indigo-200/60 dark:border-indigo-900/50 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                            Base Value (₹) *
                          </Label>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            value={planForm.academicPartnerBasePrice} 
                            onChange={e => setPlanForm({ ...planForm, academicPartnerBasePrice: e.target.value })} 
                            placeholder="e.g. 10000" 
                            className="bg-white dark:bg-slate-900 font-semibold"
                            required 
                          />
                          <p className="text-[10px] text-muted-foreground">Fixed periodic fee for Academic Partner</p>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                            Rate Per Partner Student (₹) *
                          </Label>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            value={planForm.academicPartnerPerEnrollmentFee} 
                            onChange={e => setPlanForm({ ...planForm, academicPartnerPerEnrollmentFee: e.target.value })} 
                            placeholder="e.g. 50" 
                            className="bg-white dark:bg-slate-900 font-semibold"
                            required 
                          />
                          <p className="text-[10px] text-muted-foreground">Charged per student enrolled via Academic Partner centers</p>
                        </div>
                      </div>

                      <div className="text-xs text-indigo-900/80 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-lg flex items-center justify-between">
                        <span>Partner Subtotal:</span>
                        <strong>₹{partnerBase.toLocaleString('en-IN')} (Base) + ({partnerCount} partner students × ₹{partnerPerFee}) = ₹{partnerSubtotal.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* FEATURE 2: Direct Student Admissions Pricing */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:bg-slate-900/40 dark:border-slate-800 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Direct Admissions (Institution Admissions)</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Students admitted directly via main campus / online desk (non-partner admissions)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-foreground">
                        Rate Per Direct Student (₹)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Set ₹0 if direct enrollments are exempt</p>
                    </div>
                    <div className="w-44 shrink-0">
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={planForm.directPerEnrollmentFee} 
                        onChange={e => setPlanForm({ ...planForm, directPerEnrollmentFee: e.target.value })} 
                        placeholder="e.g. 25 or 0" 
                        className="bg-white dark:bg-slate-900 font-semibold"
                        required 
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-800 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span>Direct Admissions Total:</span>
                    <strong>{directCount} direct students × ₹{directPerFee} = ₹{directEnrollmentTotal.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* FEATURE 3: Academic Center (Base Value Only) */}
                <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/60 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <School className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Academic Center</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Physical center venues, offline classroom batches, and venue scheduling
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={planForm.academic_centers} 
                      onCheckedChange={checked => setPlanForm({ ...planForm, academic_centers: checked })} 
                    />
                  </div>

                  {planForm.academic_centers && (
                    <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-900/50 flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                          Base Value (₹) *
                        </Label>
                        <p className="text-[11px] text-muted-foreground">Fixed base fee for Academic Center</p>
                      </div>
                      <div className="w-44 shrink-0">
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          value={planForm.academicCenterBasePrice} 
                          onChange={e => setPlanForm({ ...planForm, academicCenterBasePrice: e.target.value })} 
                          placeholder="e.g. 5000" 
                          className="bg-white dark:bg-slate-900 font-semibold"
                          required 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Bill Preview Box */}
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-800 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Monthly Calculation Preview ({selectedMonthLabel})
                  </p>
                  <div className="flex items-baseline justify-between">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>
                        Academic Partner: {planForm.academic_partners ? `₹${partnerBase.toLocaleString('en-IN')} (Base) + (${partnerCount} partner × ₹${partnerPerFee}) = ₹${partnerSubtotal.toLocaleString('en-IN')}` : 'Disabled (₹0)'}
                      </div>
                      <div>
                        Direct Admissions: {directCount} direct × ₹{directPerFee} = ₹{directEnrollmentTotal.toLocaleString('en-IN')}
                      </div>
                      <div>
                        Academic Center: {planForm.academic_centers ? `₹${centerBase.toLocaleString('en-IN')} (Base)` : 'Disabled (₹0)'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                        ₹{previewTotalBill.toLocaleString('en-IN')}
                      </span>
                      <p className="text-[10px] text-muted-foreground">monthly total</p>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Organization Plan</Button>
                </DialogFooter>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Statement / Invoice Preview */}
      <Dialog open={statementDialogOpen} onOpenChange={setStatementDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:p-0">
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle>Billing Statement / Invoice</DialogTitle>
                <DialogDescription>
                  Itemized statement of Academic Partner, Direct Admissions, and Academic Center components.
                </DialogDescription>
              </div>
              {statementData && (
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
                    onClick={() => handleDownloadStatementPDF(statementData.invoiceNo)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" /> Print
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {statementData && (
            <>
              <div id="statement-print-area" className="space-y-6 p-6 bg-white text-slate-900 rounded-xl print:p-0">
              {/* Invoice Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-primary">Pype ERM</h3>
                  <p className="text-xs text-muted-foreground">Institutional Software Subscription & Feature Licensing</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-mono font-bold text-sm text-foreground">{statementData.invoiceNo}</p>
                  <p className="text-muted-foreground">Billing Month: <strong className="text-foreground">{statementData.billingMonthLabel}</strong></p>
                  <p className="text-muted-foreground">Date: {statementData.generatedAt}</p>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Billed To:</span>
                  <p className="font-bold text-sm text-foreground mt-0.5">{statementData.orgName}</p>
                  <p className="text-muted-foreground">{statementData.orgAddress || 'Campus Address Not Provided'}</p>
                  <p className="text-muted-foreground">{statementData.orgEmail}</p>
                  <p className="text-muted-foreground">{statementData.orgPhone}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Cycle Status:</span>
                  <div className="mt-1">
                    <Badge variant={statementData.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                      {statementData.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Total Month Students: <strong className="text-foreground">{statementData.totalStudentCount}</strong>
                    <span className="text-[11px] text-muted-foreground block">
                      ({statementData.partnerStudentCount} partner + {statementData.directStudentCount} direct)
                    </span>
                  </p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Feature / Component</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Status / Count</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Rate / Usage</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Academic Partner Base */}
                    <TableRow>
                      <TableCell>
                        <div className="font-semibold text-xs">Academic Partner — Base Value</div>
                        <div className="text-[11px] text-muted-foreground">Franchise study center portal and center wallet system</div>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {statementData.partnerEnabled ? (
                          <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">Enabled</Badge>
                        ) : (
                          <span className="text-muted-foreground">Disabled</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {statementData.partnerEnabled ? `₹${statementData.partnerBase.toLocaleString('en-IN')}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        ₹{(statementData.partnerEnabled ? statementData.partnerBase : 0).toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>

                    {/* Academic Partner Per Enrollment */}
                    <TableRow>
                      <TableCell>
                        <div className="font-semibold text-xs">Academic Partner — Partner Enrollments</div>
                        <div className="text-[11px] text-muted-foreground">
                          Students enrolled via partner centers in {statementData.billingMonthLabel}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {statementData.partnerEnabled ? (
                          <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                            {statementData.partnerStudentCount} partner students
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {statementData.partnerEnabled ? `₹${statementData.partnerPerEnrollment} / partner student` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        ₹{(statementData.partnerEnabled ? statementData.partnerEnrollmentTotal : 0).toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>

                    {/* Direct Admissions Per Enrollment */}
                    <TableRow>
                      <TableCell>
                        <div className="font-semibold text-xs">Direct Admissions — Per Enrollment Value</div>
                        <div className="text-[11px] text-muted-foreground">
                          Direct institutional admissions in {statementData.billingMonthLabel}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="font-semibold text-foreground">
                          {statementData.directStudentCount} direct students
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        ₹{statementData.directPerEnrollment} / direct student
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        ₹{statementData.directEnrollmentTotal.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>

                    {/* Academic Center Base */}
                    <TableRow>
                      <TableCell>
                        <div className="font-semibold text-xs">Academic Center — Base Value</div>
                        <div className="text-[11px] text-muted-foreground">Physical center venues, offline classroom batches, and scheduling</div>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {statementData.centerEnabled ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Enabled</Badge>
                        ) : (
                          <span className="text-muted-foreground">Disabled</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {statementData.centerEnabled ? `₹${statementData.centerBase.toLocaleString('en-IN')}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        ₹{(statementData.centerEnabled ? statementData.centerBase : 0).toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-end pt-2">
                <div className="w-80 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Academic Partner Subtotal:</span>
                    <span>₹{statementData.partnerSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Direct Admissions Total:</span>
                    <span>₹{statementData.directEnrollmentTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Academic Center Subtotal:</span>
                    <span>₹{statementData.centerSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-foreground pt-2 border-t">
                    <span>Total Monthly Bill:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">₹{statementData.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Enrolled Students for this Billing Period */}
              <div className="space-y-2.5 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      Enrolled Students in {statementData.billingMonthLabel} ({statementData.totalStudentCount})
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {statementData.partnerStudentCount} via Academic Partners (₹{statementData.partnerEnrollmentTotal}) • {statementData.directStudentCount} Direct Admissions (₹{statementData.directEnrollmentTotal})
                    </p>
                  </div>
                </div>

                {statementData.enrollments && statementData.enrollments.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-[11px] h-8 font-semibold w-10">#</TableHead>
                          <TableHead className="text-[11px] h-8 font-semibold">Student Name</TableHead>
                          <TableHead className="text-[11px] h-8 font-semibold">Enrollment #</TableHead>
                          <TableHead className="text-[11px] h-8 font-semibold">Enrollment Channel / Center</TableHead>
                          <TableHead className="text-[11px] h-8 font-semibold">Program</TableHead>
                          <TableHead className="text-[11px] h-8 font-semibold text-right">Enrolled Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementData.enrollments.map((st, idx) => (
                          <TableRow key={st.id || idx} className="text-xs print:break-inside-avoid">
                            <TableCell className="py-1.5 text-[11px] text-muted-foreground font-mono">{idx + 1}</TableCell>
                            <TableCell className="py-1.5 font-medium text-foreground">
                              <div>{st.studentName}</div>
                              <div className="text-[10px] text-muted-foreground">{st.studentEmail}</div>
                            </TableCell>
                            <TableCell className="py-1.5 font-mono text-[11px]">{st.enrollmentNumber}</TableCell>
                            <TableCell className="py-1.5">
                              {st.isPartnerEnrollment ? (
                                <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                                  Partner: {st.studyCenterName || 'Study Center'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                  Direct Admission
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 text-[11px]">
                              {st.programName}
                            </TableCell>
                            <TableCell className="py-1.5 text-right text-[11px] text-muted-foreground">
                              {st.enrolledAt ? new Date(st.enrolledAt).toLocaleDateString() : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No student enrollments recorded for this billing period.
                  </div>
                )}
              </div>

              {/* Official Attestation Footer inside PDF document */}
              <div className="pt-4 border-t border-dashed flex items-center justify-between text-[11px] text-muted-foreground">
                <div>
                  This is an official computer-generated billing statement from <strong>Pype ERM</strong>.
                </div>
                <div>
                  Generated on {statementData.generatedAt}
                </div>
              </div>
            </div>

            {/* Statement Dialog Footer (UI controls OUTSIDE the printable PDF area) */}
            <DialogFooter className="print:hidden pt-4 flex items-center justify-between sm:justify-between border-t mt-4">
              <div>
                {statementData.enrollments && statementData.enrollments.length > 0 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-9 text-xs"
                    onClick={() => handleDownloadEnrollmentsCSV(statementData.enrollments!, `Enrollments_${statementData.invoiceNo}.csv`)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download Enrollments (CSV)
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => setStatementDialogOpen(false)}>Close</Button>
                <Button 
                  type="button" 
                  size="sm" 
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" 
                  onClick={() => handleDownloadStatementPDF(statementData.invoiceNo)}
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download PDF
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-1.5" /> Print
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Month Enrollments Dialog */}
      <Dialog open={enrollmentsDialogOpen} onOpenChange={setEnrollmentsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <DialogTitle>
                Enrollments: {activeOrgEnrollments?.org.name} ({activeOrgEnrollments?.monthLabel})
              </DialogTitle>
            </div>
            <DialogDescription>
              Review all student enrollments for this monthly billing cycle, distinguishing between Academic Partner centers and Direct Admissions.
            </DialogDescription>
          </DialogHeader>

          {activeOrgEnrollments && (() => {
            const { org, monthLabel, list } = activeOrgEnrollments;
            const details = getOrgPlanDetails(org);

            const filteredList = list.filter(s => {
              if (enrollmentsTypeFilter === 'partner' && !s.isPartnerEnrollment) return false;
              if (enrollmentsTypeFilter === 'direct' && s.isPartnerEnrollment) return false;

              if (!enrollmentsSearch) return true;
              const q = enrollmentsSearch.toLowerCase();
              return (
                s.studentName.toLowerCase().includes(q) ||
                s.studentEmail.toLowerCase().includes(q) ||
                s.enrollmentNumber.toLowerCase().includes(q) ||
                s.programName.toLowerCase().includes(q) ||
                (s.studyCenterName && s.studyCenterName.toLowerCase().includes(q))
              );
            });

            const partnerCount = list.filter(e => e.isPartnerEnrollment).length;
            const directCount = list.filter(e => !e.isPartnerEnrollment).length;

            return (
              <div className="space-y-4 pt-1">
                {/* Information Callout */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-900/40 p-3 flex items-start gap-2.5 text-xs">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-muted-foreground">
                    <strong className="text-foreground">Monthly Enrollment Breakdown: </strong>
                    Academic Partner enrollments are billed at ₹{details.academicPartnerPerEnrollmentFee}/partner student. Direct admissions are billed at ₹{details.directPerEnrollmentFee}/direct student.
                  </div>
                </div>

                {/* Summary Banner with Type Filters */}
                <div className="p-3.5 rounded-xl border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEnrollmentsTypeFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        enrollmentsTypeFilter === 'all' 
                          ? 'bg-foreground text-background shadow-xs' 
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      All ({list.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrollmentsTypeFilter('partner')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        enrollmentsTypeFilter === 'partner' 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Academic Partners ({partnerCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrollmentsTypeFilter('direct')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        enrollmentsTypeFilter === 'direct' 
                          ? 'bg-slate-700 text-white shadow-xs' 
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Direct Admissions ({directCount})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Search student, email, enroll #..."
                      value={enrollmentsSearch}
                      onChange={e => setEnrollmentsSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                {/* Billed Partner & Direct Usage Summary */}
                <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
                  <div>
                    Partner Students: <strong className="text-foreground">{partnerCount}</strong> × ₹{details.academicPartnerPerEnrollmentFee} = <strong className="text-indigo-600 dark:text-indigo-400">₹{(partnerCount * details.academicPartnerPerEnrollmentFee).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    Direct Admissions: <strong className="text-foreground">{directCount}</strong> × ₹{details.directPerEnrollmentFee} = <strong className="text-foreground">₹{(directCount * details.directPerEnrollmentFee).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Enrollments Table */}
                {enrollmentsLoading ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : filteredList.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground space-y-1">
                    <Users className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      {list.length === 0 ? `No enrollments found for ${monthLabel}` : 'No matching students'}
                    </p>
                    <p className="text-xs">
                      {list.length === 0 
                        ? 'Only students enrolled in this specific calendar month are counted in this billing cycle.' 
                        : 'Try adjusting your search criteria or tab filters.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/80 overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-xs font-semibold w-10">#</TableHead>
                          <TableHead className="text-xs font-semibold">Student</TableHead>
                          <TableHead className="text-xs font-semibold">Enrollment #</TableHead>
                          <TableHead className="text-xs font-semibold">Channel / Center</TableHead>
                          <TableHead className="text-xs font-semibold">Program</TableHead>
                          <TableHead className="text-xs font-semibold">Enrolled Date</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredList.map((st, idx) => (
                          <TableRow key={st.id || idx} className="hover:bg-muted/30">
                            <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium text-xs text-foreground">{st.studentName}</div>
                              <div className="text-[11px] text-muted-foreground">{st.studentEmail}</div>
                            </TableCell>
                            <TableCell className="font-mono text-xs font-medium">
                              {st.enrollmentNumber}
                            </TableCell>
                            <TableCell>
                              {st.isPartnerEnrollment ? (
                                <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                                  Partner: {st.studyCenterName || 'Study Center'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                  Direct Admission
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {st.programName}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {st.enrolledAt ? new Date(st.enrolledAt).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {st.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Showing {filteredList.length} of {list.length} student(s)
                    </span>
                    {filteredList.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-indigo-600 hover:text-indigo-800"
                        onClick={() => handleDownloadEnrollmentsCSV(filteredList, `Enrollments_${org.name.replace(/\s+/g, '_')}_${monthLabel.replace(/\s+/g, '_')}.csv`)}
                      >
                        <Download className="w-3 h-3 mr-1" /> Export CSV
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEnrollmentsDialogOpen(false)}>
                      Close
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => {
                        setEnrollmentsDialogOpen(false);
                        handleGenerateBill(org);
                      }}
                    >
                      <Receipt className="w-3.5 h-3.5 mr-1" /> Generate Bill for {monthLabel}
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
