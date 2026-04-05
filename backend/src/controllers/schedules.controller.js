const db = require('../db/connection');

exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM shifts ORDER BY start_time');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ error: 'Server error fetching schedules' });
    }
};

exports.getById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM shifts WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, start_time, end_time } = req.body;
        const [result] = await db.query('INSERT INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)', [name, start_time, end_time]);
        res.status(201).json({ id: result.insertId, name, start_time, end_time });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Schedule already exists' });
        res.status(500).json({ error: 'Server error' });
    }
};

exports.update = async (req, res) => {
    try {
        const { name, start_time, end_time } = req.body;
        const [result] = await db.query('UPDATE shifts SET name = ?, start_time = ?, end_time = ? WHERE id = ?', [name, start_time, end_time, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Schedule not found' });
        res.json({ id: req.params.id, name, start_time, end_time });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Schedule name already in use' });
        res.status(500).json({ error: 'Server error' });
    }
};

exports.delete = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM shifts WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Schedule not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error (may be in use)' });
    }
};
