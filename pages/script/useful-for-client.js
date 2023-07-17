export function showModalWindow(bodyElement, elementsArray, { showCross = true, style = "", className = "", attributes = [], handlers: eventHandlers = [] } = {}) {
    let modalWindow = createElement({ name: "div", class: "modal-window " + className, style: style });
    elementsArray.forEach(element => {
        if (element) {
            modalWindow.append(element);
        }
    });
    if (showCross == true) {
        let cross = createElement({ name: "div", class: "modal-window-cross" });
        cross.innerHTML = '<img src="/img/cross.png" alt="Close">';
        modalWindow.append(cross);
        cross.addEventListener("click", event => {
            modalWindow.closeWindow();
        });
    }
    eventHandlers.forEach(({ eventName, handler, options = {} }) => modalWindow.addEventListener(eventName, handler, options));
    modalWindow.closeWindow = function() {
        background.remove();
        background = null;
        document.body.style.overflow = "auto";
    }
    let background = createElement({ name: "div", class: "background" });
    document.body.style.overflow = "hidden";
    background.append(modalWindow);
    bodyElement.prepend(background);
    background.addEventListener("mousedown", event => {
        if (!event.target.closest(".modal-window")) {
            background.children[0].closeWindow();
        }
    });
}
export function createElement({ name: elemName = "div", style = "", content = "", class: className = "" } = {}) {
    let element = document.createElement(elemName);
    if (elemName == "input") {
        element.value = content;
    } else {
        element.textContent = content;
    }
    if (className) element.className = className;
    if (style) element.style.cssText = style;
    return element;
}
export function setWarningAfterElement(element, warningText) {
    if (element.nextElementSibling?.matches('.warning')) {
        element.nextElementSibling.textContent = warningText;
    } else {
        element.insertAdjacentHTML("afterend", `<b class="warning">${warningText}</b>`);
    }
}
export function userNameIsCorrect(inputElement, elementForWarning = null) {
    let warningText = "";
    if (inputElement.value.length > 50) {
        warningText = "Ім'я не повинно бути більше, ніж 50 символів.";
    } else if (inputElement.value.length < 3) {
        warningText = "Ім'я не повинно бути менше, ніж 3 символи.";
    }
    elementForWarning = elementForWarning || inputElement;
    setWarningAfterElement(elementForWarning, warningText);
    return warningText.length > 0 ? false : true;
}
export function phoneNumberIsCorrect(inputElement, elementForWarning = null) {
    let warningText = "";
    if (inputElement.value.length > 20) {
        warningText = "Номер телефону не повинен бути більше, ніж 20 символів.";
    } else if (inputElement.value.length < 3) {
        warningText = "Номер телефону не повинен бути менше, ніж 3 символи.";
    } else {
        for (const symbol of inputElement.value) {
            if (Number.isNaN(Number(symbol))) {
                warningText = "Номер телефону повинен складатися лише з чисел.";
                break;
            }
        }
    }
    elementForWarning = elementForWarning || inputElement;
    setWarningAfterElement(elementForWarning, warningText);
    return warningText.length > 0 ? false : true;
}
const emailRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+$/;
// console.log("Some-Email@gmail.com".match(emailRegex));
// console.log("wrong@email@gmail.com".match(emailRegex));
export function emailIsCorrect(inputElement, elementForWarning = null) {
    let warningText = "";
    if (inputElement.value.length > 50) {
        warningText = "Email не повинен бути більше, ніж 50 символів.";
    } else if (!inputElement.value.match(emailRegex)) {
        warningText = "Некоректний email.";
    }
    elementForWarning = elementForWarning || inputElement;
    setWarningAfterElement(elementForWarning, warningText);
    return warningText.length > 0 ? false : true;
}