import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const facultyId = "da40fe9c-e179-4a43-a661-90878775dd5c"; // Abeesh
const token = jwt.sign({ id: facultyId }, process.env.JWT_SECRET as string, { expiresIn: '30d' });

console.log("Token:", token);

async function fetchAssignments() {
  try {
    const res = await fetch('http://localhost:6478/api/v1/faculty-portal/my-assignments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

fetchAssignments();
