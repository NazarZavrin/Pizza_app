"use strict";

import { createElement, emailIsCorrect, phoneNumberIsCorrect, setWarningAfterElement, showModalWindow, userNameIsCorrect } from "./useful-for-client.js";

const customerName = document.getElementById("customer-name");
const changeAccountBtn = document.getElementsByClassName("change-account-btn")[0];
const viewBasketBtn = document.getElementsByClassName("view-basket-btn")[0];
const content = document.querySelector(".wrapper");

const basket = [
    {
        cost: "Сума: піца (185 грн.) + добавки (45 грн.) = 230 грн.",
        extraToppings: ['Нарізані гриби (25 грн.)', 'Шинка (20 грн.)'],
        pizzaInfo: {
            ingredients: "інгредієнти: нарізані пепероні, сир моцарела, орегано, базилік",
            name: "Пепероні",
            price: "185 грн."
        }
    }
];
let extraToppings = [];

if (customerName.textContent.length === 0) {
    changeAccountBtn.textContent = "Увійти або створити акаунт";
}
changeAccountBtn.addEventListener("click", event => {
    showRegistrationWindow();
})

content.addEventListener("click", async event => {
    // logic of adding pizza to the basket
    const addToBasketBtn = event.target.closest(".add-to-basket-btn");
    if (!addToBasketBtn) {
        return;
    }
    const pizzaContainer = addToBasketBtn.closest("section");
    if (!pizzaContainer) {
        return;
    }
    const order = {
        pizzaInfo: {},
    }
    order.pizzaInfo.name = pizzaContainer.querySelector(".pizza__name")?.textContent || "";
    order.pizzaInfo.ingredients = pizzaContainer.querySelector(".pizza__ingredients")?.textContent.toLowerCase() || "";
    order.pizzaInfo.price = pizzaContainer.querySelector(".pizza__price")?.textContent || "";
    const header = createElement({ name: "header", content: `Оберіть добавки до піци "${order.pizzaInfo.name}":` });
    if (extraToppings.length === 0) {
        let result = {};
        try {
            let response = await fetch(location.href + "get-extra-toppings");
            if (response.ok) {
                result = await response.json();
                // console.log(result);
                if (!result.success) {
                    console.error(result.message);
                    throw new Error(result.errorInfo || "Fetching data error. Please try again.");
                }
            }
        } catch (error) {
            alert(error.message);
            return;
        }
        extraToppings = result.data;
    }
    const extraToppingsContainer = createElement({ name: 'section' });
    extraToppings.filter(extraToppingInfo => {
        if (order.pizzaInfo.ingredients.indexOf(extraToppingInfo.name.toLowerCase()) < 0) {
            return true;
        }
    }).forEach((extraToppingInfo, index) => {
        extraToppingsContainer.insertAdjacentHTML("beforeend", `<label><input type="checkbox" name=${index}>${extraToppingInfo.name} (${extraToppingInfo.price} грн.)</label>`);
    })
    const orderCostElem = createElement();
    orderCostElem.textContent = `Сума: піца (${order.pizzaInfo.price}) + добавки (0 грн.) = ${Number.parseFloat(order.pizzaInfo.price)} грн.`;
    extraToppingsContainer.addEventListener('change', event => {
        if (!event.target.closest('label')) {
            return;
        }
        const orderCostNum = [...extraToppingsContainer.querySelectorAll('label > input[type="checkbox"]:checked')].reduce((prev, cur) => {
            return prev + Number.parseFloat(cur.parentElement.textContent.match(/\d+/));
        }, 0);
        if (!Number.isNaN(orderCostNum)) {
            orderCostElem.textContent = `Сума: піца (${order.pizzaInfo.price}) + добавки (${orderCostNum} грн.) = ${Number.parseFloat(order.pizzaInfo.price) + orderCostNum} грн.`;
        }
    })
    const confirmBtn = createElement({ name: 'button', content: "Додати до кошику", class: "confirm-btn" });
    confirmBtn.addEventListener("click", async function (event) {
        Array.from(this.parentElement.querySelectorAll("input[type=checkbox]:checked")).forEach(checkbox => {
            if (!order.extraToppings) {
                order.extraToppings = [];
            }
            order.extraToppings.push(checkbox.parentElement.textContent);
        })
        order.cost = orderCostElem.textContent;
        basket.push(order);
        this.closest(".modal-window").closeWindow();
    });
    showModalWindow(document.body, [header, extraToppingsContainer, orderCostElem, confirmBtn], { className: 'confirm' });
})

viewBasketBtn.addEventListener('click', event => {
    console.log(...basket);
    let currentCustomerLabel = null;
    if (customerName.textContent.length !== 0) {
        currentCustomerLabel = createElement({ content: "Поточний користувач: " + customerName.textContent });
        currentCustomerLabel.style.fontSize = "16px";
    }
    let orders = createElement({ name: 'section' })
    let totalCost = 0;
    basket.forEach(order => {
        const pizzaName = createElement({ class: 'pizza-name', content: `Піца: ${order.pizzaInfo.name}` });
        const extraToppings = createElement({ class: 'extra-toppings' });
        extraToppings.textContent = order.extraToppings?.reduce((prev, cur) => {
            return prev += cur.slice(0, cur.indexOf(' (')).concat(", ");
        }, "").slice(0, -2) || "Добавки відсутні";
        if (!extraToppings.textContent.includes("відсутні")) {
            extraToppings.textContent = 'Добавки: ' + extraToppings.textContent.toLocaleLowerCase();
        }
        const orderElement = createElement();
        orderElement.append(pizzaName);
        orderElement.append(extraToppings);
        orderElement.insertAdjacentHTML('beforeend', `<div class='pizza-cost'>${order.cost}</div>`);
        totalCost += Number.parseFloat(order.cost.match(/= (\d+)/)[1]);
        orders.append(orderElement);
    });
    const totalCostElem = createElement({ class: 'total-cost', content: `Сума замовлення: ${totalCost} грн.` });
    const orderBtn = createElement({ name: 'button', content: "Замовити", class: "order-btn" });
    orderBtn.addEventListener("click", async event => {
        event.target.closest(".modal-window").closeWindow();
        if (currentCustomerLabel) {
            // save an order
        } else {
            // registration
            showRegistrationWindow();
        }
    });
    showModalWindow(document.body,
        [currentCustomerLabel, orders, totalCostElem, orderBtn],
        { className: 'basket' });
})

function showRegistrationWindow() {
    let currentCustomerLabel = null;
    if (customerName.textContent.length !== 0) {
        currentCustomerLabel = createElement({ content: "Поточний користувач: " + customerName.textContent });
        currentCustomerLabel.style.fontSize = "16px";
    }
    const header = createElement({ name: "header" });
    header.textContent = currentCustomerLabel === null ? "Вхід" : "Зміна користувача";
    const nameLabel = createElement({ name: "header", content: "Введіть ваше ім'я:" });
    const nameInput = createElement({ name: "input" });
    nameInput.setAttribute("autocomplete", "off");
    const phoneNumberLabel = createElement({ name: "header", content: "Введіть ваш номер телефону:" });
    const phoneNumberInput = createElement({ name: "input" });
    phoneNumberInput.setAttribute("autocomplete", "off");
    phoneNumberInput.setAttribute("type", "tel");
    const logInBtn = createElement({ name: 'button', content: "Увійти", class: "log-in-btn" });
    logInBtn.addEventListener("click", async event => {
        // for login you can enter name or phone or both
        setWarningAfterElement(nameInput, '');
        setWarningAfterElement(phoneNumberInput, '');
        setWarningAfterElement(logInBtn, '');
        let everythingIsCorrect = true;
        if (nameInput.value.length > 0) {
            everythingIsCorrect = userNameIsCorrect(nameInput) && everythingIsCorrect;
        }
        if (phoneNumberInput.value.length > 0) {
            everythingIsCorrect = phoneNumberIsCorrect(phoneNumberInput) && everythingIsCorrect;
        }
        if (nameInput.value.length === 0 && phoneNumberInput.value.length === 0) {
            setWarningAfterElement(logInBtn, "Для регістрації потрібно ввести ім'я користувача та номер телефону, або одне з них");
            everythingIsCorrect = false;
        }
        if (everythingIsCorrect === false) {
            return;
        }
        try {
            let requestBody = {
                name: nameInput.value,
                phoneNum: phoneNumberInput.value
            };
            let response = await fetch(location.href + "log-in", {
                method: "PROPFIND",
                body: JSON.stringify(requestBody),
                headers: { "Content-Type": "application/json" }
            })
            if (response.ok) {
                let result = await response.json();
                if (!result.success) {
                    if (result.message.includes("not exist")) {
                        setWarningAfterElement(logInBtn, `Користувача з такими даними не існує`);
                        return;
                    } else if (result.message.includes("several users")) {
                        setWarningAfterElement(logInBtn, `Знайдено декілька користувачів з такими даними. Введіть додаткове дане (ім'я чи номер телефону) для уточнення пошуку.`);
                        return;
                    }
                    console.error(result.message);
                    throw new Error(result.errorInfo || "Server error.");
                } else {
                    customerName.textContent = result.userData.name;
                }
            }
        } catch (error) {
            alert(error.message);
            return;
        }
        changeAccountBtn.textContent = "Змінити";
        event.target.closest(".modal-window").closeWindow();
    });
    const createAccountLabel = createElement({ name: "span", content: "Немає аккаунту? Створіть його:", class: "create-account-label" });
    const createAccountBtn = createElement({ name: 'button', content: "Створити акаунт", class: "create-account-btn" });
    createAccountBtn.addEventListener("click", event => {
        event.target.closest(".modal-window").closeWindow();
        showCreateAccountWindow();
    });
    const separator = createElement({ class: "separator" });
    const enterAsEmployeeBtn = createElement({ name: 'button', content: "Увійти як працівник", class: "enter-as-employee-btn" });
    enterAsEmployeeBtn.addEventListener("click", event => {
        location.href += "orders";
    });
    showModalWindow(document.body,
        [currentCustomerLabel, currentCustomerLabel ? separator.cloneNode(true) : null,
            header, nameLabel, nameInput,
            phoneNumberLabel, phoneNumberInput, logInBtn,
            createAccountLabel, createAccountBtn, separator, enterAsEmployeeBtn],
        { className: 'registration' });
}
function showCreateAccountWindow() {
    const header = createElement({ name: "header", content: "Реєстрація" });
    const nameLabel = createElement({ name: "header", content: "Введіть ваше ім'я:" });
    const nameInput = createElement({ name: "input" });
    nameInput.setAttribute("autocomplete", "off");
    const phoneNumberLabel = createElement({ name: "header", content: "Введіть ваш номер телефону:" });
    const phoneNumberInput = createElement({ name: "input" });
    phoneNumberInput.setAttribute("autocomplete", "off");
    phoneNumberInput.setAttribute("type", "tel");
    const emailLabel = createElement({ name: "header", content: "Введіть ваш email:" });
    const emailInput = createElement({ name: "input" });
    emailInput.setAttribute("autocomplete", "off");
    const createAccountBtn = createElement({ name: 'button', content: "Створити акаунт", class: "create-account-btn" });
    createAccountBtn.addEventListener("click", async event => {
        setWarningAfterElement(createAccountBtn, '');
        let everythingIsCorrect = true;
        everythingIsCorrect = userNameIsCorrect(nameInput) && everythingIsCorrect;
        everythingIsCorrect = phoneNumberIsCorrect(phoneNumberInput) && everythingIsCorrect;
        everythingIsCorrect = emailIsCorrect(emailInput) && everythingIsCorrect;
        if (everythingIsCorrect === false) {
            return;
        }
        try {
            let requestBody = {
                name: nameInput.value,
                phoneNum: phoneNumberInput.value,
                email: emailInput.value
            };
            let response = await fetch(location.href + "create-account", {
                method: "POST",
                body: JSON.stringify(requestBody),
                headers: { "Content-Type": "application/json" }
            })
            if (response.ok) {
                let result = await response.json();
                if (!result.success) {
                    if (result.message.includes("already exists")) {
                        setWarningAfterElement(createAccountBtn, 'Покупець з таким іменем та номером телефону вже існує');
                        return;
                    }
                    console.error(result.message);
                    throw new Error(result.errorInfo || "Server error.");
                }
            }
        } catch (error) {
            alert(error.message);
            return;
        }
        customerName.textContent = nameInput.value;
        changeAccountBtn.textContent = "Змінити";
        event.target.closest(".modal-window").closeWindow();
    });
    showModalWindow(document.body,
        [header, nameLabel, nameInput,
            phoneNumberLabel, phoneNumberInput,
            emailLabel, emailInput, createAccountBtn],
        { className: 'create-account' });
}