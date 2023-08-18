"use strict";

import Customer from "./class_Customer.js";
import "./polyfills.js";

const employeeName = document.getElementById("employee-name");
const toEmployeePageBtn = document.getElementsByClassName("to-employee-page-btn")[0];
const searchInput = document.getElementsByName('customer_name')[0];
const searchBtn = document.getElementById("search-btn");
const refreshBtn = document.getElementById("refresh-btn");
const customersContainer = document.getElementById("customers");

refreshBtn.addEventListener('click', async event => {
    if (localStorage.getItem("employeeName") === null) {
        toEmployeePageBtn.click();
        return;
    }
    await Customer.fetchCustomers();
    searchBtn.click();
})
if (localStorage.getItem("employeeName") === null) {
    toEmployeePageBtn.click();
} else {
    employeeName.textContent = localStorage.getItem("employeeName");
    employeeName.style.display = "";
    refreshBtn.click();
}

searchBtn.addEventListener('click', event => {
    Customer.renderCustomers(customersContainer, searchInput);
});

customersContainer.addEventListener('click', async event => {
    // 1: customer deletion logic, 2: customer creation logic, 3: edit customer info logic
    // 1: customer deletion logic
    const deleteBtn = event.target.closest('.delete-btn');
    if (deleteBtn) {
        let customerIndex = [...customersContainer.querySelectorAll('.delete-btn')].findIndex(btn => btn === deleteBtn);
        if (await Customer.delete(customerIndex) === "success") {
            const customerElement = deleteBtn.closest(".customer");
            if (!customerElement) {
                refreshBtn.click();
            } else {
                customerElement.classList.add("deleted");
                customerElement.addEventListener("transitionend", event => {
                    customerElement.remove();
                    refreshBtn.click();
                })
            }
        }
    }
    // 2: customer creation logic
    const createCustomerBtn = event.target.closest('#create-customer');
    if (createCustomerBtn) {
        new Customer("employee", (newCustomerName) => {
            if (typeof newCustomerName === "string") {
                refreshBtn.click();
            }
        });
    }
    // 3: edit customer info logic
    const editInfoBtn = event.target.closest('.edit-info-btn');
    if (editInfoBtn) {
        let customerIndex = [...customersContainer.querySelectorAll('.edit-info-btn')].findIndex(btn => btn === editInfoBtn);
        await Customer.editInfo(customerIndex, () => refreshBtn.click());
    }
})