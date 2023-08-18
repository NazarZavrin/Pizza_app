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

app.listen(PORT, () => {
    console.log(`Server has been started on port ${PORT}...`);
})