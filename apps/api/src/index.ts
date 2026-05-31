import express from 'express';

const app = express();
const PORT = Number(process.env['PORT'] ?? 3001);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT);

export default app;
