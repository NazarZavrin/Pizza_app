import express from 'express';
import pool from '../connect-to-PostgreSQL.js';
import path from 'path';
import ejs from 'ejs';

export const ordersRouter = express.Router();

ordersRouter.get("/", async (req, res) => {
    res.sendFile(path.join(path.resolve(), "pages", "orders.html"));
})

ordersRouter.propfind("/get-orders", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.employeeName) {
            throw new Error("Orders receiving: req.body doesn't contain employee name: " + JSON.stringify(req.body));
        }
        await pool.query(`
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        BEGIN;
        `);
        // ↓ Task 1: get all orders that weren't issued yet
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
        await pool.query("COMMIT;");
        res.json({ success: true, orders: orders });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

ordersRouter.patch("/issue", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.receiptNum || !req.body.employeeName || !req.body.paid) {
            throw new Error("Order issuance: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        await pool.query(`
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        BEGIN;
        `);
        let result = await pool.query(`SELECT NOW();`);
        const currentDateTime = result.rows[0].now;
        await pool.query(`UPDATE pizza_order 
        SET employee = $1, paid = $2, issuance_datetime = $3 WHERE receipt_num = $4;`,
            [req.body.employeeName, req.body.paid, currentDateTime, req.body.receiptNum]);
        await pool.query("COMMIT;");
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

ordersRouter.all(/^\/(\d+)$/, async (req, res, next) => {
    let receipt_num = Number(req.url.match(/^\/(\d+)$/)[1]);
    if (req.method === "GET") {
        let receipt = await ejs.renderFile(path.join(path.resolve("pages", "receipt.ejs")), { receipt_num: receipt_num });
        res.send(receipt);
    } else if (req.method === "PROPFIND") {
        try {
            // ↓ Task 1: get all orders that weren't issued and have specified receipt number
            let result = await pool.query(`SELECT * FROM pizza_order 
            WHERE receipt_num = $1 AND paid IS NOT NULL 
            ORDER BY datetime DESC, pizza ASC;`, [receipt_num]);
            if (result.rowCount === 0) {
                res.json({ success: false, message: "Non-existent receipt number." });
                return;
            }
            let orders = result.rows.map(order => {
                order.extra_toppings = [];
                return order;
            });
            // ↓ Task 2: get all extra toppings
            result = await pool.query(`
            SELECT order_extra_topping.extra_topping, order_extra_topping.order_num 
            FROM order_extra_topping INNER JOIN pizza_order ON num = order_num
            WHERE receipt_num = $1 AND paid IS NOT NULL 
            ORDER BY datetime DESC, pizza ASC;`, [receipt_num]);
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
                delete order.customer_phone_num;
            })
            res.json({ success: true, orders: orders });
        } catch (error) {
            console.log(error.message);
            res.json({ success: false, message: error.message });
        }
    } else {
        next();
    }
})

ordersRouter.delete("/delete", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.receiptNum || !req.body.employeeName) {
            throw new Error("Order deletion: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        if (req.body.employeeName !== 'Admin') {
            throw new Error("Employee is not admin");
        }
        await pool.query(`DELETE FROM pizza_order WHERE receipt_num = $1;`,
        [req.body.receiptNum]);
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})