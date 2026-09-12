import axios from 'axios';
async function test() {
  try {
    const res = await axios.get('http://localhost:6478/api/v1/academic-classes/some-id/transfer-history');
    console.log(res.data);
  } catch (err) {
    console.error("ERROR", err.response?.data || err.message);
  }
}
test();
