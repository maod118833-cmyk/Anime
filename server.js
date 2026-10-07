const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// إعداد التخزين المؤقت (Cache)
const cache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

// إعدادات Axios متقدمة تحاكي متصفح حقيقي لتفادي الحظر
const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Referer': 'https://animelek.me/',
    'Connection': 'keep-alive'
  }
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: '🚀 OtakuHub Optimized Backend is Ready!' 
  });
});

// نقطة جلب الحلقة المحسنة
app.get('/api/get-episode', async (req, res) => {
  try {
    const { anime, episode } = req.query;

    if (!anime || !episode) {
      return res.status(400).json({ 
        success: false, 
        error: 'يرجى تزويد اسم الأنمي ورقم الحلقة.' 
      });
    }

    const cleanAnime = String(anime).trim().toLowerCase().replace(/\s+/g, '-');
    const cleanEpisode = String(episode).trim();
    const cacheKey = `ep_${cleanAnime}_${cleanEpisode}`;

    // 1. التحقق من التخزين المؤقت
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`⚡ البيانات من Cache: ${cacheKey}`);
      return res.json({ ...cachedData, fromCache: true });
    }

    // 2. محاولة تجربة رابط بديل أو صيغة مختلفة للموقع
    const targetUrl = `https://animelek.me/episode/${cleanAnime}-الحلقة-${cleanEpisode}/`;
    console.log(`🔍 جاري المحاولة مع الرابط: ${targetUrl}`);

    const response = await axiosInstance.get(targetUrl);
    const html = response.data;

    const $ = cheerio.load(html);
    const extractedServers = [];

    // استخراج السيرفرات
    $('iframe, video source').each((index, element) => {
      let src = $(element).attr('src') \vert{}\vert{}$(element).attr('data-src');
      if (src) {
        if (src.startsWith('//')) src = `https:${src}`;
        extractedServers.push({
          id: index + 1,
          name: `Server ${index + 1}`,
          url: src
        });
      }
    });

    const responseData = {
      success: true,
      anime: cleanAnime,
      episode: cleanEpisode,
      serversCount: extractedServers.length,
      servers: extractedServers,
      message: extractedServers.length > 0 
        ? 'تم استخراج سيرفرات المشاهدة بنجاح 🎬' 
        : 'تم فتح الصفحة ولكن لم نجد سيرفرات.'
    };

    cache.set(cacheKey, responseData);
    return res.json({ ...responseData, fromCache: false });

  } catch (error) {
    const statusCode = error.response ? error.response.status : 'Network Error';
    console.error(`❌ خطأ (${statusCode}):`, error.message);

    return res.status(500).json({ 
      success: false, 
      statusCode: statusCode,
      error: 'تعذر جلب الحلقة. الموقع المصدر قد يحظر الطلبات المباشرة.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ⚡`);
});
