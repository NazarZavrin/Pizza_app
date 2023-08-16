import express from 'express';
import pool from './connect-to-PostgreSQL.js';
import path from 'path';
import { employeeRouter } from './routers/employee-router.js';
import { ordersRouter } from './routers/orders-router.js';
import { customersRouter } from './routers/customers-router.js';

const app = express();

const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(path.resolve(), 'pages'));

app.use(express.static(path.join(path.resolve(), 'pages')));
app.use("/employee", employeeRouter);
app.use("/orders", ordersRouter);
app.use("/customers", customersRouter);

const imgNames = {
    "Сирна": "cheese-pizza.jpg"
}

app.get('/', async (req, res) => {
    try {
        let result = await pool.query(`SELECT * FROM pizza`);
        res.render('main', {
            pizzas: result.rows.map(pizzaInfo => {
                pizzaInfo.imgUrl = path.join("img", imgNames[pizzaInfo.name] || "none.png");
                pizzaInfo.is_vegetarian = pizzaInfo.is_vegetarian === true ? "Вегетаріанська" : "Не вегетаріанська";
                return pizzaInfo;
            })
        });
    } catch (error) {
        console.log(error.message);
        res.send("<pre>Server error</pre>");
    }
})

app.get("/get-extra-toppings", async (req, res) => {
    try {
        let result = await pool.query(`SELECT * FROM extra_topping`);
        res.json({
            success: true, data: result.rows.map(extraToppingInfo => {
                extraToppingInfo.is_vegetarian = extraToppingInfo.is_vegetarian === true ? "Вегетаріанська" : "Не вегетаріанська";
                return extraToppingInfo;
            })
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: "Fetching data error. Please try again." });
    }
})

app.post("/create-order", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        // console.log(req.body);
        if (!req.body.customerName || !req.body.customerPhoneNum || !Array.isArray(req.body.orders) || req.body.orders?.length == 0) {
            throw new Error("Order creation: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        await pool.query(`
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        BEGIN;
        `);
        let result;
        result = await pool.query(`
        SELECT MAX(receipt_num) FROM pizza_order;
        `);
        let receiptNum = Number(result.rows[0].max) + 1 || 1;
        result = await pool.query(`SELECT NOW();`);
        const currentDateTime = result.rows[0].now;
        for (const order of req.body.orders) {
            result = await pool.query(`
            SELECT price FROM pizza WHERE name = $1;
            `, [order.pizzaName]);
            let orderCost = Number.parseFloat(result.rows[0].price);
            if (order.extraToppings === undefined) {
                // if no extra topping were selected
                result = await pool.query(`INSERT INTO pizza_order 
                (num, receipt_num, datetime, pizza, cost, customer_name, customer_phone_num, employee, paid, issuance_datetime) VALUES
                (DEFAULT, $1, $2, $3, $4, $5, $6, NULL, NULL, NULL) RETURNING datetime;
                `, [receiptNum, currentDateTime, order.pizzaName, orderCost, req.body.customerName, req.body.customerPhoneNum]);// insert only pizza
            } else {
                // if some extra toppings were selected
                result = await pool.query(`
                SELECT SUM(price) FROM extra_topping WHERE name = ANY ($1);
                `, [order.extraToppings]);// calc sum of selected extra toppings
                orderCost += Number.parseFloat(result.rows[0].sum);
                result = await pool.query(`WITH inserted_order AS (
                INSERT INTO pizza_order 
                (num, receipt_num, datetime, pizza, cost, customer_name, customer_phone_num, employee, paid, issuance_datetime) VALUES
                (DEFAULT, $1, $2, $3, $4, $5, $6, NULL, NULL, NULL) RETURNING *
                )
                INSERT INTO order_extra_topping VALUES ` + order.extraToppings.map(
                    (item, index) => `((SELECT num FROM inserted_order), $${index + 7})`
                ).join(", ").concat("RETURNING (SELECT datetime FROM inserted_order);"),
                    [receiptNum, currentDateTime, order.pizzaName, orderCost,
                        req.body.customerName, req.body.customerPhoneNum,
                        ...order.extraToppings]);// insert pizza and extra toppings
            }
        }
        result = await pool.query("UPDATE customer SET last_action_date_time = $1 WHERE name = $2 AND phone_num = $3;",
            [result.rows[0].datetime, req.body.customerName, req.body.customerPhoneNum]);
        await pool.query("COMMIT;");
        res.json({ success: true, message: "Order was created successfully.", receiptNum: receiptNum });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

app.propfind("/log-in", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.name && !req.body.phoneNum) {
            throw new Error("Customer log in: req.body doesn't contain neither name nor phone number: " + JSON.stringify(req.body));
        }
        let condition = "", params = [];
        if (req.body.name.length > 0 && req.body.phoneNum.length > 0) {
            condition = `name = $1 and phone_num = $2`;
            params = [req.body.name, req.body.phoneNum];
        } else if (req.body.name.length > 0) {
            condition = `name = $1`;
            params = [req.body.name];
        } else if (req.body.phoneNum.length > 0) {
            condition = `phone_num = $1`;
            params = [req.body.phoneNum];
        }
        let result = await pool.query(`SELECT name, phone_num FROM customer WHERE ${condition};`, params);
        let message = "";
        if (result.rowCount === 0) {
            message = "Customer with such data does not exist.";
        } else if (result.rowCount > 1) {
            message = `Found several customers with such data. Enter additional data (name or phone number) to refine your search.`;
        }
        if (message.length > 0) {
            res.json({ success: false, message: message });
            return;
        }
        res.json({ success: true, customerData: result.rows[0] });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

app.listen(PORT, () => {
    console.log(`Server has been started on port ${PORT}...`);
})