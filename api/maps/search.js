// api/maps/search.js
// Google Places Text Search API

export default async function handler(req, res) {
  // 設置 CORS 標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { query, location, radius = 5000 } = req.body;

    // 驗證必要參數
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: query'
      });
    }

    // 獲取 Google Maps API Key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Google Maps API key not configured'
      });
    }

    // 建立搜尋 URL
    let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
      `query=${encodeURIComponent(query)}&` +
      `key=${apiKey}`;

    // 如果有提供位置，加入位置參數
    if (location && location.lat && location.lng) {
      searchUrl += `&location=${location.lat},${location.lng}&radius=${radius}`;
    }

    // 調用 Google Places Text Search API
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places Text Search API error:', data);
      return res.status(500).json({
        success: false,
        error: `Google Places API error: ${data.status}`
      });
    }

    // 處理搜尋結果
    const results = data.results ? data.results.slice(0, 10).map(place => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      geometry: {
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        }
      },
      rating: place.rating || 4.0,
      types: place.types,
      opening_hours: place.opening_hours,
      photos: place.photos ? place.photos.slice(0, 1) : undefined,
      business_status: place.business_status
    })) : [];

    return res.status(200).json({
      success: true,
      count: results.length,
      results: results,
      status: data.status
    });

  } catch (error) {
    console.error('Text search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
