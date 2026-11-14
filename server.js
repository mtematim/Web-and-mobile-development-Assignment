const express = require('express');
const sql = require('mssql');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware to read JSON data and serve your frontend folder
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Connect to your Microsoft SQL Server Database
const dbConfig = {
    user: 'sa',                  // Replace with your SQL Server username
    password: 'TodoPass123!', // Replace with your SQL Server password
    server: 'localhost',         // Use 'localhost\\SQLEXPRESS' if using SQL Server Express
    database: 'todo_db',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('Connected to the Microsoft SQL Server database.');
        return pool;
    })
    .catch(err => console.error('SQL Server connection failed:', err.message));

// --- API ENDPOINTS (CRUD OPERATIONS) ---

// READ: Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT * FROM tasks ORDER BY task_id DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE: Add a new task
app.post('/api/tasks', async (req, res) => {
    try {
        const { task_name, task_description } = req.body;
        console.log('Adding task:', task_name, task_description); // Logs in VS Code terminal

        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.VarChar(255), task_name)
            .input('desc', sql.VarChar(255), task_description)
            .query(`
                INSERT INTO tasks (task_name, task_description, task_status)
                OUTPUT INSERTED.*
                VALUES (@name, @desc, 'Pending')
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Insert Error:', err.message); // Shows exact SQL error in terminal
        res.status(500).json({ error: err.message });
    }
});

// UPDATE: Edit task details or toggle status (Pending / Completed)
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { task_name, task_description, task_status } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('name', sql.VarChar(255), task_name)
            .input('desc', sql.VarChar(255), task_description)
            .input('status', sql.VarChar(20), task_status)
            .query(`
                UPDATE tasks
                SET task_name = @name, task_description = @desc, task_status = @status
                WHERE task_id = @id
            `);
        res.json({ message: 'Task updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Remove a task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM tasks WHERE task_id = @id');
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running! Open http://localhost:${PORT} in your browser.`);
});
