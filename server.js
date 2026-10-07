const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const cache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
  }
});

app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: '🚀 OtakuHub Animedar Proxy Backend is Ready!' 
  });
});

app.get('/api/get-episode', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'يرجى تزويد الرابط المطلوب باستخدام معامل ?url=' 
      });
    }

    const cacheKey = `animedar_${url}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json({ ...cachedData, fromCache: true });
    }

    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await axiosInstance.get(proxyUrl);
    const html = response.data;

    const $ = cheerio.load(html);
    const extractedServers = [];

    // طريقة آمنة لاستخراج الروابط وتجنب أي أخطاء في العناصر
    $('iframe, video source, a').each((index, element) => {
      try {
        const el = $(element);
        let src = el.attr('src') || el.attr('data-src') || el.attr('href');
        
        if (src && typeof src === 'string') {
          if (src.startsWith('//')) {
            src = `https:${src}`;
          }
          
          if (src.includes('http') && !src.includes('animedar.net') && !src.includes('facebook') && !src.includes('twitter')) {
            extractedServers.push({
              id: extractedServers.length + 1,
              name: `Server ${extractedServers.length + 1}`,
              url: src
            });
          }
        }
      } catch (err) {
        // تخطي أي عنصر تالف دون إيقاف الخادم
      }
    });

    const uniqueServers = Array.from(new Set(extractedServers.map(s => s.url)))
      .map(url => extractedServers.find(s => s.url === url));

    const responseData = {
      success: true,
      targetUrl: url,
      serversCount: uniqueServers.length,
      servers: uniqueServers,
      message: uniqueServers.length > 0 
        ? 'تم استخراج الروابط والسيرفرات بنجاح 🎬' 
        : 'تم فتح الصفحة بنجاح ولكن لم يتم العثور على روابط وسائط مباشرة.'
    };

    cache.set(cacheKey, responseData);
    return res.json({ ...responseData, fromCache: false });

  } catch (error) {
    const statusCode = error.response ? error.response.status : 500;
    return res.status(500).json({ 
      success: false, 
      statusCode: statusCode,
      error: 'تعذر جلب الصفحة عبر الوسيط. يرجى التحقق من صحة الرابط المدخل.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ⚡`);
});
