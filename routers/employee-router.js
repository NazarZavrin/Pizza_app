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
        if (!req.body.name) {
            throw new Error("Employee log in: req.body doesn't contain name: " + JSON.stringify(req.body));
        }
        let result = await pool.query(`SELECT name FROM employee WHERE name = $1;`, [req.body.name]);
        if (result.rowCount === 0) {
            res.json({ success: false, message: "Employee with such data does not exist." });
            return;
        }
        res.json({ success: true, employeeData: result.rows[0] });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})