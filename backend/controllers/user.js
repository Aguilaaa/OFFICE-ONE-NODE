const db = require('../models');
const User = db.User;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { trashedWhere, restoreRow } = require('../utils/softDelete');
const { generateVerificationToken, sendVerificationEmail } = require('../utils/emailVerification');

const issueVerification = async (user) => {
  const verificationToken = generateVerificationToken();
  await user.update({ token: verificationToken, email_verified_at: null });
  await sendVerificationEmail(user, verificationToken);
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'customer',
      is_active: 1
    });
    try {
      await issueVerification(user);
    } catch (mailErr) {
      console.error('Verification email failed:', mailErr.message);
      return res.status(201).json({
        success: true,
        emailSent: false,
        message: 'User created but verification email could not be sent. Use resend verification.',
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    }
    return res.status(201).json({
      success: true,
      emailSent: true,
      message: 'User created. A verification email has been sent.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return res.status(500).json({ error: 'Error creating user' });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      role: 'customer',
      is_active: 1
    });
    try {
      await issueVerification(user);
    } catch (mailErr) {
      console.error('Verification email failed:', mailErr.message);
      return res.status(201).json({
        success: true,
        emailSent: false,
        message: 'Account created but verification email could not be sent. You can resend it from the login page.',
        user: { id: user.id, name: user.name, email: user.email }
      });
    }
    return res.status(201).json({
      success: true,
      emailSent: true,
      message: 'Registration successful. Please check your email to verify your account before logging in.',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return res.status(500).json({ error: 'Error registering user' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { token: req.params.token, deleted_at: null, is_active: 1 }
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });
    if (user.email_verified_at) {
      return res.status(200).json({ success: true, message: 'Email is already verified. You can log in.' });
    }
    await user.update({ email_verified_at: new Date(), token: null });
    return res.status(200).json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Error verifying email' });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const email = (req.body.email || '').trim();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ where: { email, deleted_at: null, is_active: 1 } });
    if (!user) {
      return res.status(200).json({ success: true, message: 'If that account exists, a verification email has been sent.' });
    }
    if (user.email_verified_at) {
      return res.status(400).json({ error: 'This email is already verified. You can log in.' });
    }

    await issueVerification(user);
    return res.status(200).json({ success: true, message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {
    console.error('Resend verification failed:', err.message);
    return res.status(500).json({ error: 'Could not send verification email. Check SMTP settings.' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email, deleted_at: null, is_active: 1 } });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.email_verified_at) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        needsVerification: true,
        email: user.email
      });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    await user.update({ token });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, profile_image: user.profile_image },
      token
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error logging in' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'profile_image', 'is_active', 'email_verified_at', 'createdAt']
    });
    if (!user || !user.is_active) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.is_active) return res.status(404).json({ error: 'User not found' });

    const updateData = {};
    if (req.body.name && req.body.name.trim()) updateData.name = req.body.name.trim();
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }
    if (req.file) updateData.profile_image = req.file.path.replace(/\\/g, '/');

    await user.update(updateData);
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating profile' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: trashedWhere(req.query.trashed),
      attributes: { exclude: ['password', 'token'] },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json({ rows: users });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching users' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'customer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    await User.update({ role }, { where: { id: req.params.id } });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating role' });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.deleted_at) return res.status(400).json({ error: 'User is already deleted' });
    await user.update({ is_active: 0, deleted_at: new Date(), token: null });
    return res.status(200).json({ success: true, message: 'User moved to trash' });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating user status' });
  }
};

exports.restoreUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    const result = await restoreRow(user, { is_active: 1 });
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'User restored' });
  } catch (err) {
    return res.status(500).json({ error: 'Error restoring user' });
  }
};
