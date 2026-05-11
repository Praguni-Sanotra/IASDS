import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import redisClient from '../config/redis';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretadmin123';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'supersecretrefresh123';

const generateTokens = (user: any) => {
  const payload = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
  };

  // Access Token: 15 minutes
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  // Refresh Token: 7 days
  const refreshToken = jwt.sign({ id: user._id }, REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken, payload };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ message: 'Validation Error', errors: errors.array() });
    return;
  }

  const { name, email, password, role, department } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: 'User with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'FACULTY',
      department
    });

    const { accessToken, refreshToken, payload } = generateTokens(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await AuditLog.create({
      action: 'REGISTER',
      entity: 'USER',
      entityId: user._id,
      performedBy: user._id,
      ipAddress: req.ip,
      details: { email: user.email, role: user.role },
    });

    res.status(201).json({ accessToken, user: payload });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  // Input validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ message: 'Validation Error', errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Invalid credentials or inactive account' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWTs
    const { accessToken, refreshToken, payload } = generateTokens(user);

    // Set refreshToken in httpOnly cookie (7 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Audit Log for successful login
    await AuditLog.create({
      action: 'LOGIN',
      entity: 'USER',
      entityId: user._id,
      performedBy: user._id,
      ipAddress: req.ip,
      details: { email: user.email },
    });

    res.json({ accessToken, user: payload });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const authHeader = req.headers.authorization;
    
    // Clear the HTTP-only cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    // Blacklist the access token if provided
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1];
      // Blacklist for 1 day (generous buffer for a 15m token)
      await redisClient.set(`blacklist:${accessToken}`, 'true', 'EX', 24 * 60 * 60);
    }
    
    // Blacklist the refresh token for 7 days
    if (refreshToken) {
      await redisClient.set(`blacklist:${refreshToken}`, 'true', 'EX', 7 * 24 * 60 * 60);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ message: 'Unauthorized: No refresh token provided' });
      return;
    }

    // Check if the refresh token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      res.status(403).json({ message: 'Forbidden: Invalid refresh token (blacklisted)' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Unauthorized: User not found or inactive' });
      return;
    }

    // Generate new tokens
    const { accessToken, payload } = generateTokens(user);

    res.json({ accessToken, user: payload });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(403).json({ message: 'Forbidden: Refresh token expired' });
    } else {
      res.status(403).json({ message: 'Forbidden: Invalid refresh token' });
    }
  }
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
