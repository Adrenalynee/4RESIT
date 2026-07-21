import express from 'express';
import { pool } from './db.js';

const app = express();
const port = process.env.PORT || 5000;

app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    try {
        await pool.query('SELECT 1');
        console.log('Database connection OK');
    } catch (err) {
        console.error('Database connection failed:', err.message);
    }
});