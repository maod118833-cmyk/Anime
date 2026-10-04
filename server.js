const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🚀 سيرفر جلب أنمي ستريم يعمل بنجاح');
});

app.get('/api/get-episode', async (req, res) => {
    const { anime, episode } = req.query;

    if (!anime || !episode) {
        return res.status(400).json({ success: false, error: 'يرجى تزويد اسم الأنمي ورقم الحلقة' });
    }

    console.log(`[+] جاري البحث عن: ${anime} - الحلقة ${episode}`);

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');

        // 1. رابط تجريبي للصفحة
        const targetUrl = `https://example.com/anime/${encodeURIComponent(anime)}/episode/${episode}`;
        
        // 2. الانتقال إلى الصفحة
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

        // 3. استخراج رابط الفيديو
        const streamUrl = await page.evaluate(() => {
            const videoElement = document.querySelector('video');
            return videoElement ? videoElement.src : null;
        });

        await browser.close();

        return res.json({
            success: true,
            anime: anime,
            episode: episode,
            streamUrl: streamUrl
        });

    } catch (error) {
        if (browser) await browser.close();
        console.error('Err:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
