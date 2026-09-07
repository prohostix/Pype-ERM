export type AcademicCenterType = 'OFFLINE' | 'ONLINE';
export type AcademicCenterStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type AcademicMaterialType = 'VIDEO' | 'DOCUMENT' | 'EBOOK' | 'SYLLABUS' | 'RECORDED_CLASS';
export type AcademicClassType = 'OFFLINE_LECTURE' | 'ONLINE_LIVE_CLASS';
export type AcademicClassStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface AcademicCenter {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  type: AcademicCenterType;
  status: AcademicCenterStatus;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  meetingPlatform?: string | null;
  onlineAccessUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  counselors?: Array<{
    id: string;
    counselorId: string;
    isPrimary: boolean;
    counselor: {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
      specialization?: string | null;
    };
  }>;
  assignedPrograms?: Array<{
    id: string;
    name: string;
    code: string;
    courseType?: string;
    university?: {
      id: string;
      name: string;
      code: string;
    };
  }>;
  _count?: {
    programs: number;
    assignedPrograms?: number;
    teachers: number;
    students: number;
    schedules: number;
  };
}

export interface AcademicCounselor {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  specialization?: string | null;
  status: string;
  assignedCenters?: AcademicCenter[];
  counts?: {
    programs: number;
    materials: number;
    students: number;
  };
  createdAt?: string;
}

export interface CenterTeacher {
  id: string;
  organizationId: string;
  centerId: string;
  name: string;
  email: string;
  phone?: string | null;
  specialization?: string | null;
  bio?: string | null;
  avatar?: string | null;
  status: string;
  center?: { id: string; name: string; code: string; type: AcademicCenterType };
  programs?: Array<{ id: string; name: string; code: string }>;
  _count?: { programs: number; schedules: number };
}

export interface University {
  id: string;
  name: string;
  code: string;
  logo?: string | null;
  _count?: {
    programs: number;
  };
}

export interface CenterProgram {
  id: string;
  organizationId: string;
  centerId?: string;
  universityId?: string;
  counselorId?: string;
  teacherId?: string | null;
  assignedTeacher?: CenterTeacher | null;
  teacher?: CenterTeacher | null;
  centerProgramId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  mode?: string;
  courseType?: string;
  duration?: string | number | null;
  syllabus?: unknown;
  thumbnail?: string | null;
  status: string;
  university?: {
    id: string;
    name: string;
    code: string;
    logo?: string | null;
  };
  counselor?: { id: string; name: string; email: string };
  center?: { id: string; name: string; code: string; type: AcademicCenterType };
  _count?: {
    materials?: number;
    enrollments?: number;
    schedules?: number;
    centerClassSchedules?: number;
    centerMaterials?: number;
    centerEnrollments?: number;
  };
  materials?: CenterMaterial[];
  schedules?: CenterClassSchedule[];
  enrollments?: Array<Record<string, unknown>>;
}

export interface CenterMaterial {
  id: string;
  organizationId: string;
  centerId: string;
  programId: string;
  uploadedById: string;
  title: string;
  description?: string | null;
  type: AcademicMaterialType;
  mediaUrl: string;
  fileKey?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  duration?: number | null;
  chapterOrTopic?: string | null;
  sequenceOrder: number;
  isPublished: boolean;
  createdAt: string;
  program?: {
    id: string;
    name: string;
    code?: string;
    university?: { id: string; name: string; code: string; logo?: string | null };
  };
  uploadedBy?: { id: string; name: string };
}

export interface CenterClassSchedule {
  id: string;
  organizationId: string;
  centerId: string;
  programId: string;
  teacherId?: string | null;
  title: string;
  type: AcademicClassType;
  startTime: string;
  endTime: string;
  roomOrLocation?: string | null;
  meetingLink?: string | null;
  meetingPassword?: string | null;
  recordingUrl?: string | null;
  notes?: string | null;
  moduleName?: string | null;
  status: AcademicClassStatus;
  program?: {
    id: string;
    name: string;
    code: string;
    university?: { id: string; name: string; code: string; logo?: string | null };
  };
  teacher?: { id: string; name: string; email?: string; specialization?: string | null } | null;
  center?: { id: string; name: string; type: AcademicCenterType; city?: string | null; address?: string | null } | null;
  attendances?: Array<{ id: string; status: string; markedBy: string }>;
  myAttendance?: { id: string; status: string; markedBy: string; markedAt: string; notes?: string } | null;
}

export interface CenterStudent {
  id: string;
  organizationId: string;
  centerId: string;
  studentCode: string;
  name: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  address?: string | null;
  status: string;
  createdAt: string;
  center?: AcademicCenter;
  admittedBy?: { id: string; name: string; email: string } | null;
  enrollments?: Array<{
    id: string;
    programId: string;
    status: string;
    progressPercent: number;
    program: CenterProgram;
  }>;
}

export interface ModuleClassItem {
  id?: string;
  title: string;
  type: 'RECORDED_VIDEO' | 'ONLINE_LIVE_CLASS' | 'OFFLINE_LECTURE';
  recordingUrl?: string;
  durationMins?: number;
  startTime?: string;
  endTime?: string;
  meetingLink?: string;
  meetingPassword?: string;
  roomOrLocation?: string;
  notes?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  topics: string[];
  durationHours?: number;
  classes?: ModuleClassItem[];
}

export interface TeacherHistoryEntry {
  id: string;
  previousTeacherId: string | null;
  previousTeacherName: string;
  newTeacherId: string | null;
  newTeacherName: string;
  changedById?: string | null;
  changedByName: string;
  changedAt: string;
  remarks?: string;
}

export interface Assessment {
  id: string;
  centerId: string;
  programId: string;
  title: string;
  module: string;
  assessmentType: 'ASSIGNMENT' | 'QUIZ' | 'EXAM' | 'PROJECT' | string;
  maxMarks: number;
  dueDate?: string | null;
  instructions?: string;
  questionPaperUrl: string;
  isPublished: boolean;
  createdAt: string;
  program?: {
    id: string;
    name: string;
    code?: string;
    university?: { id: string; name: string; code: string; logo?: string | null };
  };
  uploadedBy?: { id: string; name: string; email?: string };
}

