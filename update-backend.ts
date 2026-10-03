import fs from 'fs';
import path from 'path';

// Update routes
const routesFile = path.resolve('server/src/routes/hrRoutes.ts');
let routes = fs.readFileSync(routesFile, 'utf8');
if (!routes.includes('withdrawLeaveRequest')) {
  routes = routes.replace('deleteLeaveRequest,', 'deleteLeaveRequest,\n  withdrawLeaveRequest,');
  routes = routes.replace('router.delete(\'/leaves/:id\', deleteLeaveRequest);', 'router.delete(\'/leaves/:id\', deleteLeaveRequest);\nrouter.patch(\'/leaves/:id/withdraw\', withdrawLeaveRequest);');
  fs.writeFileSync(routesFile, routes);
}

// Update hrController
const ctrlFile = path.resolve('server/src/controllers/hrController.ts');
let ctrl = fs.readFileSync(ctrlFile, 'utf8');
if (!ctrl.includes('export const withdrawLeaveRequest')) {
  const withdrawImpl = `
export const withdrawLeaveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { remarks } = req.body;
  const leave = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, employeeId: req.user.id } });
  if (!leave) {
    res.status(404).json({ success: false, message: 'Leave request not found' });
    return;
  }
  
  if (leave.status === 'pending') {
    // If it's pending, just delete it directly since no one approved it yet
    await prisma.leaveRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Leave request withdrawn and deleted' });
  } else {
    // If it's already approved, set it to withdraw_pending for CEO/HR to approve
    await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: 'withdraw_pending', hrRemarks: remarks ? ('Withdrawal Reason: ' + remarks) : undefined }
    });
    res.json({ success: true, message: 'Withdrawal requested' });
  }
});
`;
  ctrl = ctrl + '\n' + withdrawImpl;
  fs.writeFileSync(ctrlFile, ctrl);
}
