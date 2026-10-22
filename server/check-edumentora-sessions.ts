import prisma from './src/lib/prisma.js';

const show = (label: string, v: any) => console.log(`\n=== ${label} ===\n` + JSON.stringify(v, null, 2));

(async () => {
  // 1. The organization(s)
  const orgs = await prisma.organization.findMany({
    where: { name: { contains: 'edumentora', mode: 'insensitive' } },
    select: { id: true, name: true, status: true },
  });
  show('Organizations', orgs);
  if (!orgs.length) { console.log('No organization matched "edumentora" - try another spelling.'); process.exit(0); }

  for (const org of orgs) {
    console.log(`\n\n######## ${org.name} (${org.id}) ########`);

    // 2. The university and program they picked
    const unis = await prisma.university.findMany({
      where: { organizationId: org.id, name: { contains: 'Manipur', mode: 'insensitive' } },
    });
    show('Universities matching "Manipur"', unis.map((u: any) => ({ id: u.id, name: u.name, status: u.status })));

    const programs = await prisma.program.findMany({
      where: { organizationId: org.id, name: { contains: 'Commerce', mode: 'insensitive' } },
    });
    show('Programs matching "Commerce"', programs.map((p: any) => ({ id: p.id, name: p.name, universityId: p.universityId, status: p.status })));

    // 3. Every session in the org (all fields, so nothing is assumed)
    const sessions: any[] = await prisma.admissionSession.findMany({ where: { organizationId: org.id } });
    show(`ALL admission sessions (${sessions.length})`, sessions);

    // 4. Which sessions point at the Manipur university or the Commerce program?
    const ids = new Set([...unis.map((u: any) => u.id), ...programs.map((p: any) => p.id)]);
    const linked = sessions.filter((s) => Object.values(s).some((v) => (typeof v === 'string' && ids.has(v)) || (Array.isArray(v) && v.some((x) => ids.has(x)))));
    show(`Sessions linked to that university/program (${linked.length})`, linked);
    const statuses = sessions.reduce((a: any, s) => ((a[s.status] = (a[s.status] || 0) + 1), a), {});
    show('Session counts by status', statuses);

    // 5. Who works there, so you know who to ask
    const staff = await prisma.user.findMany({
      where: { organizationId: org.id, status: 'active', role: { in: ['org_admin', 'ops_admin', 'sales_admin', 'sales_sub_admin', 'center_admin'] } },
      select: { name: true, email: true, role: true },
    });
    show('Admin / sales users', staff);
  }
  process.exit(0);
})();
