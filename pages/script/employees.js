"use strict";

import Employee from "./class_Employee.js";
import "./polyfills.js";

const employeeName = document.getElementById("employee-name");
const toEmployeePageBtn = document.getElementsByClassName("to-employee-page-btn")[0];
const searchInput = document.getElementsByName('employee_name')[0];
const searchBtn = document.getElementById("search-btn");
const employeesContainer = document.getElementById("employees");

async function refreshData() {
    if (localStorage.getItem("employeeName") !== 'Admin') {
        toEmployeePageBtn.click();
        return;
    }
    await Employee.fetchEmployees();
    searchBtn.click();
}

if (localStorage.getItem("employeeName") !== 'Admin') {
    alert("Only admin has access to this page. Redirecting to employee page...");
    toEmployeePageBtn.click();
} else {
    employeeName.textContent = localStorage.getItem("employeeName");
    // employeeName.style.display = "";
    refreshData();
}

searchBtn.addEventListener('click', event => {
    Employee.renderEmployees(employeesContainer, searchInput);
});

employeesContainer.addEventListener('click', async event => {
    // 1: employee deletion logic, 2: employee creation logic, 3: edit employee info logic
    // 1: employee deletion logic
    const deleteBtn = event.target.closest('.delete-btn');
    if (deleteBtn) {
        let employeeIndex = [...employeesContainer.querySelectorAll('.delete-btn')].findIndex(btn => btn === deleteBtn);
        if (await Employee.delete(employeeIndex) === "success") {
            const employeeElement = deleteBtn.closest(".employee");
            if (!employeeElement) {
                refreshData();
            } else {
                employeeElement.classList.add("deleted");
                employeeElement.addEventListener("transitionend", event => {
                    employeeElement.remove();
                    refreshData();
                })
            }
        }
    }
    // 2: employee creation logic
    const createEmployeeBtn = event.target.closest('#create-employee');
    if (createEmployeeBtn) {
        new Employee((newEmployeeName) => {
            if (typeof newEmployeeName === "string") {
                refreshData();
            }
        });
    }
    // 3: edit employee info logic
    const editInfoBtn = event.target.closest('.edit-info-btn');
    if (editInfoBtn) {
        let employeeIndex = [...employeesContainer.querySelectorAll('.edit-info-btn')].findIndex(btn => btn === editInfoBtn);
        await Employee.editInfo(employeeIndex, () => refreshData());
    }
});