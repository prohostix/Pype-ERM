const fs = require('fs');
const path = './src/controllers/facultyPortalController.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Update getSessionStudents authorization
const oldGetSessionStudents = `  const session = await prisma.academicSession.findUnique({ where: { id: sessionId } });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.facultyId !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied to this session' });`;

const newGetSessionStudents = `  const session = await prisma.academicSession.findUnique({ 
    where: { id: sessionId },
    include: { academicClass: true }
  });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.facultyId !== req.user.id && session.academicClass?.inchargeId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied to this session' });
  }`;

code = code.replace(oldGetSessionStudents, newGetSessionStudents);

// 2. Add getLessonSessions
const newEndpoint = `
export const getLessonSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { lessonId } = req.params;
  
  const lesson = await prisma.moduleLesson.findUnique({ 
    where: { id: lessonId },
    include: { classModule: { include: { academicClass: true } } }
  });
  
  if (!lesson || lesson.classModule.academicClass.inchargeId !== req.user.id) {
    return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized' });
  }

  const sessions = await prisma.academicSession.findMany({
    where: { moduleLessonId: lessonId },
    include: { 
      faculty: { select: { id: true, name: true } },
      academicBatch: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  res.status(200).json({ success: true, data: sessions });
});
`;

code += newEndpoint;

fs.writeFileSync(path, code);
console.log('Patched backend controller');
