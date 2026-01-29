import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import User from '../models/User.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Check for user (include password for comparison)
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// @route   POST /api/auth/google/verify
// @desc    Verify Google token and authenticate user
// @access  Public
router.post('/google/verify', async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: 'Google credential is required' });
        }

        // Verify the Google token
        const { OAuth2Client } = await import('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Check if user exists with this Google ID
        let user = await User.findOne({ googleId });

        if (!user) {
            // Check if user exists with the same email
            user = await User.findOne({ email });

            if (user) {
                // Link Google account to existing user
                user.googleId = googleId;
                user.authProvider = 'google';
                user.avatar = picture;
                await user.save();
            } else {
                // Create new user
                user = await User.create({
                    name,
                    email,
                    googleId,
                    authProvider: 'google',
                    avatar: picture,
                });
            }
        }

        // Generate JWT token
        const token = generateToken(user._id);

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            token,
        });
    } catch (error) {
        console.error('Google verification error:', error);
        res.status(500).json({ message: 'Failed to verify Google token' });
    }
});

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth flow
// @access  Public
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
}));

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: 'http://localhost:8080/auth' }),
    (req, res) => {
        try {
            // Generate JWT token
            const token = generateToken(req.user._id);

            // Redirect to frontend with token
            res.redirect(`http://localhost:8080/auth?token=${token}&user=${encodeURIComponent(JSON.stringify({
                _id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                avatar: req.user.avatar,
            }))}`);
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect('http://localhost:8080/auth?error=authentication_failed');
        }
    }
);

export default router;
