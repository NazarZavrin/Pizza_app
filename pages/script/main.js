"use strict";

import { createElement, emailIsCorrect, phoneNumberIsCorrect, setWarningAfterElement, showModalWindow, userNameIsCorrect } from "./useful-for-client.js";

console.info(`"Log out buttons" must erase data from local storage`);
// console.info(``);

const customerName = document.getElementById("customer-name");
const changeAccountBtn = document.getElementsByClassName("change-account-btn")[0];
const viewBasketBtn = document.getElementsByClassName("view-basket-btn")[0];
const content = document.querySelector(".wrapper > main");

let basket = [];
let extraToppings = [];

if (localStorage.getItem("customerName") === null) {
    customerName.style.display = "none";
    changeAccountBtn.textContent = "Увійти або створити акаунт";
} else {
    customerName.textContent = localStorage.getItem("customerName");
    customerName.style.display = "";
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
                    throw new Error(result.message || "Fetching data error. Please try again.");
                }
            }
        } catch (error) {
            console.error(error.message);
            alert("Error");
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
            let extraToppingInfo = checkbox.parentElement.textContent;
            order.extraToppings.push(extraToppingInfo.slice(0, extraToppingInfo.indexOf(' (')));
        })
        order.cost = orderCostElem.textContent;
        basket.push(order);
        this.closest(".modal-window").closeWindow();
    });
    showModalWindow([header, extraToppingsContainer,
        orderCostElem, confirmBtn], { className: 'confirm' });
})

viewBasketBtn.addEventListener('click', event => {
    console.log(...basket);
    let currentCustomerLabel = null;
    if (localStorage.getItem("customerName") !== null) {
        currentCustomerLabel = createElement({ content: "Покупець: " + localStorage.getItem("customerName") });
        currentCustomerLabel.style.fontSize = "16px";
        currentCustomerLabel.style.textAlign = "center";
    }
    let orders = createElement({ name: 'section' });
    basket.forEach(order => {
        const pizzaNameElem = createElement({ class: 'pizza-name', content: `Піца: ${order.pizzaInfo.name}` });
        const extraToppingsElem = createElement({ class: 'extra-toppings' });
        extraToppingsElem.textContent = order.extraToppings?.join(", ") || "Добавки відсутні";
        if (!extraToppingsElem.textContent.includes("відсутні")) {
            extraToppingsElem.textContent = 'Добавки: ' + extraToppingsElem.textContent.toLocaleLowerCase();
        }
        const orderElement = createElement();
        orderElement.append(pizzaNameElem);
        orderElement.append(extraToppingsElem);
        orderElement.insertAdjacentHTML('beforeend', `<div class='pizza-cost'>${order.cost}</div>
        <button type="button" class="del-from-basket-btn">Видалити з кошику</button>`);
        orders.append(orderElement);
    });
    const totalCostElem = createElement({ class: 'total-cost' });
    const orderBtn = createElement({ name: 'button', content: "Замовити", class: "order-btn" });
    function updateTotalCost() {
        totalCostElem.textContent = `Сума замовлення: ${basket.reduce(
            (totalCost, order) => totalCost + Number.parseFloat(order.cost.match(/= (\d+)/)[1]), 0)
            } грн.`;
        if (totalCostElem.textContent.includes(": 0 грн")) {
            orders.textContent = "Кошик пустий";
            totalCostElem.textContent = "";
            orderBtn.style.display = "none";
        } else {
            orderBtn.style.display = "";
        }
    }
    updateTotalCost();
    orders.addEventListener('click', event => {
        // deletion from the basket
        const delFromBasketBtn = event.target.closest('.del-from-basket-btn');
        if (!delFromBasketBtn) {
            return;
        }
        let orderIndex = [...orders.querySelectorAll('.del-from-basket-btn')].findIndex(btn => btn === delFromBasketBtn);
        basket = basket.filter((item, index) => index !== orderIndex);
        delFromBasketBtn.closest('section > div')?.remove();
        updateTotalCost();
    })
    orderBtn.addEventListener("click", async event => {
        if (localStorage.getItem("customerName") !== null) {
            try {
                if (basket.length === 0) {
                    alert("Кошик пустий!");
                    return;
                }
                let requestBody = {
                    customerName: localStorage.getItem("customerName"),
                    customerPhoneNum: localStorage.getItem("customerPhoneNum")
                };
                requestBody.orders = basket.map(order => {
                    return {
                        pizzaName: order.pizzaInfo.name,
                        extraToppings: order.extraToppings
                    }
                });
                let response = await fetch(location.href + "create-order", {
                    method: "POST",
                    body: JSON.stringify(requestBody),
                    headers: { "Content-Type": "application/json" }
                })
                if (response.ok) {
                    let result = await response.json();
                    console.log(result);
                    if (!result.success) {
                        throw new Error(result.message || "Server error.");
                    } else {
                        setWarningAfterElement(orderBtn, `Замовлення оформлено. Номер чеку: ${result.receiptNum || -1}.`);
                        return;
                    }
                }
            } catch (error) {
                console.error(error.message);
                alert("Error");
                return;
            }
        } else {
            event.target.closest(".modal-window").closeWindow();
            showRegistrationWindow("show basket after registration");
        }
    });
    showModalWindow([currentCustomerLabel, orders,
        totalCostElem, orderBtn],
        { className: 'basket' });
})

function showRegistrationWindow(whatToDoAfterRegistration = "") {
    let currentCustomerLabel = null;
    if (localStorage.getItem("customerName") !== null) {
        currentCustomerLabel = createElement({ content: "Покупець: " + localStorage.getItem("customerName") });
        currentCustomerLabel.style.fontSize = "16px";
        currentCustomerLabel.style.textAlign = "center";
    }
    const header = createElement({ name: "header" });
    header.textContent = currentCustomerLabel === null ? "Вхід" : "Зміна покупця";
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
            setWarningAfterElement(logInBtn, "Для регістрації потрібно ввести ім'я та номер телефону, або одне з них");
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
                        setWarningAfterElement(logInBtn, `Покупця з такими даними не існує`);
                        return;
                    } else if (result.message.includes("several customers")) {
                        setWarningAfterElement(logInBtn, `Знайдено декілька покупців з такими даними. Введіть додаткове дане (ім'я чи номер телефону) для уточнення пошуку.`);
                        return;
                    }
                    throw new Error(result.message || "Server error.");
                } else {
                    customerName.textContent = result.customerData.name;
                    customerName.style.display = "";
                    localStorage.setItem("customerName", result.customerData.name);
                    localStorage.setItem("customerPhoneNum", result.customerData.phone_num);
                }
            }
        } catch (error) {
            console.error(error.message);
            alert("Error");
            return;
        }
        changeAccountBtn.textContent = "Змінити акаунт";
        event.target.closest(".modal-window").closeWindow();
        if (whatToDoAfterRegistration.includes("show basket")) {
            viewBasketBtn.click();
        }
    });
    const createAccountLabel = createElement({ name: "span", content: "Немає аккаунту? Створіть його:", class: "create-account-label" });
    const createAccountBtn = createElement({ name: 'button', content: "Створити акаунт", class: "create-account-btn" });
    createAccountBtn.addEventListener("click", event => {
        event.target.closest(".modal-window").closeWindow();
        showCreateAccountWindow(whatToDoAfterRegistration);
    });
    const separator = createElement({ class: "separator" });
    const enterAsEmployeeBtn = createElement({ name: 'button', content: "Увійти як працівник", class: "enter-as-employee-btn" });
    enterAsEmployeeBtn.addEventListener("click", event => {
        location.href += "orders";
    });
    showModalWindow([currentCustomerLabel,
        currentCustomerLabel ? separator.cloneNode(true) : null,
        header, nameLabel, nameInput,
        phoneNumberLabel, phoneNumberInput, logInBtn,
        createAccountLabel, createAccountBtn, separator, enterAsEmployeeBtn],
        { className: 'registration' });
}
function showCreateAccountWindow(whatToDoAfterAccountCreation = "") {
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
                    throw new Error(result.message || "Server error.");
                } else {
                    customerName.textContent = result.customerData.name;
                    customerName.style.display = "";
                    localStorage.setItem("customerName", result.customerData.name);
                    localStorage.setItem("customerPhoneNum", result.customerData.phone_num);
                }
            }
        } catch (error) {
            console.error(error.message);
            alert("Error");
            return;
        }
        changeAccountBtn.textContent = "Змінити акаунт";
        event.target.closest(".modal-window").closeWindow();
        if (whatToDoAfterAccountCreation.includes("show basket")) {
            viewBasketBtn.click();
        }
    });
    showModalWindow([header, nameLabel, nameInput,
            phoneNumberLabel, phoneNumberInput,
            emailLabel, emailInput, createAccountBtn],
        { className: 'create-account' });
}