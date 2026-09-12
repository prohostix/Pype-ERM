import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { hashPassword } from '../utils/authUtils.js';


export const getFaculties = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Organization ID is required' });
    }

    const faculties = await prisma.faculty.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: faculties });
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch faculties' });
  }
};

export const getFacultyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const organizationId = user.organizationId;

    const faculty = await prisma.faculty.findFirst({
      where: { id, organizationId }
    });

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    res.json({ success: true, data: faculty });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch faculty' });
  }
};

export const createFaculty = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId;
    const { name, email, phone, password, specialization, status } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    let hashedPassword = password;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    const faculty = await prisma.faculty.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        specialization,
        status: status || 'active',
        organizationId
      }
    });

    res.status(201).json({ success: true, data: faculty, message: 'Faculty created successfully' });
  } catch (error) {
    console.error('Error creating faculty:', error);
    res.status(500).json({ success: false, message: 'Failed to create faculty' });
  }
};

export const updateFaculty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const organizationId = user.organizationId;
    const { name, email, phone, password, specialization, status } = req.body;

    const existingFaculty = await prisma.faculty.findFirst({
      where: { id, organizationId }
    });

    if (!existingFaculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const updateData: any = {
      name,
      email,
      phone,
      specialization,
      status
    };

    if (password && password.trim() !== '') {
      updateData.password = await hashPassword(password);
    }

    const faculty = await prisma.faculty.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: faculty, message: 'Faculty updated successfully' });
  } catch (error) {
    console.error('Error updating faculty:', error);
    res.status(500).json({ success: false, message: 'Failed to update faculty' });
  }
};

export const deleteFaculty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const organizationId = user.organizationId;

    const existingFaculty = await prisma.faculty.findFirst({
      where: { id, organizationId }
    });

    if (!existingFaculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    await prisma.faculty.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Faculty deleted successfully' });
  } catch (error) {
    console.error('Error deleting faculty:', error);
    res.status(500).json({ success: false, message: 'Failed to delete faculty' });
  }
};
