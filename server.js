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

// إعدادات Axios للتخفي كمتصفح عادي
const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
  }
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: '🚀 OtakuHub Light Backend is Ready!' 
  });
});

// نقطة جلب الحلقة
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

    // 2. تجربة رابط الموقع البسيط
    const targetUrl = `https://animelek.me/episode/${cleanAnime}-الحلقة-${cleanEpisode}/`;

    console.log(`🔍 جاري جلب الصفحة من: ${targetUrl}`);

    // 3. طلب كود الـ HTML
    const response = await axiosInstance.get(targetUrl);
    const html = response.data;

    // 4. استخراج الروابط باستخدام Cheerio
    const $ = cheerio.load(html);
    const extractedServers = [];

    $('iframe').each((index, element) => {
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
        : 'تم فتح الصفحة ولكن لم نجد سيرفرات مباشرة بها.'
    };

    cache.set(cacheKey, responseData);
    return res.json({ ...responseData, fromCache: false });

  } catch (error) {
    // طباعة رمز الخطأ والتفاصيل لمعرفة السبب بدقة
    const statusCode = error.response ? error.response.status : 'لا يوجد استجابة';
    console.error(`❌ خطأ أثناء الجلب (${statusCode}):`, error.message);

    return res.status(500).json({ 
      success: false, 
      statusCode: statusCode,
      details: error.message,
      error: 'تعذر جلب الحلقة من الموقع. يرجى التحقق من وجود الحلقة أو رمز الخطأ.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ⚡`);
});
