const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 🧠 متغير عام للربط بمتصفح واحد دائم التشغيل
let globalBrowser = null;

async function getBrowserInstance() {
    if (globalBrowser && globalBrowser.isConnected()) {
        return globalBrowser;
    }
    
    console.log('[+] جاري تشغيل المتصفح الرئيسي لأول مرة...');
    const executablePath = await chromium.executablePath();
    
    globalBrowser = await puppeteer.launch({
        args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
    });

    return globalBrowser;
}

app.get('/', (req, res) => {
    res.send('🚀 سيرفر جلب أنمي ستريم يعمل بنجاح وسرعة فائقة');
});

app.get('/api/get-episode', async (req, res) => {
    const { anime, episode } = req.query;

    if (!anime || !episode) {
        return res.status(400).json({ success: false, error: 'يرجى تزويد اسم الأنمي ورقم الحلقة' });
    }

    const formattedAnime = anime.trim().toLowerCase().replace(/\s+/g, '-');
    const targetUrl = `https://www.animenest.co/anime/${formattedAnime}/episode/${episode}`;

    console.log(`[+] جاري الجلب من الرابط: ${targetUrl}`);

    let page = null;
    try {
        const browser = await getBrowserInstance();
        page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

        // الانتقال للصفحة مع مهلة أسرع
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);

        let streamUrl = null;

        // 🔄 البحث عن مشغل الفيديو
        for (let attempt = 1; attempt <= 4; attempt++) {
            streamUrl = await page.evaluate(() => {
                const iframes = Array.from(document.querySelectorAll('iframe'));
                for (const iframe of iframes) {
                    const src = iframe.src || iframe.getAttribute('data-src');
                    if (src && (src.includes('4shared') || src.includes('redload') || src.includes('embed') || src.includes('stream') || src.includes('file'))) {
                        return src;
                    }
                }
                return iframes.length > 0 ? (iframes[0].src || iframes[0].getAttribute('data-src')) : null;
            });

            if (streamUrl && streamUrl !== 'about:blank') {
                console.log(`[+] تم العثور على الرابط: ${streamUrl}`);
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // إغلاق التبويب فقط لإبقاء المتصفح سريعاً ومستقراً
        await page.close();

        return res.json({
            success: true,
            anime: anime,
            episode: episode,
            streamUrl: streamUrl
        });

    } catch (error) {
        if (page) await page.close().catch(() => {});
        console.error('Err:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // تشغيل المتصفح مسبقاً عند إقلاع السيرفر ليكون جاهزاً للطلبات
    try {
        await getBrowserInstance();
        console.log('🚀 المتصفح جاهز لاستقبال الطلبات بنجاح');
    } catch (e) {
        console.error('فشل تشغيل المتصفح المبدئي:', e);
    }
});
