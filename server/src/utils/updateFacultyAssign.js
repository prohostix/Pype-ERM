const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../controllers/facultyPortalController.ts');
let content = fs.readFileSync(file, 'utf8');

const assignFunction = `
export const assignTeacherToLesson = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { lessonId } = req.params;
  const { facultyId, reason } = req.body;

  if (!reason) return res.status(400).json({ success: false, message: 'Reason is required for assignment' });

  const lesson = await prisma.moduleLesson.findUnique({ where: { id: lessonId }, include: { classModule: { include: { academicClass: true } } } });
  if (!lesson || lesson.classModule.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized' });

  // If the new facultyId is the same as the existing, just return
  const newId = facultyId || null;
  if (lesson.facultyId === newId) return res.status(200).json({ success: true, message: 'No change needed' });

  // Create the history record
  await prisma.lessonFacultyHistory.create({
    data: {
      moduleLessonId: lessonId,
      previousFacultyId: lesson.facultyId,
      newFacultyId: newId,
      reason,
      changedById: req.user.id,
      organizationId: req.user.organizationId
    }
  });

  // Update the lesson
  const updated = await prisma.moduleLesson.update({
    where: { id: lessonId },
    data: { facultyId: newId },
    include: { faculty: { select: { id: true, name: true } } }
  });

  res.status(200).json({ success: true, data: updated, message: 'Teacher assigned and history recorded' });
});
`;

content = content.replace('// --- Materials Management ---', assignFunction + '\n// --- Materials Management ---');

fs.writeFileSync(file, content);
