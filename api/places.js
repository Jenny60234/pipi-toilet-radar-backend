// /api/places.js - Google Places API代理
export default async function handler(req, res) {
  // 設定CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { lat, lng, radius = 5000 } = req.query;
  const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  // 檢查必要參數
  if (!lat || !lng) {
    return res.status(400).json({ 
      success: false, 
      error: '缺少位置參數' 
    });
  }

  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'Google API金鑰未設定' 
    });
  }

  try {
    // 呼叫Google Places API
    const googleResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${lat},${lng}&` +
      `radius=${radius}&` +
      `type=toilet&` +
      `keyword=廁所 公廁 洗手間&` +
      `language=zh-TW&` +
      `key=${GOOGLE_API_KEY}`
    );
    
    const data = await googleResponse.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google API錯誤: ${data.status}`);
    }

    // 計算距離函數
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // 地球半徑(公里)
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      if (distance < 1) {
        return `${Math.round(distance * 1000)}m`;
      } else {
        return `${distance.toFixed(1)}km`;
      }
    };

    // 處理回傳的資料
    const places = data.results?.slice(0, 15).map(place => ({
      place_id: place.place_id,
      name: place.name,
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
      rating: place.rating || 4.0,
      address: place.vicinity || place.formatted_address,
      distance: calculateDistance(
        parseFloat(lat), 
        parseFloat(lng), 
        place.geometry?.location?.lat, 
        place.geometry?.location?.lng
      ),
      photo_reference: place.photos?.[0]?.photo_reference,
      opening_hours: place.opening_hours?.open_now,
      price_level: place.price_level,
      types: place.types
    })) || [];

    // 回傳成功結果
    res.json({
      success: true,
      count: places.length,
      places: places,
      status: data.status
    });

  } catch (error) {
    console.error('Google Places API錯誤:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
