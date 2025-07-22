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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8080',
      'https://d0cfd836.jobhunter-frontend.pages.dev',
      'https://jobhunter-frontend.pages.dev',
      // Add any other Cloudflare Pages domains you might use
      /^https:\/\/.*\.pages\.dev$/,
      /^https:\/\/.*\.cloudflare\.com$/
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(passport.initialize());

// Handle preflight requests
app.options('*', cors());

// Debug middleware to log CORS issues
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

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

// PRESIGNED URL UPLOAD ENDPOINTS
app.post('/api/upload/presign', requireJwt, async (req, res) => {
  const user = req.user;
  const { fileName, fileType, fileSize } = req.body;
  
  if (!fileName || !fileType || !fileSize) {
    return res.status(400).json({ error: 'fileName, fileType, and fileSize are required' });
  }

  // Validate file size (5MB limit)
  if (fileSize > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File size must be less than 5MB' });
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(fileType)) {
    return res.status(400).json({ error: 'Only PDF and Word documents are allowed' });
  }

  try {
    const fileId = `${user.id}_${Date.now()}_${fileName}`;
    const key = `cvs/${user.id}/${fileId}`;
    
    // Generate presigned URL for upload
    const uploadUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: fileType,
      Expires: 300, // 5 minutes
    });

    const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    res.json({
      uploadUrl,
      fileUrl,
      fileId,
    });
  } catch (err) {
    console.error('Presigned URL generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload/confirm', requireJwt, async (req, res) => {
  const user = req.user;
  const { fileId, fileName } = req.body;
  
  if (!fileId || !fileName) {
    return res.status(400).json({ error: 'fileId and fileName are required' });
  }

  try {
    const key = `cvs/${user.id}/${fileId}`;
    const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    
    // Save URL to Supabase
    await supabase.from('user_cvs').upsert({ 
      user_id: user.id, 
      url: fileUrl,
      file_name: fileName
    });
    
    res.json({ 
      message: 'Upload confirmed',
      fileUrl,
      fileId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy upload endpoint to avoid SSL issues with direct R2 upload
app.post('/api/upload/proxy', requireJwt, upload.single('file'), async (req, res) => {
  const user = req.user;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { fileName, fileType } = req.body;
  
  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'fileName and fileType are required' });
  }

  // Validate file size (5MB limit)
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File size must be less than 5MB' });
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedTypes.includes(fileType)) {
    return res.status(400).json({ error: 'Only PDF and Word documents are allowed' });
  }

  try {
    console.log('Starting proxy upload for user:', user.id);
    console.log('File name:', fileName);
    console.log('File type:', fileType);
    console.log('File size:', req.file.size);
    
    const fileId = `${user.id}_${Date.now()}_${fileName}`;
    const key = `cvs/${user.id}/${fileId}`;
    
    console.log('Uploading to R2 with key:', key);
    
    // Upload directly to R2 through backend
    const uploadResult = await s3.putObject({
      Bucket: R2_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: fileType,
    }).promise();

    console.log('R2 upload successful:', uploadResult);

    const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    
    console.log('File URL:', fileUrl);
    
    // Save URL to Supabase
    const { data: dbResult, error: dbError } = await supabase.from('user_cvs').upsert({ 
      user_id: user.id, 
      url: fileUrl,
      file_name: fileName
    });
    
    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to save file URL to database' });
    }
    
    console.log('Database save successful:', dbResult);
    
    res.json({ 
      message: 'Upload successful',
      fileUrl,
      fileId,
      fileName
    });
  } catch (err) {
    console.error('Proxy upload error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      requestId: err.requestId
    });
    
    // Provide more specific error messages
    if (err.code === 'NetworkingError' || err.message.includes('SSL') || err.message.includes('TLS')) {
      res.status(500).json({ 
        error: 'SSL/TLS connection issue with storage service. Please try again.',
        details: err.message 
      });
    } else if (err.code === 'AccessDenied' || err.code === 'InvalidAccessKeyId') {
      res.status(500).json({ 
        error: 'Storage service authentication failed. Please contact support.',
        details: err.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Upload failed. Please try again.',
        details: err.message 
      });
    }
  }
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

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({ 
    message: 'CORS is working!', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Test S3 connection endpoint
app.get('/api/test-s3', requireJwt, async (req, res) => {
  try {
    // Test S3 connection by listing objects (limited to 1)
    const result = await s3.listObjectsV2({
      Bucket: R2_BUCKET,
      MaxKeys: 1
    }).promise();
    
    res.json({ 
      message: 'S3 connection is working!',
      bucket: R2_BUCKET,
      objectCount: result.KeyCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('S3 test error:', err);
    res.status(500).json({ 
      error: 'S3 connection failed',
      details: err.message 
    });
  }
});

// Test R2 upload endpoint
app.post('/api/test-r2-upload', requireJwt, async (req, res) => {
  try {
    const user = req.user;
    const testKey = `test/${user.id}/test-${Date.now()}.txt`;
    const testContent = 'This is a test upload to verify R2 connectivity.';
    
    console.log('Testing R2 upload with key:', testKey);
    
    const uploadResult = await s3.putObject({
      Bucket: R2_BUCKET,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    }).promise();

    console.log('R2 test upload successful:', uploadResult);
    
    // Clean up test file
    await s3.deleteObject({
      Bucket: R2_BUCKET,
      Key: testKey,
    }).promise();
    
    res.json({ 
      message: 'R2 upload test successful!',
      bucket: R2_BUCKET,
      testKey,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('R2 upload test error:', err);
    res.status(500).json({ 
      error: 'R2 upload test failed',
      details: err.message,
      code: err.code,
      statusCode: err.statusCode
    });
  }
});

// Simple R2 connection test (no auth required)
app.get('/api/test-r2-connection', async (req, res) => {
  try {
    console.log('Testing R2 connection without auth...');
    
    // Just try to list objects (limited to 1) to test connection
    const result = await s3.listObjectsV2({
      Bucket: R2_BUCKET,
      MaxKeys: 1
    }).promise();
    
    res.json({ 
      message: 'R2 connection test successful!',
      bucket: R2_BUCKET,
      objectCount: result.KeyCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('R2 connection test error:', err);
    res.status(500).json({ 
      error: 'R2 connection test failed',
      details: err.message,
      code: err.code,
      statusCode: err.statusCode,
      endpoint: process.env.R2_ENDPOINT || 'https://1020050031271.r2.cloudflarestorage.com'
    });
  }
});

// Debug R2 configuration endpoint
app.get('/api/debug-r2-config', async (req, res) => {
  res.json({
    endpoint: 'https://2bf2de591e1cf380e0266d46ea7f3524.r2.cloudflarestorage.com', // Correct account ID
    bucket: R2_BUCKET,
    hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
    timestamp: new Date().toISOString()
  });
});

// Test multiple R2 endpoints to find the correct one
app.get('/api/test-r2-endpoints', async (req, res) => {
  const possibleEndpoints = [
    'https://2bf2de591e1cf380e0266d46ea7f3524.r2.cloudflarestorage.com',
    'https://r2.cloudflarestorage.com',
    'https://api.cloudflare.com/client/v4/accounts/2bf2de591e1cf380e0266d46ea7f3524/storage/buckets'
  ];
  
  const results = [];
  
  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      
      // Create a temporary S3 client for this endpoint
      const tempS3 = new AWS.S3({
        endpoint: endpoint,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        region: 'auto',
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      });
      
      // Try to list objects
      const result = await tempS3.listObjectsV2({
        Bucket: R2_BUCKET,
        MaxKeys: 1
      }).promise();
      
      results.push({
        endpoint,
        status: 'SUCCESS',
        objectCount: result.KeyCount
      });
      
      console.log(`✅ Endpoint ${endpoint} works!`);
      
    } catch (error) {
      results.push({
        endpoint,
        status: 'FAILED',
        error: error.message,
        code: error.code
      });
      
      console.log(`❌ Endpoint ${endpoint} failed: ${error.message}`);
    }
  }
  
  res.json({
    message: 'R2 endpoint test results',
    results,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 