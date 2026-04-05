import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true
});

// Departments
export const hrService = {
    // Departments
    getDepartments: () => api.get('/departments').then(res => res.data),
    getDepartment: (id) => api.get(`/departments/${id}`).then(res => res.data),
    createDepartment: (data) => api.post('/departments', data).then(res => res.data),
    updateDepartment: (id, data) => api.put(`/departments/${id}`, data).then(res => res.data),
    deleteDepartment: (id) => api.delete(`/departments/${id}`).then(res => res.data),

    // Schedules
    getSchedules: () => api.get('/schedules').then(res => res.data),
    getSchedule: (id) => api.get(`/schedules/${id}`).then(res => res.data),
    createSchedule: (data) => api.post('/schedules', data).then(res => res.data),
    updateSchedule: (id, data) => api.put(`/schedules/${id}`, data).then(res => res.data),
    deleteSchedule: (id) => api.delete(`/schedules/${id}`).then(res => res.data),

    // Employee Roles
    getEmployeeRoles: () => api.get('/employee-roles').then(res => res.data),
    getEmployeeRole: (id) => api.get(`/employee-roles/${id}`).then(res => res.data),
    createEmployeeRole: (data) => api.post('/employee-roles', data).then(res => res.data),
    updateEmployeeRole: (id, data) => api.put(`/employee-roles/${id}`, data).then(res => res.data),
    deleteEmployeeRole: (id) => api.delete(`/employee-roles/${id}`).then(res => res.data),

    // Employees
    getEmployees: () => api.get('/employees').then(res => res.data),
    getEmployee: (id) => api.get(`/employees/${id}`).then(res => res.data),
    createEmployee: (data) => api.post('/employees', data).then(res => res.data),
    updateEmployee: (id, data) => api.put(`/employees/${id}`, data).then(res => res.data),
    deleteEmployee: (id) => api.delete(`/employees/${id}`).then(res => res.data),

    // Production Lines
    getProductionLines: () => api.get('/production-lines').then(res => res.data),
    getProductionLine: (id) => api.get(`/production-lines/${id}`).then(res => res.data),
    createProductionLine: (data) => api.post('/production-lines', data).then(res => res.data),
    updateProductionLine: (id, data) => api.put(`/production-lines/${id}`, data).then(res => res.data),
    deleteProductionLine: (id) => api.delete(`/production-lines/${id}`).then(res => res.data)
};
