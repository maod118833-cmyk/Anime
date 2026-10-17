const express = require('express');
const puppeteer = require('puppeteer');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 86400 });
const PORT = process.env.PORT || 3000;

app.get('/api/get-episode', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'الرجاء توفير رابط الحلقة عبر الوسيط (url)' });
    }

    if (cache.has(targetUrl)) {
        return res.json({ success: true, source: 'cache', data: cache.get(targetUrl) });
    }

    let browser = null;

    try {
        // تشغيل متصفح Puppeteer بخيارات متوافقة مع الاستضافات السحابية مثل Render
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // محاكاة متصفح حقيقي لتجاوز الحماية
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(targetUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // استخراج العناصر من الصفحة تماماً مثل Cheerio ولكن بعد تشغيل JavaScript بالكامل
        const servers = await page.evaluate(() => {
            const elements = document.querySelectorAll('iframe, video source, a.server-link, .watch-servers a, ul.servers-list li a');
            const results = [];

            elements.forEach((element, index) => {
                let src = element.getAttribute('src') || element.getAttribute('href');
                let name = element.innerText ? element.innerText.trim() : null;
                if (!name) {
                    name = element.getAttribute('data-name');
                }
                if (!name) {
                    name = 'Server ' + (index + 1);
                }

                if (src && src.startsWith('http')) {
                    results.push({ name, url: src });
                }
            });

            return results;
        });

        await browser.close();

        // تصفية الروابط المتكررة
        const uniqueServers = Array.from(new Set(servers.map(s => s.url)))
            .map(url => servers.find(s => s.url === url));

        const resultData = {
            episodeUrl: targetUrl,
            serversCount: uniqueServers.length,
            servers: uniqueServers
        };

        cache.set(targetUrl, resultData);

        return res.json({ success: true, source: 'live', data: resultData });

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        console.error('Puppeteer Scraping Error:', error.message);
        return res.status(500).json({ 
            success: false, 
            statusCode: 500, 
            error: 'تعذر جلب الصفحة عبر المتصفح الوهمي. يرجى التحقق من صحة الرابط المدخل.' 
        });
    }
});

app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
});
