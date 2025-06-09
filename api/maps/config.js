// api/maps/config.js
// 提供 Google Maps API 配置

export default function handler(req, res) {
  // 設置 CORS 標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允許 GET 請求
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // 從環境變數獲取 Google Maps API Key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Google Maps API key not configured'
      });
    }

    // 返回包含 API Key 的 Google Maps 載入 URL
    const mapsApiUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;

    return res.status(200).json({
      success: true,
      mapsApiUrl: mapsApiUrl
    });

  } catch (error) {
    console.error('Maps config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
