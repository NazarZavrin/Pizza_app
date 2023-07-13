export function showModalWindow(bodyElement, elementsArray, {showCross = true, style = "", className = "", attributes = [], handlers: eventHandlers = []} = {}){
    let modalWindow = createElement({name: "div", class: "modal-window " + className, style: style});
    elementsArray.forEach(element => {
        if (element) {
            modalWindow.append(element);
        }
    });
    if (showCross == true) {
        let cross = createElement({name: "div", class: "modal-window-cross"});
        cross.innerHTML = '<img src="/img/cross.png" alt="Close">';
        modalWindow.append(cross);
        cross.addEventListener("click", event => {
            modalWindow.closeWindow();
        });
    }
    eventHandlers.forEach(({eventName, handler, options = {}}) => modalWindow.addEventListener(eventName, handler, options));
    modalWindow.closeWindow = function () {
        background.remove();
        background = null;
        document.body.style.overflow = "auto";
    }
    let background = createElement({name: "div", class: "background"});
    document.body.style.overflow = "hidden";
    background.append(modalWindow);
    bodyElement.prepend(background);
    background.addEventListener("mousedown", event => {
        if (!event.target.closest(".modal-window")) {
            background.children[0].closeWindow();
        }
    });
}
export function createElement({name: elemName = "div", style = "", content = "", class: className = ""} = {}){
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
export function createWarningAfterElement(element){
    if (!element.nextElementSibling?.matches('.warning')) {
        element.insertAdjacentHTML("afterend", '<b class="warning"></b>');
    }
}
export function setWarning(element, warningText, description = ""){
    if (element?.matches('.warning')) {
        element.textContent = warningText;
    } else if (warningText) {
        console.warn(description + ":", warningText);
    }
}
export function userNameIsCorrect(inputElement, elementForWarning = null, event = {}) {
    elementForWarning = elementForWarning || inputElement;
    createWarningAfterElement(elementForWarning);
    let warningText = "";
    if (inputElement.value.length > 50) {
        warningText = "Username must not exceed 50 characters.";
    } else if (inputElement.value.length < 3) {
        warningText = "Username must not be less than 3 characters.";
    }
    setWarning(elementForWarning.nextElementSibling, warningText, "username");
    return warningText.length > 0 ? false : true;
}
export function phoneNumberIsCorrect(inputElement, elementForWarning = null, event = {}) {
    elementForWarning = elementForWarning || inputElement;
    createWarningAfterElement(elementForWarning);
    let warningText = "";
    if (inputElement.value.length > 20) {
        warningText = "Номер телефону must not exceed 20 characters.";
    } else if (inputElement.value.length < 3) {
        warningText = "Номер телефону must not be less than 3 characters.";
    } else {
        for (const symbol of inputElement.value) {
            if (Number.isNaN(Number(symbol))) {
                warningText = "Номер телефону повинен складатися лише з чисел!";
                break;
            }
        }
        
    }
    setWarning(elementForWarning.nextElementSibling, warningText, "phoneNum");
    return warningText.length > 0 ? false : true;
}
const emailRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+$/;
// console.log("Some-Email@gmail.com".match(emailRegex));
// console.log("wrong@email@gmail.com".match(emailRegex));
export function emailIsCorrect(inputElement, elementForWarning = null, event = {}){
    elementForWarning = elementForWarning || inputElement;
    createWarningAfterElement(elementForWarning);
    let warningText = "";
    if (inputElement.value.length > 50) {
        warningText = "Email must not exceed 50 characters.";
    } else if (!inputElement.value.match(emailRegex)) {
        warningText = "Incorrect email.";
    }
    setWarning(elementForWarning.nextElementSibling, warningText, "email");
    return warningText.length > 0 ? false : true;
}