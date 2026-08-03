import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { pool } from './db.js';
import authRouter from './routes/auth.js';
import cookbooksRouter from './routes/cookbooks.js';
import usersRouter from './routes/users.js';
import recipesRouter from './routes/recipes.js';
import { attachChat } from './sockets/chat.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/cookbooks', cookbooksRouter);
app.use('/api/users', usersRouter);
app.use('/api/recipes', recipesRouter);

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