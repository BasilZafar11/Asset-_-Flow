import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { logActivity } from '../utils/activityLogger.js';

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password_hash: passwordHash
    });

    await logActivity(null, user.id, 'REGISTER', `Global user registration completed for ${email}`);

    return res.status(201).json({
      message: 'User registered successfully.',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Error in user registration controller:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logActivity(null, user.id, 'LOGIN', `Successful login for user ${user.email}`);

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Error in user login controller:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'created_at']
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json(user);
  } catch (err) {
    console.error('Error in user profile controller:', err);
    return res.status(500).json({ error: 'Internal server error fetching profile.' });
  }
};
