const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// إعداد التخزين المؤقت (Cache) لمدة 24 ساعة
const cache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

// إعدادات طلبات الشبكة لحماية السيرفر
const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: '🚀 OtakuHub Light Backend is Live & Ready!' 
  });
});

// نقطة جلب الحلقة واستخراج الروابط
app.get('/api/get-episode', async (req, res) => {
  try {
    const { anime, episode } = req.query;

    if (!anime || !episode) {
      return res.status(400).json({ 
        success: false, 
        error: 'يرجى تزويد اسم الأنمي ورقم الحلقة بشكل صحيح.' 
      });
    }

    const cleanAnime = String(anime).trim().toLowerCase().replace(/\s+/g, '-');
    const cleanEpisode = String(episode).trim();
    const cacheKey = `ep_${cleanAnime}_${cleanEpisode}`;

    // 1. التحقق من التخزين المؤقت
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`⚡ تم إرجاع البيانات من Cache: ${cacheKey}`);
      return res.json({ ...cachedData, fromCache: true });
    }

    // 2. رابط الصفحة المستهدفة (يمكن تعديل النمط حسب الموقع المصدر)
    const targetUrl = `https://example-anime-site.com/watch/${cleanAnime}-episode-${cleanEpisode}`;

    // 3. جلب محتوى HTML بواسطة Axios
    const response = await axiosInstance.get(targetUrl);
    const html = response.data;

    // 4. تحليل الصفحة بواسطة Cheerio واستخراج الروابط
    const $ = cheerio.load(html);
    const extractedServers = [];

    // استخراج سيرفرات المشاهدة والتحميل من العناصر (حسب وسوم الموقع المصدر)
    $('iframe').each((index, element) => {
      const src = $(element).attr('src');
      if (src) {
        extractedServers.push({
          id: index + 1,
          name: `Server ${index + 1}`,
          url: src.startsWith('//') ? `https:${src}` : src
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
        ? 'تم جلب سيرفرات الحلقة بنجاح 🎬' 
        : 'لم يتم العثور على سيرفرات مباشرة في هذه الصفحة.'
    };

    // حفظ النتيجة في Cache
    cache.set(cacheKey, responseData);

    return res.json({ ...responseData, fromCache: false });

  } catch (error) {
    console.error('Error fetching episode:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ أثناء جلب الحلقة، أو أن الحلقة غير موجودة.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ⚡`);
});
