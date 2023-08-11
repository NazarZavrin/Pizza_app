"use strict";

import { createElement, dayAndMonthAreCorrect, hourAndMinuteAreCorrect, isFloat, isInt, normalizeOrders, setWarningAfterElement, showModalWindow, showPassword, userNameIsCorrect } from "./useful-for-client.js";

const employeeName = document.getElementById("employee-name");
const changeAccountBtn = document.getElementsByClassName("change-account-btn")[0];
const exitBtn = document.getElementsByClassName("exit-btn")[0];
const content = document.querySelector(".wrapper > main");
const searchBtn = document.getElementById("search-btn");
const sortingSection = document.getElementsByClassName("actions-section__sorting")[0];
const sortBySelect = document.getElementById("sort-by");
const sortOrderSelect = document.getElementById("sort-order");
const refreshBtn = document.getElementById("refresh-btn");
const ordersContainer = document.getElementById("orders");

const searchInputsContainer = document.getElementsByClassName('search-inputs')[0];
let searchInputs = {};
for (const input of searchInputsContainer.querySelectorAll('input')) {
    searchInputs[input.getAttribute('name')] = input;
}
const dateTimeComponents = document.querySelectorAll('#datetime-period > .datetime-component');
searchInputs.dateTimeComponents = {
    from: {
        day: dateTimeComponents[0].children[1],
        month: dateTimeComponents[0].children[2],
        year: dateTimeComponents[0].children[3],
        hour: dateTimeComponents[0].children[4],
        minute: dateTimeComponents[0].children[5]
    },
    to: {
        day: dateTimeComponents[1].children[1],
        month: dateTimeComponents[1].children[2],
        year: dateTimeComponents[1].children[3],
        hour: dateTimeComponents[1].children[4],
        minute: dateTimeComponents[1].children[5]
    },
}

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
                // console.log(result.orders);
                orders = normalizeOrders(result.orders);
                // console.log(orders);
                searchBtn.click();
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
changeAccountBtn.addEventListener("click", event => {
    showRegistrationWindow();
});
exitBtn.addEventListener("click", event => {
    localStorage.removeItem("employeeName");
    location.href = location.href.slice(0, location.href.indexOf("/orders"));
});

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
    const passwordLabel = createElement({ name: "label", content: "Введіть пароль:" },);
    const passwordInput = createElement({ name: "input", attributes: ["type: password", "autocomplete: off"] });
    const passwordBlock = createElement({ name: "form", class: "password-block" });
    passwordBlock.innerHTML = `<label class="show-password">
    <input type="checkbox">Показати пароль</label>`;
    passwordBlock.prepend(passwordInput);
    passwordBlock.addEventListener("change", showPassword);
    const logInBtn = createElement({ name: 'button', content: "Увійти", class: "log-in-btn" });
    logInBtn.addEventListener("click", async event => {
        // for login you can enter just name
        setWarningAfterElement(nameInput, '');
        setWarningAfterElement(passwordInput, '');
        setWarningAfterElement(logInBtn, '');
        let everythingIsCorrect = userNameIsCorrect(nameInput);
        if (passwordInput.value.length === 0) {
            setWarningAfterElement(passwordInput, 'Введіть пароль');
            everythingIsCorrect = false;
        }
        if (!everythingIsCorrect) {
            return;
        }
        try {
            let requestBody = {
                name: nameInput.value,
                password: passwordInput.value
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
                    } else if (result.message.includes("Wrong password")) {
                        setWarningAfterElement(logInBtn, `Неправильний пароль`);
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
    showModalWindow([currentEmployeeLabel,
        currentEmployeeLabel ? separator : null,
        header, nameLabel, nameInput,
        passwordLabel, passwordBlock,
        logInBtn],
        { className: 'registration' });
}

function renderOrders() {
    if (!orders || orders.length === 0) {
        ordersContainer.textContent = "Невидані замовлення відсутні";
        return;
    }
    // console.log(orders[0]);
    // console.log(orders.length);
    let filteredOrders = orders.filter(order => order.receipt_num.includes(searchInputs.receipt_num.value))
        .filter(order => order.orderItems.find(orderItem => orderItem.pizza.toLocaleLowerCase().includes(searchInputs.pizza_name.value.toLocaleLowerCase())))
        .filter(order => order.customer_name.toLocaleLowerCase().includes(searchInputs.customer_name.value.toLocaleLowerCase()))
        .filter(order => order.customer_phone_num.includes(searchInputs.customer_phone_num.value));
    let fromTimestamp = searchInputs.dateTimeComponents.from.day.value === '' ?
        0 : Date.parse(new Date(
            Number(searchInputs.dateTimeComponents.from.year.value),
            Number(searchInputs.dateTimeComponents.from.month.value) - 1,
            Number(searchInputs.dateTimeComponents.from.day.value),
            Number(searchInputs.dateTimeComponents.from.hour.value),
            Number(searchInputs.dateTimeComponents.from.minute.value),
            0, 0 // seconds and milliseconds
        )) || 0;

    let toTimestamp = searchInputs.dateTimeComponents.to.day.value === '' ?
        Infinity : Date.parse(new Date(
            Number(searchInputs.dateTimeComponents.to.year.value),
            Number(searchInputs.dateTimeComponents.to.month.value) - 1,
            Number(searchInputs.dateTimeComponents.to.day.value),
            Number(searchInputs.dateTimeComponents.to.hour.value),
            Number(searchInputs.dateTimeComponents.to.minute.value),
            59, 999 // seconds and milliseconds
        )) || Infinity;
    // console.log(fromTimestamp, toTimestamp);
    if (fromTimestamp > toTimestamp) {
        setWarningAfterElement(searchBtn, 'У діапазоні дат початок більше ніж кінець.');
    } else {
        filteredOrders = filteredOrders.filter(order => {
            let orderTimestamp = new Date(order.datetime).setSeconds(0, 0);
            // new Date() adds timezone offset to ISOString
            // console.log(order.datetime, orderTimestamp);
            return orderTimestamp >= fromTimestamp && orderTimestamp <= toTimestamp;
        })
    }
    if (filteredOrders.length === 0) {
        ordersContainer.textContent = "Немає невиданих замовлень, що задовільняють фільтри";
        return;
    }
    let sortOrder = sortOrderSelect.value === 'asc' ? 1 : -1;
    filteredOrders.sort((first, second) => {
        first = first[sortBySelect.value];
        second = second[sortBySelect.value];
        if (!first) {
            console.error(`Field "${sortBySelect.value}" does not exist in order object.`);
            return 0;
        }
        if (sortBySelect.value === 'receipt_num') {
            return sortOrder * (first - second);
        }
        return sortOrder * first.localeCompare(second);
    })


    ordersContainer.innerHTML = '';
    filteredOrders?.forEach(order => {
        if (!order.element) {
            order.element = createElement({ name: 'div', class: 'order' });
            const receiptNum = createElement({ class: 'receipt_num', content: 'Замовлення №' + order.receipt_num });
            order.element.append(receiptNum);
            const customerName = createElement({ class: 'customer_name', content: 'Покупець: ' + order.customer_name });
            order.element.append(customerName);
            const customerPhoneNum = createElement({ class: 'customer_phone_num', content: 'Номер телефону покупця: ' + order.customer_phone_num });
            order.element.append(customerPhoneNum);
            const datetime = createElement({ class: 'datetime', content: 'Дата замовлення: ' + new Date(order.datetime).toLocaleString() });
            order.element.append(datetime);
            const cost = createElement({ class: 'cost', content: 'Вартість: ' + order.cost + ' грн.' });
            order.element.append(cost);
            const orderItems = createElement({ class: 'order-items' });
            order.orderItems.forEach(orderItem => {
                let text = `Піца: ${orderItem.pizza}; `;
                if (orderItem.extra_toppings.length > 0) {
                    text += `добавки: ${orderItem.extra_toppings.join(", ")}.`;
                } else {
                    text += `добавки відсутні.`;
                }
                orderItems.insertAdjacentHTML("beforeend", `<div class="order-item">${text[0] + text.slice(1).toLocaleLowerCase()}</div>`);
            })
            order.element.append(orderItems);
            const issuanceBtn = createElement({ name: 'button', class: 'issuance-btn', content: 'Видати замовлення' });
            order.element.append(issuanceBtn);
        }
        ordersContainer.append(order.element);
    })
}
searchBtn.addEventListener('click', event => {
    let everythingIsCorrect = true, message = '';
    if (searchInputs.customer_phone_num.value.length > 0 && isInt(searchInputs.customer_phone_num.value).length > 0) {
        message = 'Номер телефону покупця повинен складатися лише з цифр.';
        everythingIsCorrect = false;
    }
    if (searchInputs.receipt_num.value.length > 0 && isInt(searchInputs.receipt_num.value).length > 0) {
        message = 'Номер чеку повинен складатися лише з цифр.';
        everythingIsCorrect = false;
    }
    for (const dateTimeComponentKey in searchInputs.dateTimeComponents) {
        const dateTimeComponent = searchInputs.dateTimeComponents[dateTimeComponentKey];
        let dateTimeComponentIsUsed = false;
        for (const key in dateTimeComponent) {
            dateTimeComponent[key].style.borderColor = '';
            if (!dateTimeComponentIsUsed && dateTimeComponent[key].value.length > 0) {
                // console.log(dateTimeComponentKey, dateTimeComponent[key]);
                dateTimeComponentIsUsed = true;
            }
        }
        // console.log(dateTimeComponentIsUsed);
        if (!everythingIsCorrect || dateTimeComponentIsUsed === false) {
            continue;
        }
        for (const key in dateTimeComponent) {
            if (key === 'hour' || key === 'minute') {
                continue;
            }
            if (dateTimeComponent[key].value.length == 0) {
                if (key === 'year') {
                    dateTimeComponent[key].value = new Date().getFullYear();
                    continue;
                }
                message = `День та місяць 
                    ${dateTimeComponentKey === 'to' ? 'кінця' : 'початку'} 
                    діапазону дат повинні бути заповнені.`;
                dateTimeComponent[key].style.borderColor = 'red';
                everythingIsCorrect = false;
                break;
            }
        }
        if (!everythingIsCorrect) {
            continue;
        }
        if (isInt(dateTimeComponent.day).length > 0 ||
            isInt(dateTimeComponent.month).length > 0 ||
            isInt(dateTimeComponent.year).length > 0 ||
            !dayAndMonthAreCorrect(dateTimeComponent.day, dateTimeComponent.month)) {
            message = `Некоректна або неіснуюча дата 
                ${dateTimeComponentKey === 'to' ? 'кінця' : 'початку'} 
                діапазону дат.`;
            everythingIsCorrect = false;
            continue;
        }
        if (isInt(dateTimeComponent.hour).length > 0 ||
            isInt(dateTimeComponent.minute).length > 0 ||
            !hourAndMinuteAreCorrect(dateTimeComponent.hour, dateTimeComponent.minute)) {
            message = `Некоректний або неіснуючий час 
            ${dateTimeComponentKey === 'to' ? 'кінця' : 'початку'} 
            діапазону дат.`;
            everythingIsCorrect = false;
            // continue;
        }
    }
    if (everythingIsCorrect === false) {
        setWarningAfterElement(searchBtn, message);
        return;
    }
    setWarningAfterElement(searchBtn, '');
    renderOrders();
})
sortingSection.addEventListener('change', event => {
    let closestSelect = event.target.closest('select');
    if (closestSelect === sortBySelect || closestSelect === sortOrderSelect) {
        searchBtn.click();
    }
})
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
    showModalWindow([header, сostElem,
        paidLabel, paidInput, changeLabel, issueBtn],
        { className: 'issuance' });
})