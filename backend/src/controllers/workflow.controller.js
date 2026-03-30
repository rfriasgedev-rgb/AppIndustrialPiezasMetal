const { pool } = require('../db/connection');

const getDepartments = async (req, res, next) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM departments ORDER BY id ASC`);
        res.json(rows);
    } catch (err) { next(err); }
};

const getShifts = async (req, res, next) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM shifts ORDER BY id ASC`);
        res.json(rows);
    } catch (err) { next(err); }
};

module.exports = { getDepartments, getShifts };
