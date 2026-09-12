import fs from 'fs';

const content = `

// @desc    Transfer student to another batch
// @route   POST /api/v1/academic-batches/:id/transfer
// @access  Private
export const transferStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id: fromBatchId } = req.params;
  const { studentId, toBatchId, reason } = req.body;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  if (!studentId || !toBatchId) {
    return res.status(400).json({ success: false, message: 'Student ID and Target Batch ID are required' });
  }

  if (fromBatchId === toBatchId) {
    return res.status(400).json({ success: false, message: 'Source and target batches cannot be the same' });
  }

  const fromBatch = await prisma.academicBatch.findUnique({
    where: { id: fromBatchId }
  });

  if (!fromBatch || fromBatch.organizationId !== organizationId) {
    return res.status(404).json({ success: false, message: 'Source batch not found' });
  }

  const toBatch = await prisma.academicBatch.findUnique({
    where: { id: toBatchId },
    include: { _count: { select: { students: true } } }
  });

  if (!toBatch || toBatch.organizationId !== organizationId) {
    return res.status(404).json({ success: false, message: 'Target batch not found' });
  }

  if (fromBatch.academicClassId !== toBatch.academicClassId) {
    return res.status(400).json({ success: false, message: 'Target batch must be in the same Academic Class' });
  }

  if (toBatch.capacity && toBatch._count.students >= toBatch.capacity) {
    return res.status(400).json({ success: false, message: 'Target batch is at full capacity' });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student || student.organizationId !== organizationId) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  if (student.academicBatchId !== fromBatchId) {
    return res.status(400).json({ success: false, message: 'Student is not currently enrolled in the source batch' });
  }

  // Perform transfer in a transaction
  await prisma.$transaction([
    prisma.student.update({
      where: { id: studentId },
      data: { academicBatchId: toBatchId }
    }),
    prisma.studentBatchTransfer.create({
      data: {
        studentId,
        fromBatchId,
        toBatchId,
        academicClassId: fromBatch.academicClassId,
        transferredById: user.id,
        organizationId,
        reason: reason || null
      }
    })
  ]);

  res.json({ success: true, message: 'Student successfully transferred' });
});
`;

fs.appendFileSync('server/src/controllers/academicBatchController.ts', content);
