const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../controllers/facultyPortalController.ts');
let content = fs.readFileSync(file, 'utf8');

const historyFunction = `
export const getLessonHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { lessonId } = req.params;

  const lesson = await prisma.moduleLesson.findUnique({ where: { id: lessonId }, include: { classModule: { include: { academicClass: true } } } });
  if (!lesson || lesson.classModule.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized' });

  const history = await prisma.lessonFacultyHistory.findMany({
    where: { moduleLessonId: lessonId },
    orderBy: { createdAt: 'desc' },
    include: {
      previousFaculty: { select: { id: true, name: true } },
      newFaculty: { select: { id: true, name: true } },
      changedBy: { select: { id: true, name: true } }
    }
  });

  res.status(200).json({ success: true, data: history });
});
`;

content = content.replace('// --- Materials Management ---', historyFunction + '\n// --- Materials Management ---');

fs.writeFileSync(file, content);
