const axios = require('axios');
const scrapr = require('./scrapr');

// Supported platforms definition
const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', regex: /tiktok\.com/i },
  { id: 'instagram', name: 'Instagram', regex: /instagram\.com/i },
  { id: 'youtube', name: 'YouTube', regex: /youtube\.com|youtu\.be/i },
  { id: 'facebook', name: 'Facebook', regex: /facebook\.com|fb\.watch/i },
  { id: 'twitter', name: 'X (Twitter)', regex: /twitter\.com|x\.com/i },
  { id: 'threads', name: 'Threads', regex: /threads\.net/i },
  { id: 'spotify', name: 'Spotify', regex: /spotify\.com/i },
  { id: 'soundcloud', name: 'SoundCloud', regex: /soundcloud\.com/i },
  { id: 'applemusic', name: 'Apple Music', regex: /music\.apple\.com/i },
  { id: 'pinterest', name: 'Pinterest', regex: /pinterest\.(com|co\.uk|ca|de|fr|jp)|pin\.it/i },
  { id: 'bilibili', name: 'Bilibili', regex: /bilibili\.com|bili\.im/i },
  { id: 'douyin', name: 'Douyin', regex: /douyin\.com/i },
  { id: 'rednote', name: 'RedNote (Xiaohongshu)', regex: /xiaohongshu\.com|xhslink\.com/i },
  { id: 'pixiv', name: 'Pixiv', regex: /pixiv\.net/i },
  { id: 'bandcamp', name: 'Bandcamp', regex: /bandcamp\.com/i },
  { id: 'capcut', name: 'CapCut', regex: /capcut\.com/i },
];

function detectPlatform(url) {
  if (!url || typeof url !== 'string') return null;
  for (const p of PLATFORMS) {
    if (p.regex.test(url)) return p;
  }
  return null;
}

// TikTok TikWM Direct (Fast)
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
        timeout: 12000
      }
    );
    if (res.data && res.data.code === 0 && res.data.data) {
      const d = res.data.data;
      let vid = d.play || d.hdplay || d.wmplay;
      if (vid && !vid.startsWith('http')) {
        vid = 'https://www.tikwm.com' + (vid.startsWith('/') ? '' : '/') + vid;
      }
      let aud = d.music;
      if (aud && !aud.startsWith('http')) {
        aud = 'https://www.tikwm.com' + (aud.startsWith('/') ? '' : '/') + aud;
      }
      return {
        success: true,
        title: d.title || 'TikTok Video',
        videoUrl: vid,
        audioUrl: aud,
        author: d.author ? d.author.nickname : 'TikTok User',
        thumbnail: d.cover
      };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// Universal getdl.space
const BASE_URL = 'https://getdl.space';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'Referer': `${BASE_URL}/id`,
  'Origin': BASE_URL,
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain, */*',
  'Cookie': 'NEXT_LOCALE=id'
};

// Pilih link video/audio dari field "medias" hasil scrape.
function pickMediaUrls(data) {
  let videoUrl = null;
  let audioUrl = null;

  if (data && data.medias && Array.isArray(data.medias) && data.medias.length > 0) {
    const vid = data.medias.find(m => m.type === 'video');
    const aud = data.medias.find(m => m.type === 'audio');
    if (vid) videoUrl = vid.url;
    if (aud) audioUrl = aud.url;

    if (!videoUrl && !audioUrl && data.medias[0] && data.medias[0].url) {
      videoUrl = data.medias[0].url;
    }
  } else if (data && data.url) {
    videoUrl = data.url;
  }

  return { videoUrl, audioUrl };
}

let sessionCache = { sessionId: null, cookieHeader: 'NEXT_LOCALE=id', timestamp: 0 };

async function getSession(force = false) {
  const now = Date.now();
  if (!force && sessionCache.sessionId && (now - sessionCache.timestamp < 20 * 60 * 1000)) {
    return sessionCache;
  }
  try {
    const res = await axios.get(`${BASE_URL}/api/session`, { headers: HEADERS, timeout: 8000 });
    if (res.data && res.data.sessionId) {
      const setCookies = res.headers['set-cookie'] || [];
      const cookieStr = ['NEXT_LOCALE=id', ...setCookies.map(c => c.split(';')[0])].join('; ');
      sessionCache = { sessionId: res.data.sessionId, cookieHeader: cookieStr, timestamp: now };
      return sessionCache;
    }
  } catch (err) {
    // ignore
  }
  return sessionCache;
}

async function downloadGetdl(cleanUrl) {
  try {
    let session = await getSession();
    const makeReq = async (sess) => {
      return await axios.post(
        `${BASE_URL}/api/download`,
        { url: cleanUrl, sessionId: sess.sessionId },
        { headers: { ...HEADERS, 'Cookie': sess.cookieHeader }, timeout: 20000 }
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
      const { videoUrl, audioUrl } = pickMediaUrls(data);

      if (!videoUrl && !audioUrl) {
        return {
          success: false,
          error: 'Server merespons tapi tidak ada link media yang valid ditemukan.'
        };
      }

      return {
        success: true,
        title: data.title || 'Video Downloader Result',
        author: data.author || null,
        videoUrl: videoUrl,
        audioUrl: audioUrl,
        thumbnail: data.thumbnail || null
      };
    }
  } catch (err) {
    // ignore
  }
  return null;
}

// Scrapr Platform Runners
async function runScrapr(platformId, cleanUrl) {
  try {
    switch (platformId) {
      case 'tiktok': {
        // Try scrapr tiktok scrapers
        const scrapers = [scrapr.tiktok.snaptik, scrapr.tiktok.ssstik, scrapr.tiktok.savetik, scrapr.tiktok.tiktokio];
        for (const fn of scrapers) {
          try {
            if (typeof fn === 'function') {
              const res = await fn(cleanUrl);
              if (res) {
                const vid = res.video || res.download || res.url || (res.links && res.links[0] && res.links[0].url);
                const aud = res.audio || res.music;
                if (vid || aud) {
                  return {
                    success: true,
                    title: res.title || 'TikTok Video',
                    videoUrl: vid,
                    audioUrl: aud,
                    author: res.author || res.nickname || null
                  };
                }
              }
            }
          } catch {}
        }
        break;
      }

      case 'instagram': {
        const scrapers = [scrapr.instagram.snapinsta, scrapr.instagram.snapsave, scrapr.instagram.indown, scrapr.instagram.downreels, scrapr.instagram.direct];
        for (const fn of scrapers) {
          try {
            if (typeof fn === 'function') {
              const res = await fn(cleanUrl);
              if (res) {
                const vid = res.video || res.download || (res.media && res.media[0] && res.media[0].url) || (Array.isArray(res) && res[0]?.url) || res.url;
                if (vid) {
                  return {
                    success: true,
                    title: res.title || res.caption || 'Instagram Media',
                    videoUrl: vid,
                    thumbnail: res.thumbnail || res.cover || null
                  };
                }
              }
            }
          } catch {}
        }
        break;
      }

      case 'facebook': {
        const scrapers = [scrapr.facebook.snapsave, scrapr.facebook.fdown];
        for (const fn of scrapers) {
          try {
            if (typeof fn === 'function') {
              const res = await fn(cleanUrl);
              if (res) {
                const vid = res.hd || res.sd || res.video || res.url || (res.links && res.links[0]?.url);
                if (vid) {
                  return {
                    success: true,
                    title: res.title || 'Facebook Video',
                    videoUrl: vid
                  };
                }
              }
            }
          } catch {}
        }
        break;
      }

      case 'twitter': {
        const scrapers = [scrapr.twitter.tweeload, scrapr.twitter.savetwt, scrapr.twitter.tvd, scrapr.twitter.direct];
        for (const fn of scrapers) {
          try {
            if (typeof fn === 'function') {
              const res = await fn(cleanUrl);
              if (res) {
                const vid = res.video || res.download || res.url || (res.media && res.media[0]?.url) || (res.links && res.links[0]?.url);
                if (vid) {
                  return {
                    success: true,
                    title: res.title || res.text || 'Twitter / X Video',
                    videoUrl: vid
                  };
                }
              }
            }
          } catch {}
        }
        break;
      }

      case 'threads': {
        try {
          if (typeof scrapr.threads.threadster === 'function') {
            const res = await scrapr.threads.threadster(cleanUrl);
            if (res) {
              const vid = res.video || res.url || (res.media && res.media[0]?.url);
              if (vid) {
                return {
                  success: true,
                  title: res.title || 'Threads Media',
                  videoUrl: vid
                };
              }
            }
          }
        } catch {}
        break;
      }

      case 'spotify': {
        const scrapers = [scrapr.spotify.spotmate, scrapr.spotify.spotidown, scrapr.spotify.soundloaders];
        for (const fn of scrapers) {
          try {
            if (typeof fn === 'function') {
              const res = await fn(cleanUrl);
              if (res) {
                const aud = res.audio || res.download || res.link || res.url;
                if (aud) {
                  return {
                    success: true,
                    title: res.title || 'Spotify Track',
                    audioUrl: aud,
                    author: res.artist || res.author || null,
                    thumbnail: res.cover || res.thumbnail || null
                  };
                }
              }
            }
          } catch {}
        }
        break;
      }

      case 'soundcloud': {
        try {
          if (typeof scrapr.soundcloud.klickaud === 'function') {
            const res = await scrapr.soundcloud.klickaud(cleanUrl);
            if (res) {
              const aud = res.audio || res.download || res.url;
              if (aud) {
                return {
                  success: true,
                  title: res.title || 'SoundCloud Audio',
                  audioUrl: aud,
                  author: res.artist || null
                };
              }
            }
          }
        } catch {}
        break;
      }

      case 'applemusic': {
        try {
          if (typeof scrapr.applemusic.aplmate === 'function') {
            const res = await scrapr.applemusic.aplmate(cleanUrl);
            if (res) {
              const aud = res.audio || res.download || res.url;
              if (aud) {
                return {
                  success: true,
                  title: res.title || 'Apple Music Track',
                  audioUrl: aud,
                  author: res.artist || null
                };
              }
            }
          }
        } catch {}
        break;
      }

      case 'pinterest': {
        const scrapers = [scrapr.pinterest.pindown, scrapr.pinterest.direct];
        for (const fn of scrapers) {
          try {
            if (typeof fn === 'function') {
              const res = await fn(cleanUrl);
              if (res) {
                const vid = res.video || res.download || res.image || res.url;
                if (vid) {
                  return {
                    success: true,
                    title: res.title || 'Pinterest Media',
                    videoUrl: vid
                  };
                }
              }
            }
          } catch {}
        }
        break;
      }

      case 'bilibili': {
        const scrapers = [scrapr.bilibili.snapwc, scrapr.bilibili.direct];
        for (const fn of scrapers) {
          try {
            if (typeof fn === 'function') {
              const res = await fn(cleanUrl);
              if (res) {
                const vid = res.video || res.download || res.url;
                if (vid) {
                  return {
                    success: true,
                    title: res.title || 'Bilibili Video',
                    videoUrl: vid
                  };
                }
              }
            }
          } catch {}
        }
        break;
      }

      case 'youtube': {
        const scrapers = [scrapr.youtube.ytmp3, scrapr.youtube.ytmp3gg];
        for (const fn of scrapers) {
          try {
            if (typeof fn === 'function') {
              const res = await fn(cleanUrl);
              if (res) {
                const aud = res.audio || res.download || res.url;
                const vid = res.video;
                if (aud || vid) {
                  return {
                    success: true,
                    title: res.title || 'YouTube Media',
                    audioUrl: aud,
                    videoUrl: vid
                  };
                }
              }
            }
          } catch {}
        }
        break;
      }

      case 'douyin': {
        try {
          if (typeof scrapr.douyin.direct === 'function') {
            const res = await scrapr.douyin.direct(cleanUrl);
            if (res) {
              const vid = res.video || res.download || res.url;
              if (vid) {
                return {
                  success: true,
                  title: res.title || 'Douyin Video',
                  videoUrl: vid
                };
              }
            }
          }
        } catch {}
        break;
      }

      case 'rednote': {
        try {
          if (typeof scrapr.rednote.direct === 'function') {
            const res = await scrapr.rednote.direct(cleanUrl);
            if (res) {
              const vid = res.video || res.download || res.url || (res.images && res.images[0]);
              if (vid) {
                return {
                  success: true,
                  title: res.title || 'RedNote Post',
                  videoUrl: vid
                };
              }
            }
          }
        } catch {}
        break;
      }

      case 'bandcamp': {
        try {
          if (typeof scrapr.bandcamp.bandcampdownloader === 'function') {
            const res = await scrapr.bandcamp.bandcampdownloader(cleanUrl);
            if (res) {
              const aud = res.audio || res.download || res.url;
              if (aud) {
                return {
                  success: true,
                  title: res.title || 'Bandcamp Audio',
                  audioUrl: aud
                };
              }
            }
          }
        } catch {}
        break;
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

// Master Media Downloader
async function downloadMedia(targetUrl) {
  const cleanUrl = targetUrl.trim();
  const platform = detectPlatform(cleanUrl);
  const platformName = platform ? platform.name : 'Universal Media';

  // 1. TikTok special fast direct
  if (platform && platform.id === 'tiktok') {
    const tikwmRes = await downloadTikTokTikwm(cleanUrl);
    if (tikwmRes && (tikwmRes.videoUrl || tikwmRes.audioUrl)) {
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

  // 2. Try scrapr modules
  if (platform) {
    const scraprRes = await runScrapr(platform.id, cleanUrl);
    if (scraprRes && (scraprRes.videoUrl || scraprRes.audioUrl)) {
      return {
        success: true,
        platform: platformName,
        title: scraprRes.title || `${platformName} Media`,
        videoUrl: scraprRes.videoUrl,
        audioUrl: scraprRes.audioUrl,
        author: scraprRes.author || null,
        thumbnail: scraprRes.thumbnail || null
      };
    }
  }

  // 3. Fallback to getdl.space
  const getdlRes = await downloadGetdl(cleanUrl);
  if (getdlRes && (getdlRes.videoUrl || getdlRes.audioUrl)) {
    return {
      success: true,
      platform: platformName,
      title: getdlRes.title,
      videoUrl: getdlRes.videoUrl,
      audioUrl: getdlRes.audioUrl,
      thumbnail: getdlRes.thumbnail
    };
  }

  return {
    success: false,
    error: 'Gagal mengekstrak media. Pastikan link bersifat publik, valid, dan bukan akun private.'
  };
}

module.exports = {
  PLATFORMS,
  detectPlatform,
  downloadMedia,
  pickMediaUrls
};
