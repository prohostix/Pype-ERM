import axios from 'axios';
import FormData from 'form-data';

const api = axios.create({
  baseURL: 'http://localhost:6478',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  console.log('Headers sent:', config.headers);
  return config;
});

const form = new FormData();
form.append('test', '123');
api.post('/test', form).catch(()=>{}).finally(()=>console.log('done1'));

api.post('/test2', form, { headers: { 'Content-Type': undefined } }).catch(()=>{}).finally(()=>console.log('done2'));

