import express from 'express';
import pool from './connect-to-PostgreSQL.js';
import path from 'path';

const app = express();

const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(path.resolve(), 'pages'));

app.use(express.static(path.join(path.resolve(), 'pages')));

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
        let result = await pool.query(`SELECT * FROM extra_toppings`);
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

app.propfind("/log-in", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.name && !req.body.phoneNum) {
            throw new Error("Log in: req.body doesn't contain neither name nor phone number: " + JSON.stringify(req.body));
        }
        let condition = "";
        if (req.body.name.length > 0 && req.body.phoneNum.length > 0) {
            condition = `name = '${req.body.name}' and phone_num = ${req.body.phoneNum}`;
        } else if (req.body.name.length > 0) {
            condition = `name = '${req.body.name}'`;
        } else if (req.body.phoneNum.length > 0) {
            condition = `phone_num = ${req.body.phoneNum}`;
        }
        let result = await pool.query(`SELECT name, phone_num FROM customer WHERE ${condition}`);
        let message = "";
        if (result.rowCount === 0) {
            message = "User with such data does not exist.";
        } else if (result.rowCount > 1) {
            message = `Found several users with such data. Enter additional data (name or phone number) to refine your search.`;
        }
        if (message.length > 0) {
            res.json({ success: false, message: message });
            return;
        }
        res.json({ success: true, userData: result.rows[0] });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
});

app.post("/create-account", (req, res, next) => {
    express.json({
        limit: req.get('content-length'),
    })(req, res, next);
}, async (req, res) => {
    try {
        if (!req.body.name || !req.body.phoneNum || !req.body.email) {
            throw new Error("Account creation: req.body doesn't contain some data: " + JSON.stringify(req.body));
        }
        await pool.query(`
        DO $$
        BEGIN IF EXISTS (SELECT * FROM customer WHERE name = '${req.body.name}' AND phone_num = ${req.body.phoneNum}) THEN
        RAISE EXCEPTION 'Customer with such name and phone number already exists.';
        ELSE
        INSERT INTO customer VALUES ('${req.body.name}', ${req.body.phoneNum}, '${req.body.email}');
        END IF;
        END $$
        `);
        res.json({ success: true, message: "Customer was added." });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
})

app.listen(PORT, () => {
    console.log(`Server has been started on port ${PORT}...`);
})