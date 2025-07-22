const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');
const https = require('https');

// Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

// Create a custom HTTPS agent with more compatible TLS settings
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  rejectUnauthorized: true,
  // Use more compatible TLS settings
  minVersion: 'TLSv1.1',
  maxVersion: 'TLSv1.3',
  // Add timeout settings
  timeout: 30000,
  // Allow legacy cipher suites for better compatibility
  ciphers: 'ALL'
});

// Cloudflare R2 (S3-compatible)
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT || 'https://1020050031271.r2.cloudflarestorage.com', // Use your account ID
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
  // Use the custom HTTPS agent
  httpOptions: {
    timeout: 30000,
    connectTimeout: 10000,
    agent: httpsAgent
  },
  // Add retry configuration
  maxRetries: 3,
  retryDelayOptions: {
    base: 300
  }
});

const R2_BUCKET = process.env.R2_BUCKET;

// Debug R2 configuration
console.log('R2 Configuration:');
console.log('Endpoint:', process.env.R2_ENDPOINT || 'https://1020050031271.r2.cloudflarestorage.com');
console.log('Bucket:', R2_BUCKET);
console.log('Access Key ID:', process.env.R2_ACCESS_KEY_ID ? 'Set' : 'Not set');
console.log('Secret Access Key:', process.env.R2_SECRET_ACCESS_KEY ? 'Set' : 'Not set');

module.exports = {
  supabase,
  s3,
  R2_BUCKET,
}; 