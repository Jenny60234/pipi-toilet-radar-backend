// 簡單的記憶體存儲
let users = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      const { name, avatar, action, points, level } = req.body;
      
      if (action === 'login') {
        const userId = `user_${Date.now()}`;
        const user = {
          id: userId,
          name: name || '皮皮星人',
          avatar: avatar || '🐱',
          points: 0,
          level: 1,
          rank: '廁所新手',
          achievements: [],
          gamesPlayed: 0,
          joinDate: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };
        
        users.set(userId, user);
        
        res.status(200).json({
          success: true,
          user,
          token: userId
        });
      } else if (action === 'update') {
        const { userId } = req.body;
        const user = users.get(userId);
        
        if (user) {
          user.points = points || user.points;
          user.level = level || user.level;
          user.lastActive = new Date().toISOString();
          
          // 更新稱號
          if (user.points >= 10000) user.rank = '皮皮大師';
          else if (user.points >= 5000) user.rank = '廁所專家';
          else if (user.points >= 2000) user.rank = '廁所探險家';
          else if (user.points >= 500) user.rank = '廁所學徒';
          else user.rank = '廁所新手';
          
          users.set(userId, user);
          
          res.status(200).json({
            success: true,
            user
          });
        } else {
          res.status(404).json({ error: '用戶不存在' });
        }
      }
    } else if (req.method === 'GET') {
      const { userId } = req.query;
      
      if (userId) {
        const user = users.get(userId);
        if (user) {
          res.status(200).json({ success: true, user });
        } else {
          res.status(404).json({ error: '用戶不存在' });
        }
      } else {
        // 返回排行榜
        const topUsers = Array.from(users.values())
          .sort((a, b) => b.points - a.points)
          .slice(0, 10);
          
        res.status(200).json({
          success: true,
          leaderboard: topUsers
        });
      }
    }
  } catch (error) {
    console.error('用戶API錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
}
