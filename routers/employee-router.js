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

employeeRouter.patch("/change-password", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.employeeName || !req.body.oldPassword || !req.body.newPassword) {
            throw new Error("Employee password changing: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        await pool.query(`BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;`);
        let result = await pool.query(`
            SELECT * FROM employee WHERE name = $1 AND deleted_id = 0;
            `, [req.body.employeeName]);
        let message = "";
        if (result.rowCount === 0) {
            message = "Customer with such data does not exist.";
        } else if (result.rowCount > 1) {
            message = `Found several employees with such data.`;
        }
        if (message.length > 0) {
            res.json({ success: false, message: message });
            return;
        }
        result = await pool.query(`UPDATE employee SET password = $1 
        WHERE name = $2 AND password = $3 AND deleted_id = 0;`,
            [req.body.newPassword, req.body.employeeName, req.body.oldPassword]);
        if (result.rowCount === 0) {
            res.json({ success: false, message: "Wrong password." });
            return;
        }
        await pool.query(`COMMIT;`);
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

export const employeesRouter = express.Router();

employeesRouter.get("/", async (req, res) => {
    res.sendFile(path.join(path.resolve(), "pages", "employees.html"));
})

employeesRouter.post("/create-account", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.employeeName || !req.body.name || !req.body.phoneNum || !req.body.email || !req.body.passportNum || !req.body.password) {
            throw new Error("Employee account creation: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        if (req.body.employeeName !== 'Admin') {
            throw new Error("Employee is not admin");
        }
        await pool.query(`
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        BEGIN;`);
        let result = await pool.query(`
        SELECT * FROM employee WHERE name = $1 AND deleted_id = 0;
        `, [req.body.name]);
        if (result.rowCount > 0) {
            res.json({ success: false, message: "Employee with such name already exists." });
            return;
        }
        result = await pool.query(`
        SELECT * FROM employee WHERE passport_num = $1 AND deleted_id = 0;
        `, [req.body.passportNum]);
        if (result.rowCount > 0) {
            res.json({ success: false, message: "Employee with such passport number already exists." });
            return;
        }
        result = await pool.query(`
            INSERT INTO employee (name, phone_num, email, passport_num, password) 
            VALUES ($1, $2, $3, $4, $5) RETURNING name, phone_num;
            `, [req.body.name, req.body.phoneNum, req.body.email, req.body.passportNum, req.body.password]);
        await pool.query(`COMMIT;`);
        res.json({ success: true, message: "Employee was added.", employeeData: result.rows[0] });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

employeesRouter.propfind("/get-employees", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.employeeName) {
            throw new Error("Employees receiving: req.body doesn't contain employee name: " + JSON.stringify(req.body));
        }
        if (req.body.employeeName !== 'Admin') {
            throw new Error("Employee is not admin");
        }
        let result = await pool.query(`
        SELECT name, passport_num, phone_num, email 
        FROM employee WHERE deleted_id = 0;`);
        res.json({ success: true, employees: result.rows });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

employeesRouter.patch("/edit", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        // console.log(req.body);
        // console.log(req.body.oldInfo);
        if (!['employeeName', 'newEmployeeName', 'newEmployeePhoneNum', 'newEmployeeEmail', 'newEmployeePassportNum', 
            'oldInfo'].every(key => Object.keys(req.body).includes(key))
            || !['name', 'phoneNum', 'email', 'passportNum'].every(key => Object.keys(req.body.oldInfo).includes(key))) {
            throw new Error("Employee info changing: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        if (req.body.employeeName !== 'Admin') {
            throw new Error("Employee is not admin");
        }
        await pool.query(`BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;`);
        if (req.body.oldPassword || req.body.newPassword) {
            if (req.body.oldInfo.name !== 'Admin') {
                res.json({ success: false, message: "Admin can't change employee's password." });
                return;
            } else if (req.body.oldPassword && req.body.newPassword) {
                let result = await pool.query(`UPDATE employee SET password = $1 
            WHERE name = 'Admin' AND password = $2 
            RETURNING name;`,
                    [req.body.newPassword, req.body.oldPassword]);
                if (result.rowCount === 0) {
                    res.json({ success: false, message: "Wrong password." });
                    return;
                }
            } else {
                throw new Error("Admin password changing: req.body doesn't contain old or/and new password: " + JSON.stringify(req.body));
            }
        }
        if (req.body.oldInfo.name == 'Admin') {
            req.body.newEmployeeName = 'Admin';
        }
        if (req.body.newEmployeeName !== req.body.oldInfo.name) {
            let result = await pool.query(`
            SELECT * FROM employee WHERE name = $1 AND deleted_id = 0;
            `, [req.body.newEmployeeName]);
            if (result.rowCount > 0) {
                res.json({ success: false, message: "Employee with such name already exists." });
                return;
            }
        }
        if (req.body.newEmployeePassportNum !== req.body.oldInfo.passportNum) {
            let result = await pool.query(`
            SELECT * FROM employee WHERE passport_num = $1 AND deleted_id = 0;
            `, [req.body.newEmployeePassportNum]);
            if (result.rowCount > 0) {
                res.json({ success: false, message: "Employee with such passport number already exists." });
                return;
            }
        }
        await pool.query(`UPDATE employee 
            SET name = $1, phone_num = $2, email = $3, passport_num = $4 
            WHERE name = $5 AND deleted_id = 0;`,
            [req.body.newEmployeeName, req.body.newEmployeePhoneNum,
            req.body.newEmployeeEmail, req.body.newEmployeePassportNum,
            req.body.oldInfo.name]);
        await pool.query(`COMMIT;`);
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

employeesRouter.delete("/delete", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.employeeName || !req.body.employeeToDeleteName) {
            throw new Error("Employee deletion: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        if (req.body.employeeName !== 'Admin') {
            throw new Error("Employee is not admin");
        }
        if (req.body.employeeToDeleteName === 'Admin') {
            throw new Error("Can't delete an admin");
        }
        await pool.query(`UPDATE employee 
        SET deleted_id = (SELECT MAX(deleted_id) FROM employee 
        WHERE name = $1) + 1 
        WHERE name = $1 AND deleted_id = 0;`,
            [req.body.employeeToDeleteName]);
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})