import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { pool } from './db.js';
import authRouter from './routes/auth.js';
import cookbooksRouter from './routes/cookbooks.js';
import usersRouter from './routes/users.js';
import recipesRouter from './routes/recipes.js';
import { exportRouter, importRouter } from './routes/data.js';
import uploadsRouter from './routes/uploads.js';
import planningRouter from './routes/planning.js';
import { attachChat } from './sockets/chat.js';

const app = express();
const port = process.env.PORT || 5000;

app.set('trust proxy', 1); // derrière nginx : lit le vrai client IP via X-Forwarded-For (rate limiting)

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads', { setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff') }));
app.use('/api/auth', authRouter);
app.use('/api/cookbooks', cookbooksRouter);
app.use('/api/users', usersRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/export', exportRouter);
app.use('/api/import', importRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/planning', planningRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

const httpServer = createServer(app);
const io = new Server(httpServer);
attachChat(io);

httpServer.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    try {
        await pool.query('SELECT 1');
        console.log('Database connection OK');
    } catch (err) {
        console.error('Database connection failed:', err.message);
    }
});