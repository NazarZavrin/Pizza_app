import express from 'express';
import pool from '../connect-to-PostgreSQL.js';
import path from 'path';
import ejs from 'ejs';

export const ordersRouter = express.Router();

ordersRouter.get("/", async (req, res) => {
    res.sendFile(path.join(path.resolve(), "pages", "orders.html"));
})

ordersRouter.post("/create-order", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        // console.log(req.body);
        if (!req.body.customerName || !req.body.customerPhoneNum || !Array.isArray(req.body.orderItems) || req.body.orderItems?.length == 0) {
            throw new Error("Order creation: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        await pool.query(`
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        BEGIN;
        `);
        let result = await pool.query(`
        SELECT MAX(receipt_num) FROM order_items;
        `);
        let receiptNum = Number(result.rows[0].max) + 1 || 1;
        result = await pool.query(`SELECT NOW();`);
        const currentDateTime = result.rows[0].now;
        for (const orderItem of req.body.orderItems) {
            result = await pool.query(`
            SELECT price FROM pizza WHERE name = $1;
            `, [orderItem.pizzaName]);
            let orderItemCost = Number.parseFloat(result.rows[0].price);
            if (orderItem.extraToppings === undefined) {
                // if no extra topping were selected - insert only pizza
                result = await pool.query(`INSERT INTO order_items 
                (num, receipt_num, datetime, pizza, cost, customer_name, customer_phone_num) VALUES
                (DEFAULT, $1, $2, $3, $4, $5, $6) RETURNING datetime;
                `, [receiptNum, currentDateTime, orderItem.pizzaName, orderItemCost, req.body.customerName, req.body.customerPhoneNum]);
            } else {
                // if some extra toppings were selected - insert pizza and extra toppings
                result = await pool.query(`
                SELECT SUM(price) FROM extra_topping WHERE name = ANY ($1);
                `, [orderItem.extraToppings]);// calc sum of selected extra toppings
                orderItemCost += Number.parseFloat(result.rows[0].sum);
                result = await pool.query(`WITH inserted_order AS (
                INSERT INTO order_items 
                (num, receipt_num, datetime, pizza, cost, customer_name, customer_phone_num) VALUES
                (DEFAULT, $1, $2, $3, $4, $5, $6) RETURNING *
                )
                INSERT INTO order_extra_topping VALUES ` + orderItem.extraToppings.map(
                    (item, index) => `((SELECT num FROM inserted_order), $${index + 7})`
                ).join(", ").concat("RETURNING (SELECT datetime FROM inserted_order);"),
                    [receiptNum, currentDateTime, orderItem.pizzaName, orderItemCost,
                        req.body.customerName, req.body.customerPhoneNum,
                        ...orderItem.extraToppings]);
            }
        }
        result = await pool.query("UPDATE customer SET last_action_date_time = $1 WHERE name = $2 AND phone_num = $3 AND deleted_id = 0;",
            [result.rows[0].datetime, req.body.customerName, req.body.customerPhoneNum]);
        await pool.query("COMMIT;");
        res.json({ success: true, message: "Order was created successfully.", receiptNum: receiptNum });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
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
        SELECT num, receipt_num, pizza, datetime, order_items.cost,
        customer_name, customer_phone_num
        FROM order_items 
        WHERE employee_name IS NULL AND customer_deleted_id = 0
        ORDER BY datetime DESC, pizza ASC;`);
        // ↓ add array of extraToppings to each order item
        let orderItems = result.rows.map(orderItem => {
            orderItem.extra_toppings = [];
            return orderItem;
        });
        // ↓ Task 2: get all extra toppings
        result = await pool.query(`
        SELECT order_extra_topping.extra_topping, order_extra_topping.order_num 
        FROM order_extra_topping INNER JOIN order_items ON num = order_num
        WHERE employee_name IS NULL AND order_items.customer_deleted_id = 0
        ORDER BY datetime DESC, pizza ASC;`);
        // ↓ Task 3: add to each order item it's extraToppings
        orderItems.forEach(orderItem => {
            for (const extraToppingInfo of result.rows) {
                if (orderItem.num === extraToppingInfo.order_num) {
                    orderItem.extra_toppings.push(extraToppingInfo.extra_topping);
                    // ↓ current extra topping found corresponding pizza, so we can remove it, thus reduce this cycle's amount of work
                    result.rows = result.rows.filter(item => item !== extraToppingInfo);
                }
            }
            delete orderItem.num;
        })
        await pool.query("COMMIT;");
        res.json({ success: true, orderItems: orderItems });
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
        await pool.query(`UPDATE order_items 
        SET employee_name = $1, paid = $2, issuance_datetime = $3 WHERE receipt_num = $4;`,
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
            // ↓ Task 1: get all order items that weren't issued and have specified receipt number
            let result = await pool.query(`SELECT * FROM order_items 
            WHERE receipt_num = $1 AND paid IS NOT NULL 
            ORDER BY datetime DESC, pizza ASC;`, [receipt_num]);
            if (result.rowCount === 0) {
                res.json({ success: false, message: "Non-existent receipt number." });
                return;
            }
            let orderItems = result.rows.map(orderItem => {
                orderItem.extra_toppings = [];
                return orderItem;
            });
            // ↓ Task 2: get all extra toppings
            result = await pool.query(`
            SELECT order_extra_topping.extra_topping, order_extra_topping.order_num 
            FROM order_extra_topping INNER JOIN order_items ON num = order_num
            WHERE receipt_num = $1 AND paid IS NOT NULL 
            ORDER BY datetime DESC, pizza ASC;`, [receipt_num]);
            // ↓ Task 3: add to each order item it's extraToppings
            orderItems.forEach(orderItem => {
                for (const extraToppingInfo of result.rows) {
                    if (orderItem.num === extraToppingInfo.order_num) {
                        orderItem.extra_toppings.push(extraToppingInfo.extra_topping);
                        // ↓ current extra topping found corresponding pizza, so we can remove it, thus reduce this cycle's amount of work
                        result.rows = result.rows.filter(item => item !== extraToppingInfo);
                    }
                }
                delete orderItem.num;
                delete orderItem.customer_phone_num;
                delete orderItem.customer_deleted_id;
                delete orderItem.employee_deleted_id;
            })
            res.json({ success: true, orderItems: orderItems });
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
        await pool.query(`DELETE FROM order_items WHERE receipt_num = $1;`,
            [req.body.receiptNum]);
        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})