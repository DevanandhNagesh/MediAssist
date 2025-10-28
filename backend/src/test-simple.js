import express from 'express';

const app = express();
const port = 5000;

app.get('/', (req, res) => {
  res.json({ message: 'Simple test server working!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Simple test server listening on http://127.0.0.1:${port}`);
});