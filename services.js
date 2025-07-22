const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');

// Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

// Cloudflare R2 (S3-compatible)
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT, // e.g. https://<accountid>.r2.cloudflarestorage.com
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
  // Force modern TLS configuration
  httpOptions: {
    timeout: 30000,
    connectTimeout: 5000,
    // Use modern TLS
    agent: require('https').Agent({
      keepAlive: true,
      maxSockets: 50,
      rejectUnauthorized: true,
      // Force TLS 1.2 or higher
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3'
    })
  }
});

const R2_BUCKET = process.env.R2_BUCKET;

module.exports = {
  supabase,
  s3,
  R2_BUCKET,
}; 