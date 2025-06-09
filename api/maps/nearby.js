// api/maps/nearby.js
// Google Places Nearby Search API

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
    const { lat, lng, radius = 2000, type = 'toilet' } = req.body;

    // 驗證必要參數
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: lat, lng'
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

    // 建立 Google Places Nearby Search 請求
    const location = `${lat},${lng}`;
    
    // 多個類型的搜尋，提高找到廁所的機會
    const searchTypes = [
      'toilet',
      'gas_station',
      'convenience_store', 
      'shopping_mall',
      'restaurant',
      'subway_station',
      'train_station'
    ];

    const keyword = 'toilet restroom 廁所 化妝室';
    
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${location}&` +
      `radius=${radius}&` +
      `type=${searchTypes.join('|')}&` +
      `keyword=${encodeURIComponent(keyword)}&` +
      `key=${apiKey}`;

    // 調用 Google Places API
    const response = await fetch(placesUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data);
      return res.status(500).json({
        success: false,
        error: `Google Places API error: ${data.status}`
      });
    }

    // 處理搜尋結果
    const places = data.results ? data.results.slice(0, 15).map(place => ({
      place_id: place.place_id,
      name: place.name,
      geometry: {
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        }
      },
      rating: place.rating || 4.0,
      types: place.types,
      vicinity: place.vicinity,
      opening_hours: place.opening_hours,
      photos: place.photos ? place.photos.slice(0, 1) : undefined,
      business_status: place.business_status
    })) : [];

    return res.status(200).json({
      success: true,
      count: places.length,
      places: places,
      status: data.status
    });

  } catch (error) {
    console.error('Nearby search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
