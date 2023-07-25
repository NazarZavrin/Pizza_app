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

employeeRouter.propfind("/get-orders", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.name) {
            throw new Error("Employee log in: req.body doesn't contain employee name: " + JSON.stringify(req.body));
        }
        await pool.query(`
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        BEGIN;
        `);
        // ↓ Task 1: get all orders
        let result = await pool.query(`
        SELECT num, receipt_num, pizza, datetime, pizza_order.cost,
        customer_name, customer_phone_num
        FROM pizza_order
        WHERE employee IS NULL
        ORDER BY datetime DESC, pizza ASC;`);
        // ↓ add array of extraToppings to each order
        let orders = result.rows.map(order => {
            order.extra_toppings = [];
            return order;
        });
        // ↓ Task 2: get all extra toppings
        result = await pool.query(`
        SELECT order_extra_topping.extra_topping, order_extra_topping.order_num 
        FROM order_extra_topping INNER JOIN pizza_order ON num = order_num
        WHERE employee IS NULL
        ORDER BY datetime DESC, pizza ASC;`);
        // ↓ Task 3: add to each order it's extraToppings
        orders.forEach(order => {
            for (const extraToppingInfo of result.rows) {
                if (order.num === extraToppingInfo.order_num) {
                    order.extra_toppings.push(extraToppingInfo.extra_topping);
                    // ↓ current extra topping found corresponding pizza, so we can remove it, thus reduce this cycle's amount of work
                    result.rows = result.rows.filter(item => item !== extraToppingInfo);
                }
            }
            delete order.num;
        })
        let curDateTime = await pool.query(`select now();`);
        await pool.query("COMMIT;");
        res.json({ success: true, orders: orders, curDateTime: curDateTime.rows[0] });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})