"use strict";

import { createElement, isFloat, normalizeOrders, setWarningAfterElement, showModalWindow, userNameIsCorrect } from "./useful-for-client.js";

const employeeName = document.getElementById("employee-name");
const changeAccountBtn = document.getElementsByClassName("change-account-btn")[0];
const exitBtn = document.getElementsByClassName("exit-btn")[0];
const content = document.querySelector(".wrapper > main");
const searchBtn = document.getElementById("search-btn");
const refreshBtn = document.getElementById("refresh-btn");
const ordersContainer = document.getElementById("orders");

let orders = [];

refreshBtn.addEventListener('click', async event => {
    if (localStorage.getItem("employeeName") === null) {
        showRegistrationWindow();
        return;
    }
    content.style.display = "";
    try {
        let requestBody = {
            name: localStorage.getItem("employeeName"),
        };
        let response = await fetch(location.href + "/get-orders", {
            method: "PROPFIND",
            body: JSON.stringify(requestBody),
            headers: { "Content-Type": "application/json" }
        })
        if (response.ok) {
            let result = await response.json();
            if (!result.success) {
                throw new Error(result.message || "Server error.");
            } else {
                content.style.display = "";
                console.log(result.orders);
                orders = normalizeOrders(result.orders);
                console.log(orders);
                renderOrders();
            }
        }
    } catch (error) {
        console.error(error.message);
        alert("Error");
    }
})

if (localStorage.getItem("employeeName") === null) {
    employeeName.style.display = "none";
    showRegistrationWindow();
    content.style.display = "none";
} else {
    employeeName.textContent = localStorage.getItem("employeeName");
    employeeName.style.display = "";
    changeAccountBtn.textContent = "Змінити акаунт";
    refreshBtn.click();
}
exitBtn.addEventListener("click", event => {
    localStorage.removeItem("employeeName");
    location.href = location.href.slice(0, location.href.indexOf("/orders"));
});

changeAccountBtn.addEventListener("click", event => {
    showRegistrationWindow();
})
function showRegistrationWindow() {
    let currentEmployeeLabel = null;
    if (localStorage.getItem("employeeName") !== null) {
        currentEmployeeLabel = createElement({ content: "Співробітник: " + localStorage.getItem("employeeName") });
        currentEmployeeLabel.style.fontSize = "16px";
        currentEmployeeLabel.style.textAlign = "center";
    }
    const separator = createElement({ class: "separator" });
    const header = createElement({ name: "header" });
    header.textContent = currentEmployeeLabel === null ? "Вхід" : "Змінити акаунт";
    const nameLabel = createElement({ name: "header", content: "Введіть ваше ім'я:" });
    const nameInput = createElement({ name: "input" });
    nameInput.setAttribute("autocomplete", "off");
    const logInBtn = createElement({ name: 'button', content: "Увійти", class: "log-in-btn" });
    logInBtn.addEventListener("click", async event => {
        // for login you can enter just name
        setWarningAfterElement(nameInput, '');
        setWarningAfterElement(logInBtn, '');
        if (userNameIsCorrect(nameInput) === false) {
            return;
        }
        try {
            let requestBody = {
                name: nameInput.value,
            };
            let response = await fetch(location.href + "/log-in", {
                method: "PROPFIND",
                body: JSON.stringify(requestBody),
                headers: { "Content-Type": "application/json" }
            })
            if (response.ok) {
                let result = await response.json();
                if (!result.success) {
                    if (result.message.includes("not exist")) {
                        setWarningAfterElement(logInBtn, `Співробітника з такими даними не існує`);
                        return;
                    }
                    throw new Error(result.message || "Server error.");
                } else {
                    employeeName.textContent = result.employeeData.name;
                    employeeName.style.display = "";
                    localStorage.setItem("employeeName", result.employeeData.name);
                    refreshBtn.click();
                }
            }
        } catch (error) {
            console.error(error.message);
            alert("Error");
            return;
        }
        changeAccountBtn.textContent = "Змінити акаунт";
        event.target.closest(".modal-window").closeWindow();
    });
    showModalWindow(document.body,
        [currentEmployeeLabel, currentEmployeeLabel ? separator : null,
            header, nameLabel, nameInput, logInBtn],
        { className: 'registration' });
}

function renderOrders() {
    if (!orders || orders.length === 0) {
        ordersContainer.textContent = "Невидані замовлення відсутні";
        return;
    }
    ordersContainer.innerHTML = '';
    orders?.forEach(orderInfo => {
        if (!orderInfo.element) {
            orderInfo.element = createElement({ name: 'div', class: 'order' });
            const receiptNum = createElement({ class: 'receipt_num', content: 'Замовлення №' + orderInfo.receipt_num });
            orderInfo.element.append(receiptNum);
            const customerName = createElement({ class: 'customer_name', content: 'Покупець: ' + orderInfo.customer_name });
            orderInfo.element.append(customerName);
            const customerPhoneNum = createElement({ class: 'customer_phone_num', content: 'Номер телефону покупця: ' + orderInfo.customer_phone_num });
            orderInfo.element.append(customerPhoneNum);
            const datetime = createElement({ class: 'datetime', content: 'Дата замовлення: ' + new Date(orderInfo.datetime).toLocaleString() });
            orderInfo.element.append(datetime);
            const cost = createElement({ class: 'cost', content: 'Вартість: ' + orderInfo.cost + ' грн.' });
            orderInfo.element.append(cost);
            const orderItems = createElement({ class: 'order-items' });
            orderInfo.orderItems.forEach(orderItem => {
                let text = `Піца: ${orderItem.pizza}; `;
                if (orderItem.extra_toppings.length > 0) {
                    text += `добавки: ${orderItem.extra_toppings.join(", ")}.`;
                } else {
                    text += `добавки відсутні.`;
                }
                orderItems.insertAdjacentHTML("beforeend", `<div class="order-item">${text[0] + text.slice(1).toLocaleLowerCase()}</div>`);
            })
            orderInfo.element.append(orderItems);
            const issuanceBtn = createElement({ name: 'button', class: 'issuance-btn', content: 'Видати замовлення' });
            orderInfo.element.append(issuanceBtn);
        }
        ordersContainer.append(orderInfo.element);
    })
}
ordersContainer.addEventListener('click', event => {
    const issuanceBtn = event.target.closest('.issuance-btn')
    if (!issuanceBtn) {
        return;
    }
    let orderIndex = [...ordersContainer.querySelectorAll('.issuance-btn')].findIndex(btn => btn === issuanceBtn);
    const header = createElement({ name: "header", content: 'Видача замовлення' });
    const сostElem = createElement({ class: 'cost', content: 'Вартість: ' + orders[orderIndex].cost + ' грн.' });
    const paidLabel = createElement({ name: "header", content: "Заплачено (грн.):" });
    const paidInput = createElement({ name: "input" });
    paidInput.setAttribute("autocomplete", "off");
    const changeLabel = createElement({ name: "header", content: 'Введіть заплачену суму' });
    const issueBtn = createElement({ name: 'button', content: "Видати", class: "issue-btn" });
    issueBtn.style.display = "none";
    paidInput.addEventListener("input", event => {
        issueBtn.style.display = "none";
        let warningText = "";
        if (paidInput.value.length === 0) {
            warningText = 'Введіть заплачену суму';
        } else {
            let numWarning = isFloat(paidInput.value);
            if (numWarning.includes("more than once")) {
                warningText = "Десяткова крапка не може зустрічатися у числі більш ніж 1 раз!";
            } else if (numWarning.includes("Incorrect")) {
                warningText = 'Некоретне значення заплаченої суми';
            }
        }
        if (warningText.length > 0) {
            setWarningAfterElement(paidInput, warningText);
            changeLabel.textContent = "";
            return;
        }
        setWarningAfterElement(paidInput, '');
        let change = Number(paidInput.value.split(",").join(".")) - orders[orderIndex].cost;
        if (change < 0) {
            changeLabel.textContent = 'Сплачено недостатньо';
        } else {
            changeLabel.textContent = `Решта: ${change.toFixed(2)} грн.`;
            issueBtn.style.display = "";
        }
    })
    issueBtn.addEventListener('click', async event => {
        paidInput.dispatchEvent(new Event('input'));
        if (changeLabel.textContent.match(/Решта: [\d.,]+ грн./)) {
            try {
                let requestBody = {
                    receiptNum: orders[orderIndex].receipt_num,
                    employeeName: localStorage.getItem("employeeName"),
                    paid: Number(paidInput.value.split(",").join("."))
                };
                let response = await fetch(location.href + "/issue", {
                    method: "PATCH",
                    body: JSON.stringify(requestBody),
                    headers: { "Content-Type": "application/json" }
                })
                if (response.ok) {
                    let result = await response.json();
                    if (!result.success) {
                        throw new Error(result.message || "Server error.");
                    } else {
                        refreshBtn.click();
                        let receiptLink = document.createElement("a");
                        receiptLink.setAttribute('target', '_blank');
                        receiptLink.href = location.href + `/${requestBody.receiptNum}`;
                        receiptLink.click();
                    }
                }
            } catch (error) {
                console.error(error.message);
                alert("Error");
                return;
            }
            event.target.closest(".modal-window").closeWindow();
        } else {
            alert(paidInput.nextElementSibling.textContent
                || changeLabel.textContent ||
                "Введіть коректне і достатнє значення заплаченої суми");
        }
    })
    showModalWindow(document.body,
        [header, сostElem, paidLabel, paidInput, changeLabel, issueBtn],
        { className: 'issuance' });
})