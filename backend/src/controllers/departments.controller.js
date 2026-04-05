const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM departments ORDER BY name');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Server error fetching departments' });
    }
};

exports.getById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Department not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, description } = req.body;
        const id = uuidv4();
        await pool.query('INSERT INTO departments (id, name, description) VALUES (?, ?, ?)', [id, name, description]);
        res.status(201).json({ id, name, description });
    } catch (error) {
        console.error('Error creating department:', error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Department already exists' });
        res.status(500).json({ error: 'Server error' });
    }
};

exports.update = async (req, res) => {
    try {
        const { name, description } = req.body;
        const [result] = await pool.query('UPDATE departments SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Department not found' });
        res.json({ id: req.params.id, name, description });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Department name already in use' });
        res.status(500).json({ error: 'Server error' });
    }
};

exports.delete = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Department not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error (may be in use)' });
    }
};
