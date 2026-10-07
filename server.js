const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// الصفحة الرئيسية للتأكد من عمل السيرفر
app.get('/', (req, res) => {
  res.json({ success: true, message: '🚀 OtakuHub Light Backend is Running!' });
});

// نقطة جلب الحلقة
app.get('/api/get-episode', async (req, res) => {
  const { anime, episode } = req.query;

  if (!anime || !episode) {
    return res.status(400).json({ success: false, error: 'يرجى تقديم اسم الأنمي ورقم الحلقة.' });
  }

  try {
    // سنقوم بإضافة المنطق المباشر للجلب هنا
    res.json({ success: true, message: 'جاهز لإضافة مصدر البيانات المباشر' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running smoothly on port ${PORT} ⚡`);
});
