const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🧠 إعادة استخدام المتصفح لزيادة السرعة
let globalBrowser = null;

async function getBrowserInstance() {
  if (globalBrowser && globalBrowser.isConnected()) {
    return globalBrowser;
  }
  
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
      '--single-process',
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: executablePath,
    headless: chromium.headless,
  });

  return globalBrowser;
}

// 🟢 فحص صحة الخادم
app.get('/', (req, res) => {
  res.json({ success: true, message: '🚀 OtakuHub Backend Server is Running!' });
});

// 🎬 API جلب رابط الحلقة المتوافق مع التطبيق
app.get('/api/get-episode', async (req, res) => {
  const { anime, episode, targetUrl } = req.query;

  // حدد الرابط المستهدف: إما المرسل مباشرة من التطبيق أو بناء رابط تلقائي
  let finalUrl = targetUrl;
  if (!finalUrl) {
    if (!anime || !episode) {
      return res.status(400).json({ success: false, error: 'يرجى تزويد اسم الأنمي ورقم الحلقة أو الرابط المباشر.' });
    }
    const formattedAnime = anime.trim().toLowerCase().replace(/\s+/g, '-');
    finalUrl = `https://www.animenest.co/anime/${formattedAnime}/episode/${episode}`;
  }

  let page = null;
  try {
    const browser = await getBrowserInstance();
    page = await browser.newPage();

    // ⚡ تسريع التصفح وحجب الصور والإعلانات الثقيلة
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

    let streamUrl = null;

    // 🔄 البحث الذكي عن الـ iframe الخاص بمشغل الفيديو
    for (let attempt = 1; attempt <= 3; attempt++) {
      streamUrl = await page.evaluate(() => {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        for (const iframe of iframes) {
          const src = iframe.src || iframe.getAttribute('data-src');
          if (src && (src.includes('embed') || src.includes('player') || src.includes('stream') || src.includes('http'))) {
            return src;
          }
        }
        return null;
      });

      if (streamUrl) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await page.close();

    if (streamUrl) {
      return res.json({
        success: true,
        anime: anime || 'Dynamic',
        episode: episode || 'Dynamic',
        streamUrl: streamUrl,
      });
    } else {
      return res.status(444).json({ success: false, error: 'لم يتم العثور على مشغل فيديو صالح في هذه الصفحة.' });
    }

  } catch (error) {
    if (page) await page.close().catch(() => {});
    console.error('Extraction Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 🚀 تشغيل الخادم
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await getBrowserInstance();
    console.log('🚀 Puppeteer Browser Initialized Successfully!');
  } catch (e) {
    console.error('Error Initializing Browser:', e.message);
  }
});
