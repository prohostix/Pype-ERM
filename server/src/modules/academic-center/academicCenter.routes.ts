import express from 'express';
import {
  createCenter,
  getCenters,
  getCenterById,
  updateCenter,
  deleteCenter,
  registerCounselor,
  updateCounselor,
  getAllCounselors,
  assignCounselorToCenter,
  unassignCounselorFromCenter,
} from './center.controller.js';
import {
  counselorLogin,
  getMyCenters,
  getCounselorProfile,
} from './counselor.controller.js';
import {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
} from './teacher.controller.js';
import {
  createProgram,
  getPrograms,
  getProgramById,
  updateProgram,
  deleteProgram,
  getUniversities,
} from './program.controller.js';
import {
  createMaterial,
  getMaterials,
  updateMaterial,
  deleteMaterial,
} from './material.controller.js';
import {
  scheduleClass,
  getClasses,
  updateClass,
  deleteClass,
  getClassAttendanceSheet,
  saveClassAttendance,
} from './class.controller.js';
import {
  registerStudent,
  getStudents,
  enrollStudentInProgram,
  updateStudent,
} from './student.controller.js';
import {
  studentLogin,
  getStudentDashboard,
  getStudentClasses,
  getStudentMaterials,
  registerStudentAttendance,
} from './studentPortal.controller.js';
import {
  getTeacherDashboard,
  getTeacherClasses,
  getTeacherStudents,
  getTeacherPrograms,
  getTeacherClassAttendanceSheet,
  saveTeacherClassAttendance,
} from './teacherPortal.controller.js';
import { protectAcademic, requireRoles } from './academicAuth.middleware.js';

const router = express.Router();

// ==========================================
// PUBLIC AUTH ROUTES
// ==========================================
router.post('/counselor/login', counselorLogin);
router.post('/student-portal/login', studentLogin);

// ==========================================
// PROTECTED ROUTES
// ==========================================
router.use(protectAcademic);

// 1. Centers & Counselors (Org Admin / Superadmin / Assigned Counselor)
router.post('/centers', requireRoles('org_admin', 'superadmin'), createCenter);
router.get('/centers', getCenters);
router.get('/centers/:id', getCenterById);
router.put('/centers/:id', requireRoles('org_admin', 'superadmin'), updateCenter);
router.delete('/centers/:id', requireRoles('org_admin', 'superadmin'), deleteCenter);

router.get('/counselors', requireRoles('org_admin', 'superadmin'), getAllCounselors);
router.post('/counselors/register', requireRoles('org_admin', 'superadmin'), registerCounselor);
router.put('/counselors/:id', requireRoles('org_admin', 'superadmin'), updateCounselor);
router.post('/centers/:centerId/counselors', requireRoles('org_admin', 'superadmin'), assignCounselorToCenter);
router.delete('/centers/:centerId/counselors/:counselorId', requireRoles('org_admin', 'superadmin'), unassignCounselorFromCenter);

// 2. Counselor Self Routes
router.get('/counselor/my-centers', getMyCenters);
router.get('/counselor/profile', getCounselorProfile);

// 3. Teachers
router.post('/teachers', requireRoles('academic_counselor', 'org_admin', 'superadmin'), createTeacher);
router.get('/teachers', getTeachers);
router.put('/teachers/:id', requireRoles('academic_counselor', 'org_admin', 'superadmin'), updateTeacher);
router.delete('/teachers/:id', requireRoles('academic_counselor', 'org_admin', 'superadmin'), deleteTeacher);

// 4. Universities & Programs
router.get('/universities', getUniversities);
router.post('/programs', requireRoles('academic_counselor', 'org_admin', 'superadmin'), createProgram);
router.get('/programs', getPrograms);
router.get('/programs/:id', getProgramById);
router.put('/programs/:id', requireRoles('academic_counselor', 'org_admin', 'superadmin'), updateProgram);
router.delete('/programs/:id', requireRoles('academic_counselor', 'org_admin', 'superadmin'), deleteProgram);

// 5. Learning Materials (Videos, Documents, E-Books)
router.post('/materials', requireRoles('academic_counselor', 'org_admin', 'superadmin'), createMaterial);
router.get('/materials', getMaterials);
router.put('/materials/:id', requireRoles('academic_counselor', 'org_admin', 'superadmin'), updateMaterial);
router.delete('/materials/:id', requireRoles('academic_counselor', 'org_admin', 'superadmin'), deleteMaterial);

// 6. Classes & Live Sessions
router.post('/classes', requireRoles('academic_counselor', 'org_admin', 'superadmin'), scheduleClass);
router.get('/classes', getClasses);
router.put('/classes/:id', requireRoles('academic_counselor', 'org_admin', 'superadmin'), updateClass);
router.delete('/classes/:id', requireRoles('academic_counselor', 'org_admin', 'superadmin'), deleteClass);
router.get('/classes/:id/attendance', requireRoles('academic_counselor', 'org_admin', 'superadmin', 'center_teacher'), getClassAttendanceSheet);
router.post('/classes/:id/attendance', requireRoles('org_admin', 'superadmin', 'center_teacher'), saveClassAttendance);

// 7. Students & Enrollments
router.post('/students', requireRoles('academic_counselor', 'org_admin', 'superadmin'), registerStudent);
router.get('/students', requireRoles('academic_counselor', 'org_admin', 'superadmin'), getStudents);
router.post('/students/:id/enroll', requireRoles('academic_counselor', 'org_admin', 'superadmin'), enrollStudentInProgram);
router.put('/students/:id', requireRoles('academic_counselor', 'org_admin', 'superadmin'), updateStudent);

// 8. Student Portal Routes
router.get('/student-portal/dashboard', getStudentDashboard);
router.get('/student-portal/classes', getStudentClasses);
router.post('/student-portal/classes/:classId/attendance', registerStudentAttendance);
router.get('/student-portal/materials', getStudentMaterials);

// 9. Teacher Portal Routes
router.get('/teacher-portal/dashboard', requireRoles('center_teacher', 'org_admin', 'superadmin', 'academic_counselor'), getTeacherDashboard);
router.get('/teacher-portal/classes', requireRoles('center_teacher', 'org_admin', 'superadmin', 'academic_counselor'), getTeacherClasses);
router.get('/teacher-portal/students', requireRoles('center_teacher', 'org_admin', 'superadmin', 'academic_counselor'), getTeacherStudents);
router.get('/teacher-portal/programs', requireRoles('center_teacher', 'org_admin', 'superadmin', 'academic_counselor'), getTeacherPrograms);
router.get('/teacher-portal/classes/:classId/attendance', requireRoles('center_teacher', 'org_admin', 'superadmin', 'academic_counselor'), getTeacherClassAttendanceSheet);
router.post('/teacher-portal/classes/:classId/attendance', requireRoles('center_teacher', 'org_admin', 'superadmin', 'academic_counselor'), saveTeacherClassAttendance);

export default router;
