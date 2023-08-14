import express from 'express';
import pool from '../connect-to-PostgreSQL.js';
import path from 'path';

export const employeeRouter = express.Router();

employeeRouter.get("/", async (req, res) => {
    res.sendFile(path.join(path.resolve(), "pages", "employee.html"));
})

employeeRouter.propfind("/log-in", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.name || !req.body.password) {
            throw new Error("Employee log in: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        let result = await pool.query(`SELECT name FROM employee WHERE name = $1`, [req.body.name]);
        if (result.rowCount === 0) {
            res.json({ success: false, message: "Employee with such name does not exist." });
            return;
        }
        result = await pool.query(`SELECT name FROM employee WHERE name = $1 AND password = $2`, [req.body.name, req.body.password]);
        if (result.rowCount === 0) {
            res.json({ success: false, message: "Wrong password." });
            return;
        }
        res.json({ success: true, employeeData: result.rows[0] });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})