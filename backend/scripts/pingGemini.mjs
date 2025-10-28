import 'dotenv/config';
import axios from 'axios';

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

const client = axios.create({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  params: { key },
  timeout: 10000
});

try {
  const { data } = await client.get('/models');
  console.log('Available models:', data.models.map(m => m.name).slice(0, 10));
} catch (error) {
  console.error('List models failed');
  console.error('status:', error.response?.status);
  console.error('body:', error.response?.data);
}
