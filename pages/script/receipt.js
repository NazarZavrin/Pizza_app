"use strict";

import { normalizeOrders } from "./useful-for-client.js";

if (localStorage.getItem("employeeName")) {
    (async () => {
        try {
            let response = await fetch(location.href, {
                method: "PROPFIND",
                headers: { "Content-Type": "application/json" }
            })
            if (response.ok) {
                let result = await response.json();
                if (!result.success) {
                    if (result.message.includes("Non-existent")) {
                        document.body.innerHTML = `<pre>Неіснуючий номер чеку</pre>`;
                    } else {
                        throw new Error(result.message || "Server error.");
                    }
                } else {
                    let order = normalizeOrders(result.orders)?.pop();
                    const labels = {
                        cost: "Вартість",
                        paid: "Сплачено",
                        change: "Решта",
                    }
                    for (const key in order) {
                        if (key === "orderItems") {
                            continue;
                        } else if (key.includes("datetime")) {
                            order[key] = new Date(order[key]).toLocaleString();
                        }
                        document.getElementsByClassName(key)[0].textContent += order[key] || '';
                    }
                    order.orderItems.forEach(orderItem => {
                        let text = `Піца: ${orderItem.pizza}; `;
                        if (orderItem.extra_toppings.length > 0) {
                            text += `добавки: ${orderItem.extra_toppings.join(", ")}.`;
                        } else {
                            text += `добавки відсутні.`;
                        }
                        document.querySelector(".receipt_body").insertAdjacentHTML("beforeend",
                            `<div class="order-item">${text[0] + text.slice(1).toLocaleLowerCase()}</div>
                    <div class="order-item-cost">${orderItem.cost} грн.</div>`);
                    })
                    document.querySelector(".change").textContent += (Number(order.paid) - order.cost).toFixed(2);
                    for (const item of ["cost", "paid", "change"]) {
                        let elem = document.getElementsByClassName(item)[0];
                        elem.textContent += " грн.";
                        elem.insertAdjacentHTML("beforebegin",
                            `<div>${labels[item]}</div>`);
                    }
                }
            }
        } catch (error) {
            console.error(error.message);
            alert("Error");
        }
    })();
} else {
    document.body.innerHTML = `<pre>Відмова в доступі</pre>`;
}