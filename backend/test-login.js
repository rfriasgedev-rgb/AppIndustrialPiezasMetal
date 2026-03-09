const https = require('https');

const data = JSON.stringify({ email: 'admin@metalerp.com', password: 'Admin123!' });

const options = {
    hostname: 'appindustrialpiezasmetal-production.up.railway.app',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', error => {
    console.error('Request error:', error);
});

req.write(data);
req.end();
