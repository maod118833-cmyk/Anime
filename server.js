const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

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

    const formattedAnime = anime.trim().toLowerCase().replace(/\s+/g, '-');
    const targetUrl = `https://www.animenest.co/anime/${formattedAnime}/episode/${episode}`;

    console.log(`[+] جاري الجلب من الرابط: ${targetUrl}`);

    let browser = null;
    try {
        const executablePath = await chromium.executablePath();
        
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath,
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

        // تحميل الصفحة والانتظار حتى استقرار حركة الشبكة
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 }).catch(() => null);

        let streamUrl = null;

        // 🔄 محاولة البحث عن الرابط الصحيح حتى 5 مرات مع انتظار بين كل محاولة
        for (let attempt = 1; attempt <= 5; attempt++) {
            streamUrl = await page.evaluate(() => {
                const iframes = Array.from(document.querySelectorAll('iframe'));
                for (const iframe of iframes) {
                    const src = iframe.src || iframe.getAttribute('data-src');
                    // التقط أي iframe يحتوي على سيرفر فيديو معروف وليس إعلاناً
                    if (src && (src.includes('4shared') || src.includes('redload') || src.includes('embed') || src.includes('stream') || src.includes('file'))) {
                        return src;
                    }
                }
                // إذا لم يجد سيرفر مخصص، يرجع أول iframe متاح
                return iframes.length > 0 ? (iframes[0].src || iframes[0].getAttribute('data-src')) : null;
            });

            if (streamUrl && streamUrl !== 'about:blank') {
                console.log(`[+] تم العثور على الرابط في المحاولة رقم ${attempt}: ${streamUrl}`);
                break;
            }

            // انتظار ثانية ونصف قبل المحاولة التالية
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

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
