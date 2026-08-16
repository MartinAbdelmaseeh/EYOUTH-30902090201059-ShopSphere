const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/email/emailService');
const { recordUserRegistered } = require('../services/statistics/statsService');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000
};

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const safeRole = role === 'admin' ? 'admin' : 'customer';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: safeRole
    });

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    sendWelcomeEmail(newUser);
    recordUserRegistered(newUser);

    res.status(201).json({
      message: 'Registered successfully',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({
      message: 'Logged in successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: 'Name cannot be empty.' });
      }
      updates.name = name;
    }

    if (email !== undefined) {
      const existing = await User.findByEmail(email);
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }
      updates.email = email;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No changes provided.' });
    }

    const updatedUser = await User.update(req.user.id, updates);

    const token = jwt.sign(
      { id: updatedUser.id, name: updatedUser.name, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({
      message: 'Profile updated successfully',
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Log out 
const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ message: 'Logged out successfully' });
};

module.exports = { register, login, logout, getMe, updateProfile };