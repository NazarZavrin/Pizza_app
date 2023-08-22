"use strict";

import { createElement, setWarningAfterElement, showModalWindow, showPassword, userNameIsCorrect } from "./useful-for-client.js";
import "./polyfills.js";

const employeeName = document.getElementById("employee-name");
const accountBtn = document.getElementById("account-btn");
const content = document.getElementsByTagName("main")[0];
const optionButtons = content.querySelectorAll('a > button');

content.style.display = "none";
if (localStorage.getItem("employeeName") === null) {
    employeeName.style.display = "none";
    showRegistrationWindow();
} else {
    employeeName.textContent = localStorage.getItem("employeeName");
    employeeName.style.display = "";
    // changeAccountBtn.textContent = "Змінити акаунт";
    showCorrectButtons();
    content.style.display = "";
}
accountBtn.addEventListener("click", event => {
    if (localStorage.getItem("employeeName") === null) {
        showRegistrationWindow();
    } else {
        showEmployeeProfile();
    }
});

function showRegistrationWindow() {
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
                    content.style.display = "";
                    showCorrectButtons();
                }
            }
        } catch (error) {
            console.error(error.message);
            alert("Error");
            return;
        }
        // changeAccountBtn.textContent = "Змінити акаунт";
        event.target.closest(".modal-window").closeWindow();
    });
    showModalWindow([nameLabel, nameInput,
        passwordLabel, passwordBlock,
        logInBtn],
        { className: 'registration' });
}

function showEmployeeProfile() {
    const employeeInfo = createElement({ name: 'section', class: 'info' });
    employeeInfo.innerHTML = `<div>${localStorage.getItem("employeeName")}</div>`;
    const exitBtn = createElement({ name: 'button', class: 'exit-btn', content: 'Вийти' });
    exitBtn.addEventListener('click', event => {
        employeeName.style.display = "none";
        localStorage.removeItem("employeeName");
        event.target.closest(".modal-window").closeWindow();
        showRegistrationWindow();
    });
    showModalWindow([employeeInfo, exitBtn],
        { className: 'profile' });
}

function showCorrectButtons() {
    for (const btn of optionButtons) {
        if (btn.className.includes("employees") || btn.className.includes("report")) {
            if (localStorage.getItem("employeeName") === 'Admin') {
                btn.style.display = "";
                if (btn.closest("a")) {
                    btn.closest("a").style.display = "";
                }
            } else {
                btn.style.display = "none";
                if (btn.closest("a")) {
                    btn.closest("a").style.display = "none";
                }
            }
        }
    }
}