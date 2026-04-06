const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res) => {
    try {
        const query = `
            SELECT 
                pl.*,
                e.first_name as leader_first_name,
                e.last_name as leader_last_name
            FROM production_lines pl
            LEFT JOIN employees e ON pl.leader_employee_id = e.id
            ORDER BY pl.name
        `;
        const [rows] = await pool.query(query);
        
        const [lineEmployees] = await pool.query(`
            SELECT ple.line_id, ple.employee_id, e.first_name, e.last_name, er.name as role_name
            FROM production_line_employees ple
            JOIN employees e ON ple.employee_id = e.id
            LEFT JOIN employee_roles er ON e.employee_role_id = er.id
        `);
        
        const result = rows.map(line => {
            return {
                ...line,
                employees: lineEmployees.filter(le => le.line_id === line.id)
            };
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
};

exports.getById = async (req, res) => {
    try {
        const query = `
            SELECT 
                pl.*,
                e.first_name as leader_first_name,
                e.last_name as leader_last_name
            FROM production_lines pl
            LEFT JOIN employees e ON pl.leader_employee_id = e.id
            WHERE pl.id = ?
        `;
        const [rows] = await pool.query(query, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Production line not found' });
        
        const line = rows[0];
        const [employees] = await pool.query(`
            SELECT ple.employee_id, e.first_name, e.last_name, er.name as role_name
            FROM production_line_employees ple
            JOIN employees e ON ple.employee_id = e.id
            LEFT JOIN employee_roles er ON e.employee_role_id = er.id
            WHERE ple.line_id = ?
        `, [line.id]);
        
        line.employees = employees;
        res.json(line);
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
};

exports.create = async (req, res) => {
    let connection;
    try {
        const { name, description, leader_employee_id, employee_ids = [] } = req.body;
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const lineId = uuidv4();
        const leaderId = leader_employee_id || null;
        await connection.query('INSERT INTO production_lines (id, name, description, leader_employee_id) VALUES (?, ?, ?, ?)', [lineId, name, description, leaderId]);
        if (employee_ids.length > 0) {
            const values = employee_ids.map(empId => [lineId, empId]);
            await connection.query('INSERT IGNORE INTO production_line_employees (line_id, employee_id) VALUES ?', [values]);
        }
        await connection.commit();
        res.status(201).json({ id: lineId, name, description, leader_employee_id: leaderId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    } finally {
        if (connection) connection.release();
    }
};

exports.update = async (req, res) => {
    let connection;
    try {
        const { name, description, leader_employee_id, employee_ids } = req.body;
        const lineId = req.params.id;
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const leaderId = leader_employee_id || null;
        const [result] = await connection.query('UPDATE production_lines SET name = ?, description = ?, leader_employee_id = ? WHERE id = ?', [name, description, leaderId, lineId]);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Production line not found' });
        }
        if (employee_ids !== undefined && Array.isArray(employee_ids)) {
            await connection.query('DELETE FROM production_line_employees WHERE line_id = ?', [lineId]);
            if (employee_ids.length > 0) {
                const values = employee_ids.map(empId => [lineId, empId]);
                await connection.query('INSERT IGNORE INTO production_line_employees (line_id, employee_id) VALUES ?', [values]);
            }
        }
        await connection.commit();
        res.json({ id: lineId, name, description, leader_employee_id: leaderId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    } finally {
        if (connection) connection.release();
    }
};

exports.delete = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM production_lines WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Production line not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
};
