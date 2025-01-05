import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

const Snake = ({
  isActive,
  yearInfo,
  getContributionValue,
  contributionData,
  onEatCell,
  onReset,
  totalContributions,
  isRandomMode
}) => {
  // 使用 ref 存储不需要触发重渲染的状态
  const gameLoopRef = useRef(null)
  const lastUpdateTimeRef = useRef(Date.now())
  const frameRequestRef = useRef(null)
  const snakePositionRef = useRef({ weekIndex: 0, dayIndex: 0 })
  const snakeDirectionRef = useRef({ x: 1, y: 0 })
  const snakeBodyRef = useRef([])
  const snakeLengthRef = useRef(1)
  const eatenContributionsRef = useRef(new Set())
  const validPositionsRef = useRef(new Set())
  const calculationPromiseRef = useRef(null)

  // 只有需要触发UI更新的状态才使用 useState
  const [isRage, setIsRage] = useState(totalContributions === 0)
  const [renderTrigger, setRenderTrigger] = useState(0)

  // 添加Q-learning相关的状态
  const [isTraining, setIsTraining] = useState(false)
  const [episodeCount, setEpisodeCount] = useState(0)
  const [totalReward, setTotalReward] = useState(0)
  const [trainingStats, setTrainingStats] = useState({
    successRate: 0,
    averageReward: 0,
    episodesCompleted: 0
  })
  const lastStateRef = useRef(null)
  const lastActionRef = useRef(null)
  const qlearningStateRef = useRef(null)
  const episodeStatsRef = useRef({
    successCount: 0,
    totalEpisodeReward: 0
  })

  // 使用 useCallback 优化函数定义
  const forceRender = useCallback(() => {
    setRenderTrigger(prev => prev + 1)
  }, [])

  // 监听贡献状态变化
  useEffect(() => {
    if (totalContributions === 0) {
      setIsRage(true)
    } else if (eatenContributionsRef.current.size === totalContributions && totalContributions > 0) {
      setIsRage(true)
    } else {
      setIsRage(false)
    }
  }, [totalContributions])

  // 优化碰撞检测
  const checkCollision = useCallback((pos) => {
    const posKey = `${pos.weekIndex}-${pos.dayIndex}`
    return snakeBodyRef.current.some(bodyPos => `${bodyPos.weekIndex}-${bodyPos.dayIndex}` === posKey)
  }, [])

  // 优化位置验证
  const isValidPosition = useCallback((pos) => {
    return validPositionsRef.current.has(`${pos.weekIndex}-${pos.dayIndex}`)
  }, [])

  // 获取有效的下一个位置（考虑碰撞检测和边界）
  const getNextValidPosition = useCallback((currentPos, direction) => {
    const possibleDirections = [
      direction,
      { x: direction.y, y: direction.x },
      { x: -direction.y, y: -direction.x },
      { x: -direction.x, y: -direction.y }
    ]

    // 过滤出有效的方向
    const validDirections = possibleDirections.filter(dir => {
      const nextPos = {
        weekIndex: currentPos.weekIndex + dir.x,
        dayIndex: currentPos.dayIndex + dir.y
      }

      // 检查是否出界
      if (nextPos.weekIndex < 0 || nextPos.weekIndex >= yearInfo.totalWeeks ||
        nextPos.dayIndex < 0 || nextPos.dayIndex >= 7) {
        return false
      }

      // 检查是否碰到蛇身
      if (checkCollision(nextPos)) {
        return false
      }

      return true
    })

    if (validDirections.length === 0) {
      return null // 没有有效的移动方向
    }

    // 在有效方向中选择一个
    const selectedDirection = validDirections[0]
    return {
      weekIndex: currentPos.weekIndex + selectedDirection.x,
      dayIndex: currentPos.dayIndex + selectedDirection.y,
      direction: selectedDirection
    }
  }, [yearInfo.totalWeeks, checkCollision])

  // 随机改变方向
  const changeDirection = useCallback(() => {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ]
    const randomIndex = Math.floor(Math.random() * directions.length)
    snakeDirectionRef.current = directions[randomIndex]
  }, [])

  // 使用服务端API进行计算
  const calculateNextMove = useCallback(async () => {
    try {
      // 准备当前状态
      const currentState = {
        currentPos: snakePositionRef.current,
        yearInfo,
        contributionData,
        snakeBody: snakeBodyRef.current,
        snakeLength: snakeLengthRef.current,
        direction: snakeDirectionRef.current
      }

      // 获取有效的下一个位置
      const nextValidPos = getNextValidPosition(currentState.currentPos, currentState.direction)
      if (!nextValidPos) {
        return null
      }

      // 如果不是训练模式，直接返回下一个有效位置
      if (!isTraining) {
        return {
          nextDirection: nextValidPos.direction
        }
      }

      // 如果是训练模式，使用Q-learning进行决策
      const response = await fetch('/api/snake-calculation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentState,
          validPosition: nextValidPos,
          lastState: lastStateRef.current,
          lastAction: lastActionRef.current,
          isTraining: true
        })
      })

      if (!response.ok) {
        throw new Error('计算失败')
      }

      const result = await response.json()

      // 保存当前状态用于下一次更新
      lastStateRef.current = currentState
      lastActionRef.current = result.nextDirection

      return result
    } catch (error) {
      console.error('计算下一步移动时出错:', error)
      return null
    }
  }, [yearInfo, contributionData, isTraining, getNextValidPosition])

  // 重置状态
  const resetSnake = useCallback(() => {
    let startPos = { weekIndex: 0, dayIndex: 0 }
    for (let w = 0; w < yearInfo.totalWeeks; w++) {
      for (let d = 0; d < 7; d++) {
        if (isValidPosition({ weekIndex: w, dayIndex: d })) {
          startPos = { weekIndex: w, dayIndex: d }
          break
        }
      }
      if (startPos.weekIndex > 0) break
    }

    snakePositionRef.current = startPos
    snakeDirectionRef.current = { x: 1, y: 0 }
    snakeBodyRef.current = []
    snakeLengthRef.current = 1
    eatenContributionsRef.current = new Set()
    setIsRage(totalContributions === 0)
    onReset?.()
    forceRender()
  }, [yearInfo.totalWeeks, isValidPosition, onReset, totalContributions, forceRender])

  // 监听激活状态变化
  useEffect(() => {
    if (!isActive) {
      resetSnake()
    }
  }, [isActive, resetSnake])

  // 更新训练统计信息
  const updateTrainingStats = useCallback(() => {
    const { successCount, totalEpisodeReward } = episodeStatsRef.current
    setTrainingStats({
      successRate: episodeCount > 0 ? (successCount / episodeCount) * 100 : 0,
      averageReward: episodeCount > 0 ? totalEpisodeReward / episodeCount : 0,
      episodesCompleted: episodeCount
    })
  }, [episodeCount])

  // 记录训练结果
  const recordEpisodeResult = useCallback((success, reward) => {
    if (success) {
      episodeStatsRef.current.successCount++
    }
    episodeStatsRef.current.totalEpisodeReward += reward
    setEpisodeCount(prev => prev + 1)
    updateTrainingStats()
  }, [updateTrainingStats])

  // 开始训练
  const startTraining = useCallback(() => {
    setIsTraining(true)
    setTotalReward(0)
    episodeStatsRef.current = {
      successCount: 0,
      totalEpisodeReward: 0
    }
    resetSnake()
  }, [resetSnake])

  // 停止训练
  const stopTraining = useCallback(() => {
    console.log('停止训练')
    setIsTraining(false)
    // 重置训练相关状态
    setEpisodeCount(0)
    setTotalReward(0)
    episodeStatsRef.current = {
      successCount: 0,
      totalEpisodeReward: 0
    }
    // 重置贪吃蛇状态
    resetSnake()
  }, [resetSnake])

  // 自动开始训练
  useEffect(() => {
    if (isActive) {
      startTraining()
    }
  }, [isActive, startTraining])

  // 更新蛇的位置
  const updateSnakePosition = useCallback(async () => {
    const currentTime = Date.now()
    const deltaTime = currentTime - lastUpdateTimeRef.current
    const moveInterval = isRage ? 200 : (isRandomMode ? 50 : 300)

    if (deltaTime >= moveInterval) {
      const calculation = await calculateNextMove()
      if (!calculation) {
        if (isTraining) {
          recordEpisodeResult(false, totalReward)
        }
        resetSnake()
        return
      }

      const { nextDirection } = calculation
      if (!nextDirection) {
        if (isTraining) {
          recordEpisodeResult(false, totalReward)
        }
        resetSnake()
        return
      }

      const currentPos = snakePositionRef.current
      const nextPos = {
        weekIndex: currentPos.weekIndex + nextDirection.x,
        dayIndex: currentPos.dayIndex + nextDirection.y
      }

      // 更新方向
      snakeDirectionRef.current = nextDirection

      // 检查是否吃到贡献点
      const contribution = getContributionValue(nextPos.weekIndex, nextPos.dayIndex)
      if (contribution > 0) {
        onEatCell?.(nextPos.weekIndex, nextPos.dayIndex)
        const growthAmount = Math.min(contribution * 2, 8)
        snakeLengthRef.current = Math.min(snakeLengthRef.current + growthAmount, 30)
        eatenContributionsRef.current.add(`${nextPos.weekIndex}-${nextPos.dayIndex}`)

        if (isTraining) {
          setTotalReward(prev => prev + contribution * 10)
          if (eatenContributionsRef.current.size === totalContributions) {
            recordEpisodeResult(true, totalReward)
            resetSnake()
            return
          }
        }
      }

      // 更新蛇身
      snakeBodyRef.current = [...snakeBodyRef.current, currentPos].slice(-snakeLengthRef.current)
      snakePositionRef.current = nextPos
      lastUpdateTimeRef.current = currentTime
      forceRender()
    }

    frameRequestRef.current = requestAnimationFrame(updateSnakePosition)
  }, [
    isRage,
    isTraining,
    isRandomMode,
    calculateNextMove,
    getContributionValue,
    onEatCell,
    resetSnake,
    forceRender,
    totalReward,
    totalContributions,
    recordEpisodeResult
  ])

  // 优化动画循环
  useEffect(() => {
    if (isActive) {
      frameRequestRef.current = requestAnimationFrame(updateSnakePosition)
    }
    return () => {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current)
      }
      // 取消正在进行的计算
      if (calculationPromiseRef.current) {
        calculationPromiseRef.current.abort()
      }
    }
  }, [isActive, updateSnakePosition])

  // 优化蛇身样式计算
  const getSnakeBodyStyle = useCallback((weekIndex, dayIndex) => {
    const bodyIndex = snakeBodyRef.current.findIndex(pos =>
      pos.weekIndex === weekIndex && pos.dayIndex === dayIndex
    )
    if (bodyIndex === -1) return null

    const progress = 1 - bodyIndex / snakeLengthRef.current
    const opacity = 0.3 + progress * 0.7
    const scale = 1 + progress * 0.15

    // 使用缓存的时间戳减少 Date.now() 调用
    const rotateAngle = Math.sin((lastUpdateTimeRef.current / 200) + bodyIndex * 0.5) * (8 - bodyIndex * 0.5)

    const baseStyle = isRage
      ? 'snake-body rage'
      : `bg-yellow-${Math.floor(300 + progress * 200)}/80 dark:bg-yellow-${Math.floor(400 + progress * 100)}/80 snake-body`

    return {
      isBody: true,
      style: baseStyle,
      scale,
      opacity,
      transform: `rotate(${rotateAngle}deg)`,
      '--rotate-deg': `${rotateAngle}deg`,
      '--index': bodyIndex,
      '--glow-color': isRage ? 'rgba(255, 0, 0, 0.8)' : 'rgba(250, 204, 21, 0.5)',
      '--pulse-speed': isRage ? '0.4s' : '0.8s',
      isRage
    }
  }, [isRage])

  // 更新训练状态
  useEffect(() => {
    console.log('随机模式状态变化:', isRandomMode)
    if (isRandomMode) {
      // 在随机模式下开始训练
      console.log('开始训练')
      startTraining()
    } else {
      // 在非随机模式下暂停训练
      console.log('停止训练')
      stopTraining()
    }
  }, [isRandomMode, startTraining, stopTraining])

  return {
    snakePosition: snakePositionRef.current,
    getSnakeBodyStyle,
    isSnakeHead: (weekIndex, dayIndex) => (
      isActive && snakePositionRef.current.weekIndex === weekIndex && snakePositionRef.current.dayIndex === dayIndex
    ),
    reset: resetSnake,
    isActive,
    isRage,
    // 添加训练相关的控制接口和统计信息
    training: {
      isTraining,
      episodeCount,
      totalReward,
      stats: trainingStats,
      startTraining,
      stopTraining
    },
    styles: `
      @keyframes snakeHead {
        0% { 
          transform: scale(1.25) rotate(-5deg) translateY(0) translateZ(2px);
          filter: brightness(1.3) contrast(1.2) saturate(1.4);
          box-shadow: 
            0 0 15px rgba(251, 191, 36, 0.6),
            0 0 30px rgba(251, 191, 36, 0.4);
        }
        25% { 
          transform: scale(1.3) rotate(0deg) translateY(-1px) translateZ(4px);
          filter: brightness(1.4) contrast(1.3) saturate(1.5);
          box-shadow: 
            0 0 20px rgba(251, 191, 36, 0.7),
            0 0 40px rgba(251, 191, 36, 0.5);
        }
        50% { 
          transform: scale(1.25) rotate(5deg) translateY(0) translateZ(2px);
          filter: brightness(1.3) contrast(1.2) saturate(1.4);
          box-shadow: 
            0 0 15px rgba(251, 191, 36, 0.6),
            0 0 30px rgba(251, 191, 36, 0.4);
        }
        75% { 
          transform: scale(1.3) rotate(0deg) translateY(1px) translateZ(4px);
          filter: brightness(1.4) contrast(1.3) saturate(1.5);
          box-shadow: 
            0 0 20px rgba(251, 191, 36, 0.7),
            0 0 40px rgba(251, 191, 36, 0.5);
        }
        100% { 
          transform: scale(1.25) rotate(-5deg) translateY(0) translateZ(2px);
          filter: brightness(1.3) contrast(1.2) saturate(1.4);
          box-shadow: 
            0 0 15px rgba(251, 191, 36, 0.6),
            0 0 30px rgba(251, 191, 36, 0.4);
        }
      }
      @keyframes snakeBody {
        0% { 
          transform: scale(1) rotate(var(--rotate-deg, 0deg)) translateZ(calc(var(--index) * -0.5px));
          filter: brightness(1) contrast(1) saturate(1);
          box-shadow: 0 0 calc((30 - var(--index)) * 1px) rgba(250, 204, 21, calc(0.3 - var(--index) * 0.01));
        }
        50% { 
          transform: scale(1.1) rotate(calc(var(--rotate-deg, 0deg) + 5deg)) translateZ(calc(var(--index) * -0.5px + 2px));
          filter: brightness(1.2) contrast(1.1) saturate(1.2);
          box-shadow: 0 0 calc((30 - var(--index)) * 1.5px) rgba(250, 204, 21, calc(0.4 - var(--index) * 0.01));
        }
        100% { 
          transform: scale(1) rotate(var(--rotate-deg, 0deg)) translateZ(calc(var(--index) * -0.5px));
          filter: brightness(1) contrast(1) saturate(1);
          box-shadow: 0 0 calc((30 - var(--index)) * 1px) rgba(250, 204, 21, calc(0.3 - var(--index) * 0.01));
        }
      }
      @keyframes snakeEyes {
        0%, 90% { transform: scale(1) translateY(0); opacity: 1; background: currentColor; }
        95% { transform: scale(0.8) translateY(0.5px); opacity: 0.8; background: #ff3e3e; }
        100% { transform: scale(1) translateY(0); opacity: 1; background: currentColor; }
      }
      @keyframes rageSnakeHead {
        0% { 
          transform: scale(1.4) rotate(-12deg) translateY(0) translateZ(5px);
          filter: brightness(1.6) contrast(1.4) saturate(2);
          box-shadow: 
            0 0 25px rgba(220, 38, 38, 0.8),
            0 0 50px rgba(239, 68, 68, 0.6),
            0 0 75px rgba(248, 113, 113, 0.4),
            inset 0 0 30px rgba(254, 202, 202, 0.5);
        }
        50% { 
          transform: scale(1.5) rotate(12deg) translateY(0) translateZ(8px);
          filter: brightness(1.8) contrast(1.5) saturate(2.2);
          box-shadow: 
            0 0 35px rgba(220, 38, 38, 0.9),
            0 0 70px rgba(239, 68, 68, 0.7),
            0 0 105px rgba(248, 113, 113, 0.5),
            inset 0 0 40px rgba(254, 202, 202, 0.6);
        }
        100% { 
          transform: scale(1.4) rotate(-12deg) translateY(0) translateZ(5px);
          filter: brightness(1.6) contrast(1.4) saturate(2);
          box-shadow: 
            0 0 25px rgba(220, 38, 38, 0.8),
            0 0 50px rgba(239, 68, 68, 0.6),
            0 0 75px rgba(248, 113, 113, 0.4),
            inset 0 0 30px rgba(254, 202, 202, 0.5);
        }
      }
      @keyframes rageSnakeBody {
        0% { 
          transform: scale(1.2) rotate(var(--rotate-deg, 0deg)) translateZ(calc(var(--index) * -1px));
          filter: brightness(1.4) contrast(1.3) saturate(1.8);
          box-shadow: 
            0 0 25px rgba(220, 38, 38, 0.8),
            0 0 50px rgba(239, 68, 68, 0.6),
            0 0 75px rgba(248, 113, 113, 0.4),
            inset 0 0 20px rgba(254, 202, 202, 0.5);
        }
        50% { 
          transform: scale(1.3) rotate(calc(var(--rotate-deg, 0deg) + 12deg)) translateZ(calc(var(--index) * -1px + 5px));
          filter: brightness(1.6) contrast(1.4) saturate(2);
          box-shadow: 
            0 0 35px rgba(220, 38, 38, 0.9),
            0 0 70px rgba(239, 68, 68, 0.7),
            0 0 105px rgba(248, 113, 113, 0.5),
            inset 0 0 30px rgba(254, 202, 202, 0.6);
        }
        100% { 
          transform: scale(1.2) rotate(var(--rotate-deg, 0deg)) translateZ(calc(var(--index) * -1px));
          filter: brightness(1.4) contrast(1.3) saturate(1.8);
          box-shadow: 
            0 0 25px rgba(220, 38, 38, 0.8),
            0 0 50px rgba(239, 68, 68, 0.6),
            0 0 75px rgba(248, 113, 113, 0.4),
            inset 0 0 20px rgba(254, 202, 202, 0.5);
        }
      }
      @keyframes glowPulse {
        0%, 100% { 
          opacity: 0.7; 
          transform: scale(1.3); 
          filter: blur(3px); 
          background: radial-gradient(circle at center, rgba(239, 68, 68, 0.7), transparent 75%);
        }
        50% { 
          opacity: 0.8; 
          transform: scale(1.6); 
          filter: blur(4px);
          background: radial-gradient(circle at center, rgba(220, 38, 38, 0.8), transparent 80%);
        }
      }
      @keyframes rageEyeGlow {
        0%, 100% {
          box-shadow: 
            0 0 15px #ff0000,
            0 0 30px #ff0000,
            0 0 45px #ff0000,
            inset 0 0 12px #ffffff;
          background: #ff0000;
        }
        50% {
          box-shadow: 
            0 0 20px #ff3333,
            0 0 40px #ff3333,
            0 0 60px #ff3333,
            inset 0 0 15px #ffffff;
          background: #ff3333;
        }
      }

      .snake-head {
        transform-style: preserve-3d;
        animation: snakeHead 0.6s ease-in-out infinite;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        position: relative;
        box-shadow: 
          0 0 15px rgba(251, 191, 36, 0.6),
          0 0 30px rgba(251, 191, 36, 0.4),
          inset 0 0 10px rgba(255, 255, 255, 0.5);
      }
      .snake-head::before {
        content: '';
        position: absolute;
        inset: -2px;
        background: linear-gradient(45deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.4));
        border-radius: inherit;
        z-index: 1;
      }
      .snake-body {
        transform-style: preserve-3d;
        animation: snakeBody 0.8s ease-in-out infinite;
        animation-delay: calc(var(--index, 0) * -0.1s);
        background: linear-gradient(135deg, 
          rgba(255, 215, 0, calc(1 - var(--index) * 0.03)), 
          rgba(255, 165, 0, calc(1 - var(--index) * 0.03))
        );
      }
      .snake-head.rage {
        animation: rageSnakeHead 0.3s ease-in-out infinite;
        background: linear-gradient(135deg, #ef4444, #991b1b);
        position: relative;
        box-shadow: 
          0 0 25px rgba(220, 38, 38, 0.8),
          0 0 50px rgba(239, 68, 68, 0.6),
          0 0 75px rgba(248, 113, 113, 0.4),
          inset 0 0 30px rgba(254, 202, 202, 0.5);
      }
      .snake-head.rage::before {
        content: '';
        position: absolute;
        inset: -8px;
        background: radial-gradient(circle at center, rgba(239, 68, 68, 0.7), transparent 75%);
        border-radius: inherit;
        animation: glowPulse 0.8s ease-in-out infinite;
        filter: blur(3px);
      }
      .snake-body.rage {
        animation: rageSnakeBody var(--pulse-speed) ease-in-out infinite;
        animation-delay: calc(var(--index, 0) * -0.06s);
        background: linear-gradient(135deg, #ef4444, #991b1b) !important;
        position: relative;
        box-shadow: 
          0 0 25px rgba(220, 38, 38, 0.8),
          0 0 50px rgba(239, 68, 68, 0.6),
          0 0 75px rgba(248, 113, 113, 0.4),
          inset 0 0 20px rgba(254, 202, 202, 0.5);
        transform-style: preserve-3d;
        z-index: 10;
      }
      .snake-body.rage::before {
        content: '';
        position: absolute;
        inset: -8px;
        background: radial-gradient(circle at center, rgba(239, 68, 68, 0.7), transparent 75%);
        border-radius: inherit;
        animation: glowPulse 0.8s ease-in-out infinite;
        animation-delay: calc(var(--index, 0) * -0.08s);
        filter: blur(3px);
        z-index: -1;
      }
      .snake-body.rage::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(45deg, rgba(255, 255, 255, 0.6), transparent 70%);
        border-radius: inherit;
        z-index: 1;
      }
      .snake-eyes {
        animation: snakeEyes 3s ease-in-out infinite;
        box-shadow: 0 0 5px currentColor;
      }
      .snake-eyes.rage {
        animation: rageEyeGlow 0.8s ease-in-out infinite;
        background: #ff0000;
        box-shadow: 
          0 0 15px #ff0000,
          0 0 30px #ff0000,
          0 0 45px #ff0000,
          inset 0 0 12px #ffffff;
      }
    `
  }
}

export default Snake 