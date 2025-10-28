import 'dotenv/config';
const keys = Object.keys(process.env).filter(k => k.toLowerCase().includes('gem'));
console.log('matching keys:', keys);
for (const key of keys) {
  const raw = process.env[key];
  console.log(`${key}:`, raw);
  console.log('chars:', Array.from(raw).map(c => c.charCodeAt(0)));
}
