const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// إعداد التخزين المؤقت: الاحتفاظ بالبيانات لمدة 24 ساعة (86400 ثانية)
const cache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

// إعدادات طلبات الشبكة مع مهلة زمنية (Timeout) لحماية السيرفر
const axiosInstance = axios.create({
  timeout: 10000, // مهلة 10 ثوانٍ كحد أقصى
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

// 1. الصفحة الرئيسية للتأكد من تشغيل السيرفر
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: '🚀 OtakuHub Light Backend with Cache & Protection is Running!' 
  });
});

// 2. نقطة جلب الحلقة مع معالجة الأخطاء والتخزين المؤقت
app.get('/api/get-episode', async (req, res) => {
  try {
    const { anime, episode } = req.query;

    // معالجة الأخطاء: التحقق من وجود المدخلات
    if (!anime || !episode) {
      return res.status(400).json({ 
        success: false, 
        error: 'يرجى تزويد اسم الأنمي ورقم الحلقة بشكل صحيح.' 
      });
    }

    // تنظيف المدخلات
    const cleanAnime = String(anime).trim().toLowerCase();
    const cleanEpisode = String(episode).trim();

    // إنشاء مفتاح فريد للتخزين المؤقت
    const cacheKey = `ep_${cleanAnime}_${cleanEpisode}`;

    // التحقق ممّا إذا كانت الحلقة مخرّنة مسبقاً في الذاكرة (Cache)
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`⚡ تم إرجاع البيانات من التخزين المؤقت لـ: ${cacheKey}`);
      return res.json({
        ...cachedData,
        fromCache: true
      });
    }

    // بناء كائن النتيجة (سيتم إضافة جلب الروابط الحقيقية هنا في الخطوة القادمة)
    const responseData = {
      success: true,
      anime: cleanAnime,
      episode: cleanEpisode,
      servers: [],
      message: 'تم تجهيز نظام التخزين المؤقت والحماية بنجاح ⚡'
    };

    // حفظ النتيجة في التخزين المؤقت
    cache.set(cacheKey, responseData);

    return res.json({
      ...responseData,
      fromCache: false
    });

  } catch (error) {
    // معالجة أخطاء السيرفر لمنع انهياره
    console.error('Error handling request:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ داخلي في السيرفر، يرجى المحاولة لاحقاً.' 
    });
  }
});

// 3. تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Server running with Cache on port ${PORT} ⚡`);
});
