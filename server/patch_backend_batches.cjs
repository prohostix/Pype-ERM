const fs = require('fs');
const pathCtrl = './src/controllers/facultyPortalController.ts';
const pathRoutes = './src/routes/facultyPortalRoutes.ts';

// 1. Update Controller
let ctrlCode = fs.readFileSync(pathCtrl, 'utf8');

// Replace getLessonSessions with getBatchSessions
const oldEndpoint = `export const getLessonSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
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
});`;

const newEndpoint = `export const getBatchSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const { batchId } = req.params;
  
  const batch = await prisma.academicBatch.findUnique({ 
    where: { id: batchId },
    include: { academicClass: true }
  });
  
  if (!batch || batch.academicClass.inchargeId !== req.user.id) {
    return res.status(404).json({ success: false, message: 'Batch not found or unauthorized' });
  }

  const sessions = await prisma.academicSession.findMany({
    where: { academicBatchId: batchId },
    include: { 
      faculty: { select: { id: true, name: true } },
      moduleLesson: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  res.status(200).json({ success: true, data: sessions });
});`;

if (ctrlCode.includes('getLessonSessions')) {
  ctrlCode = ctrlCode.replace(oldEndpoint, newEndpoint);
} else {
  ctrlCode += "\n" + newEndpoint;
}
fs.writeFileSync(pathCtrl, ctrlCode);

// 2. Update Routes
let routesCode = fs.readFileSync(pathRoutes, 'utf8');
routesCode = routesCode.replace('getLessonSessions', 'getBatchSessions');
routesCode = routesCode.replace("router.route('/lessons/:lessonId/sessions').get(getLessonSessions);", "");
routesCode = routesCode.replace("router.route('/batches/:batchId/students').get(getMyStudents);", "router.route('/batches/:batchId/students').get(getMyStudents);\nrouter.route('/batches/:batchId/sessions').get(getBatchSessions);");

fs.writeFileSync(pathRoutes, routesCode);
console.log('Patched backend');
