const { pool } = require('../db/connection');

const SINGLETON_ID = 'COMPANY_SINGLETON';

// GET /api/company — devuelve el registro único de la empresa
exports.getCompany = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM company WHERE id = ?', [SINGLETON_ID]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No company record found.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error [company.getCompany]:', error);
        res.status(500).json({ error: error.message });
    }
};

// PUT /api/company — crea o actualiza el registro único (UPSERT)
exports.upsert = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'El nombre de la empresa es requerido.' });
        }

        const updatedBy = req.user?.id || null;

        await pool.query(
            `INSERT INTO company (id, name, phone, email, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               name       = VALUES(name),
               phone      = VALUES(phone),
               email      = VALUES(email),
               updated_by = VALUES(updated_by),
               updated_at = CURRENT_TIMESTAMP`,
            [SINGLETON_ID, name.trim(), phone || null, email || null, updatedBy, updatedBy]
        );

        const [rows] = await pool.query('SELECT * FROM company WHERE id = ?', [SINGLETON_ID]);
        res.json(rows[0]);
    } catch (error) {
        console.error('Error [company.upsert]:', error);
        res.status(500).json({ error: error.message });
    }
};
