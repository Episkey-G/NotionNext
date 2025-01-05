import fs from 'fs'
import path from 'path'

// 修改存储路径到 public 目录下，这样在开发和生产环境都可以访问
const SAVE_PATH = path.join(process.cwd(), 'public', 'data', 'snake-training')

export class QLearning {
  constructor(learningRate = 0.1, discountFactor = 0.9, explorationRate = 0.1) {
    this.qTable = new Map()
    this.learningRate = 0.2
    this.discountFactor = 0.9
    this.explorationRate = 0.3
    this.lastState = null
    this.lastAction = null

    // 添加训练统计
    this.episodeCount = 0
    this.totalReward = 0
    this.rewardHistory = []
    this.convergenceThreshold = 0.01
    this.convergenceWindow = 100
    this.minExplorationRate = 0.1
    this.explorationDecayRate = 0.995
    this.lastAverageReward = -Infinity
    this.stableEpisodes = 0
    this.requiredStableEpisodes = 5

    // 初始化存储目录
    this.initializeStorage()

    // 尝试加载已有的训练数据
    if (!this.loadTrainingData()) {
      console.log('没有找到已有训练数据，使用新的学习参数开始训练')
    }
  }

  // 初始化存储目录
  initializeStorage() {
    try {
      // 创建完整的目录路径
      const dirs = ['public', 'data', 'snake-training']
      let currentPath = process.cwd()

      for (const dir of dirs) {
        currentPath = path.join(currentPath, dir)
        if (!fs.existsSync(currentPath)) {
          fs.mkdirSync(currentPath)
          console.log('创建目录:', currentPath)
        }
      }
    } catch (error) {
      console.error('创建存储目录失败:', error)
    }
  }

  // 获取状态的特征表示
  getStateFeatures(state) {
    const { currentPos, nearestContribution, snakeBody, yearInfo } = state

    // 计算到最近贡献格的相对方向和距离
    let relativeDirection = { x: 0, y: 0 }
    let distance = Infinity
    if (nearestContribution) {
      relativeDirection = {
        x: Math.sign(nearestContribution.weekIndex - currentPos.weekIndex),
        y: Math.sign(nearestContribution.dayIndex - currentPos.dayIndex)
      }
      distance = Math.abs(nearestContribution.weekIndex - currentPos.weekIndex) +
        Math.abs(nearestContribution.dayIndex - currentPos.dayIndex)
    }

    // 计算周围四个方向的状态
    const directions = [
      { x: 1, y: 0 }, // 右
      { x: -1, y: 0 }, // 左
      { x: 0, y: 1 }, // 下
      { x: 0, y: -1 } // 上
    ]

    const surroundings = directions.map(dir => {
      const pos = {
        weekIndex: currentPos.weekIndex + dir.x,
        dayIndex: currentPos.dayIndex + dir.y
      }

      // 检查是否出界
      if (pos.weekIndex < 0 || pos.weekIndex >= yearInfo.totalWeeks ||
        pos.dayIndex < 0 || pos.dayIndex >= 7) {
        return 1 // 墙壁
      }

      // 检查是否是蛇身
      if (snakeBody.some(b => b.weekIndex === pos.weekIndex && b.dayIndex === pos.dayIndex)) {
        return 1 // 蛇身
      }

      return 0 // 安全空间
    })

    // 返回简化的状态表示
    return {
      relativeDirection,
      distance: Math.min(distance, 10), // 限制距离范围
      surroundings,
      bodyLength: snakeBody.length
    }
  }

  // 计算奖励
  calculateReward(state, action, nextState) {
    let reward = 0;

    // 基础移动惩罚
    reward -= 0.1;

    // 吃到贡献点奖励
    if (nextState.bodyLength > state.bodyLength) {
      reward += 10;
    }

    // 避免碰撞奖励
    const surroundings = nextState.surroundings;
    const safeSpaces = surroundings.filter(x => x === 0).length;
    reward += safeSpaces * 0.5;

    // 接近目标奖励
    if (nextState.distance < state.distance) {
      reward += 1;
    }

    // 存活奖励
    reward += 0.1;

    return reward;
  }

  // 选择动作
  selectAction(state, validActions) {
    const stateKey = JSON.stringify(this.getStateFeatures(state))

    // 探索：随机选择动作
    if (Math.random() < this.explorationRate) {
      const safeActions = validActions.filter(action => {
        const nextPos = {
          weekIndex: state.currentPos.weekIndex + action.x,
          dayIndex: state.currentPos.dayIndex + action.y
        }
        return !state.snakeBody.some(b =>
          b.weekIndex === nextPos.weekIndex && b.dayIndex === nextPos.dayIndex
        )
      })

      if (safeActions.length > 0) {
        return safeActions[Math.floor(Math.random() * safeActions.length)]
      }
      return validActions[Math.floor(Math.random() * validActions.length)]
    }

    // 开发：选择最佳动作
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map())
    }
    const actionValues = this.qTable.get(stateKey)

    let bestAction = null
    let maxValue = Number.NEGATIVE_INFINITY

    for (const action of validActions) {
      const actionKey = JSON.stringify(action)
      const value = actionValues.get(actionKey) || 0

      // 检查该动作是否安全
      const nextPos = {
        weekIndex: state.currentPos.weekIndex + action.x,
        dayIndex: state.currentPos.dayIndex + action.y
      }

      // 如果动作会导致碰撞，给予较大的负值
      if (state.snakeBody.some(b =>
        b.weekIndex === nextPos.weekIndex && b.dayIndex === nextPos.dayIndex
      )) {
        continue
      }

      if (value > maxValue) {
        maxValue = value
        bestAction = action
      }
    }

    // 如果没有找到好的动作，随机选择一个安全的动作
    if (!bestAction) {
      const safeActions = validActions.filter(action => {
        const nextPos = {
          weekIndex: state.currentPos.weekIndex + action.x,
          dayIndex: state.currentPos.dayIndex + action.y
        }
        return !state.snakeBody.some(b =>
          b.weekIndex === nextPos.weekIndex && b.dayIndex === nextPos.dayIndex
        )
      })

      if (safeActions.length > 0) {
        return safeActions[Math.floor(Math.random() * safeActions.length)]
      }
      return validActions[Math.floor(Math.random() * validActions.length)]
    }

    return bestAction
  }

  // 更新Q值
  update(state, action, nextState, reward) {
    const stateKey = JSON.stringify(state);
    const actionKey = JSON.stringify(action);
    const nextStateKey = JSON.stringify(nextState);

    // 确保状态存在
    if (!this.qTable[stateKey]) {
      this.qTable[stateKey] = {};
      this.stateCount++;
    }

    // 获取当前Q值
    const currentQ = this.qTable[stateKey][actionKey] || 0;

    // 获取下一状态的最大Q值
    const nextStateValues = this.qTable[nextStateKey] || {};
    const maxNextQ = Object.values(nextStateValues).length > 0
      ? Math.max(...Object.values(nextStateValues))
      : 0;

    // 更新Q值
    this.qTable[stateKey][actionKey] = currentQ +
      this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);

    this.totalActions++;

    // 更新训练统计
    this.updateStats(reward);
  }

  // 保存学习状态
  saveState() {
    return {
      qTable: Array.from(this.qTable.entries()),
      learningRate: this.learningRate,
      discountFactor: this.discountFactor,
      explorationRate: this.explorationRate
    }
  }

  // 加载学习状态
  loadState(state) {
    // 确保正确转换为嵌套的 Map 对象
    this.qTable = new Map(
      state.qTable.map(([key, value]) => [key, new Map(Object.entries(value))])
    )
    this.learningRate = state.learningRate
    this.discountFactor = state.discountFactor
    this.explorationRate = state.explorationRate
  }

  // 保存训练数据到文件
  saveTrainingData() {
    try {
      this.initializeStorage()

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = path.join(SAVE_PATH, `training-data-${timestamp}.json`)

      const data = {
        qTable: Array.from(this.qTable.entries()),
        learningRate: this.learningRate,
        discountFactor: this.discountFactor,
        explorationRate: this.explorationRate,
        timestamp: timestamp,
        stats: {
          episodeCount: this.episodeCount,
          rewardHistory: this.rewardHistory,
          stateCount: this.qTable.size,
          totalActions: Array.from(this.qTable.values()).reduce((sum, actions) => sum + actions.size, 0),
          convergenceStatus: {
            stableEpisodes: this.stableEpisodes,
            lastAverageReward: this.lastAverageReward,
            hasConverged: this.checkConvergence()
          }
        }
      }

      const tempFile = `${filename}.temp`
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2))
      fs.renameSync(tempFile, filename)

      const latestFile = path.join(SAVE_PATH, 'latest.json')
      fs.writeFileSync(latestFile, JSON.stringify({
        latestFile: filename,
        timestamp: timestamp,
        convergenceStatus: data.stats.convergenceStatus
      }, null, 2))

      this.cleanupOldFiles()

      console.log('训练数据已保存:', filename)
      console.log('收敛状态:', data.stats.convergenceStatus)
      return true
    } catch (error) {
      console.error('保存训练数据失败:', error)
      return false
    }
  }

  // 加载训练数据
  loadTrainingData() {
    try {
      const latestPath = path.join(SAVE_PATH, 'latest.json')
      if (!fs.existsSync(latestPath)) {
        console.log('没有找到已保存的训练数据')
        return false
      }

      const latestContent = fs.readFileSync(latestPath, 'utf8')
      const { latestFile } = JSON.parse(latestContent)

      if (!fs.existsSync(latestFile)) {
        console.log('最新的训练数据文件不存在:', latestFile)
        return false
      }

      const content = fs.readFileSync(latestFile, 'utf8')
      const data = JSON.parse(content)

      // 加载Q表
      this.qTable = new Map()
      for (const [stateKey, actionValues] of data.qTable) {
        const stateMap = new Map()
        for (const [actionKey, value] of Object.entries(actionValues)) {
          stateMap.set(actionKey, value)
        }
        this.qTable.set(stateKey, stateMap)
      }

      // 加载学习参数，但保持一定的探索性
      this.learningRate = Math.max(data.learningRate, 0.1)
      this.discountFactor = data.discountFactor
      this.explorationRate = Math.max(data.explorationRate, 0.15) // 保持一定的探索率

      // 恢复训练统计
      if (data.stats) {
        this.episodeCount = data.stats.episodeCount || 0
        this.rewardHistory = data.stats.rewardHistory || []
        this.stableEpisodes = data.stats.convergenceStatus?.stableEpisodes || 0
        this.lastAverageReward = data.stats.convergenceStatus?.lastAverageReward || -Infinity
      }

      // 重置部分统计以开始新的训练阶段
      this.totalReward = 0
      this.stableEpisodes = Math.max(0, this.stableEpisodes - 2) // 略微降低稳定性计数

      console.log('已加载训练数据:', latestFile)
      console.log('状态数量:', this.qTable.size)
      console.log('总动作数:', Array.from(this.qTable.values()).reduce((sum, actions) => sum + actions.size, 0))
      console.log('已训练回合:', this.episodeCount)
      console.log('当前探索率:', this.explorationRate)
      return true
    } catch (error) {
      console.error('加载训练数据失败:', error)
      return false
    }
  }

  // 清理旧文件
  cleanupOldFiles() {
    try {
      if (!fs.existsSync(SAVE_PATH)) {
        return
      }

      const files = fs.readdirSync(SAVE_PATH)
        .filter(f => f.startsWith('training-data-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(SAVE_PATH, f),
          time: fs.statSync(path.join(SAVE_PATH, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)

      // 保留最近10个文件
      files.slice(10).forEach(file => {
        try {
          fs.unlinkSync(file.path)
          console.log('删除旧训练数据:', file.name)
        } catch (err) {
          console.error('删除文件失败:', file.path, err)
        }
      })
    } catch (error) {
      console.error('清理旧文件失败:', error)
    }
  }

  // 定期保存训练数据
  startAutoSave(interval = 5 * 60 * 1000) { // 默认5分钟保存一次
    this.autoSaveInterval = setInterval(() => {
      this.saveTrainingData()
    }, interval)
  }

  // 停止自动保存
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
  }

  // 检查是否达到收敛条件
  checkConvergence() {
    if (this.rewardHistory.length < this.convergenceWindow) {
      return false
    }

    const recentRewards = this.rewardHistory.slice(-this.convergenceWindow)
    const mean = recentRewards.reduce((a, b) => a + b) / this.convergenceWindow
    const variance = recentRewards.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.convergenceWindow

    return variance < this.convergenceThreshold
  }

  // 更新探索率
  updateExplorationRate() {
    // 根据训练进度动态调整探索率
    const progress = Math.min(this.episodeCount / 1000, 1) // 假设1000回合为一个完整训练周期
    const targetExplorationRate = this.minExplorationRate + (0.3 - this.minExplorationRate) * (1 - progress)

    if (this.explorationRate > targetExplorationRate) {
      this.explorationRate = Math.max(
        targetExplorationRate,
        this.explorationRate * this.explorationDecayRate
      )
    } else {
      // 如果探索率过低，适当提升
      this.explorationRate = Math.min(
        this.explorationRate * 1.05,
        targetExplorationRate
      )
    }
  }

  // 更新训练统计
  updateStats(reward) {
    this.episodeCount++
    this.totalReward += reward

    // 每完成一个回合更新统计
    if (this.episodeCount % 10 === 0) {
      this.rewardHistory.push(this.totalReward / 10)
      this.totalReward = 0
      this.updateExplorationRate()

      // 每50个回合保存一次数据
      if (this.episodeCount % 50 === 0) {
        this.saveTrainingData()
      }
    }
  }
}

// 辅助函数：计算曼哈顿距离
const manhattanDistance = (pos1, pos2) => {
  return Math.abs(pos1.weekIndex - pos2.weekIndex) + Math.abs(pos1.dayIndex - pos2.dayIndex)
} 