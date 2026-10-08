const fs = require('fs');

const file = 'server/src/controllers/dashboardController.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `  // Group by department logic
  const hierarchy = {
    hr: { head: null as any, team: [] as any[], attendance: [] as any[] },
    sales: { head: null as any, team: [] as any[], attendance: [] as any[], totalSales },
    operations: { head: null as any, team: [] as any[], attendance: [] as any[] },
    finance: { head: null as any, team: [] as any[], attendance: [] as any[] },
  };

  users.forEach(user => {
    const role = user.role;
    const att = attendances.find(a => a.employeeId === user.id);
    const userWithAtt = { ...user, attendance: att ? att.status : 'Absent' };

    if (role.includes('hr')) {
      if (role === 'hr_admin') hierarchy.hr.head = userWithAtt;
      else hierarchy.hr.team.push(userWithAtt);
      hierarchy.hr.attendance.push(userWithAtt);
    } else if (role.includes('sales')) {
      if (role === 'sales_admin') hierarchy.sales.head = userWithAtt;
      else hierarchy.sales.team.push(userWithAtt);
      hierarchy.sales.attendance.push(userWithAtt);
    } else if (role.includes('ops') || role.includes('center_admin') || role.includes('university_admin')) {
      if (role === 'ops_admin') hierarchy.operations.head = userWithAtt;
      else hierarchy.operations.team.push(userWithAtt);
      hierarchy.operations.attendance.push(userWithAtt);
    } else if (role.includes('finance') || role.includes('collections')) {
      if (role === 'finance_admin') hierarchy.finance.head = userWithAtt;
      else hierarchy.finance.team.push(userWithAtt);
      hierarchy.finance.attendance.push(userWithAtt);
    }
  });

  res.status(200).json({ success: true, data: hierarchy });`;

const replacement = `  // Dynamic department logic
  const departments = await prisma.department.findMany({
    where: { organizationId: req.user.organizationId },
    select: { id: true, name: true, type: true, managerId: true }
  });

  const hierarchyData: any[] = [];
  const assignedUserIds = new Set();

  departments.forEach(dept => {
    const deptUsers = users.filter(u => u.departmentId === dept.id);
    
    let manager = null;
    if (dept.managerId) {
      manager = users.find(u => u.id === dept.managerId);
    }
    if (!manager && deptUsers.length > 0) {
      manager = deptUsers.find(u => u.role.includes('admin') || u.designation?.toLowerCase().includes('manager'));
    }

    const team = deptUsers.filter(u => u.id !== manager?.id);
    
    deptUsers.forEach(u => assignedUserIds.add(u.id));

    if (!manager && team.length === 0) return;

    const mapAtt = (u: any) => {
      const att = attendances.find(a => a.employeeId === u.id);
      return { ...u, attendance: att ? att.status : 'Absent' };
    };

    hierarchyData.push({
      id: dept.id,
      name: dept.name,
      type: dept.type,
      head: manager ? mapAtt(manager) : null,
      team: team.map(mapAtt),
      attendance: deptUsers.map(mapAtt),
      totalSales: dept.type === 'sales' ? totalSales : undefined
    });
  });

  // Handle Unassigned users (who don't belong to any department)
  const unassigned = users.filter(u => !assignedUserIds.has(u.id) && u.id !== req.user.id && u.role !== 'branch_manager');
  if (unassigned.length > 0) {
    hierarchyData.push({
      id: 'unassigned',
      name: 'Unassigned Staff',
      type: 'general',
      head: null,
      team: unassigned.map(u => {
        const att = attendances.find(a => a.employeeId === u.id);
        return { ...u, attendance: att ? att.status : 'Absent' };
      }),
      attendance: unassigned.map(u => {
        const att = attendances.find(a => a.employeeId === u.id);
        return { ...u, attendance: att ? att.status : 'Absent' };
      })
    });
  }

  res.status(200).json({ success: true, data: hierarchyData });`;

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
