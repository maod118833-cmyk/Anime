const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 86400 }); // تخزين مؤقت لمدة 24 ساعة
const PORT = process.env.PORT || 3000;

app.get('/api/get-episode', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'الرجاء توفير رابط الحلقة عبر الوسيط (url)' });
    }

    if (cache.has(targetUrl)) {
        return res.json({ success: true, source: 'cache', data: cache.get(targetUrl) });
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
                'Referer': 'https://animedar.net/'
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);
        const servers = [];

        // استخراج الروابط بالشكل الصحيح والسليم
        $('iframe, video source, a.server-link, .watch-servers a, ul.servers-list li a').each((index, element) => {
            const src = $(element).attr('src') \vert{}\vert{}$(element).attr('href');
            const name = $(element).text().trim() \vert{}\vert{}$(element).attr('data-name') || `Server ${index + 1}`;
            
            if (src && src.startsWith('http')) {
                servers.push({ name, url: src });
            }
        });

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
        console.error('Scraping Error:', error.message);
        return res.status(500).json({ 
            success: false, 
            statusCode: 500, 
            error: 'تعذر جلب الصفحة عبر الوسيط. يرجى التحقق من صحة الرابط المدخل.' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
