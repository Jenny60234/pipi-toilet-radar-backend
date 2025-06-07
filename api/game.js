export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { userId, toiletId, score, gameType } = req.body;
      
      // 計算獎勵
      const baseReward = score * 20;
      const bonusReward = gameType === 'gym' ? Math.floor(score * 0.5) : 0;
      const totalReward = baseReward + bonusReward;
      
      // 記錄遊戲結果
      const gameResult = {
        id: `game_${Date.now()}`,
        userId,
        toiletId,
        score,
        gameType,
        reward: totalReward,
        timestamp: new Date().toISOString()
      };
      
      res.status(200).json({
        success: true,
        gameResult,
        message: `遊戲完成！獲得 ${totalReward} 積分`
      });
      
    } catch (error) {
      console.error('遊戲API錯誤:', error);
      res.status(500).json({ error: '記錄遊戲失敗' });
    }
  }
}
