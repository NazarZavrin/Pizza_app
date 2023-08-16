import express from 'express';
import pool from '../connect-to-PostgreSQL.js';
import path from 'path';

export const customersRouter = express.Router();

customersRouter.get("/", async (req, res) => {
    res.sendFile(path.join(path.resolve(), "pages", "customers.html"));
})

customersRouter.post("/create-account", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.name || !req.body.phoneNum || !req.body.email) {
            throw new Error("Customer account creation: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        await pool.query(`
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        BEGIN;`);
        let result = await pool.query(`
        SELECT * FROM customer WHERE name = $1 AND phone_num = $2;
        `, [req.body.name, req.body.phoneNum]);
        if (result.rowCount > 0) {
            throw new Error("Customer with such name and phone number already exists.");
        } else {
            result = await pool.query(`
            INSERT INTO customer VALUES ($1, $2, $3) RETURNING *;
            `, [req.body.name, req.body.phoneNum, req.body.email]);
            await pool.query(`COMMIT;`);
        }
        res.json({ success: true, message: "Customer was added.", customerData: result.rows[0] });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

customersRouter.propfind("/get-customers", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.employeeName) {
            throw new Error("Customers receiving: req.body doesn't contain employee name: " + JSON.stringify(req.body));
        }
        let result = await pool.query(`SELECT * FROM customer;`);
        result.rows.forEach(customer => delete customer.last_action_date_time);
        res.json({ success: true, customers: result.rows });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

customersRouter.patch("/edit", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        // console.log(req.body);
        // console.log(req.body.oldInfo);
        if (!['newCustomerName', 'newCustomerPhoneNum', 'newCustomerEmail',
            'oldInfo', 'employeeName'].every(key => Object.keys(req.body).includes(key))
            || !['name', 'phoneNum', 'email'].every(key => Object.keys(req.body.oldInfo).includes(key))) {
            throw new Error("Customer info changing: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        await pool.query(`BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;`);
        let result = await pool.query(`
        SELECT * FROM customer WHERE name = $1 AND phone_num = $2;
        `, [req.body.newCustomerName, req.body.newCustomerPhoneNum]);
        if (result.rowCount > 0) {
            throw new Error("Customer with such name and phone number already exists.");
        } else {
            await pool.query(`UPDATE customer 
            SET name = $1, phone_num = $2, email = $3 
            WHERE name = $4 AND phone_num = $5;`,
                [req.body.newCustomerName, req.body.newCustomerPhoneNum, req.body.newCustomerEmail,
                req.body.oldInfo.name, req.body.oldInfo.phoneNum]);
            await pool.query(`COMMIT;`);
        }
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

customersRouter.delete("/delete", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.customerName || !req.body.customerPhoneNum || !req.body.employeeName) {
            throw new Error("Customer deletion: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        if (req.body.employeeName !== 'Admin') {
            throw new Error("Employee is not admin");
        }
        await pool.query(`DELETE FROM customer WHERE name = $1 AND phone_num = $2;`,
            [req.body.customerName, req.body.customerPhoneNum]);
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})