const fs = require('fs');
let code = fs.readFileSync('server/src/controllers/facultyPortalController.ts', 'utf-8');

const newFunc = `
export const getMyAssignedLessons = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });

  // Get lessons where faculty is either the default teacher OR assigned via batch override
  const lessons = await prisma.moduleLesson.findMany({
    where: {
      OR: [
        { facultyId: req.user.id },
        { batchAssignments: { some: { facultyId: req.user.id } } }
      ]
    },
    include: {
      classModule: {
        include: {
          academicClass: {
            select: { name: true }
          }
        }
      },
      batchAssignments: {
        where: { facultyId: req.user.id },
        include: { academicBatch: { select: { name: true } } }
      }
    },
    orderBy: [
      { classModule: { academicClassId: 'asc' } },
      { classModule: { order: 'asc' } },
      { order: 'asc' }
    ]
  });

  res.status(200).json({ success: true, data: lessons });
});
`;

code += '\n' + newFunc;
fs.writeFileSync('server/src/controllers/facultyPortalController.ts', code);
