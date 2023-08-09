export function showModalWindow(elementsArray, { style = "", className = "", handlers: eventHandlers = [], showCross = true, bodyElement = document.body } = {}) {
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
    modalWindow.closeWindow = function () {
        background.remove();
        background = null;
        bodyElement.style.overflow = "auto";
    }
    let background = createElement({ name: "div", class: "background" });
    bodyElement.style.overflow = "hidden";
    background.append(modalWindow);
    bodyElement.prepend(background);
    background.addEventListener("mouseup", event => {
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
    if (warningText === "") { // if warning text is empty
        element.nextElementSibling.style.width = "0";// set width of warning element to 0
    } else {
        element.nextElementSibling.style.width = "";// set width of warning element to normal
    }
}
export function userNameIsCorrect(inputElement, elementForWarning = null, beginning = "Ім'я") {
    let warningText = "";
    if (inputElement.value.length > 50) {
        warningText = beginning + " не повинно бути більше, ніж 50 символів.";
    } else if (inputElement.value.length < 3) {
        warningText = beginning + " не повинно бути менше, ніж 3 символи.";
    }
    elementForWarning = elementForWarning || inputElement;
    setWarningAfterElement(elementForWarning, warningText);
    return warningText.length > 0 ? false : true;
}
export function phoneNumberIsCorrect(inputElement, elementForWarning = null, beginning = "Номер телефону") {
    let warningText = "";
    if (inputElement.value.length > 20) {
        warningText = beginning + " не повинен бути більше, ніж 20 символів.";
    } else if (inputElement.value.length < 3) {
        warningText = beginning + " не повинен бути менше, ніж 3 символи.";
    } else {
        for (const symbol of inputElement.value) {
            if (Number.isNaN(Number(symbol))) {
                warningText = beginning + " повинен складатися лише з цифр.";
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
export function isInt(text) {
    for (const symbol of text) {
        if (Number.isNaN(Number(symbol))) {
            if (symbol === "." || symbol === ",") {
                return "Decimal point can't be present in integer.";
            }
            return "Incorrect symbol.";
        }
    }
    return "";
}
export function isFloat(text) {
    for (const symbol of text) {
        if (Number.isNaN(Number(symbol))) {
            if (symbol === "." || symbol === ",") {
                if (text.split(/[.,]/).length > 2) {
                    return "Decimal point was found more than once.";
                } else {
                    continue;
                }
            }
            return "Incorrect symbol.";
        }
    }
    return "";
}
export function checkDayAndMonth(day, month) {
    let dayAndMonthAreCorrect = true;
    if (day > 31 || day <= 0) {
        dayAndMonthAreCorrect = false;
    }
    if (month > 12 || month <= 0) {
        dayAndMonthAreCorrect = false;
    }
    // в квітні (4), червні (6), вересні (9) та листопаді (11) 30 днів
    // в січні (1), березні (3), травні (5), липні (7),
    //  серпні (8), жовтні (10) та грудні (12) 31 день
    // в лютому (2) максимум 29 днів (у високосному році)
    if (month == 2 && day > 29) {
        dayAndMonthAreCorrect = false;
    } else if (day == 31) {
        if (month == 4 || month == 6 || month == 9 || month == 11) {
            dayAndMonthAreCorrect = false;
        }
    }
    return dayAndMonthAreCorrect;
}

export function normalizeOrders(orders) {
    /* In "orders" parameter each pizza and
    it's extra toppings are in sepatate order.
    We will put all the pizzas 
    that belong to one order in one order: */
    return orders?.reduce((prev, item) => {
        if (prev.length === 0 || item.receipt_num !== prev.at(-1).receipt_num) {
            item.orderItems = [
                { pizza: item.pizza, extra_toppings: item.extra_toppings, cost: Number(item.cost) }
            ];
            delete item.pizza;
            delete item.extra_toppings;
            prev.push(item);
        } else {
            prev.at(-1).orderItems.push({ pizza: item.pizza, extra_toppings: item.extra_toppings, cost: Number(item.cost) });
            prev.at(-1).cost = Number(prev.at(-1).cost) + Number(item.cost);
        }
        return prev;
    }, []);
}