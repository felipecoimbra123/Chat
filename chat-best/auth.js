const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const router = express.Router();

// Rota de Registro
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Usuário e senha são obrigatórios." });

        const [rows] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (rows.length > 0) return res.status(400).json({ message: "Nome de usuário já existe." });

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

        res.status(201).json({ message: "Usuário registrado com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro no servidor.", error: error.message });
    }
});

// Rota de Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: "Credenciais inválidas." });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Credenciais inválidas." });

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({ message: "Erro no servidor.", error: error.message });
    }
});

module.exports = router;