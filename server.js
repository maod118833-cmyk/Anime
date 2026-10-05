const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

app.get('/', (req, res) => {
  res.json({ success: true, message: '🚀 OtakuHub Backend Server is Running!' });
});

app.get('/api/get-episode', async (req, res) => {
  const { anime, episode, targetUrl } = req.query;

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

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.goto(finalUrl, { waitUntil: 'networkidle2', timeout: 35000 });

    let serversList = [];

    // 🔄 استخراج جميع السيرفرات والمشغلات المتاحة في الصفحة
    for (let attempt = 1; attempt <= 3; attempt++) {
      serversList = await page.evaluate(() => {
        const results = [];
        const iframes = Array.from(document.querySelectorAll('iframe'));

        iframes.forEach((iframe, index) => {
          const src = iframe.src || iframe.getAttribute('data-src') || iframe.getAttribute('src');
          if (src && (src.includes('embed') || src.includes('player') || src.includes('stream') || src.startsWith('http'))) {
            // التمييز الافتراضي للسيرفر بناءً على الرابط أو الترتيب
            let name = `Server ${index + 1}`;
            if (src.includes('4shared')) name = '4Shared Server';
            else if (src.includes('dood') || src.includes('ds251')) name = 'DoodStream';
            else if (src.includes('mega')) name = 'Mega Server';
            else if (src.includes('drive')) name = 'Google Drive';

            results.push({
              name: name,
              url: src,
              quality: 'Auto / Multi-Quality'
            });
          }
        });

        return results;
      });

      if (serversList.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    await page.close();

    if (serversList.length > 0) {
      return res.json({
        success: true,
        anime: anime || 'DirectLink',
        episode: episode || 'DirectLink',
        defaultStreamUrl: serversList[0].url,
        servers: serversList
      });
    } else {
      return res.status(444).json({ success: false, error: 'لم يتم العثور على مشغلات فيديو صالحة في هذه الصفحة.' });
    }

  } catch (error) {
    if (page) await page.close().catch(() => {});
    console.error('Extraction Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await getBrowserInstance();
    console.log('🚀 Puppeteer Browser Initialized Successfully!');
  } catch (e) {
    console.error('Error Initializing Browser:', e.message);
  }
});
