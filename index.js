const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { supabase, s3, R2_BUCKET } = require('./services');
const passport = require('./auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const upload = multer();

const app = express();
const port = process.env.PORT || 8080;

// Configure CORS properly for credentials
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://d0cfd836.jobhunter-frontend.pages.dev',
    'https://jobhunter-frontend.pages.dev'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(passport.initialize());

// Helper: sign JWT
function signJwt(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// AUTH ROUTES
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  // Check if user exists
  const { data: existing, error: findErr } = await supabase.from('users').select('*').eq('email', email).single();
  if (existing) return res.status(400).json({ error: 'User already exists' });
  // Hash password
  const password_hash = await bcrypt.hash(password, 10);
  // Insert user
  const { data: user, error } = await supabase.from('users').insert([{ email, password_hash }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  const token = signJwt(user);
  res.json({ token, user: { id: user.id, email: user.email } });
});

app.post('/api/auth/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err || !user) return res.status(400).json({ error: info ? info.message : 'Login failed' });
    const token = signJwt(user);
    res.json({ token, user: { id: user.id, email: user.email } });
  })(req, res, next);
});

// JWT-protected middleware
const requireJwt = passport.authenticate('jwt', { session: false });

// USER PREFERENCES
app.get('/api/user/preferences', requireJwt, async (req, res) => {
  const user = req.user;
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error && error.code !== 'PGRST116') return res.status(400).json({ error: error.message });
  res.json(data || {});
});

app.put('/api/user/preferences', requireJwt, async (req, res) => {
  const user = req.user;
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ ...req.body, user_id: user.id })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// CV UPLOAD/GET
app.post('/api/user/cv', requireJwt, upload.single('cv'), async (req, res) => {
  const user = req.user;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const key = `cvs/${user.id}/${Date.now()}_${req.file.originalname}`;
  try {
    await s3.putObject({
      Bucket: R2_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }).promise();
    const url = `${process.env.R2_PUBLIC_URL}/${key}`;
    // Save URL to Supabase
    await supabase.from('user_cvs').upsert({ user_id: user.id, url });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/cv', requireJwt, async (req, res) => {
  const user = req.user;
  const { data, error } = await supabase
    .from('user_cvs')
    .select('url')
    .eq('user_id', user.id)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// JOB URLS CRUD
app.get('/api/job-urls', requireJwt, async (req, res) => {
  const user = req.user;
  const { data, error } = await supabase
    .from('job_urls')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post('/api/job-urls', requireJwt, async (req, res) => {
  const user = req.user;
  const { data, error } = await supabase
    .from('job_urls')
    .insert([{ ...req.body, user_id: user.id }])
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.put('/api/job-urls/:id', requireJwt, async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { data, error } = await supabase
    .from('job_urls')
    .update({ ...req.body })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.delete('/api/job-urls/:id', requireJwt, async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { error } = await supabase
    .from('job_urls')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Placeholder for autofill extension
app.post('/api/job-urls/autofill', requireJwt, (req, res) => {
  res.json({ message: 'Autofill extension endpoint (to be implemented)' });
});

// Placeholder for AI CV builder
app.post('/api/ai-cv-builder', requireJwt, (req, res) => {
  res.json({ message: 'AI CV builder endpoint (to be implemented)' });
});

app.get('/', (req, res) => {
  res.send('Hello from the JobHunter Backend!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 