const fs = require('fs');
let content = fs.readFileSync('server/src/controllers/facultyPortalController.ts', 'utf8');

const getMyClassesFunc = `
export const getMyClasses = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'faculty') return res.status(403).json({ success: false, message: 'Access denied' });
  const classes = await prisma.academicClass.findMany({
    where: { inchargeId: req.user.id },
    include: {
      organization: { select: { id: true, name: true } }
    }
  });
  res.status(200).json({ success: true, data: classes });
});
`;

content = content.replace('export const getClassBatches', getMyClassesFunc + '\nexport const getClassBatches');
fs.writeFileSync('server/src/controllers/facultyPortalController.ts', content);
