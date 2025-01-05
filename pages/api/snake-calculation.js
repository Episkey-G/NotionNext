import { PriorityQueue } from '../../lib/utils/priorityQueue'
import { QLearning } from '../../lib/utils/qlearning'

// 创建Q-learning实例
const qlearning = new QLearning()

// 启动自动保存
qlearning.startAutoSave()

// 确保在进程退出时保存数据
process.on('SIGTERM', () => {
  qlearning.stopAutoSave()
  qlearning.saveTrainingData()
})

process.on('SIGINT', () => {
  qlearning.stopAutoSave()
  qlearning.saveTrainingData()
})

// 计算两点之间的曼哈顿距离
const manhattanDistance = (pos1, pos2) => {
  return Math.abs(pos1.weekIndex - pos2.weekIndex) + Math.abs(pos1.dayIndex - pos2.dayIndex)
}

// 获取某个位置的邻居节点
const getNeighbors = (pos, yearInfo) => {
  const directions = [
    { x: 1, y: 0 }, // 右
    { x: -1, y: 0 }, // 左
    { x: 0, y: 1 }, // 下
    { x: 0, y: -1 } // 上
  ]

  return directions
    .map(dir => ({
      weekIndex: pos.weekIndex + dir.x,
      dayIndex: pos.dayIndex + dir.y,
      direction: dir
    }))
    .filter(pos =>
      pos.weekIndex >= 0 &&
      pos.weekIndex < yearInfo.totalWeeks &&
      pos.dayIndex >= 0 &&
      pos.dayIndex < 7
    )
}

// 计算安全度（避免撞到蛇身和死角）
const calculateSafety = (pos, yearInfo, snakeBody) => {
  const neighbors = getNeighbors(pos, yearInfo)
  const availableNeighbors = neighbors.filter(n =>
    !snakeBody.some(b => b.weekIndex === n.weekIndex && b.dayIndex === n.dayIndex)
  )
  return availableNeighbors.length / 4 // 返回0-1之间的安全度
}

// 检查位置是否会导致死角
const isDeadEnd = (pos, yearInfo, snakeBody) => {
  const neighbors = getNeighbors(pos, yearInfo)
  const availableNeighbors = neighbors.filter(n =>
    !snakeBody.some(b => b.weekIndex === n.weekIndex && b.dayIndex === n.dayIndex)
  )
  return availableNeighbors.length <= 1
}

// 寻找最近的贡献格
const findNearestContribution = (currentState) => {
  const { currentPos, yearInfo, contributionData } = currentState
  let nearestContribution = null
  let minDistance = Infinity

  // 遍历所有位置
  for (let weekIndex = 0; weekIndex < yearInfo.totalWeeks; weekIndex++) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const contribution = contributionData[weekIndex * 7 + dayIndex - yearInfo.firstDayOfWeek]
      if (!contribution || contribution.count === 0) continue

      const distance = Math.abs(weekIndex - currentPos.weekIndex) +
        Math.abs(dayIndex - currentPos.dayIndex)

      if (distance < minDistance) {
        minDistance = distance
        nearestContribution = { weekIndex, dayIndex }
      }
    }
  }

  return nearestContribution
}

// A*寻路算法优化
const findPath = (start, target, yearInfo, contributionData, snakeBody) => {
  const pq = new PriorityQueue((a, b) => a.f < b.f)
  const visited = new Set()
  const cameFrom = new Map()
  const gScore = new Map()
  const fScore = new Map()

  const posToKey = pos => `${pos.weekIndex}-${pos.dayIndex}`
  const isSnakeBody = pos => snakeBody.some(bodyPos =>
    bodyPos.weekIndex === pos.weekIndex && bodyPos.dayIndex === pos.dayIndex
  )

  gScore.set(posToKey(start), 0)
  fScore.set(posToKey(start), manhattanDistance(start, target))
  pq.push({ ...start, f: fScore.get(posToKey(start)) })

  while (!pq.isEmpty()) {
    const current = pq.pop()
    const currentKey = posToKey(current)

    if (current.weekIndex === target.weekIndex && current.dayIndex === target.dayIndex) {
      const path = []
      let curr = current
      while (cameFrom.has(posToKey(curr))) {
        path.unshift(curr)
        curr = cameFrom.get(posToKey(curr))
      }
      // 验证路径的安全性
      for (const pos of path) {
        if (isDeadEnd(pos, yearInfo, snakeBody)) {
          return null // 如果路径中有死角，放弃这条路径
        }
      }
      return path
    }

    if (visited.has(currentKey)) continue
    visited.add(currentKey)

    const neighbors = getNeighbors(current, yearInfo)
    // 优先考虑安全的方向
    neighbors.sort((a, b) => {
      const safetyA = calculateSafety(a, yearInfo, snakeBody)
      const safetyB = calculateSafety(b, yearInfo, snakeBody)
      if (safetyA !== safetyB) return safetyB - safetyA

      const distA = manhattanDistance(a, target)
      const distB = manhattanDistance(b, target)
      return distA - distB
    })

    for (const neighbor of neighbors) {
      const neighborKey = posToKey(neighbor)
      if (isSnakeBody(neighbor)) continue
      if (isDeadEnd(neighbor, yearInfo, snakeBody)) continue // 跳过死角

      const tentativeGScore = gScore.get(currentKey) + 1

      if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
        cameFrom.set(neighborKey, current)
        gScore.set(neighborKey, tentativeGScore)

        const contribution = contributionData[neighbor.weekIndex]?.[neighbor.dayIndex] || 0
        const distance = manhattanDistance(neighbor, target)
        const safety = calculateSafety(neighbor, yearInfo, snakeBody)

        // 综合考虑距离、安全度和贡献值
        const heuristic = (
          distance * 2 +
          (1 - safety) * 3 -
          contribution
        ) / 6

        fScore.set(neighborKey, tentativeGScore + heuristic)
        pq.push({ ...neighbor, f: fScore.get(neighborKey) })
      }
    }
  }

  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' })
  }

  try {
    const { currentState, validPosition, lastState, lastAction, isTraining } = req.body

    // 验证必要的参数
    if (!currentState || !currentState.currentPos || !currentState.yearInfo || !currentState.contributionData) {
      return res.status(400).json({ error: '缺少必要的参数' })
    }

    // 寻找最近的贡献格
    const nearestContribution = findNearestContribution(currentState)

    // 如果不是训练模式，直接返回下一个有效位置
    if (!isTraining) {
      return res.status(200).json({
        nextDirection: validPosition.direction,
        nearestContribution
      })
    }

    // 准备Q-learning的状态
    const state = {
      currentPos: currentState.currentPos,
      yearInfo: currentState.yearInfo,
      contributionData: currentState.contributionData,
      snakeBody: currentState.snakeBody,
      nearestContribution
    }

    // 获取有效的动作
    const validActions = [
      { x: 1, y: 0 }, // 右
      { x: -1, y: 0 }, // 左
      { x: 0, y: 1 }, // 下
      { x: 0, y: -1 } // 上
    ].filter(action => {
      const nextPos = {
        weekIndex: currentState.currentPos.weekIndex + action.x,
        dayIndex: currentState.currentPos.dayIndex + action.y
      }

      // 检查是否出界
      if (nextPos.weekIndex < 0 || nextPos.weekIndex >= currentState.yearInfo.totalWeeks ||
        nextPos.dayIndex < 0 || nextPos.dayIndex >= 7) {
        return false
      }

      // 检查是否撞到蛇身
      return !currentState.snakeBody.some(segment =>
        segment.weekIndex === nextPos.weekIndex && segment.dayIndex === nextPos.dayIndex
      )
    })

    // 如果没有有效动作，返回null
    if (validActions.length === 0) {
      return res.status(200).json({
        nextDirection: null,
        nearestContribution
      })
    }

    // 使用Q-learning选择动作
    const qlearning = new QLearning()
    const nextDirection = qlearning.selectAction(state, validActions)

    // 返回结果
    return res.status(200).json({
      nextDirection,
      nearestContribution
    })

  } catch (error) {
    console.error('计算错误:', error)
    return res.status(500).json({ error: '计算过程中出错' })
  }
} 