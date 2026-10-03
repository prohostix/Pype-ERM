import prisma from './src/lib/prisma.js';

async function main() {
  await prisma.leaveRequest.create({
    data: {
      id: 'd21a2c16-d7ff-4d1f-96e2-9e531572996e',
      employeeId: 'e0117cf7-8134-49c6-8baa-3134d0dcb740',
      organizationId: 'f0e75a7f-4e1b-4520-827a-c12deb366277',
      departmentId: '10f7ea38-8b83-4519-aa44-a60e175afc36',
      type: 'casual',
      startDate: new Date('2026-09-03T00:00:00.000Z'),
      endDate: new Date('2026-09-03T00:00:00.000Z'),
      reason: 'I have an urgent matter at home tomorrow, September 3, 2026.',
      status: 'approved',
      deptAdminRemarks: '',
      hrRemarks: '',
      deptApprovedBy: '77f9e74d-ba82-4858-8ad4-5438a333265a',
      hrApprovedBy: '48d7e2f7-babf-407c-89f7-20b1ae9fc37e',
      isHalfDay: false,
      halfDayType: 'first_half',
      appliedAt: new Date('2026-09-02T06:10:17.422Z'),
      createdAt: new Date('2026-09-02T06:10:17.422Z'),
      updatedAt: new Date('2026-09-05T10:58:09.152Z')
    }
  });
  console.log('Restored old leave request.');
}
main();
