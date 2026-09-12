const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../controllers/facultyPortalController.ts');
let content = fs.readFileSync(file, 'utf8');

// Replace modules management get query
content = content.replace(
  /include: \{ materials: true \}/g,
  "include: { lessons: { include: { materials: true }, orderBy: { order: 'asc' } } }"
);

// We need to add lesson management functions
const lessonFunctions = `

// --- Lessons Management ---
export const createLesson = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { moduleId } = req.params;
  const { title, description, order } = req.body;

  const mod = await prisma.classModule.findUnique({ where: { id: moduleId }, include: { academicClass: true } });
  if (!mod || mod.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Module not found or unauthorized' });

  const lesson = await prisma.moduleLesson.create({
    data: {
      title,
      description,
      order: order || 0,
      classModuleId: moduleId,
      organizationId: req.user.organizationId
    }
  });
  res.status(201).json({ success: true, data: lesson });
});

export const updateLesson = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { lessonId } = req.params;
  const { title, description, order } = req.body;

  const lesson = await prisma.moduleLesson.findUnique({ where: { id: lessonId }, include: { classModule: { include: { academicClass: true } } } });
  if (!lesson || lesson.classModule.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized' });

  const updated = await prisma.moduleLesson.update({
    where: { id: lessonId },
    data: { title, description, order }
  });
  res.status(200).json({ success: true, data: updated });
});

export const deleteLesson = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { lessonId } = req.params;
  const lesson = await prisma.moduleLesson.findUnique({ where: { id: lessonId }, include: { classModule: { include: { academicClass: true } } } });
  if (!lesson || lesson.classModule.academicClass.inchargeId !== req.user.id) return res.status(404).json({ success: false, message: 'Lesson not found or unauthorized' });

  await prisma.moduleLesson.delete({ where: { id: lessonId } });
  res.status(200).json({ success: true, message: 'Lesson deleted' });
});
`;

content = content.replace('// --- Materials Management ---', lessonFunctions + '\n// --- Materials Management ---');

// Update material endpoints to use lessonId instead of moduleId
content = content.replace(/const { moduleId } = req.params;/g, "const { lessonId } = req.params;");
content = content.replace(/classModuleId: moduleId/g, "moduleLessonId: lessonId");
content = content.replace(
  /prisma.classModule.findUnique\(\{ where: \{ id: moduleId \}, include: \{ academicClass: true \} \}\)/g,
  "prisma.moduleLesson.findUnique({ where: { id: lessonId }, include: { classModule: { include: { academicClass: true } } } })"
);
content = content.replace(
  /(!mod \|\| mod.academicClass.inchargeId !== req.user.id)/g,
  "(!mod || mod.classModule.academicClass.inchargeId !== req.user.id)"
);
content = content.replace(
  /mat.classModule.academicClass.inchargeId/g,
  "mat.moduleLesson.classModule.academicClass.inchargeId"
);
content = content.replace(
  /classModule: \{ include: \{ academicClass: true \} \}/g,
  "moduleLesson: { include: { classModule: { include: { academicClass: true } } } }"
);

fs.writeFileSync(file, content);
