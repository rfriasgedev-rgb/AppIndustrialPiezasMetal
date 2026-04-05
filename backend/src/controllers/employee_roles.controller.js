const db = require('../db/connection');

exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM employee_roles ORDER BY name');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching employee roles:', error);
        res.status(500).json({ error: 'Server error fetching employee roles' });
    }
};

exports.getById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM employee_roles WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Employee role not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, description } = req.body;
        const [result] = await db.query('INSERT INTO employee_roles (name, description) VALUES (?, ?)', [name, description]);
        res.status(201).json({ id: result.insertId, name, description });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Role already exists' });
        res.status(500).json({ error: 'Server error' });
    }
};

exports.update = async (req, res) => {
    try {
        const { name, description } = req.body;
        const [result] = await db.query('UPDATE employee_roles SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Role not found' });
        res.json({ id: req.params.id, name, description });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Role name already in use' });
        res.status(500).json({ error: 'Server error' });
    }
};

exports.delete = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM employee_roles WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Role not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error (may be in use)' });
    }
};
