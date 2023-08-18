"use strict";

import { createElement, emailIsCorrect, phoneNumberIsCorrect, setWarningAfterElement, showModalWindow, userNameIsCorrect } from "./useful-for-client.js";

let customers = [];
let customersToDisplay = [];

export default class Customer {
    constructor(creator = "employee", callback = function () { }) {
        const header = createElement({ name: "header", content: "Створення акаунту" });
        const nameLabel = createElement({ name: "header" });
        nameLabel.textContent = creator === "customer" ? "Введіть ваше ім'я:" : "Введіть ім'я покупця:";
        const nameInput = createElement({ name: "input" });
        nameInput.setAttribute("autocomplete", "off");
        const phoneNumberLabel = createElement({ name: "header" });
        phoneNumberLabel.textContent = creator === "customer" ? "Введіть ваш номер телефону:" : "Введіть номер телефону покупця:";
        const phoneNumberInput = createElement({ name: "input" });
        phoneNumberInput.setAttribute("autocomplete", "off");
        phoneNumberInput.setAttribute("type", "tel");
        const emailLabel = createElement({ name: "header" });
        emailLabel.textContent = creator === "customer" ? "Введіть ваш email:" : "Введіть email покупця:";
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
                let response = await fetch(location.origin + "/customers/create-account", {
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
                        event.target.closest(".modal-window").closeWindow();
                        callback(result.customerData.name, result.customerData.phone_num);
                    }
                }
            } catch (error) {
                console.error(error.message);
                alert("Error");
                return;
            }
        });
        showModalWindow([header, nameLabel, nameInput,
            phoneNumberLabel, phoneNumberInput,
            emailLabel, emailInput, createAccountBtn],
            { className: 'create-account' });
    }
    static createCustomerElement(customer) {
        customer.element = createElement({ name: 'div', class: 'customer' });
        const info = createElement({ name: 'section', class: 'info' });
        customer.element.append(info);
        const name = createElement({ class: 'name', content: "Ім'я: " + customer.name });
        info.append(name);
        const phoneNum = createElement({ class: 'phone_num', content: 'Номер телефону: ' + customer.phone_num });
        info.append(phoneNum);
        const email = createElement({ class: 'email', content: 'Email: ' + customer.email });
        info.append(email);
        const buttons = createElement({ name: 'section', class: 'buttons' });
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
    static async fetchCustomers() {
        try {
            let requestBody = {
                employeeName: localStorage.getItem("employeeName"),
            };
            let response = await fetch(location.origin + "/customers/get-customers", {
                method: "PROPFIND",
                body: JSON.stringify(requestBody),
                headers: { "Content-Type": "application/json" }
            })
            if (response.ok) {
                let result = await response.json();
                if (!result.success) {
                    throw new Error(result.message || "Server error.");
                } else {
                    // console.log(result.customers);
                    customers = result.customers.map(this.createCustomerElement);
                    // customers = [];
                }
            }
        } catch (error) {
            console.error(error.message);
            alert("Error");
        }
    }
    static renderCustomers(customersContainer, searchInput) {
        customersContainer.innerHTML = '<button id="create-customer">Створити покупця</button>';
        if (!customers || customers.length === 0) {
            customersContainer.insertAdjacentText("beforeend", "Покупців немає.");
            return;
        }
        // console.log(customers, searchInput.value);
        // console.log(customers.length);
        customersToDisplay = customers.filter(customer => customer.name.toLocaleLowerCase().includes(searchInput.value.toLocaleLowerCase()));

        if (customersToDisplay.length === 0) {
            customersContainer.insertAdjacentText("beforeend", "Немає покупців, ім'я яких містить рядок пошуку.");
            return;
        }
        customersToDisplay?.forEach(customer => {
            customersContainer.append(customer.element || this.createCustomerElement(customer).element);
        })
    }
    static async editInfo(customerIndex, callback = function () { }) {
        const oldInfo = {
            name: customersToDisplay[customerIndex].name,
            phoneNum: customersToDisplay[customerIndex].phone_num,
            email: customersToDisplay[customerIndex].email,
        }
        const header = createElement({ name: "header", content: 'Редагування даних покупця:' });
        const nameLabel = createElement({ name: "header", content: "Введіть нове ім'я покупця:" });
        const nameInput = createElement({ name: "input", content: oldInfo.name });
        nameInput.setAttribute("autocomplete", "off");
        const phoneNumberLabel = createElement({ name: "header", content: "Введіть новий номер телефону покупця:" });
        const phoneNumberInput = createElement({ name: "input", content: oldInfo.phoneNum });
        phoneNumberInput.setAttribute("autocomplete", "off");
        phoneNumberInput.setAttribute("type", "tel");
        const emailLabel = createElement({ name: "header", content: "Введіть новий email покупця:" });
        const emailInput = createElement({ name: "input", content: oldInfo.email });
        emailInput.setAttribute("autocomplete", "off");
        const confirmChangesBtn = createElement({ name: 'button', content: "Підтвердити зміни", class: "confirm-changes-btn" });
        confirmChangesBtn.addEventListener("click", async event => {
            setWarningAfterElement(confirmChangesBtn, '');
            let everythingIsCorrect = true;
            everythingIsCorrect = userNameIsCorrect(nameInput) && everythingIsCorrect;
            everythingIsCorrect = phoneNumberIsCorrect(phoneNumberInput) && everythingIsCorrect;
            everythingIsCorrect = emailIsCorrect(emailInput) && everythingIsCorrect;
            if (everythingIsCorrect === false) {
                return;
            }
            try {
                let requestBody = {
                    newCustomerName: nameInput.value,
                    newCustomerPhoneNum: phoneNumberInput.value,
                    newCustomerEmail: emailInput.value,
                    oldInfo, // oldInfo: oldInfo
                    employeeName: localStorage.getItem("employeeName"),
                };
                let response = await fetch(location.origin + "/customers/edit", {
                    method: "PATCH",
                    body: JSON.stringify(requestBody),
                    headers: { "Content-Type": "application/json" }
                })
                if (response.ok) {
                    let result = await response.json();
                    if (!result.success) {
                        if (result.message.includes("already exists")) {
                            setWarningAfterElement(confirmChangesBtn, 'Покупець з таким іменем та номером телефону вже існує');
                            return;
                        }
                        throw new Error(result.message || "Server error.");
                    } else {
                        event.target.closest(".modal-window").closeWindow();
                        callback();
                    }
                }
            } catch (error) {
                console.error(error.message);
                alert("Error");
                return;
            }
        });
        showModalWindow([header, nameLabel, nameInput,
            phoneNumberLabel, phoneNumberInput,
            emailLabel, emailInput, confirmChangesBtn],
            { className: 'edit-customer-data' });
        /*
        let requestBody = {
                customerName: customersToDisplay[customerIndex].name,
                customerPhoneNum: customersToDisplay[customerIndex].phone_num,
                employeeName: localStorage.getItem("employeeName")
            }; */

    }
    static async delete(customerIndex) {
        try {
            if (localStorage.getItem("employeeName") !== 'Admin') {
                throw new Error("Employee is not admin");
            }
            let requestBody = {
                customerName: customersToDisplay[customerIndex].name,
                customerPhoneNum: customersToDisplay[customerIndex].phone_num,
                employeeName: localStorage.getItem("employeeName")
            };
            let response = await fetch(location.origin + "/customers/delete", {
                method: "DELETE",
                body: JSON.stringify(requestBody),
                headers: { "Content-Type": "application/json" }
            })
            if (response.ok) {
                let result = await response.json();
                if (!result.success) {
                    throw new Error(result.message || "Server error.");
                } else {
                    return "success";
                }
            }
        } catch (error) {
            console.error(error.message);
            alert("Error");
        }
    }
}
