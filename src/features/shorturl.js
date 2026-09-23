const axios = require('axios');

async function shortenWithIsGd(longUrl) {
  const res = await axios.get('https://is.gd/create.php', {
    params: { format: 'json', url: longUrl },
    timeout: 10000
  });
  if (res.data && res.data.shorturl) {
    return res.data.shorturl;
  }
  throw new Error(res.data.errormessage || 'is.gd failed');
}

async function shortenWithTinyUrl(longUrl) {
  const res = await axios.get('https://tinyurl.com/api-create.php', {
    params: { url: longUrl },
    timeout: 10000
  });
  if (typeof res.data === 'string' && res.data.startsWith('http')) {
    return res.data.trim();
  }
  throw new Error('TinyURL failed');
}

async function shortenWithCleanUri(longUrl) {
  const res = await axios.post('https://cleanuri.com/api/v1/shorten', {
    url: longUrl
  }, {
    timeout: 10000
  });
  if (res.data && res.data.result_url) {
    return res.data.result_url;
  }
  throw new Error('CleanURI failed');
}

async function shortenUrl(url) {
  const clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    throw new Error('URL harus diawali dengan http:// atau https://');
  }

  // Coba is.gd terlebih dahulu
  try {
    const short = await shortenWithIsGd(clean);
    return { success: true, shortUrl: short, provider: 'is.gd' };
  } catch (err1) {
    // Fallback TinyURL
    try {
      const short = await shortenWithTinyUrl(clean);
      return { success: true, shortUrl: short, provider: 'TinyURL' };
    } catch (err2) {
      // Fallback CleanURI
      try {
        const short = await shortenWithCleanUri(clean);
        return { success: true, shortUrl: short, provider: 'CleanURI' };
      } catch (err3) {
        return { success: false, error: 'Semua layanan shortlink sedang sibuk. Coba lagi nanti.' };
      }
    }
  }
}

module.exports = {
  shortenUrl
};
