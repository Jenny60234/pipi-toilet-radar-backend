// 廁所雷達LINE Bot - Railway部署版本
console.log('🚀 廁所雷達啟動中...');

const express = require('express');
const line = require('@line/bot-sdk');
const mongoose = require('mongoose');

const app = express();

// LINE Bot設定 - 使用環境變數或硬編碼
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'JN2ttzGlu+Z21EVXyJImNcti+I3QUgFEbsZs9RbLdFlpTy9BRWR5ZGYhrSQ6zQust5M46BPIJ49GsisRz2ZtsZHFWVS4uiKt228nhrRINpbogU2F6uCCbyx4RBSNpLKz5K/7K7WYTWRsy8RtKU1SzwdB04t89/10/w1cDnyilFU=',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '03427c71d01d38e575c143df3e2c7a8'
};

const client = new line.Client(config);

// MongoDB連接 - 使用環境變數或硬編碼
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://dssh30906:0Zb2JSUrEFbN5SIH@toilet-radar.natezpn.mongodb.net/toilet-radar?retryWrites=true&w=majority&appName=toilet-radar';

mongoose.connect(mongoUri)
  .then(() => console.log('🍃 MongoDB連接成功！'))
  .catch(err => {
    console.error('❌ MongoDB連接失敗：', err);
    // 不要讓程式停止，繼續運行
  });

// 用戶資料模型
const UserSchema = new mongoose.Schema({
  lineUserId: { type: String, unique: true, required: true },
  displayName: String,
  gameProfile: {
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    coins: { type: Number, default: 100 },
    totalCheckIns: { type: Number, default: 0 },
    class: { type: String, default: 'explorer' }
  },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// 廁所資料模型
const ToiletSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String
  },
  facilities: {
    hasToiletPaper: { type: Boolean, default: false },
    hasAirCon: { type: Boolean, default: false },
    isAccessible: { type: Boolean, default: false },
    isFree: { type: Boolean, default: true }
  },
  businessHours: {
    open: String,
    close: String,
    isOpen24h: { type: Boolean, default: false }
  },
  ratings: {
    cleanliness: { type: Number, default: 3.0 },
    comfort: { type: Number, default: 3.0 },
    totalReviews: { type: Number, default: 0 }
  },
  gameInfo: {
    level: { type: String, enum: ['bronze', 'silver', 'gold', 'diamond', 'legendary'], default: 'bronze' },
    currentOwner: String,
    checkInCount: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

const Toilet = mongoose.model('Toilet', ToiletSchema);

// 簽到記錄模型
const CheckInSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  toiletId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  experience: { type: Number, default: 10 },
  coins: { type: Number, default: 5 }
});

const CheckIn = mongoose.model('CheckIn', CheckInSchema);

// 工具函數：計算距離
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// 獲取或創建用戶 - 加入錯誤處理
async function getOrCreateUser(lineUserId, displayName) {
  try {
    let user = await User.findOne({ lineUserId });
    
    if (!user) {
      user = new User({
        lineUserId,
        displayName,
        gameProfile: {
          level: 1,
          experience: 0,
          coins: 100,
          totalCheckIns: 0,
          class: 'explorer'
        }
      });
      await user.save();
      
      // 發送歡迎訊息
      const welcomeMessage = {
        type: 'text',
        text: `🎉 歡迎加入廁所雷達！\n\n你現在是探索者新手！\n🎁 新手禮包：\n🪙 衛生幣 x100\n⭐ Lv.1 探索者\n\n開始你的衛生戰士之旅吧！`
      };
      
      await client.pushMessage(lineUserId, welcomeMessage);
    }
    
    user.lastActive = new Date();
    await user.save();
    
    return user;
  } catch (error) {
    console.error('用戶處理錯誤:', error);
    // 返回基本用戶資料
    return {
      lineUserId,
      displayName,
      gameProfile: { level: 1, experience: 0, coins: 100, totalCheckIns: 0, class: 'explorer' }
    };
  }
}

// 尋找附近廁所
async function findNearbyToilets(lat, lng, radius = 1000) {
  try {
    // 基本的地理範圍查詢  
    const toilets = await Toilet.find({
      'location.lat': {
        $gte: lat - (radius / 111000),
        $lte: lat + (radius / 111000)
      },
      'location.lng': {
        $gte: lng - (radius / (111000 * Math.cos(lat * Math.PI / 180))),
        $lte: lng + (radius / (111000 * Math.cos(lat * Math.PI / 180)))
      }
    });

    // 計算距離並排序
    const toiletsWithDistance = toilets.map(toilet => ({
      ...toilet.toObject(),
      distance: calculateDistance(lat, lng, toilet.location.lat, toilet.location.lng)
    })).filter(toilet => toilet.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return toiletsWithDistance.slice(0, 5);
  } catch (error) {
    console.error('尋找廁所錯誤:', error);
    return [];
  }
}

// 創建廁所資訊卡片
function createToiletCard(toilet) {
  const facilitiesText = [
    toilet.facilities.hasToiletPaper ? '✅衛生紙' : '❌衛生紙',
    toilet.facilities.hasAirCon ? '✅冷氣' : '❌冷氣',
    toilet.facilities.isAccessible ? '✅無障礙' : '',
    toilet.facilities.isFree ? '✅免費' : '💰付費'
  ].filter(Boolean).join(' ');

  const distanceText = toilet.distance ? `📍 ${Math.round(toilet.distance)}公尺` : '';

  return {
    type: 'flex',
    altText: toilet.name,
    contents: {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": toilet.name,
            "weight": "bold",
            "size": "xl",
            "wrap": true
          },
          {
            "type": "text",
            "text": distanceText,
            "size": "sm",
            "color": "#999999"
          },
          {
            "type": "separator",
            "margin": "md"
          },
          {
            "type": "text",
            "text": `⭐ ${toilet.ratings.cleanliness}/5 (${toilet.ratings.totalReviews}評價)`,
            "size": "sm",
            "margin": "md"
          },
          {
            "type": "text",
            "text": facilitiesText,
            "size": "sm",
            "wrap": true,
            "margin": "md"
          },
          {
            "type": "text",
            "text": toilet.businessHours.isOpen24h ? "🕒 24小時營業" : `🕒 ${toilet.businessHours.open}-${toilet.businessHours.close}`,
            "size": "sm",
            "margin": "md"
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "button",
            "action": {
              "type": "uri",
              "label": "🗺️ 導航",
              "uri": `https://www.google.com/maps/dir/?api=1&destination=${toilet.location.lat},${toilet.location.lng}`
            },
            "style": "primary"
          },
          {
            "type": "button",
            "action": {
              "type": "postback",
              "label": "⭐ 簽到",
              "data": `action=checkin&toiletId=${toilet._id}`
            },
            "margin": "sm"
          }
        ]
      }
    }
  };
}

// 處理LINE訊息 - 加強錯誤處理
async function handleEvent(event) {
  if (event.type !== 'message' && event.type !== 'postback') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  
  try {
    // 獲取用戶資料
    const profile = await client.getProfile(userId);
    const user = await getOrCreateUser(userId, profile.displayName);

    if (event.type === 'message') {
      if (event.message.type === 'text') {
        const messageText = event.message.text.toLowerCase();

        if (messageText.includes('找廁所') || messageText.includes('廁所')) {
          return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '🔍 請分享你的位置，我來幫你找附近最棒的廁所！',
            quickReply: {
              items: [
                {
                  type: 'location',
                  action: {
                    type: 'location',
                    label: '📍 分享位置'
                  }
                }
              ]
            }
          });
        }

        if (messageText.includes('我的資料') || messageText.includes('個人資料')) {
          const profileMessage = {
            type: 'text',
            text: `👤 ${user.displayName}\n⭐ 等級: Lv.${user.gameProfile.level}\n💎 經驗值: ${user.gameProfile.experience}\n🪙 衛生幣: ${user.gameProfile.coins}\n🏆 總簽到: ${user.gameProfile.totalCheckIns}次`
          };
          return client.replyMessage(event.replyToken, profileMessage);
        }

        // 預設回應
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '👋 歡迎使用廁所雷達！\n\n🔍 輸入「找廁所」開始搜尋\n📊 輸入「我的資料」查看個人資訊\n📍 分享位置找附近廁所'
        });

      } else if (event.message.type === 'location') {
        const lat = event.message.latitude;
        const lng = event.message.longitude;
        
        const nearbyToilets = await findNearbyToilets(lat, lng);
        
        if (nearbyToilets.length === 0) {
          return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '😅 附近沒有找到廁所資訊，我們會持續新增更多地點！\n\n你可以幫忙回報附近的廁所位置喔！'
          });
        }

        const toiletCards = nearbyToilets.map(createToiletCard);
        
        return client.replyMessage(event.replyToken, {
          type: 'flex',
          altText: '附近廁所',
          contents: {
            type: 'carousel',
            contents: toiletCards.map(card => card.contents)
          }
        });
      }
    }

  } catch (error) {
    console.error('處理訊息錯誤:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '抱歉，系統暫時忙碌中，請稍後再試！'
    });
  }
}

// LINE Webhook
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Webhook錯誤:', err);
      res.status(500).end();
    });
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '🚽 廁所雷達運行中！',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 根路徑
app.get('/', (req, res) => {
  res.json({
    message: '🚽 廁所雷達 API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/webhook'
    }
  });
});

// 初始化一些測試廁所資料
async function initializeTestData() {
  try {
    const count = await Toilet.countDocuments();
    if (count === 0) {
      const testToilets = [
        {
          name: "台北車站1樓東側廁所",
          location: { lat: 25.047924, lng: 121.517081, address: "台北市中正區北平西路3號" },
          facilities: { hasToiletPaper: true, hasAirCon: true, isAccessible: true, isFree: true },
          businessHours: { open: "05:00", close: "24:00", isOpen24h: false },
          ratings: { cleanliness: 3.8, comfort: 3.5, totalReviews: 245 },
          gameInfo: { level: "gold", currentOwner: null, checkInCount: 0 }
        },
        {
          name: "信義誠品書店廁所",
          location: { lat: 25.036598, lng: 121.560837, address: "台北市信義區松高路11號" },
          facilities: { hasToiletPaper: true, hasAirCon: true, isAccessible: true, isFree: true },
          businessHours: { open: "10:00", close: "22:00", isOpen24h: false },
          ratings: { cleanliness: 4.5, comfort: 4.2, totalReviews: 156 },
          gameInfo: { level: "gold", currentOwner: null, checkInCount: 0 }
        },
        {
          name: "101購物中心B1廁所",
          location: { lat: 25.033976, lng: 121.564472, address: "台北市信義區市府路45號" },
          facilities: { hasToiletPaper: true, hasAirCon: true, isAccessible: true, isFree: true },
          businessHours: { open: "11:00", close: "22:00", isOpen24h: false },
          ratings: { cleanliness: 4.8, comfort: 4.6, totalReviews: 324 },
          gameInfo: { level: "diamond", currentOwner: null, checkInCount: 0 }
        }
      ];

      await Toilet.insertMany(testToilets);
      console.log('📍 初始廁所資料建立完成！');
    }
  } catch (error) {
    console.error('初始化資料錯誤:', error);
  }
} 

// 重要：Railway需要這個PORT設定
const port = process.env.PORT || 3000;

app.listen(port, async () => {
  console.log(`🚽 廁所雷達LINE Bot正在運行在Port ${port}`);
  console.log(`🎮 你的創業之路開始了！`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 初始化測試資料 - 只在MongoDB連接成功時執行
  if (mongoose.connection.readyState === 1) {
    await initializeTestData();
  }
});

// 優雅關閉
process.on('SIGTERM', () => {
  console.log('🛑 收到SIGTERM，正在關閉伺服器...');
  mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
