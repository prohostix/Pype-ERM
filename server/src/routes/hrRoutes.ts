import express from 'express';
import {
  getLeaveRequests,
  getMyLeaveBalance,
  getLeaveRequest,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  withdrawLeaveRequest,
  deptApproveLeave,
  hrApproveLeave,
  getLeaveStats,
  getMyLeaves,
  getVacancies,
  getVacancy,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  closeVacancy,
  validateVacancyForHiring,
  fillVacancyPosition,
  getVacancyStats,
  getComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  resolveComplaint,
  getHolidays,
  getHoliday,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/hrController.js';
import {
  getAttendance,
  getAttendances,
  getAttendanceById,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  getMyAttendance,
  getMyAttendanceSummary,
  getActivityReport,
} from '../controllers/attendanceController.js';
import {
  getEmployeeProfile,
  upsertEmployeeProfile,
  updateKPIs,
  updateKRAs,
  updateSalaryDetails,
} from '../controllers/employeeProfileController.js';
import {
  getPolls,
  createPoll,
  updatePoll,
  deletePoll,
  votePoll,
} from '../controllers/pollController.js';
import {
  getSalaryConfigs,
  getSalaryConfig,
  upsertSalaryConfig,
  deleteSalaryConfig,
  getSalaryCycle,
  updateSalaryCycle,
  getLeaveAllocations,
  getLeaveAllocation,
  deleteLeaveAllocation,
  upsertLeaveAllocation,
  bulkInitLeaveAllocations,
  generateSmartPayroll,
} from '../controllers/salaryController.js';
import { protect, authorize } from '../middleware/auth.js';

import { pageAction, givenContext } from '../access/pageGuard.js';

const router = express.Router();

router.use(protect);

// Leave Requests
router.route('/leaves').get(givenContext('leave_requests'), getLeaveRequests).post(createLeaveRequest);
router.route('/leaves/stats').get(authorize('hr_admin', 'hr_sub_admin', 'dept_admin'), getLeaveStats);
router.get('/leaves/balance', getMyLeaveBalance);
router.get('/leaves/my', getMyLeaves);
router.route('/leaves/:id')
  .get(getLeaveRequest)
  .put(updateLeaveRequest)
  .delete(deleteLeaveRequest);
router.patch('/leaves/:id/withdraw', withdrawLeaveRequest);
router.put('/leaves/:id/approve', pageAction('leave_requests', 'approve', ['hr_admin', 'hr_sub_admin', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager']), hrApproveLeave);
router.patch('/leaves/:id/dept-approve', pageAction('leave_requests', 'approve', ['ops_admin', 'finance_admin', 'finance_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin', 'ops_sub_admin', 'hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager']), deptApproveLeave);
router.patch('/leaves/:id/hr-approve', pageAction('leave_requests', 'approve', ['hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager', 'branch_manager']), hrApproveLeave);

// Attendance
router.get('/attendance/my', getMyAttendance);
router.get('/attendance/my-summary', getMyAttendanceSummary);
router.get('/attendance/activity-report', pageAction('activity_report', 'view', ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager', 'org_admin', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'branch_manager']), getActivityReport);
router.route('/attendance').get(pageAction('team_attendance', 'view', ['hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'general_manager', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'branch_manager']), getAttendances).post(pageAction('team_attendance', 'create', ['hr_admin', 'hr_sub_admin']), markAttendance);
router.route('/attendance/:id')
  .get(getAttendanceById)
  .put(pageAction('team_attendance', 'edit', ['hr_admin', 'hr_sub_admin']), updateAttendance)
  .delete(pageAction('team_attendance', 'delete', ['hr_admin', 'hr_sub_admin']), deleteAttendance);

// Vacancies
router.route('/vacancies').get(getVacancies).post(pageAction('vacancies', 'create', ['hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager']), createVacancy);
router.route('/vacancies/stats').get(pageAction('vacancies', 'view', ['hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager']), getVacancyStats);
router.route('/vacancies/:id')
  .get(getVacancy)
  .put(pageAction('vacancies', 'edit', ['hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager']), updateVacancy)
  .delete(pageAction('vacancies', 'delete', ['hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager']), deleteVacancy);
router.put('/vacancies/:id/close', pageAction('vacancies', 'edit', ['hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager']), closeVacancy);
router.get('/vacancies/:id/validate', pageAction('vacancies', 'view', ['hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager']), validateVacancyForHiring);
router.patch('/vacancies/:id/fill', pageAction('vacancies', 'edit', ['hr_admin', 'hr_sub_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager']), fillVacancyPosition);

// Complaints
router.route('/complaints').get(givenContext('complaints'), getComplaints).post(createComplaint);
router.route('/complaints/:id')
  .get(givenContext('complaints'), getComplaint)
  .put(pageAction('complaints', 'edit', ['hr_admin', 'hr_sub_admin']), updateComplaint)
  .delete(pageAction('complaints', 'delete', ['hr_admin', 'hr_sub_admin']), deleteComplaint);
router.put('/complaints/:id/resolve', pageAction('complaints', 'edit', ['hr_admin', 'hr_sub_admin']), resolveComplaint);

// Holidays
router.route('/holidays').get(getHolidays).post(pageAction('holidays', 'create', ['hr_admin', 'hr_sub_admin']), createHoliday);
router.route('/holidays/:id')
  .get(getHoliday)
  .put(pageAction('holidays', 'edit', ['hr_admin', 'hr_sub_admin']), updateHoliday)
  .delete(pageAction('holidays', 'delete', ['hr_admin', 'hr_sub_admin']), deleteHoliday);

// Salary Configuration (per employee)
router.get('/salary-configs', pageAction('salary_config', 'view', ['hr_admin', 'hr_sub_admin']), getSalaryConfigs);
router.route('/salary-configs/:userId')
  .get(pageAction('salary_config', 'view', ['hr_admin', 'hr_sub_admin']), getSalaryConfig)
  .put(pageAction('salary_config', 'edit', ['hr_admin', 'hr_sub_admin']), upsertSalaryConfig)
  .delete(pageAction('salary_config', 'delete', ['hr_admin', 'hr_sub_admin']), deleteSalaryConfig);

// Salary Cycle / Period (Organization-wide Date From to Date To)
router.route('/salary-cycle')
  .get(pageAction('salary_config', 'view', ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin']), getSalaryCycle)
  .put(pageAction('salary_config', 'edit', ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin']), updateSalaryCycle);

// Leave Allocations
router.get('/leave-allocations', pageAction('leave_allocation', 'view', ['hr_admin', 'hr_sub_admin']), getLeaveAllocations);
router.post('/leave-allocations/bulk-init', pageAction('leave_allocation', 'create', ['hr_admin', 'hr_sub_admin']), bulkInitLeaveAllocations);
router.route('/leave-allocations/:userId')
  .get(pageAction('leave_allocation', 'view', ['hr_admin', 'hr_sub_admin']), getLeaveAllocation)
  .put(pageAction('leave_allocation', 'edit', ['hr_admin', 'hr_sub_admin']), upsertLeaveAllocation)
  .delete(pageAction('leave_allocation', 'delete', ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin']), deleteLeaveAllocation);

// Smart Payroll Generation (uses salary configs + late deductions)
router.post('/payroll/generate-smart', pageAction('payroll', 'create', ['hr_admin', 'hr_sub_admin']), generateSmartPayroll);

// Employee Profiles (KPI / KRA / Salary details / Work Location)
router.get('/employee-profiles/:userId', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin'), getEmployeeProfile);
router.put('/employee-profiles/:userId', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin'), upsertEmployeeProfile);
router.patch('/employee-profiles/:userId/kpis', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin'), updateKPIs);
router.patch('/employee-profiles/:userId/kras', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin'), updateKRAs);
router.patch('/employee-profiles/:userId/salary', authorize('hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin'), updateSalaryDetails);

// Announcements (HR creates, all org members can read)
router.get('/announcements', getAnnouncements);
router.post('/announcements', authorize('hr_admin', 'hr_sub_admin'), createAnnouncement);
router.put('/announcements/:id', authorize('hr_admin', 'hr_sub_admin'), updateAnnouncement);
router.delete('/announcements/:id', authorize('hr_admin', 'hr_sub_admin'), deleteAnnouncement);

// Polls (HR creates, all org members can view and vote)
router.get('/polls', getPolls);
router.post('/polls', authorize('hr_admin', 'hr_sub_admin'), createPoll);
router.put('/polls/:id', authorize('hr_admin', 'hr_sub_admin'), updatePoll);
router.delete('/polls/:id', authorize('hr_admin', 'hr_sub_admin'), deletePoll);
router.post('/polls/:id/vote', votePoll);

export default router;
