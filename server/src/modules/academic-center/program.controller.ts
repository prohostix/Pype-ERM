import { Response } from 'express';
import { AcademicAuthRequest } from './academicAuth.middleware.js';
import prisma from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serializeClassNotes, parseClassNotes } from './class.controller.js';

// @desc    Create a program in a Center and assign a teacher
// @route   POST /api/v1/academic-center/programs
// @access  Private (Academic Counselor, Org Admin)
export const createProgram = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { centerId, name, code, description, mode = 'ONLINE', duration, teacherId, syllabus, thumbnail } = req.body;
  const organizationId = req.academicUser?.organizationId;
  const counselorId = req.academicUser?.counselorId;

  if (!organizationId) {
    res.status(400).json({ success: false, message: 'Organization ID is required' });
    return;
  }

  if (!centerId || !name || !code) {
    res.status(400).json({ success: false, message: 'Center ID, program name, and code are required' });
    return;
  }

  // Ensure counselor is specified
  let effectiveCounselorId = counselorId;
  if (!effectiveCounselorId) {
    // If org_admin is creating on behalf of counselor, find primary counselor for the center
    const assignment = await prisma.centerCounselorAssignment.findFirst({
      where: { centerId, status: 'ACTIVE' },
    });
    if (assignment) {
      effectiveCounselorId = assignment.counselorId;
    } else {
      // Find any counselor in org
      const anyCounselor = await prisma.academicCounselor.findFirst({
        where: { organizationId },
      });
      if (!anyCounselor) {
        res.status(400).json({
          success: false,
          message: 'An Academic Counselor must be registered before creating programs',
        });
        return;
      }
      effectiveCounselorId = anyCounselor.id;
    }
  }

  const normalizedCode = code.trim().toUpperCase();

  // Check unique code in center
  const existing = await prisma.centerProgram.findUnique({
    where: {
      centerId_code: {
        centerId,
        code: normalizedCode,
      },
    },
  });

  if (existing) {
    res.status(400).json({
      success: false,
      message: `Program code '${normalizedCode}' already exists in this center`,
    });
    return;
  }

  const program = await prisma.centerProgram.create({
    data: {
      organizationId,
      centerId,
      counselorId: effectiveCounselorId,
      teacherId: teacherId || null,
      name: name.trim(),
      code: normalizedCode,
      description: description?.trim() || null,
      mode: mode || 'ONLINE',
      duration: duration?.trim() || null,
      syllabus: syllabus || [],
      thumbnail: thumbnail || null,
      status: 'ACTIVE',
    },
    include: {
      teacher: true,
      counselor: {
        select: { id: true, name: true, email: true },
      },
      center: {
        select: { id: true, name: true, code: true, type: true },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Program created and teacher assigned successfully',
    data: program,
  });
});

// @desc    Get programs
// @desc    Get all universities in organization for Academic Center
// @route   GET /api/v1/academic-center/universities
// @access  Private
export const getUniversities = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const organizationId = req.academicUser?.organizationId;

  const universities = await prisma.university.findMany({
    where: { organizationId, status: 'active' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      logo: true,
      _count: {
        select: { programs: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: universities,
  });
});

// @desc    Get University Programs
// @route   GET /api/v1/academic-center/programs
// @access  Private
export const getPrograms = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { universityId, search, centerId } = req.query;
  const organizationId = req.academicUser?.organizationId;

  const whereClause: any = { organizationId, status: 'active' };
  if (universityId) {
    whereClause.universityId = String(universityId);
  }
  if (centerId) {
    const centerWithProgs = await prisma.academicCenter.findUnique({
      where: { id: String(centerId) },
      select: { _count: { select: { assignedPrograms: true } } },
    });
    if (centerWithProgs && centerWithProgs._count.assignedPrograms > 0) {
      whereClause.academicCenters = { some: { id: String(centerId) } };
    }
  }
  if (search) {
    const s = String(search).trim();
    whereClause.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { code: { contains: s, mode: 'insensitive' } },
      { university: { name: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const programs = await prisma.program.findMany({
    where: whereClause,
    orderBy: [
      { university: { name: 'asc' } },
      { name: 'asc' },
    ],
    include: {
      university: {
        select: { id: true, name: true, code: true, logo: true },
      },
      _count: {
        select: {
          centerClassSchedules: centerId ? { where: { centerId: String(centerId) } } : true,
          centerMaterials: centerId ? { where: { centerId: String(centerId) } } : true,
          centerEnrollments: true,
          students: true,
        },
      },
    },
  });

  let enrichedPrograms: any[] = programs;
  if (centerId) {
    const centerPrograms = await prisma.centerProgram.findMany({
      where: { centerId: String(centerId) },
      include: {
        teacher: {
          select: { id: true, name: true, email: true, phone: true, specialization: true },
        },
      },
    });

    const centerProgMap = new Map(centerPrograms.map((cp) => [cp.code, cp]));
    enrichedPrograms = programs.map((p) => {
      const cp = centerProgMap.get(p.code) || centerPrograms.find((c) => c.name === p.name || c.id === p.id);
      return {
        ...p,
        centerProgramId: cp?.id || null,
        assignedTeacher: cp?.teacher || null,
        teacherId: cp?.teacherId || null,
      };
    });
  }

  res.status(200).json({
    success: true,
    data: enrichedPrograms,
  });
});

// @desc    Get program by ID with materials & schedules
// @route   GET /api/v1/academic-center/programs/:id
// @access  Private
export const getProgramById = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { centerId } = req.query;

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      university: true,
      centerMaterials: {
        where: centerId ? { centerId: String(centerId) } : undefined,
        orderBy: { sequenceOrder: 'asc' },
      },
      centerClassSchedules: {
        where: centerId ? { centerId: String(centerId) } : undefined,
        orderBy: { startTime: 'asc' },
        include: { teacher: true },
      },
      _count: {
        select: { centerMaterials: true, centerClassSchedules: true, centerEnrollments: true, students: true },
      },
    },
  });

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: program,
  });
});

// @desc    Update program / assign teacher (compatibility fallback)
// @route   PUT /api/v1/academic-center/programs/:id
// @access  Private (Academic Counselor, Org Admin)
export const updateProgram = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, duration } = req.body;

  const updated = await prisma.program.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { syllabus: description }),
      ...(duration !== undefined && { duration: Number(duration) || undefined }),
    },
    include: {
      university: true,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Program updated successfully',
    data: updated,
  });
});

// @desc    Delete program (compatibility fallback)
// @route   DELETE /api/v1/academic-center/programs/:id
// @access  Private (Academic Counselor, Org Admin)
export const deleteProgram = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.program.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'Program deleted successfully',
  });
});

// @desc    Get course structure (syllabus modules & topics)
// @route   GET /api/v1/academic-center/programs/:id/structure
// @access  Private
export const getProgramStructure = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { centerId } = req.query;

  const prog = await prisma.program.findUnique({
    where: { id },
    include: { university: true },
  });

  // 1. Check if centerProgram exists for this center and has custom structure
  if (centerId) {
    const centerProg = await prisma.centerProgram.findFirst({
      where: {
        centerId: String(centerId),
        OR: [
          { id },
          { code: id },
          ...(prog ? [{ code: prog.code }, { name: prog.name }] : []),
        ],
      },
    });

    if (centerProg?.syllabus) {
      let modulesList: any[] = [];
      if (Array.isArray(centerProg.syllabus)) {
        modulesList = centerProg.syllabus;
      } else if (typeof centerProg.syllabus === 'object' && centerProg.syllabus !== null) {
        const obj: any = centerProg.syllabus;
        modulesList = Array.isArray(obj.modules) ? obj.modules : [];
      }
      if (modulesList.length > 0) {
        const normalized = modulesList.map((m: any, idx: number) => ({
          ...m,
          id: m.id || `mod-${idx + 1}`,
          title: m.title || `Module ${idx + 1}`,
          topics: Array.isArray(m.topics) ? m.topics : [],
        }));
        res.status(200).json({
          success: true,
          data: normalized,
        });
        return;
      }
    }
  }

  if (!prog) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  let modules: any[] = [];
  if (prog.syllabus) {
    try {
      const parsed = JSON.parse(prog.syllabus);
      if (Array.isArray(parsed)) {
        modules = parsed;
      } else if (parsed && typeof parsed === 'object') {
        modules = parsed.modules || [parsed];
      }
    } catch {
      // If syllabus was plain text, format as default module 1
      modules = [
        {
          id: 'mod-1',
          title: 'Module 1: Curriculum Overview',
          description: prog.syllabus,
          topics: ['Introduction to Course', 'Key Learning Objectives'],
          durationHours: 10,
        },
      ];
    }
  }

  res.status(200).json({
    success: true,
    data: modules,
  });
});

// @desc    Save/update course structure (modules & topics) for program/center, and optionally schedule initial classes
// @route   PUT /api/v1/academic-center/programs/:id/structure
// @access  Private (Academic Counselor, Org Admin)
export const saveProgramStructure = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { modules, centerId, classes, moduleTitle, oldModuleTitle } = req.body;

  if (!Array.isArray(modules)) {
    res.status(400).json({ success: false, message: 'Modules must be an array of curriculum sections' });
    return;
  }

  const jsonString = JSON.stringify(modules);

  // Update primary Program record
  await prisma.program.update({
    where: { id },
    data: { syllabus: jsonString },
  }).catch((err) => console.warn('Primary program syllabus update notice:', err.message));

  // If centerId provided, update or create centerProgram record
  let centerProg: any = null;
  if (centerId) {
    const prog = await prisma.program.findUnique({ where: { id } }).catch(() => null);
    const existingCenterProg = await prisma.centerProgram.findFirst({
      where: {
        centerId: String(centerId),
        OR: [
          { id },
          { code: id },
          ...(prog ? [{ code: prog.code }, { name: prog.name }] : []),
        ],
      },
    });

    if (existingCenterProg) {
      let updatedSyllabus: any = modules;
      if (typeof existingCenterProg.syllabus === 'object' && existingCenterProg.syllabus !== null && !Array.isArray(existingCenterProg.syllabus)) {
        const obj: any = existingCenterProg.syllabus;
        updatedSyllabus = { ...obj, modules };
      }
      centerProg = await prisma.centerProgram.update({
        where: { id: existingCenterProg.id },
        data: { syllabus: updatedSyllabus },
        include: { teacher: true },
      });
    } else {
      if (prog) {
        centerProg = await prisma.centerProgram.create({
          data: {
            organizationId: req.academicUser?.organizationId || '',
            centerId: String(centerId),
            counselorId: req.academicUser?.counselorId || req.academicUser?.id || '',
            name: prog.name,
            code: prog.code,
            syllabus: { modules },
          },
          include: { teacher: true },
        });
      }
    }
  }

  // If initial classes are provided in the payload (recorded video or live class), create them
  if (Array.isArray(classes) && classes.length > 0 && centerId) {
    // Effective teacher is the program's teacher
    let effectiveTeacherId: string | null = centerProg?.teacherId || null;
    if (!effectiveTeacherId) {
      const centerTeacher = await prisma.centerTeacher.findFirst({
        where: { centerId: String(centerId), status: 'ACTIVE' },
      });
      effectiveTeacherId = centerTeacher?.id || null;
    }

    const processedClassIds: string[] = [];

    for (const cls of classes) {
      if (!cls.title || !cls.title.trim()) continue;
      const isRecorded = cls.type === 'RECORDED_VIDEO' || Boolean(cls.recordingUrl);
      const startTime = cls.startTime ? new Date(cls.startTime) : new Date();
      const durationMins = Number(cls.durationMins) || 45;
      const endTime = cls.endTime ? new Date(cls.endTime) : new Date(startTime.getTime() + durationMins * 60000);

      const classData = {
        organizationId: req.academicUser?.organizationId || '',
        centerId: String(centerId),
        programId: id,
        teacherId: effectiveTeacherId,
        title: cls.title.trim(),
        type: (cls.type === 'OFFLINE_LECTURE' ? 'OFFLINE_LECTURE' : 'ONLINE_LIVE_CLASS') as any,
        startTime,
        endTime,
        roomOrLocation: cls.roomOrLocation?.trim() || null,
        meetingLink: cls.meetingLink?.trim() || null,
        meetingPassword: cls.meetingPassword?.trim() || null,
        recordingUrl: cls.recordingUrl?.trim() || null,
        notes: serializeClassNotes(cls.moduleName || moduleTitle, cls.notes),
        status: (isRecorded ? 'COMPLETED' : 'SCHEDULED') as any,
      };

      if (cls.id) {
        await prisma.centerClassSchedule.update({
          where: { id: cls.id },
          data: classData,
        });
        processedClassIds.push(cls.id);
      } else {
        const newClass = await prisma.centerClassSchedule.create({
          data: classData,
        });
        processedClassIds.push(newClass.id);
      }
    }

    // Cleanup orphaned classes for this module
    const targetModuleNames = [moduleTitle, oldModuleTitle].filter(Boolean).map((t) => String(t).trim());
    if (targetModuleNames.length > 0) {
      const allModClasses = await prisma.centerClassSchedule.findMany({
        where: { centerId: String(centerId), programId: id },
      });
      const toDelete = allModClasses.filter((c) => {
        try {
          const notesObj = JSON.parse(c.notes || '{}');
          return targetModuleNames.includes(notesObj.moduleName) && !processedClassIds.includes(c.id);
        } catch {
          return false;
        }
      });
      if (toDelete.length > 0) {
        await prisma.centerClassSchedule.deleteMany({
          where: { id: { in: toDelete.map((d) => d.id) } },
        });
      }
    }
  }

  // If deleteClassesForModule is provided, remove all classes attached to this module
  if (req.body.deleteClassesForModule && centerId) {
    const targetModuleTitle = String(req.body.deleteClassesForModule).trim().toLowerCase();
    const classSchedules = await prisma.centerClassSchedule.findMany({
      where: {
        centerId: String(centerId),
        programId: id,
      },
    });
    for (const schedule of classSchedules) {
      const parsed = parseClassNotes(schedule.notes);
      if (parsed.moduleName && parsed.moduleName.trim().toLowerCase() === targetModuleTitle) {
        await prisma.centerClassSchedule.delete({ where: { id: schedule.id } }).catch(() => null);
      }
    }
  }

  res.status(200).json({
    success: true,
    message: 'Course structure and classes saved successfully',
    data: modules,
  });
});

// @desc    Assign or change teacher for a program in a center, and track history
// @route   PUT /api/v1/academic-center/programs/:id/assign-teacher
// @access  Private (Academic Counselor, Org Admin)
export const assignProgramTeacher = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { centerId, teacherId, remarks } = req.body;
  const counselor = req.academicUser;
  const organizationId = counselor?.organizationId;

  if (!centerId) {
    res.status(400).json({ success: false, message: 'centerId is required' });
    return;
  }

  const program = await prisma.program.findUnique({
    where: { id },
  });

  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  // Find new teacher if teacherId provided
  let newTeacher: any = null;
  if (teacherId && teacherId !== 'none') {
    newTeacher = await prisma.centerTeacher.findFirst({
      where: { id: teacherId, centerId: String(centerId) },
    });
    if (!newTeacher) {
      res.status(404).json({ success: false, message: 'Selected teacher not found in this center' });
      return;
    }
  }

  // Find or create CenterProgram
  let centerProg = await prisma.centerProgram.findFirst({
    where: {
      centerId: String(centerId),
      OR: [{ id }, { code: program.code }],
    },
    include: { teacher: true },
  });

  const previousTeacherId = centerProg?.teacherId || null;
  const previousTeacherName = centerProg?.teacher?.name || 'Unassigned';
  const newTeacherName = newTeacher ? newTeacher.name : 'Unassigned';

  const historyEntry = {
    id: `th-${Date.now()}`,
    previousTeacherId,
    previousTeacherName,
    newTeacherId: newTeacher ? newTeacher.id : null,
    newTeacherName,
    changedById: counselor?.id || null,
    changedByName: counselor?.name || 'Academic Counselor',
    changedAt: new Date().toISOString(),
    remarks: remarks?.trim() || 'Teacher assigned by counselor',
  };

  if (!centerProg) {
    let effectiveCounselorId = counselor?.counselorId || counselor?.id;
    if (!effectiveCounselorId) {
      const assignment = await prisma.centerCounselorAssignment.findFirst({
        where: { centerId: String(centerId), status: 'ACTIVE' },
      });
      effectiveCounselorId = assignment?.counselorId;
    }

    centerProg = await prisma.centerProgram.create({
      data: {
        organizationId: organizationId || '',
        centerId: String(centerId),
        counselorId: effectiveCounselorId || '',
        teacherId: newTeacher ? newTeacher.id : null,
        name: program.name,
        code: program.code,
        description: program.syllabus || null,
        duration: `${program.duration} Months`,
        status: 'ACTIVE',
        syllabus: { _teacherHistory: [historyEntry], modules: [] },
      },
      include: { teacher: true },
    });
  } else {
    let prevHistory: any[] = [];
    let currentModules: any[] = [];
    if (Array.isArray(centerProg.syllabus)) {
      currentModules = centerProg.syllabus;
    } else if (typeof centerProg.syllabus === 'object' && centerProg.syllabus !== null) {
      const obj: any = centerProg.syllabus;
      prevHistory = Array.isArray(obj._teacherHistory) ? obj._teacherHistory : [];
      currentModules = Array.isArray(obj.modules) ? obj.modules : [];
    }

    const updatedSyllabus = {
      modules: currentModules,
      _teacherHistory: [...prevHistory, historyEntry],
    };

    centerProg = await prisma.centerProgram.update({
      where: { id: centerProg.id },
      data: {
        teacherId: newTeacher ? newTeacher.id : null,
        syllabus: updatedSyllabus,
      },
      include: { teacher: true },
    });
  }

  // Update all upcoming scheduled classes for this program to the new teacher!
  if (newTeacher) {
    await prisma.centerClassSchedule.updateMany({
      where: {
        centerId: String(centerId),
        programId: program.id,
        status: 'SCHEDULED',
      },
      data: {
        teacherId: newTeacher.id,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: `Program teacher updated to ${newTeacherName}`,
    data: {
      program: {
        ...program,
        assignedTeacher: newTeacher,
        teacherId: newTeacher ? newTeacher.id : null,
      },
      historyEntry,
    },
  });
});

// @desc    Get teacher assignment history for a program
// @route   GET /api/v1/academic-center/programs/:id/teacher-history
// @access  Private (Academic Counselor, Org Admin)
export const getProgramTeacherHistory = asyncHandler(async (req: AcademicAuthRequest, res: Response) => {
  const { id } = req.params;
  const { centerId } = req.query;

  if (!centerId) {
    res.status(400).json({ success: false, message: 'centerId is required' });
    return;
  }

  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found' });
    return;
  }

  const centerProg = await prisma.centerProgram.findFirst({
    where: {
      centerId: String(centerId),
      OR: [{ id }, { code: program.code }],
    },
  });

  let history: any[] = [];
  if (centerProg?.syllabus && typeof centerProg.syllabus === 'object') {
    const rawSyl: any = centerProg.syllabus;
    if (rawSyl._teacherHistory && Array.isArray(rawSyl._teacherHistory)) {
      history = rawSyl._teacherHistory;
    }
  }

  res.status(200).json({
    success: true,
    data: history,
  });
});


