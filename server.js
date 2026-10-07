const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 1. الصفحة الرئيسية للتأكد من تشغيل السيرفر
app.get('/', (req, res) => {
  res.json({ success: true, message: '🚀 OtakuHub Light Backend is Running!' });
});

// 2. نقطة جلب الحلقة والروابط
app.get('/api/get-episode', async (req, res) => {
  const { anime, episode } = req.query;

  if (!anime || !episode) {
    return res.status(400).json({ 
      success: false, 
      error: 'يرجى تزويد اسم الأنمي ورقم الحلقة.' 
    });
  }

  try {
    // سنضع منطق جلب سيرفرات المشاهدة المباشرة بـ axios هنا
    res.json({ 
      success: true, 
      anime: anime,
      episode: episode,
      message: 'السيرفر جاهز ومرتبط بالمكتبات الخفيفة بنجاح ⚡' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Server running smoothly on port ${PORT} ⚡`);
});
