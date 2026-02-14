/**
 * Aplos Token Proxy Sidecar
 *
 * Minimal Node.js service that handles Aplos API token exchange.
 * Runs with --security-revert=CVE-2023-46809 to allow RSA PKCS#1 v1.5
 * decryption required by Aplos, isolating the security revert from
 * the main application.
 *
 * Endpoints:
 *   GET /health       - Health check
 *   POST /decrypt     - Decrypt an Aplos encrypted token
 *   POST /auth-token  - Full auth flow: call Aplos auth endpoint, decrypt, return token
 */

const http = require('http');
const crypto = require('crypto');
const https = require('https');

const PORT = process.env.SIDECAR_PORT || 3001;
const APLOS_API_BASE_URL = process.env.APLOS_API_BASE_URL || 'https://app.aplos.com/hermes/api/v1';
const APLOS_CLIENT_ID = process.env.APLOS_CLIENT_ID || '';
const ALLOWED_ORIGIN = '127.0.0.1'; // Only accept requests from localhost

// Parse private key from environment
function getPrivateKey() {
  const rawKey = process.env.APLOS_PRIVATE_KEY || '';
  if (!rawKey) return '';
  if (rawKey.includes('-----BEGIN')) {
    return rawKey.replace(/\\n/g, '\n');
  }
  const formatted = rawKey.match(/.{1,64}/g)?.join('\n') || rawKey;
  return `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;
}

const privateKey = getPrivateKey();

// Decrypt token using RSA with PKCS#1 v1.5 fallback
function decryptToken(encryptedToken) {
  const encryptedBuffer = Buffer.from(encryptedToken, 'base64');

  const paddingOptions = [
    { padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    { padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' },
    { padding: crypto.constants.RSA_PKCS1_PADDING },
  ];

  for (const options of paddingOptions) {
    try {
      const decrypted = crypto.privateDecrypt({ key: privateKey, ...options }, encryptedBuffer);
      return decrypted.toString('utf8');
    } catch {
      continue;
    }
  }

  throw new Error('All decryption methods failed');
}

// Fetch Aplos auth token (encrypted) from their API
function fetchAplosAuth() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${APLOS_API_BASE_URL}/auth/${APLOS_CLIENT_ID}`);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Aplos auth failed: ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse Aplos auth response'));
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Aplos auth timeout')); });
    req.on('error', reject);
    req.end();
  });
}

// Read request body (JSON)
function readBody(req, maxBytes = 16384) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Simple JSON response helper
function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // Only allow requests from within the Docker network
  const remoteAddr = req.socket.remoteAddress;
  // Docker internal IPs are typically 172.x.x.x or 10.x.x.x
  // Allow localhost and Docker bridge network
  if (!remoteAddr?.match(/^(127\.|::1|::ffff:127\.|172\.|10\.|192\.168\.)/)) {
    jsonResponse(res, 403, { error: 'Forbidden' });
    return;
  }

  try {
    if (req.method === 'GET' && req.url === '/health') {
      jsonResponse(res, 200, { status: 'ok', service: 'aplos-sidecar' });
      return;
    }

    if (req.method === 'POST' && req.url === '/decrypt') {
      const body = await readBody(req);
      if (!body.encrypted_token) {
        jsonResponse(res, 400, { error: 'encrypted_token required' });
        return;
      }
      if (!privateKey) {
        jsonResponse(res, 500, { error: 'Private key not configured' });
        return;
      }
      const token = decryptToken(body.encrypted_token);
      jsonResponse(res, 200, { token });
      return;
    }

    if (req.method === 'POST' && req.url === '/auth-token') {
      if (!APLOS_CLIENT_ID || !privateKey) {
        jsonResponse(res, 500, { error: 'Aplos credentials not configured' });
        return;
      }
      const authResponse = await fetchAplosAuth();
      const encryptedToken = authResponse.data?.token || authResponse.token;
      if (!encryptedToken) {
        jsonResponse(res, 502, { error: 'No token in Aplos auth response' });
        return;
      }
      const token = decryptToken(encryptedToken);
      jsonResponse(res, 200, { token });
      return;
    }

    jsonResponse(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Sidecar error:', error.message);
    jsonResponse(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Aplos sidecar listening on port ${PORT}`);
});
