import prisma from '../lib/prisma.js';

export async function handleTargetRollup(targetId: string, organizationId: string) {
  const target = await prisma.target.findUnique({
    where: { id: targetId },
    include: { employee: true }
  });

  if (!target || !target.employeeId) return;

  // Find active users reporting directly to this employee
  const subordinates = await prisma.user.findMany({
    where: {
      reportingTo: target.employeeId,
      status: 'active'
    }
  });

  if (subordinates.length === 0) return;

  const distributedAmount = target.target / subordinates.length;
  const distributedIncentive = target.incentive ? (target.incentive / subordinates.length) : null;

  for (const sub of subordinates) {
    const existingSubTarget = await prisma.target.findFirst({
      where: {
        employeeId: sub.id,
        period: target.period,
        type: target.type,
        organizationId: organizationId
      }
    });

    if (existingSubTarget) {
      await prisma.target.update({
        where: { id: existingSubTarget.id },
        data: {
          target: distributedAmount,
          incentive: distributedIncentive,
          deadline: target.deadline
        }
      });
    } else {
      await prisma.target.create({
        data: {
          organizationId: organizationId,
          employeeId: sub.id,
          type: target.type,
          period: target.period,
          target: distributedAmount,
          achieved: 0,
          incentive: distributedIncentive,
          deadline: target.deadline,
          status: 'pending'
        }
      });
    }
  }
}

export async function syncParentTargets(organizationId: string) {
  const targets = await prisma.target.findMany({
    where: { organizationId },
    include: { employee: true }
  });

  for (const target of targets) {
    if (!target.employeeId) continue;

    const subordinates = await prisma.user.findMany({
      where: {
        reportingTo: target.employeeId,
        status: 'active'
      }
    });

    if (subordinates.length === 0) continue;

    const subTargetStats = await prisma.target.aggregate({
      where: {
        employeeId: {
          in: subordinates.map(s => s.id)
        },
        period: target.period,
        type: target.type,
        organizationId: organizationId
      },
      _sum: {
        achieved: true
      }
    });

    const totalAchieved = subTargetStats._sum.achieved || 0;
    const newStatus = totalAchieved >= target.target ? 'completed' : 'pending';

    await prisma.target.update({
      where: { id: target.id },
      data: {
        achieved: totalAchieved,
        status: newStatus
      }
    });
  }
}
