// 台灣主要廁所數據
const DEFAULT_TOILETS = [
  {
    id: "taipei_main_station",
    name: "台北車站B1公廁",
    lat: 25.0478,
    lng: 121.517,
    rating: 4.5,
    gymLevel: 5,
    type: "train_station",
    speciality: "皮皮星人總部道館",
    facilities: ["無障礙", "親子", "乾淨", "有紙", "24小時"],
    champions: [
      { name: "皮皮大師", score: 156, avatar: "😎", timestamp: Date.now() },
      { name: "廁所之神", score: 142, avatar: "🐱", timestamp: Date.now() },
      { name: "清潔勇者", score: 128, avatar: "😊", timestamp: Date.now() },
    ],
    verified: true,
    lastUpdated: Date.now()
  },
  {
    id: "ximending",
    name: "西門町公廁",
    lat: 25.0422,
    lng: 121.5081,
    rating: 4.2,
    gymLevel: 3,
    type: "public_toilet",
    speciality: "皮皮星人聚集地",
    facilities: ["24小時", "乾淨", "有紙"],
    champions: [
      { name: "夜貓皮皮", score: 98, avatar: "🌙", timestamp: Date.now() },
      { name: "購物皮皮", score: 87, avatar: "🛍️", timestamp: Date.now() },
    ],
    verified: true,
    lastUpdated: Date.now()
  },
  {
    id: "taipei_101",
    name: "台北101購物中心",
    lat: 25.0340,
    lng: 121.5645,
    rating: 4.8,
    gymLevel: 5,
    type: "shopping_mall",
    speciality: "皮皮星人天空道館",
    facilities: ["豪華", "音樂", "香氛", "免治馬桶", "嬰兒台", "化妝台"],
    champions: [
      { name: "天空皮皮", score: 189, avatar: "🏢", timestamp: Date.now() },
      { name: "奢華皮皮", score: 167, avatar: "💎", timestamp: Date.now() },
      { name: "高塔皮皮", score: 154, avatar: "🗼", timestamp: Date.now() },
    ],
    verified: true,
    lastUpdated: Date.now()
  },
  {
    id: "shilin_night_market",
    name: "士林夜市公廁",
    lat: 25.0881,
    lng: 121.5247,
    rating: 3.8,
    gymLevel: 2,
    type: "night_market",
    speciality: "皮皮星人夜市道館",
    facilities: ["夜間開放", "小吃附近"],
    champions: [
      { name: "夜市皮皮", score: 76, avatar: "🍜", timestamp: Date.now() },
      { name: "小吃皮皮", score: 65, avatar: "🥟", timestamp: Date.now() },
    ],
    verified: true,
    lastUpdated: Date.now()
  }
];

export default async function handler(req, res) {
  // 設定 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { lat, lng, radius = 2000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: '需要提供經緯度' });
    }

    // 計算距離函數
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c * 1000;
    };

    // 過濾附近的廁所
    const nearbyToilets = DEFAULT_TOILETS.filter(toilet => {
      const distance = calculateDistance(
        parseFloat(lat), parseFloat(lng),
        toilet.lat, toilet.lng
      );
      return distance <= parseFloat(radius);
    }).map(toilet => ({
      ...toilet,
      distance: calculateDistance(
        parseFloat(lat), parseFloat(lng),
        toilet.lat, toilet.lng
      ),
      isNearby: calculateDistance(
        parseFloat(lat), parseFloat(lng),
        toilet.lat, toilet.lng
      ) <= 100
    })).sort((a, b) => a.distance - b.distance);

    // 格式化距離顯示
    const formattedToilets = nearbyToilets.map(toilet => ({
      ...toilet,
      distanceText: toilet.distance < 1000 
        ? `${Math.round(toilet.distance)}m` 
        : `${(toilet.distance/1000).toFixed(1)}km`
    }));

    res.status(200).json({
      success: true,
      toilets: formattedToilets,
      count: formattedToilets.length,
      searchLocation: { lat: parseFloat(lat), lng: parseFloat(lng) }
    });

  } catch (error) {
    console.error('搜尋廁所錯誤:', error);
    res.status(500).json({ 
      error: '搜尋失敗',
      toilets: DEFAULT_TOILETS
    });
  }
}
