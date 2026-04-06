const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res) => {
    try {
        const query = `
            SELECT 
                e.*,
                d.name as department_name,
                s.name as shift_name,
                s.start_time,
                s.end_time,
                r.name as role_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN shifts s ON e.shift_id = s.id
            LEFT JOIN employee_roles r ON e.employee_role_id = r.id
            ORDER BY e.created_at DESC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getById = async (req, res) => {
    try {
        const query = `
            SELECT 
                e.*,
                d.name as department_name,
                s.name as shift_name,
                r.name as role_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN shifts s ON e.shift_id = s.id
            LEFT JOIN employee_roles r ON e.employee_role_id = r.id
            WHERE e.id = ?
        `;
        const [rows] = await pool.query(query, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.create = async (req, res) => {
    try {
        const { first_name, last_name, email, phone, department_id, shift_id, employee_role_id, is_active } = req.body;
        const id = uuidv4();
        
        const active = is_active !== undefined ? is_active : true;

        await pool.query(`
            INSERT INTO employees (id, first_name, last_name, email, phone, department_id, shift_id, employee_role_id, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, first_name, last_name, email, phone, department_id, shift_id, employee_role_id, active]);
        
        res.status(201).json({ id, first_name, last_name, email, phone, department_id, shift_id, employee_role_id, is_active: active });
    } catch (error) {
        console.error('Error creating employee:', error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Employee already exists' });
        res.status(500).json({ error: 'Server error' });
    }
};

exports.update = async (req, res) => {
    try {
        const { first_name, last_name, email, phone, department_id, shift_id, employee_role_id, is_active } = req.body;
        const [result] = await pool.query(`
            UPDATE employees 
            SET first_name = ?, last_name = ?, email = ?, phone = ?, department_id = ?, shift_id = ?, employee_role_id = ?, is_active = ?
            WHERE id = ?
        `, [first_name, last_name, email, phone, department_id, shift_id, employee_role_id, is_active, req.params.id]);
        
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });
        res.json({ id: req.params.id, first_name, last_name, email, phone, department_id, shift_id, employee_role_id, is_active });
    } catch (error) {
        console.error('Error updating employee:', error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Data collision' });
        res.status(500).json({ error: 'Server error' });
    }
};

exports.delete = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error (employee may be in use)' });
    }
};
