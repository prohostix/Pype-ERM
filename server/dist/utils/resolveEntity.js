import prisma from '../lib/prisma.js';
export async function resolveTargetName(url) {
    try {
        const parts = url.split('?')[0].split('/').filter(Boolean);
        // [ 'api', 'v1', ... ]
        if (parts[0] === 'api' && parts[1] === 'v1') {
            parts.splice(0, 2);
        }
        // Now parts is like ['users', '123'] or ['org', 'branches', '123']
        if (parts.length < 2)
            return null;
        const endpoint = parts[0];
        const id = parts[parts.length - 1]; // usually the last part is ID
        if (endpoint === 'users') {
            const u = await prisma.user.findUnique({ where: { id }, select: { name: true } });
            return u ? `User: ${u.name}` : null;
        }
        if (endpoint === 'departments') {
            const d = await prisma.department.findUnique({ where: { id }, select: { name: true } });
            return d ? `Department: ${d.name}` : null;
        }
        if (endpoint === 'sub-departments') {
            const d = await prisma.subDepartment.findUnique({ where: { id }, select: { name: true } });
            return d ? `Sub-Department: ${d.name}` : null;
        }
        if (endpoint === 'students') {
            const s = await prisma.student.findUnique({ where: { id }, select: { name: true } });
            return s ? `Student: ${s.name}` : null;
        }
        if (endpoint === 'organizations') {
            const o = await prisma.organization.findUnique({ where: { id }, select: { name: true } });
            return o ? `Organization: ${o.name}` : null;
        }
        if (endpoint === 'tasks') {
            const t = await prisma.task.findUnique({ where: { id }, select: { title: true } });
            return t ? `Task: ${t.title}` : null;
        }
        if (endpoint === 'assets') {
            const a = await prisma.asset.findUnique({ where: { id }, select: { brand: true, model: true, type: true } });
            return a ? `Asset: ${a.brand || ''} ${a.model || a.type}` : null;
        }
        if (endpoint === 'org') {
            if (parts[1] === 'branches') {
                const b = await prisma.branch.findUnique({ where: { id }, select: { name: true } });
                return b ? `Branch: ${b.name}` : null;
            }
            if (parts[1] === 'designations') {
                const d = await prisma.designation.findUnique({ where: { id }, select: { title: true } });
                return d ? `Designation: ${d.title}` : null;
            }
        }
        if (endpoint === 'hr') {
            if (parts[1] === 'holidays') {
                const h = await prisma.holiday.findUnique({ where: { id }, select: { name: true } });
                return h ? `Holiday: ${h.name}` : null;
            }
            if (parts[1] === 'vacancies') {
                const v = await prisma.vacancy.findUnique({ where: { id }, select: { designation: true } });
                return v ? `Vacancy: ${v.designation}` : null;
            }
            if (parts[1] === 'announcements') {
                const a = await prisma.announcement.findUnique({ where: { id }, select: { title: true } });
                return a ? `Announcement: ${a.title}` : null;
            }
            if (parts[1] === 'polls') {
                const p = await prisma.poll.findUnique({ where: { id }, select: { question: true } });
                return p ? `Poll: ${p.question}` : null;
            }
            if (parts[1] === 'complaints') {
                const c = await prisma.complaint.findUnique({ where: { id }, select: { subject: true } });
                return c ? `Complaint: ${c.subject}` : null;
            }
        }
        if (endpoint === 'finance') {
            if (parts[1] === 'invoices') {
                const i = await prisma.invoice.findUnique({ where: { id }, select: { invoiceNo: true } });
                return i ? `Invoice: ${i.invoiceNo}` : null;
            }
            if (parts[1] === 'fees') {
                const f = await prisma.feeStructure.findUnique({ where: { id }, select: { feeLevel: true } });
                return f ? `Fee Structure: ${f.feeLevel}` : null;
            }
            if (parts[1] === 'payments') {
                const p = await prisma.paymentEntry.findUnique({ where: { id }, select: { amount: true } });
                return p ? `Payment: ${p.amount}` : null;
            }
        }
        if (endpoint === 'operations') {
            if (parts[1] === 'centers') {
                const c = await prisma.studyCenter.findUnique({ where: { id }, select: { name: true } });
                return c ? `Study Center: ${c.name}` : null;
            }
            if (parts[1] === 'programs') {
                const p = await prisma.program.findUnique({ where: { id }, select: { name: true } });
                return p ? `Program: ${p.name}` : null;
            }
            if (parts[1] === 'universities') {
                const u = await prisma.university.findUnique({ where: { id }, select: { name: true } });
                return u ? `University: ${u.name}` : null;
            }
            if (parts[1] === 'sessions') {
                const s = await prisma.admissionSession.findUnique({ where: { id }, select: { name: true } });
                return s ? `Session: ${s.name}` : null;
            }
        }
        if (endpoint === 'sales') {
            if (parts[1] === 'leads') {
                const l = await prisma.lead.findUnique({ where: { id }, select: { contactName: true } });
                return l ? `Lead: ${l.contactName}` : null;
            }
        }
    }
    catch (e) {
        console.error('Error resolving target name', e);
    }
    return null;
}
//# sourceMappingURL=resolveEntity.js.map