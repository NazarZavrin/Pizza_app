"use strict";

import { createElement, setWarningAfterElement, showModalWindow, showPassword, nameIsCorrect, passwordIsCorrect } from "./useful-for-client.js";
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
    const nameInput = createElement({ name: "input", attributes: ["autocomplete: off"] });
    const passwordLabel = createElement({ name: "label", content: "Введіть пароль:" },);
    const passwordInput = createElement({ name: "input", attributes: ["type: password", "autocomplete: off"] });
    const passwordBlock = createElement({ name: "form", class: "password-block" });
    passwordBlock.innerHTML = `<label class="show-password">
    <input type="checkbox">Показати пароль</label>`;
    passwordBlock.prepend(passwordInput);
    passwordBlock.addEventListener("change", showPassword);
    const logInBtn = createElement({ name: 'button', content: "Увійти", class: "log-in-btn" });
    logInBtn.addEventListener("click", async event => {
        setWarningAfterElement(logInBtn, '');
        let everythingIsCorrect = nameIsCorrect(nameInput);
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
            let response = await fetch(location.origin + "/employee/log-in", {
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
                    if (result.message.includes("Wrong password")) {
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
    const oldPasswordLabel = createElement({ name: "label", content: "Введіть старий пароль:" },);
    const oldPasswordInput = createElement({ name: "input", attributes: ["type: password", "autocomplete: off"] });
    const oldPasswordBlock = createElement({ name: "form", class: "password-block" });
    oldPasswordBlock.innerHTML = `<label class="show-password">
    <input type="checkbox">Показати пароль</label>`;
    oldPasswordBlock.prepend(oldPasswordInput);
    oldPasswordBlock.addEventListener("change", showPassword);
    const newPasswordLabel = createElement({ name: "label", content: "Введіть новий пароль:" },);
    const newPasswordInput = createElement({ name: "input", attributes: ["type: password", "autocomplete: off"] });
    const newPasswordBlock = createElement({ name: "form", class: "password-block" });
    newPasswordBlock.innerHTML = `<label class="show-password">
    <input type="checkbox">Показати пароль</label>`;
    newPasswordBlock.prepend(newPasswordInput);
    newPasswordBlock.addEventListener("change", showPassword);
    const changePasswordBtn = createElement({ name: 'button', content: "Змінити пароль", class: "change-password-btn", style: "background-color: royalblue" });
    changePasswordBtn.addEventListener("click", async event => {
        if (!changePasswordBtn.textContent.includes("Підтвердити")) {
            // display necessary labels and inputs
            [oldPasswordLabel, oldPasswordBlock, newPasswordLabel, newPasswordBlock].forEach(element => changePasswordBtn.before(element));
            changePasswordBtn.textContent = "Підтвердити зміну пароля";
        } else {
            setWarningAfterElement(oldPasswordInput, '');
            setWarningAfterElement(changePasswordBtn, '');
            let everythingIsCorrect = true;
            if (oldPasswordInput.value.length === 0) {
                setWarningAfterElement(oldPasswordInput, 'Введіть старий пароль');
                everythingIsCorrect = false;
            }
            everythingIsCorrect = passwordIsCorrect(newPasswordInput) && everythingIsCorrect;
            if (!everythingIsCorrect) {
                return;
            }
            try {
                let requestBody = {
                    employeeName: localStorage.getItem("employeeName"),
                    oldPassword: oldPasswordInput.value,
                    newPassword: newPasswordInput.value,
                };
                let response = await fetch(location.origin + "/employee/change-password", {
                    method: "PATCH",
                    body: JSON.stringify(requestBody),
                    headers: { "Content-Type": "application/json" }
                })
                if (response.ok) {
                    let result = await response.json();
                    if (!result.success) {
                        if (result.message.includes("does not exist")) {
                            setWarningAfterElement(changePasswordBtn, `Співробітника з такими даними не існує`);
                            return;
                        }
                        if (result.message.includes("several employees")) {
                            setWarningAfterElement(changePasswordBtn, `Помилка: знайдено декілька співробітників з такими даними.`);
                            return;
                        }
                        if (result.message.includes("Wrong password")) {
                            setWarningAfterElement(changePasswordBtn, `Неправильний старий пароль`);
                            return;
                        }
                        throw new Error(result.message || "Server error.");
                    } else {
                        event.target.closest(".modal-window").closeWindow();
                    }
                }
            } catch (error) {
                console.error(error.message);
                alert("Error");
                return;
            }
        }
    });
    const exitBtn = createElement({ name: 'button', class: 'exit-btn', content: 'Вийти' });
    exitBtn.addEventListener('click', event => {
        employeeName.style.display = "none";
        localStorage.removeItem("employeeName");
        event.target.closest(".modal-window").closeWindow();
        showRegistrationWindow();
    });
    showModalWindow([employeeInfo, changePasswordBtn, exitBtn],
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