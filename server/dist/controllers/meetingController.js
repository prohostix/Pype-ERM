import prisma from '../lib/prisma.js';
export const getMeetings = async (req, res) => {
    try {
        const { organizationId, role, id, name } = req.user;
        if (!organizationId) {
            return res.status(400).json({ message: 'Organization ID is required' });
        }
        let meetings;
        if (role === 'ceo' || role === 'org_admin') {
            meetings = await prisma.meeting.findMany({
                where: { organizationId },
                include: {
                    host: {
                        select: { name: true, email: true, id: true, role: true }
                    }
                },
                orderBy: { date: 'desc' }
            });
        }
        else {
            meetings = await prisma.meeting.findMany({
                where: {
                    organizationId,
                    OR: [
                        { hostId: id },
                        {
                            attendees: {
                                array_contains: [{ id }]
                            }
                        },
                        {
                            attendees: {
                                array_contains: [{ name }]
                            }
                        }
                    ]
                },
                include: {
                    host: {
                        select: { name: true, email: true, id: true, role: true }
                    }
                },
                orderBy: { date: 'desc' }
            });
        }
        res.json(meetings);
    }
    catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ message: 'Error fetching meetings' });
    }
};
export const createMeeting = async (req, res) => {
    try {
        const { organizationId, id: hostId } = req.user;
        const { title, agenda, date, time, duration, attendees } = req.body;
        if (!organizationId) {
            return res.status(400).json({ message: 'Organization ID is required' });
        }
        const meeting = await prisma.meeting.create({
            data: {
                organizationId,
                hostId,
                title,
                agenda,
                date: new Date(date),
                time,
                duration: duration ? parseInt(duration) : null,
                attendees: attendees || []
            },
            include: {
                host: {
                    select: { name: true, email: true, id: true, role: true }
                }
            }
        });
        res.status(201).json(meeting);
    }
    catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ message: 'Error creating meeting' });
    }
};
export const updateMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;
        const { title, agenda, date, time, duration, attendees, status, minutes } = req.body;
        const meeting = await prisma.meeting.findUnique({ where: { id } });
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        if (meeting.hostId !== userId && role !== 'ceo' && role !== 'org_admin') {
            return res.status(403).json({ message: 'Unauthorized to update this meeting' });
        }
        const updatedMeeting = await prisma.meeting.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(agenda !== undefined && { agenda }),
                ...(date !== undefined && { date: new Date(date) }),
                ...(time !== undefined && { time }),
                ...(duration !== undefined && { duration: parseInt(duration) }),
                ...(attendees !== undefined && { attendees }),
                ...(status !== undefined && { status }),
                ...(minutes !== undefined && { minutes })
            },
            include: {
                host: {
                    select: { name: true, email: true, id: true, role: true }
                }
            }
        });
        res.json(updatedMeeting);
    }
    catch (error) {
        console.error('Error updating meeting:', error);
        res.status(500).json({ message: 'Error updating meeting' });
    }
};
export const deleteMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;
        const meeting = await prisma.meeting.findUnique({ where: { id } });
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        if (meeting.hostId !== userId && role !== 'ceo' && role !== 'org_admin') {
            return res.status(403).json({ message: 'Unauthorized to delete this meeting' });
        }
        await prisma.meeting.delete({ where: { id } });
        res.json({ message: 'Meeting deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting meeting:', error);
        res.status(500).json({ message: 'Error deleting meeting' });
    }
};
//# sourceMappingURL=meetingController.js.map