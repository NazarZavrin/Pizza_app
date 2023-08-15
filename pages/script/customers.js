"use strict";

import { createElement } from "./useful-for-client.js";

const employeeName = document.getElementById("employee-name");
const toEmployeePageBtn = document.getElementsByClassName("to-employee-page-btn")[0];
const searchInput = document.getElementsByName('customer_name')[0];
const searchBtn = document.getElementById("search-btn");
const refreshBtn = document.getElementById("refresh-btn");
const customersContainer = document.getElementById("customers");

let customers = [];

refreshBtn.addEventListener('click', async event => {
    if (localStorage.getItem("employeeName") === null) {
        toEmployeePageBtn.click();
        return;
    }
    try {
        let requestBody = {
            employeeName: localStorage.getItem("employeeName"),
        };
        let response = await fetch(location.href + "/get-customers", {
            method: "PROPFIND",
            body: JSON.stringify(requestBody),
            headers: { "Content-Type": "application/json" }
        })
        if (response.ok) {
            let result = await response.json();
            if (!result.success) {
                throw new Error(result.message || "Server error.");
            } else {
                console.log(result.customers);
                customers = result.customers.map(createCustomerElement);
                // orders = normalizeOrders(result.orders).map(createOrderElement);
                // customers = [];
                searchBtn.click();
            }
        }
    } catch (error) {
        console.error(error.message);
        alert("Error");
    }
})
if (localStorage.getItem("employeeName") === null) {
    toEmployeePageBtn.click();
} else {
    employeeName.textContent = localStorage.getItem("employeeName");
    employeeName.style.display = "";
    refreshBtn.click();
}
function renderCustomers() {
    customersContainer.innerHTML = '<button id="create-customer">Створити покупця</button>';
    if (!customers || customers.length === 0) {
        customersContainer.insertAdjacentText("beforeend", "Покупців немає.");
        return;
    }
    // console.log(customers[0]);
    // console.log(customers.length);
    let customersToDisplay = customers.filter(customer => customer.name.toLocaleLowerCase().includes(searchInput.value.toLocaleLowerCase()));
    
    if (customersToDisplay.length === 0) {
        customersContainer.insertAdjacentText("beforeend", "Немає покупців, ім'я яких містить рядок пошуку.");
        return;
    }
    customersToDisplay?.forEach(customer => {
        customersContainer.append(customer.element || createCustomerElement(customer).element);
    })
}
function createCustomerElement(customer) {
    customer.element = createElement({ name: 'div', class: 'customer' });
    const info = createElement({ name: 'section', class: 'info'});
    customer.element.append(info);
    const name = createElement({ class: 'name', content: "Ім'я: " + customer.name });
    info.append(name);
    const phoneNum = createElement({ class: 'phone_num', content: 'Номер телефону: ' + customer.phone_num });
    info.append(phoneNum);
    const email = createElement({ class: 'email', content: 'Email: ' + customer.email });
    info.append(email);
    const buttons = createElement({ name: 'section', class: 'buttons'});
    const editInfoBtn = createElement({ name: 'button', class: 'edit-info-btn', content: 'Редагувати дані покупця' });
    buttons.append(editInfoBtn);
    customer.element.append(buttons);
    const deleteBtn = createElement({ name: 'button', class: 'delete-btn', content: 'Видалити покупця' });
    if (localStorage.getItem("employeeName") === 'Admin') {
        deleteBtn.style.display = 'block';
    }
    buttons.append(deleteBtn);
    return customer;
}
searchBtn.addEventListener('click', event => {
    renderCustomers();
});