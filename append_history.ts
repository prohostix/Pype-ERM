import fs from 'fs';

const content = `

// @desc    Get transfer history for an academic class
// @route   GET /api/v1/academic-classes/:id/transfer-history
// @access  Private
export const getTransferHistory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return res.status(400).json({ success: false, message: 'Organization ID is required' });
  }

  const history = await prisma.studentBatchTransfer.findMany({
    where: {
      academicClassId: id,
      organizationId
    },
    include: {
      student: { select: { name: true, enrollmentNo: true } },
      fromBatch: { select: { name: true } },
      toBatch: { select: { name: true } },
      transferredBy: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: history });
});
`;

fs.appendFileSync('server/src/controllers/academicClassController.ts', content);
