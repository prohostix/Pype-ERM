const baseUrl1 = '/api/v1';
const baseUrl2 = 'http://localhost:5000/api/v1';

const url1 = '/api/v1/uploads/123.jpg';
const url2 = '/uploads/123.jpg';

function resolve(url, baseUrl) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    
    let origin = '';
    let apiPath = baseUrl;
    
    if (baseUrl.startsWith('http')) {
      try {
        const parsed = new URL(baseUrl);
        origin = parsed.origin;
        apiPath = parsed.pathname;
      } catch (e) {}
    }
    
    if (apiPath && url.startsWith(apiPath)) {
      return origin ? `${origin}${url}` : url;
    }
    
    return `${baseUrl}${url}`;
}

console.log("baseUrl1 + url1:", resolve(url1, baseUrl1));
console.log("baseUrl1 + url2:", resolve(url2, baseUrl1));
console.log("baseUrl2 + url1:", resolve(url1, baseUrl2));
console.log("baseUrl2 + url2:", resolve(url2, baseUrl2));
