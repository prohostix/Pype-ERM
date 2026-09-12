import axios from 'axios';
async function test() {
  const start = Date.now();
  try {
    // We don't have a valid token right now, but we can see how fast it fails
    await axios.get('http://localhost:5000/api/faculty-portal/lessons/fake-id/history');
  } catch (e) {
    console.log("Time taken:", Date.now() - start, "ms. Status:", e.response?.status);
  }
}
test();
