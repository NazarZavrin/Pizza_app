"use strict";

import { createElement, setWarningAfterElement, showModalWindow, userNameIsCorrect } from "./useful-for-client.js";

const employeeName = document.getElementById("employee-name");
const changeAccountBtn = document.getElementsByClassName("change-account-btn")[0];
const exitBtn = document.getElementsByClassName("exit-btn")[0];
const content = document.querySelector(".wrapper > main");
const searchBtn = document.getElementById("search-btn");
const refreshBtn = document.getElementById("refresh-btn");
const orders = document.getElementById("orders");

refreshBtn.addEventListener('click', async event => {
    if (localStorage.getItem("employeeName") === null) {
        showRegistrationWindow();
        return;
    }
    console.log("refreshing");
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
                console.error(result.message);
                throw new Error(result.errorInfo || "Server error.");
            } else {
                content.style.display = "";
                console.log(result.orders);
                console.log(result.orders[0].datetime);
                console.log(result.curDateTime);
                // orders.textContent = result.orders;
            }
        }
    } catch (error) {
        alert(error.message);
        return;
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
exitBtn.addEventListener("click", event => location.href = location.href.slice(0, location.href.indexOf("/orders")));

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
                    console.error(result.message);
                    throw new Error(result.errorInfo || "Server error.");
                } else {
                    employeeName.textContent = result.employeeData.name;
                    employeeName.style.display = "";
                    localStorage.setItem("employeeName", result.employeeData.name);
                    refreshBtn.click();
                }
            }
        } catch (error) {
            alert(error.message);
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
