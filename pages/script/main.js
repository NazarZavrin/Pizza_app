"use strict";

import { createElement, emailIsCorrect, phoneNumberIsCorrect, setWarningAfterElement, showModalWindow, userNameIsCorrect } from "./useful-for-client.js";

const customerName = document.getElementById("customer-name");
const changeAccountBtn = document.getElementsByClassName("change-account-btn")[0];
const viewBasketBtn = document.getElementsByClassName("view-basket-btn")[0];
const content = document.querySelector(".wrapper");

const basket = [];
let extraToppings = [];

if (customerName.textContent.length === 0) {
    changeAccountBtn.textContent = "Увійти або зареєструватися";
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
    let pizzaInfo = {};
    pizzaInfo.name = pizzaContainer.querySelector(".pizza__name")?.textContent || "";
    pizzaInfo.ingredients = pizzaContainer.querySelector(".pizza__ingredients")?.textContent.toLowerCase() || "";
    pizzaInfo.price = pizzaContainer.querySelector(".pizza__price")?.textContent || "";
    const header = createElement({ name: "header", content: `Оберіть добавки до піци "${pizzaInfo.name}":` });
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
            alert(error.message);
            return;
        }
        extraToppings = result.data;
    }
    let extraToppingsCheckboxes = extraToppings.filter(extraToppingInfo => {
        if (pizzaInfo.ingredients.indexOf(extraToppingInfo.name.toLowerCase()) < 0) {
            return true;
        }
    }).map((extraToppingInfo, index) => {
        let extraToppingElement = createElement({ name: "label" });
        extraToppingElement.innerHTML = `<input type="checkbox" name=${index}>${extraToppingInfo.name} (${extraToppingInfo.price} грн.)`;
        return extraToppingElement;
    })
    const confirmBtn = createElement({ name: 'button', content: "Додати до кошику", class: "confirm-btn" });
    console.log(confirmBtn);
    confirmBtn.addEventListener("click", async function (event) {
        Array.from(this.parentElement.querySelectorAll("input[type=checkbox]:checked")).forEach(checkbox => {
            if (!pizzaInfo.extraToppings) {
                pizzaInfo.extraToppings = [];
            }
            pizzaInfo.extraToppings.push(checkbox.parentElement.textContent);
        })
        basket.push(pizzaInfo);
        this.closest(".modal-window").closeWindow();
    });
    showModalWindow(document.body, [header, ...extraToppingsCheckboxes, confirmBtn], { className: 'confirm' });
})

viewBasketBtn.addEventListener('click', event => {
    console.log(...basket);
    const orderBtn = createElement({ name: 'button', content: "Замовити", class: "order-btn" });
    orderBtn.addEventListener("click", async event => {
        event.target.closest(".modal-window").closeWindow();
    });
    // сума замовлення
    showModalWindow(document.body,
        [orderBtn],
        { className: 'basket' });
})

function showRegistrationWindow() {
    let currentCustomerLabel = null;
    if (customerName.textContent.length !== 0) {
        currentCustomerLabel = createElement({ content: "Поточний користувач: " + customerName.textContent });
        currentCustomerLabel.style.fontSize = "16px";
    }
    const nameLabel = createElement({ name: "header", content: "Введіть ваше ім'я:" });
    const nameInput = createElement({ name: "input" });
    nameInput.setAttribute("autocomplete", "off");
    const phoneNumberLabel = createElement({ name: "header", content: "Введіть ваш номер телефону:" });
    const phoneNumberInput = createElement({ name: "input" });
    phoneNumberInput.setAttribute("autocomplete", "off");
    phoneNumberInput.setAttribute("type", "tel");
    const logInBtn = createElement({ name: 'button', content: "Увійти", class: "log-in-btn" });
    logInBtn.addEventListener("click", event => {
        console.log(nameInput.value);
        console.log(phoneNumberInput.value);
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
            nameLabel, nameInput,
            phoneNumberLabel, phoneNumberInput, logInBtn,
            createAccountLabel, createAccountBtn, separator, enterAsEmployeeBtn],
        { className: 'registration' });
}
function showCreateAccountWindow() {
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
        everythingIsCorrect = userNameIsCorrect(nameInput, null, event) && everythingIsCorrect;
        everythingIsCorrect = phoneNumberIsCorrect(phoneNumberInput, null, event) && everythingIsCorrect;
        everythingIsCorrect = emailIsCorrect(emailInput, null, event) && everythingIsCorrect;
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
                    throw new Error("Server error.");
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
        [nameLabel, nameInput,
            phoneNumberLabel, phoneNumberInput,
            emailLabel, emailInput, createAccountBtn],
        { className: 'create-account' });
}