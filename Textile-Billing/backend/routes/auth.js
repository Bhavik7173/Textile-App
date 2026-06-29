const express = require('express');
const jwt     = require('jsonwebtoken');
const Agent   = require('../models/Agent');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router  = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const agent = await Agent.findOne({ email: email.toLowerCase().trim(), isActive: true });
    if (!agent) return res.status(401).json({ error: 'Email not found' });

    const match = await agent.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign(
      { sub: agent._id.toString(), email: agent.email, name: agent.name, role: agent.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, userInfo: { sub: agent._id.toString(), email: agent.email, name: agent.name, role: agent.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, email, password, phone, role = 'agent' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });

    if (await Agent.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ error: 'Email already registered' });

    const agent = new Agent({ name, email, password, phone, role });
    await agent.save();
    res.status(201).json({ agent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const agent = await Agent.findById(req.caller.sub);
    if (!agent) return res.status(404).json({ error: 'User not found' });
    res.json({ user: agent });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
