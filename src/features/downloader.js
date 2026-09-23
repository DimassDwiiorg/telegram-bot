const axios = require('axios');

// Supported platforms
const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', regex: /tiktok\.com/i },
  { id: 'instagram', name: 'Instagram', regex: /instagram\.com/i },
  { id: 'youtube', name: 'YouTube', regex: /youtube\.com|youtu\.be/i },
  { id: 'facebook', name: 'Facebook', regex: /facebook\.com|fb\.watch/i },
  { id: 'twitter', name: 'X (Twitter)', regex: /twitter\.com|x\.com/i },
  { id: 'threads', name: 'Threads', regex: /threads\.net/i },
  { id: 'capcut', name: 'CapCut', regex: /capcut\.com/i },
  { id: 'spotify', name: 'Spotify', regex: /spotify\.com/i },
  { id: 'pinterest', name: 'Pinterest', regex: /pinterest\.(com|co\.uk|ca|de|fr|jp)/i }
];

function detectPlatform(url) {
  if (!url || typeof url !== 'string') return null;
  for (const p of PLATFORMS) {
    if (p.regex.test(url)) return p;
  }
  return null;
}

// Scraper getdl.space
const BASE_URL = 'https://getdl.space';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'Referer': `${BASE_URL}/id`,
  'Origin': BASE_URL,
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain, */*',
  'Cookie': 'NEXT_LOCALE=id'
};

let sessionCache = {
  sessionId: null,
  cookieHeader: 'NEXT_LOCALE=id',
  timestamp: 0
};

async function getSession(force = false) {
  const now = Date.now();
  if (!force && sessionCache.sessionId && (now - sessionCache.timestamp < 20 * 60 * 1000)) {
    return sessionCache;
  }
  try {
    const res = await axios.get(`${BASE_URL}/api/session`, {
      headers: HEADERS,
      timeout: 10000
    });
    if (res.data && res.data.sessionId) {
      const setCookies = res.headers['set-cookie'] || [];
      const cookieStr = ['NEXT_LOCALE=id', ...setCookies.map(c => c.split(';')[0])].join('; ');
      sessionCache = {
        sessionId: res.data.sessionId,
        cookieHeader: cookieStr,
        timestamp: now
      };
      return sessionCache;
    }
  } catch (err) {
    console.error('[Session Error]', err.message);
  }
  return sessionCache;
}

// TikTok TikWM Direct Fallback (Super fast & reliable for TikTok)
async function downloadTikTokTikwm(url) {
  try {
    const res = await axios.post(
      'https://www.tikwm.com/api/',
      new URLSearchParams({ url: url, count: 12, cursor: 0, web: 1, hd: 1 }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 15000
      }
    );
    if (res.data && res.data.code === 0 && res.data.data) {
      const d = res.data.data;
      return {
        success: true,
        title: d.title || 'TikTok Video',
        videoUrl: d.play || d.hdplay || d.wmplay,
        audioUrl: d.music,
        author: d.author ? d.author.nickname : 'TikTok User',
        thumbnail: d.cover
      };
    }
  } catch (e) {
    console.error('[TikWM Error]', e.message);
  }
  return null;
}

// Universal Scraper
async function downloadMedia(targetUrl) {
  const cleanUrl = targetUrl.trim();
  const platform = detectPlatform(cleanUrl);

  // If TikTok, try TikWM first for ultra-fast response
  if (platform && platform.id === 'tiktok') {
    const tikwmRes = await downloadTikTokTikwm(cleanUrl);
    if (tikwmRes && tikwmRes.videoUrl) {
      return {
        success: true,
        platform: 'TikTok',
        title: tikwmRes.title,
        videoUrl: tikwmRes.videoUrl,
        audioUrl: tikwmRes.audioUrl,
        author: tikwmRes.author,
        thumbnail: tikwmRes.thumbnail
      };
    }
  }

  // Try Universal getdl.space
  try {
    let session = await getSession();
    const makeReq = async (sess) => {
      return await axios.post(
        `${BASE_URL}/api/download`,
        { url: cleanUrl, sessionId: sess.sessionId },
        {
          headers: { ...HEADERS, 'Cookie': sess.cookieHeader },
          timeout: 25000
        }
      );
    };

    let res;
    try {
      res = await makeReq(session);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.code === 'SESSION_REQUIRED') {
        session = await getSession(true);
        res = await makeReq(session);
      } else {
        throw err;
      }
    }

    if (res.data && res.data.success && res.data.data) {
      const data = res.data.data;
      // Extract video stream or download link
      let videoUrl = null;
      let audioUrl = null;

      if (data.medias && Array.isArray(data.medias)) {
        const vid = data.medias.find(m => m.type === 'video') || data.medias[0];
        if (vid) videoUrl = vid.url;
        const aud = data.medias.find(m => m.type === 'audio');
        if (aud) audioUrl = aud.url;
      } else if (data.url) {
        videoUrl = data.url;
      }

      return {
        success: true,
        platform: platform ? platform.name : 'All Platform',
        title: data.title || 'Video Downloader Result',
        videoUrl: videoUrl,
        audioUrl: audioUrl,
        thumbnail: data.thumbnail || null
      };
    }
  } catch (err) {
    console.error('[Download Media Error]', err.message);
  }

  return {
    success: false,
    error: 'Gagal mengekstrak video. Pastikan link bersifat publik dan bukan akun private.'
  };
}

module.exports = {
  detectPlatform,
  downloadMedia
};
