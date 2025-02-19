import { useMemo, useState, useEffect, useCallback } from 'react'
import BLOG from '@/blog.config'
import Snake from './Snake'

// 宠物状态持久化 key
const PET_STATE_KEY = 'NOTION_NEXT_PET_STATE'
const LAST_VISIT_KEY = 'NOTION_NEXT_LAST_VISIT'

// 获取存储的宠物状态
const getSavedPetState = () => {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem(PET_STATE_KEY)
  return saved ? JSON.parse(saved) : null
}

// 保存宠物状态
const savePetState = (state) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(PET_STATE_KEY, JSON.stringify(state))
}

// 获取上次访问时间
const getLastVisitTime = () => {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem(LAST_VISIT_KEY)
  return saved ? parseInt(saved) : null
}

// 保存访问时间
const saveVisitTime = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_VISIT_KEY, Date.now().toString())
}

// 计算年份的周数和起始日信息
const getYearWeeksInfo = (year) => {
  const firstDay = new Date(Date.UTC(year, 0, 1))
  const lastDay = new Date(Date.UTC(year, 11, 31))

  // 获取第一天是星期几（0-6，0代表星期日）
  const firstDayOfWeek = firstDay.getUTCDay()

  // 计算总天数
  const totalDays = Math.floor((lastDay - firstDay) / (24 * 60 * 60 * 1000)) + 1

  // 计算需要的总周数（包括可能不完整的第一周和最后一周）
  const totalWeeks = Math.ceil((totalDays + firstDayOfWeek) / 7)

  return {
    totalWeeks,
    firstDayOfWeek,
    totalDays
  }
}

const GitHubContributionCard = ({ posts }) => {
  // 添加客户端渲染状态
  const [mounted, setMounted] = useState(false);

  // 在组件挂载后设置客户端状态
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取可用的年份列表
  const availableYears = useMemo(() => {
    if (!posts || posts.length === 0) {
      return [new Date().getFullYear()]
    }

    // 收集所有文章的年份
    const years = new Set()
    // 添加当前年份
    years.add(new Date().getFullYear())

    posts.forEach(post => {
      // 使用 date.start_date 作为文章日期
      if (post.date && post.date.start_date) {
        const date = new Date(post.date.start_date)
        const year = date.getFullYear()
        if (!isNaN(year)) {
          years.add(year)
        }
      }
    })

    // 转换为数组并降序排列
    return Array.from(years).sort((a, b) => b - a)
  }, [posts])

  // 当前选中的年份
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear()
  })

  // 当前选中的月份
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().getMonth()
  })

  // 生成基于文章更新的贡献数据
  const generateContributionData = (year) => {
    const data = []
    const startDate = new Date(Date.UTC(year, 0, 1)) // 使用 UTC 时间
    const endDate = new Date(Date.UTC(year, 11, 31))

    // 初始化该年的数据，默认贡献为0
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      data.push({
        date: new Date(d),
        count: 0,
        createCount: 0,
        updateCount: 0,
        posts: []
      })
    }

    // 统计文章更新的贡献
    if (posts && posts.length > 0) {
      posts.forEach(post => {
        // 处理创建时间
        if (post.date && post.date.start_date) {
          const createDate = new Date(Date.UTC(
            new Date(post.date.start_date).getUTCFullYear(),
            new Date(post.date.start_date).getUTCMonth(),
            new Date(post.date.start_date).getUTCDate()
          ))

          if (!isNaN(createDate.getTime()) && createDate.getUTCFullYear() === year) {
            const createDayOfYear = Math.floor((createDate - startDate) / (24 * 60 * 60 * 1000))

            if (createDayOfYear >= 0 && createDayOfYear < data.length) {
              data[createDayOfYear].createCount += 1
              data[createDayOfYear].count += 1
              data[createDayOfYear].posts.push({
                title: post.title,
                slug: post.slug,
                date: createDate,
                type: 'Created'
              })
            }
          }
        }

        // 处理更新时间
        if (post.date && post.date.last_edited_time) {
          const updateDate = new Date(Date.UTC(
            new Date(post.date.last_edited_time).getUTCFullYear(),
            new Date(post.date.last_edited_time).getUTCMonth(),
            new Date(post.date.last_edited_time).getUTCDate()
          ))

          if (!isNaN(updateDate.getTime()) && updateDate.getUTCFullYear() === year) {
            const updateDayOfYear = Math.floor((updateDate - startDate) / (24 * 60 * 60 * 1000))

            if (updateDayOfYear >= 0 && updateDayOfYear < data.length) {
              data[updateDayOfYear].updateCount += 1
              data[updateDayOfYear].count += 1
              data[updateDayOfYear].posts.push({
                title: post.title,
                slug: post.slug,
                date: updateDate,
                type: 'Updated'
              })
            }
          }
        }
      })
    }

    return data
  }

  // 使用 useMemo 缓存年份信息
  const yearInfo = useMemo(() => {
    return getYearWeeksInfo(selectedYear)
  }, [selectedYear])

  // 使用 useMemo 缓存贡献数据
  const contributionData = useMemo(() => {
    return generateContributionData(selectedYear)
  }, [selectedYear])

  // 获取某个位置的贡献值
  const getContributionValue = useCallback((weekIndex, dayIndex) => {
    const dataIndex = weekIndex * 7 + dayIndex - yearInfo.firstDayOfWeek
    if (dataIndex >= 0 && dataIndex < contributionData.length) {
      return contributionData[dataIndex]?.count || 0
    }
    return -1
  }, [contributionData, yearInfo.firstDayOfWeek])

  // 获取总贡献数
  const totalContributions = useMemo(() => {
    return contributionData.reduce((sum, day) => sum + day.count, 0)
  }, [contributionData])

  // 获取有贡献的格子总数
  const totalContributionCells = useMemo(() => {
    return contributionData.reduce((sum, day) => sum + (day.count > 0 ? 1 : 0), 0)
  }, [contributionData])

  // 切换到上一年
  const handlePrevYear = () => {
    const currentIndex = availableYears.indexOf(selectedYear)
    if (currentIndex < availableYears.length - 1) {
      setSelectedYear(availableYears[currentIndex + 1])
    }
  }

  // 切换到下一年
  const handleNextYear = () => {
    const currentIndex = availableYears.indexOf(selectedYear)
    if (currentIndex > 0) {
      setSelectedYear(availableYears[currentIndex - 1])
    }
  }

  // 获取贡献等级的样式
  const getContributionClass = (count) => {
    if (count === 0) return 'bg-gray-200 dark:bg-gray-700'
    if (count === 1) return 'bg-emerald-200 dark:bg-emerald-800'
    if (count === 2) return 'bg-emerald-300 dark:bg-emerald-700'
    if (count === 3) return 'bg-emerald-400 dark:bg-emerald-600'
    return 'bg-emerald-500 dark:bg-emerald-500'
  }

  // 获取月份标签
  const getMonthLabels = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months
  }

  // 格式化提示文本
  const formatTooltip = (contribution) => {
    if (!contribution) return 'No contributions'

    // 统一日期格式化函数
    const formatLocalDate = (date) => {
      const d = new Date(date)
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const month = months[d.getMonth()]
      const day = d.getDate()
      const ordinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd']
        const v = n % 100
        return n + (s[(v - 20) % 10] || s[v] || s[0])
      }
      return `${month} ${ordinal(day)}`
    }

    const date = formatLocalDate(contribution.date)
    const { createCount, updateCount, count } = contribution
    return `${date}: ${createCount} new, ${updateCount} updates, ${count} total contributions`
  }

  // 添加动画状态
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  // 贪吃蛇状态
  const [isSnakeActive, setIsSnakeActive] = useState(true)
  const [eatenCells, setEatenCells] = useState(new Set())

  // 重置贪吃蛇
  const handleSnakeReset = useCallback(() => {
    setEatenCells(new Set())
  }, [])

  // 处理贪吃蛇吃掉格子
  const handleEatCell = useCallback((weekIndex, dayIndex) => {
    if (isSnakeActive) { // 只在激活状态下记录被吃掉的格子
      setEatenCells(prev => new Set([...prev, `${weekIndex}-${dayIndex}`]))
    }
  }, [isSnakeActive])

  // 切换贪吃蛇状态
  const toggleSnake = useCallback(() => {
    if (isSnakeActive) {
      // 如果当前是激活状态，先重置再关闭
      handleSnakeReset()
      setIsSnakeActive(false)
    } else {
      // 如果当前是关闭状态，直接开启
      setIsSnakeActive(true)
    }
  }, [isSnakeActive, handleSnakeReset])

  // 使用 Snake 组件
  const snake = Snake({
    isActive: isSnakeActive,
    yearInfo,
    getContributionValue,
    contributionData,
    onEatCell: handleEatCell,
    onReset: handleSnakeReset,
    totalContributions: totalContributionCells
  })

  // 获取贡献等级对应的荧光颜色
  const getGlowColor = (count) => {
    if (count === 1) return 'shadow-[0_0_10px_rgba(16,185,129,0.5)] dark:shadow-[0_0_10px_rgba(16,185,129,0.3)]'
    if (count === 2) return 'shadow-[0_0_10px_rgba(16,185,129,0.6)] dark:shadow-[0_0_10px_rgba(16,185,129,0.4)]'
    if (count === 3) return 'shadow-[0_0_10px_rgba(16,185,129,0.7)] dark:shadow-[0_0_10px_rgba(16,185,129,0.5)]'
    if (count >= 4) return 'shadow-[0_0_10px_rgba(16,185,129,0.8)] dark:shadow-[0_0_10px_rgba(16,185,129,0.6)]'
    return ''
  }

  // 获取贡献等级对应的边框颜色
  const getBorderGlowClass = (count) => {
    if (count === 1) return 'ring-emerald-300 dark:ring-emerald-700'
    if (count === 2) return 'ring-emerald-400 dark:ring-emerald-600'
    if (count === 3) return 'ring-emerald-500 dark:ring-emerald-500'
    if (count >= 4) return 'ring-emerald-600 dark:ring-emerald-400'
    return 'ring-gray-300 dark:ring-gray-600'
  }

  // 获取月份网格数据
  const getMonthGrid = (year, month) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDay.getDay()
    const totalDays = lastDay.getDate()
    
    const grid = []
    
    // 填充前置空白日期
    for (let i = 0; i < firstDayOfWeek; i++) {
      grid.push({ date: null, contribution: null })
    }
    
    // 填充实际日期
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day)
      const contribution = contributionData.find(d => 
        d.date.getFullYear() === year &&
        d.date.getMonth() === month &&
        d.date.getDate() === day
      )
      grid.push({ date, contribution })
    }
    
    // 填充后置空白日期，确保总是6行7列
    const remainingCells = 42 - grid.length // 6行7列
    for (let i = 0; i < remainingCells; i++) {
      grid.push({ date: null, contribution: null })
    }
    
    return grid
  }

  // 修改贪吃蛇的位置映射逻辑
  const mapSnakePosition = (weekIndex, dayIndex) => {
    if (window.innerWidth < 768) { // 移动端
      // 在月度视图中，weekIndex 和 dayIndex 已经是正确的网格位置
      return { weekIndex, dayIndex }
    } else { // 桌面端
      // 保持原有的年度视图位置映射逻辑
      return { weekIndex, dayIndex }
    }
  }

  // 更新贪吃蛇的移动逻辑
  const updateSnakePosition = (direction) => {
    if (!isSnakeActive) return

    let { weekIndex, dayIndex } = snake.headPosition
    let newWeekIndex = weekIndex
    let newDayIndex = dayIndex

    if (window.innerWidth < 768) { // 移动端逻辑
      const monthGrid = getMonthGrid(selectedYear, selectedMonth)
      const totalRows = 6
      const totalCols = 7

      // 辅助函数：检查位置是否在当前月份的有效日期范围内
      const isValidPosition = (col, row) => {
        const index = row * totalCols + col
        return monthGrid[index]?.date !== null
      }

      // 辅助函数：寻找下一个有效位置
      const findNextValidPosition = (currentCol, currentRow, direction) => {
        switch (direction) {
          case 'ArrowUp': {
            // 向上移动时，行数减少
            const newRow = currentRow - 1
            // 如果超出上边界或位置无效，则不移动
            if (newRow < 0 || !isValidPosition(currentCol, newRow)) {
              return null
            }
            return { col: currentCol, row: newRow }
          }
          case 'ArrowDown': {
            // 向下移动时，行数增加
            const newRow = currentRow + 1
            // 如果超出下边界或位置无效，则不移动
            if (newRow >= totalRows || !isValidPosition(currentCol, newRow)) {
              return null
            }
            return { col: currentCol, row: newRow }
          }
          case 'ArrowLeft': {
            // 向左移动时，列数减少
            const newCol = currentCol - 1
            // 如果超出左边界或位置无效，则不移动
            if (newCol < 0 || !isValidPosition(newCol, currentRow)) {
              return null
            }
            return { col: newCol, row: currentRow }
          }
          case 'ArrowRight': {
            // 向右移动时，列数增加
            const newCol = currentCol + 1
            // 如果超出右边界或位置无效，则不移动
            if (newCol >= totalCols || !isValidPosition(newCol, currentRow)) {
              return null
            }
            return { col: newCol, row: currentRow }
          }
        }
        return null
      }

      // 计算新位置
      const newPosition = findNextValidPosition(weekIndex, dayIndex, direction)
      if (newPosition) {
        newWeekIndex = newPosition.col
        newDayIndex = newPosition.row
      } else {
        return // 如果找不到有效位置，不移动
      }
    } else { // 桌面端逻辑保持不变
      switch (direction) {
        case 'ArrowUp':
          newDayIndex = (dayIndex - 1 + 7) % 7
          break
        case 'ArrowDown':
          newDayIndex = (dayIndex + 1) % 7
          break
        case 'ArrowLeft':
          newWeekIndex = (weekIndex - 1 + yearInfo.totalWeeks) % yearInfo.totalWeeks
          break
        case 'ArrowRight':
          newWeekIndex = (weekIndex + 1) % yearInfo.totalWeeks
          break
      }
    }

    // 更新贪吃蛇位置
    setSnake(prev => ({
      ...prev,
      headPosition: { weekIndex: newWeekIndex, dayIndex: newDayIndex },
      direction,
      body: [prev.headPosition, ...prev.body.slice(0, -1)]
    }))
  }

  // 在组件中使用更新后的逻辑
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        updateSnakePosition(e.key)
      }
    }

    if (isSnakeActive) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSnakeActive, selectedMonth, selectedYear])

  // 获取月度贡献总数
  const getMonthlyContributions = (year, month) => {
    return contributionData.reduce((sum, day) => {
      if (day.date.getFullYear() === year && day.date.getMonth() === month) {
        return sum + day.count
      }
      return sum
    }, 0)
  }

  // 获取月度活跃天数
  const getMonthlyActiveDays = (year, month) => {
    return contributionData.reduce((sum, day) => {
      if (day.date.getFullYear() === year && day.date.getMonth() === month && day.count > 0) {
        return sum + 1
      }
      return sum
    }, 0)
  }

  // 初始化宠物状态
  const [mobilePet, setMobilePet] = useState(() => {
    // 确保在客户端环境下执行
    if (typeof window === 'undefined') {
      return {
        position: { x: 0, y: 0 },
        isJumping: false,
        isHappy: false,
        isSleeping: false,
        isEating: false,
        mood: BLOG.PET.INITIAL_STATE.mood,
        energy: BLOG.PET.INITIAL_STATE.energy,
        lastInteractTime: Date.now(),
        lastMoveTime: Date.now(),
        direction: 'right',
        animation: '',
        level: BLOG.PET.INITIAL_STATE.level,
        exp: BLOG.PET.INITIAL_STATE.exp,
        achievements: []
      }
    }

    const saved = getSavedPetState()
    if (saved) {
      return {
        ...saved,
        lastInteractTime: Date.now(),
        lastMoveTime: Date.now(),
        animation: ''
      }
    }

    return {
      position: { x: 0, y: 0 },
      isJumping: false,
      isHappy: false,
      isSleeping: false,
      isEating: false,
      mood: BLOG.PET.INITIAL_STATE.mood,
      energy: BLOG.PET.INITIAL_STATE.energy,
      lastInteractTime: Date.now(),
      lastMoveTime: Date.now(),
      direction: 'right',
      animation: '',
      level: BLOG.PET.INITIAL_STATE.level,
      exp: BLOG.PET.INITIAL_STATE.exp,
      achievements: []
    }
  })

  // 定期保存宠物状态
  useEffect(() => {
    if (!mounted) return;

    const saveState = () => {
      const stateToSave = {
        position: mobilePet.position,
        isJumping: mobilePet.isJumping,
        isHappy: mobilePet.isHappy,
        isSleeping: mobilePet.isSleeping,
        isEating: mobilePet.isEating,
        mood: mobilePet.mood,
        energy: mobilePet.energy,
        direction: mobilePet.direction,
        level: mobilePet.level,
        exp: mobilePet.exp,
        achievements: mobilePet.achievements
      }
      savePetState(stateToSave)
    }

    // 立即保存一次当前状态
    saveState()

    // 设置定期保存
    const interval = setInterval(saveState, 5000) // 每5秒保存一次

    return () => {
      clearInterval(interval)
      // 组件卸载时保存一次
      saveState()
    }
  }, [mobilePet, mounted])

  // 检查成就
  const checkAchievements = useCallback((state) => {
    const newAchievements = []
    
    // 检查等级成就
    BLOG.PET.ACHIEVEMENTS.LEVEL_MILESTONES.forEach(milestone => {
      if (state.level >= milestone && !state.achievements.includes(`LEVEL_${milestone}`)) {
        newAchievements.push(`LEVEL_${milestone}`)
      }
    })

    // 检查贡献成就
    const totalContributions = contributionData.reduce((sum, day) => sum + day.count, 0)
    BLOG.PET.ACHIEVEMENTS.CONTRIBUTION_MILESTONES.forEach(milestone => {
      if (totalContributions >= milestone && !state.achievements.includes(`CONTRIBUTION_${milestone}`)) {
        newAchievements.push(`CONTRIBUTION_${milestone}`)
      }
    })

    if (newAchievements.length > 0) {
      setMobilePet(prev => ({
        ...prev,
        achievements: [...prev.achievements, ...newAchievements],
        isHappy: true,
        mood: Math.min(100, prev.mood + BLOG.PET.STATUS_CHANGE.PLAY_MOOD_BOOST)
      }))
    }
  }, [contributionData])

  // 修改宠物互动函数
  const interactWithPet = useCallback((contribution) => {
    const now = Date.now()
    setMobilePet(prev => {
      if (now - prev.lastInteractTime < 1000) return prev;

      const expGain = contribution.count * BLOG.PET.EXP_GAIN_FACTOR.UPDATE
      const newExp = prev.exp + expGain
      const expNeeded = prev.level * BLOG.PET.LEVEL_UP_EXP_FACTOR
      
      let newLevel = prev.level
      let remainingExp = newExp
      let isLevelUp = false
      
      if (newExp >= expNeeded) {
        newLevel = prev.level + 1
        remainingExp = newExp - expNeeded
        isLevelUp = true
      }

      const newState = {
        ...prev,
        isHappy: true,
        isEating: true,
        mood: Math.min(100, prev.mood + BLOG.PET.STATUS_CHANGE.PLAY_MOOD_BOOST),
        energy: Math.min(100, prev.energy + BLOG.PET.STATUS_CHANGE.FEED_RECOVER),
        lastInteractTime: now,
        exp: remainingExp,
        level: newLevel,
        animation: isLevelUp ? 'levelup' : 'eat',
        isLevelUp
      }

      // 立即保存状态
      savePetState({
        ...newState,
        isJumping: false,
        animation: ''
      })

      return newState
    })
  }, [])

  // 自动行为
  useEffect(() => {
    const interval = setInterval(() => {
      setMobilePet(prev => {
        const now = Date.now()
        const timeSinceLastMove = now - prev.lastMoveTime
        const timeSinceLastInteract = now - prev.lastInteractTime

        // 自动降低状态
        let newMood = Math.max(0, prev.mood - BLOG.PET.STATUS_CHANGE.MOOD_DECAY)
        let newEnergy = Math.max(0, prev.energy - BLOG.PET.STATUS_CHANGE.ENERGY_DECAY)

        // 如果长时间没有互动，进入睡眠状态
        const isSleeping = timeSinceLastInteract > 30000
        
        // 如果能量太低，也进入睡眠状态
        if (newEnergy < 20 || isSleeping) {
          newEnergy = Math.min(100, newEnergy + BLOG.PET.STATUS_CHANGE.SLEEP_RECOVER)
        }

        return {
          ...prev,
          mood: newMood,
          energy: newEnergy,
          isSleeping: isSleeping,
          animation: isSleeping ? 'sleep' : prev.animation
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // 添加更多动画序列
  const KIRBY_ANIMATIONS = {
    IDLE: [
      '/Kirby/shime1.png',
      '/Kirby/shime2.png',
      '/Kirby/shime3.png',
      '/Kirby/shime9.png',
      '/Kirby/shime11.png'
    ],
    WALK: [
      '/Kirby/shimer1.png',
      '/Kirby/shimer2.png',
      '/Kirby/shimer3.png',
      '/Kirby/shimer4.png',
      '/Kirby/shimer5.png',
      '/Kirby/shimer6.png',
      '/Kirby/shimer7.png',
      '/Kirby/shimer8.png'
    ],
    SIT: [
      '/Kirby/shimesit1.png',
      '/Kirby/shimesit2.png',
      '/Kirby/shimesit3.png'
    ],
    SLEEP: [
      '/Kirby/shimesleep1.png',
      '/Kirby/shimesleep2.png',
      '/Kirby/shimesleep3.png',
      '/Kirby/shimesleep4.png',
      '/Kirby/shimesleep5.png'
    ],
    EAT: [
      '/Kirby/shimeie1.png',
      '/Kirby/shimeie2.png',
      '/Kirby/shimeie3.png',
      '/Kirby/shimeie4.png',
      '/Kirby/shimeie5.png'
    ],
    HAPPY: [
      '/Kirby/shimeshake1.png',
      '/Kirby/shimeshake1a.png',
      '/Kirby/shimeshake1b.png',
      '/Kirby/shimeshake3.png',
      '/Kirby/shimeshake4.png'
    ],
    FLY: [
      '/Kirby/shimefly1.png',
      '/Kirby/shimefly2.png',
      '/Kirby/shimefly3.png',
      '/Kirby/shimefly4.png',
      '/Kirby/shimefly5.png',
      '/Kirby/shimefly6.png'
    ],
    TRANSFORM: [
      '/Kirby/shimetf1.png',
      '/Kirby/shimetf3.png',
      '/Kirby/shimetf5.png',
      '/Kirby/shimetf11.png',
      '/Kirby/shimetf13.png'
    ]
  };

  // 添加自由行动状态
  const [autoAction, setAutoAction] = useState({
    type: 'IDLE',
    targetX: 0,
    targetY: 0,
    startTime: Date.now(),
    duration: 3000
  });

  // 添加动画帧状态
  const [currentFrame, setCurrentFrame] = useState(0);
  const [animationType, setAnimationType] = useState('IDLE');

  // 自动切换动画帧
  useEffect(() => {
    if (!mounted) return;

    const frameInterval = setInterval(() => {
      if (KIRBY_ANIMATIONS[animationType]) {
        setCurrentFrame(prev => (prev + 1) % KIRBY_ANIMATIONS[animationType].length);
      }
    }, 150);

    return () => clearInterval(frameInterval);
  }, [animationType, mounted]);

  // 自由行动逻辑
  useEffect(() => {
    if (!mounted || !mobilePet) return;
    if (mobilePet.isSleeping || mobilePet.isEating || mobilePet.isHappy || mobilePet.animation) return;

    const actionInterval = setInterval(() => {
      const now = Date.now();
      
      if (now - autoAction.startTime >= autoAction.duration) {
        const rand = Math.random();
        let newAction;

        if (rand < 0.2) { // 20% 概率走动
          const maxX = window.innerWidth < 768 ? 6 : yearInfo.totalWeeks - 1;
          const maxY = 6;
          newAction = {
            type: 'WALK',
            targetX: Math.floor(Math.random() * maxX),
            targetY: Math.floor(Math.random() * maxY),
            startTime: now,
            duration: 3000 + Math.random() * 2000
          };
        } else if (rand < 0.4) { // 20% 概率飞行
          newAction = {
            type: 'FLY',
            targetX: mobilePet.position.x,
            targetY: mobilePet.position.y,
            startTime: now,
            duration: 2000 + Math.random() * 2000
          };
        } else if (rand < 0.6) { // 20% 概率坐下
          newAction = {
            type: 'SIT',
            targetX: mobilePet.position.x,
            targetY: mobilePet.position.y,
            startTime: now,
            duration: 4000 + Math.random() * 2000
          };
        } else { // 40% 概率待机
          newAction = {
            type: 'IDLE',
            targetX: mobilePet.position.x,
            targetY: mobilePet.position.y,
            startTime: now,
            duration: 2000 + Math.random() * 3000
          };
        }

        setAutoAction(newAction);
        setAnimationType(newAction.type);
        setCurrentFrame(0);

        // 如果是移动类动作，更新宠物位置
        if (newAction.type === 'WALK' || newAction.type === 'FLY') {
          const newDirection = newAction.targetX > mobilePet.position.x ? 'right' : 'left';
          setMobilePet(prev => ({
            ...prev,
            position: { x: newAction.targetX, y: newAction.targetY },
            direction: newDirection,
            energy: Math.max(0, prev.energy - 5),
            lastMoveTime: now
          }));
        }
      }
    }, 100);

    return () => clearInterval(actionInterval);
  }, [mobilePet, autoAction, mounted, yearInfo?.totalWeeks]);

  // 修改获取图片的逻辑
  const getKirbyImage = useCallback(() => {
    const animations = KIRBY_ANIMATIONS[animationType];
    if (!animations) return KIRBY_ANIMATIONS.IDLE[0];
    return animations[currentFrame % animations.length];
  }, [animationType, currentFrame]);

  // 修改动画状态监听
  useEffect(() => {
    if (!mounted || !mobilePet) return;

    let newType = 'IDLE';
    if (mobilePet.isSleeping) {
      newType = 'SLEEP';
    } else if (mobilePet.isEating) {
      newType = 'EAT';
    } else if (mobilePet.isHappy) {
      newType = 'HAPPY';
    } else if (mobilePet.animation === 'levelup') {
      newType = 'TRANSFORM';
    }

    if (newType !== animationType) {
      setAnimationType(newType);
      setCurrentFrame(0);
    }
  }, [mobilePet, mounted, animationType]);

  // 渲染宠物
  const renderPet = useCallback((isPetHere, mobilePet) => {
    if (!isPetHere || !mobilePet) return null;

    const getAnimationClass = () => {
      const baseClass = 'transition-all duration-300';
      switch (animationType) {
        case 'WALK':
          return `${baseClass} animate-kirby-walk`;
        case 'FLY':
          return `${baseClass} animate-kirby-float`;
        case 'SIT':
          return `${baseClass} animate-kirby-sit`;
        case 'SLEEP':
          return `${baseClass} animate-kirby-sleep`;
        case 'EAT':
          return `${baseClass} animate-kirby-eat`;
        case 'HAPPY':
          return `${baseClass} animate-kirby-happy`;
        case 'TRANSFORM':
          return `${baseClass} animate-kirby-transform`;
        default:
          return `${baseClass} animate-kirby-idle`;
      }
    };

    return (
      <div className={`absolute inset-0 flex items-center justify-center ${getAnimationClass()}`}>
        <div className={`w-12 h-12 md:w-16 md:h-16 relative transform transition-all duration-300 
          ${mobilePet.isHappy ? 'scale-110' : 'scale-100'} 
          ${mobilePet.direction === 'left' ? 'scale-x-[-1]' : ''}`}>
          
          {/* 阴影效果 */}
          <div className="absolute -bottom-2 left-1/2 w-8 h-2 bg-black/10 dark:bg-black/20 rounded-full blur-sm transform -translate-x-1/2"></div>
          
          {/* 光环效果 */}
          {mobilePet.isHappy && (
            <div className="absolute -inset-4">
              <div className="absolute inset-0 animate-kirby-halo rounded-full bg-gradient-to-r from-pink-200/30 via-yellow-200/30 to-pink-200/30"></div>
              <div className="absolute inset-0 animate-kirby-glow rounded-full bg-gradient-to-r from-pink-300/20 via-yellow-300/20 to-pink-300/20"></div>
              {/* 星星特效 */}
              <div className="absolute inset-0 animate-kirby-stars">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-yellow-300"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animation: `kirby-twinkle ${1 + Math.random()}s ease-in-out infinite ${Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Kirby 图片容器 */}
          <div className="relative w-full h-full">
            {/* 发光效果 */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-50"></div>
            
            {/* Kirby 图片 */}
            <img 
              src={getKirbyImage()} 
              alt="Kirby"
              className={`w-full h-full object-contain transition-all duration-300 
                ${mobilePet.isSleeping ? 'opacity-75 filter blur-[0.5px]' : 'opacity-100'}
                drop-shadow-lg hover:drop-shadow-2xl`}
              style={{
                imageRendering: 'pixelated'
              }}
            />

            {/* 睡眠特效 */}
            {mobilePet.isSleeping && (
              <div className="absolute -top-4 -right-2 animate-kirby-sleep-bubble">
                <div className="w-4 h-4 bg-blue-50 dark:bg-blue-900/50 rounded-full animate-kirby-bubble"></div>
                <div className="w-3 h-3 bg-blue-50 dark:bg-blue-900/50 rounded-full animate-kirby-bubble-delay"></div>
              </div>
            )}
          </div>

          {/* 等级提示 */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-pink-400 to-red-500 rounded-full text-xs text-white font-bold flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-300">
            <div className="relative">
              {mobilePet.level}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-full animate-kirby-pulse"></div>
            </div>
          </div>

          {/* 特殊状态效果 */}
          {mobilePet.animation === 'levelup' && (
            <div className="absolute -inset-6">
              <div className="absolute inset-0 animate-kirby-levelup-ring rounded-full border-2 border-yellow-400/50"></div>
              <div className="absolute inset-0 animate-kirby-levelup-glow rounded-full bg-yellow-400/20"></div>
              <div className="absolute inset-0 animate-kirby-sparkle">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-yellow-300"
                    style={{
                      top: `${50 + 40 * Math.cos(2 * Math.PI * i / 8)}%`,
                      left: `${50 + 40 * Math.sin(2 * Math.PI * i / 8)}%`,
                      animation: `kirby-sparkle ${0.5 + Math.random()}s ease-in-out infinite ${Math.random()}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [getKirbyImage, animationType]);

  // 添加新的动画样式
  const kirbyStyles = `
    /* Kirby 基础动画 */
    @keyframes kirby-walk {
      0%, 100% { transform: translateY(0) scale(1); }
      25% { transform: translateY(-2px) scale(1.05, 0.95); }
      75% { transform: translateY(0) scale(0.95, 1.05); }
    }

    @keyframes kirby-float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25% { transform: translateY(-4px) rotate(2deg); }
      75% { transform: translateY(-2px) rotate(-2deg); }
    }

    @keyframes kirby-sit {
      0%, 100% { transform: scale(1, 0.95); }
      50% { transform: scale(0.95, 1); }
    }

    @keyframes kirby-sleep {
      0%, 100% { transform: translateY(0) scale(1, 0.95); }
      50% { transform: translateY(-2px) scale(0.95, 1); }
    }

    @keyframes kirby-eat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1, 0.9); }
    }

    @keyframes kirby-happy {
      0%, 100% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(-5deg) scale(1.05); }
      75% { transform: rotate(5deg) scale(1.05); }
    }

    @keyframes kirby-transform {
      0% { transform: scale(1) rotate(0deg); }
      25% { transform: scale(1.2) rotate(90deg); }
      50% { transform: scale(0.8) rotate(180deg); }
      75% { transform: scale(1.1) rotate(270deg); }
      100% { transform: scale(1) rotate(360deg); }
    }

    /* 特效动画 */
    @keyframes kirby-bubble {
      0% { transform: scale(0) translate(0, 0); opacity: 0; }
      50% { transform: scale(1) translate(-5px, -5px); opacity: 0.8; }
      100% { transform: scale(0) translate(-10px, -10px); opacity: 0; }
    }

    @keyframes kirby-sparkle {
      0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
      50% { transform: scale(1) rotate(180deg); opacity: 1; }
    }

    @keyframes kirby-pulse {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.1); }
    }

    @keyframes kirby-halo {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.1); opacity: 0.6; }
    }

    /* 应用动画类 */
    .animate-kirby-walk { animation: kirby-walk 0.6s ease-in-out infinite; }
    .animate-kirby-float { animation: kirby-float 2s ease-in-out infinite; }
    .animate-kirby-sit { animation: kirby-sit 2s ease-in-out infinite; }
    .animate-kirby-sleep { animation: kirby-sleep 2s ease-in-out infinite; }
    .animate-kirby-eat { animation: kirby-eat 0.4s ease-in-out infinite; }
    .animate-kirby-happy { animation: kirby-happy 1s ease-in-out infinite; }
    .animate-kirby-transform { animation: kirby-transform 1s ease-in-out; }
    .animate-kirby-bubble { animation: kirby-bubble 3s ease-in-out infinite; }
    .animate-kirby-bubble-delay { animation: kirby-bubble 3s ease-in-out infinite 1.5s; }
    .animate-kirby-sparkle { animation: kirby-sparkle 1s ease-in-out infinite; }
    .animate-kirby-pulse { animation: kirby-pulse 2s ease-in-out infinite; }
    .animate-kirby-halo { animation: kirby-halo 2s ease-in-out infinite; }
  `;

  // 添加样式
  const petStyles = `
    @keyframes eat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    @keyframes happy {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-15deg); }
      75% { transform: rotate(15deg); }
    }
    @keyframes sleep {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }
    @keyframes idle {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes pulse-slow {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.6; }
    }
    @keyframes ping-slow {
      0% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.2); opacity: 0.6; }
      100% { transform: scale(1); opacity: 0.3; }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes reverse-spin {
      from { transform: rotate(360deg); }
      to { transform: rotate(0deg); }
    }
    .animate-eat {
      animation: eat 0.5s ease-in-out infinite;
    }
    .animate-happy {
      animation: happy 0.5s ease-in-out infinite;
    }
    .animate-sleep {
      animation: sleep 2s ease-in-out infinite;
    }
    .animate-idle {
      animation: idle 2s ease-in-out infinite;
    }
    .animate-pulse-slow {
      animation: pulse-slow 2s ease-in-out infinite;
    }
    .animate-ping-slow {
      animation: ping-slow 2s ease-in-out infinite;
    }
    .animate-spin-slow {
      animation: spin-slow 3s linear infinite;
    }
    .animate-reverse-spin {
      animation: reverse-spin 3s linear infinite;
    }
  `;

  // 宠物移动逻辑
  const movePet = useCallback((x, y) => {
    setMobilePet(prev => {
      const newDirection = x > prev.position.x ? 'right' : 'left'
      const distance = Math.sqrt(Math.pow(x - prev.position.x, 2) + Math.pow(y - prev.position.y, 2))
      const energyCost = Math.min(10, Math.floor(distance * 2))
      
      // 如果能量不足，不允许移动
      if (prev.energy < energyCost) {
        return {
          ...prev,
          isHappy: false,
          animation: 'tired'
        }
      }

      // 计算新状态
      const newState = {
        ...prev,
        position: { x, y },
        isJumping: true,
        direction: newDirection,
        energy: Math.max(0, prev.energy - energyCost),
        animation: 'jump',
        lastMoveTime: Date.now()
      }

      // 检查是否达到移动相关的成就
      const totalMoves = (prev.achievements.find(a => a.startsWith('MOVES_'))?.split('_')[1] || 0) + 1
      if (totalMoves % 100 === 0) {
        newState.achievements = [...prev.achievements, `MOVES_${totalMoves}`]
        newState.isHappy = true
        newState.mood = Math.min(100, prev.mood + BLOG.PET.STATUS_CHANGE.PLAY_MOOD_BOOST)
      }

      return newState
    })
    
    // 跳跃动画结束后恢复状态
    setTimeout(() => {
      setMobilePet(prev => ({
        ...prev,
        isJumping: false,
        animation: prev.isHappy ? 'happy' : ''
      }))
    }, 500)
  }, [])

  // 修改点击事件处理函数
  const handleCellClick = useCallback((col, row, contribution) => {
    if (!contribution) return
    
    // 如果宠物正在睡眠，先唤醒它
    setMobilePet(prev => ({
      ...prev,
      isSleeping: false,
      animation: ''
    }))

    // 移动宠物
    movePet(col, row)

    // 延迟一下再触发互动，让移动动画更流畅
    setTimeout(() => {
      interactWithPet(contribution)
    }, 300)
  }, [movePet, interactWithPet])

  // 移动端内容渲染
  const renderMobileContent = () => {
    if (!mounted) {
      return (
        <div className="min-h-[600px] bg-white dark:bg-gray-800 rounded-xl animate-pulse">
          <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-t-xl"></div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1.5">
              {Array(7).fill(0).map((_, i) => (
                <div key={i} className="h-8 bg-gray-50 dark:bg-gray-900 rounded-md"></div>
              ))}
              {Array(35).fill(0).map((_, i) => (
                <div key={i + 7} className="aspect-square bg-gray-50 dark:bg-gray-900 rounded-md"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* 宠物信息面板 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 宠物头像 */}
              <div className={`w-12 h-12 relative rounded-full bg-gradient-to-br from-yellow-300 to-yellow-400 
                shadow-lg flex items-center justify-center ${mobilePet.isSleeping ? 'opacity-75' : 'opacity-100'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
                {/* 宠物表情 */}
                {mobilePet.isSleeping ? (
                  <>
                    <div className="absolute top-4 left-3 w-2 h-1 bg-gray-600 rounded-full transform rotate-12"></div>
                    <div className="absolute top-4 right-3 w-2 h-1 bg-gray-600 rounded-full transform -rotate-12"></div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-4 left-3 w-2 h-2 rounded-full bg-gray-700">
                      <div className="absolute top-0 left-1 w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    <div className="absolute top-4 right-3 w-2 h-2 rounded-full bg-gray-700">
                      <div className="absolute top-0 left-1 w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    {mobilePet.isEating ? (
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                    ) : mobilePet.isHappy ? (
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-3 h-1.5 border-2 border-gray-700 border-t-0 rounded-b-full"></div>
                    ) : (
                      <div className="absolute bottom-3.5 left-1/2 transform -translate-x-1/2 w-2 h-0.5 bg-gray-700 rounded-full"></div>
                    )}
                  </>
                )}
                {/* 等级标志 */}
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full text-[10px] text-white font-bold flex items-center justify-center shadow-lg">
                  {mobilePet.level}
                </div>
              </div>
              {/* 宠物状态 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">心情</span>
                  <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-300"
                      style={{ width: `${mobilePet.mood}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">能量</span>
                  <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-yellow-500 transition-all duration-300"
                      style={{ width: `${mobilePet.energy}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            {/* 经验值 */}
            <div className="flex flex-col items-end gap-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                经验值: {mobilePet.exp}/{mobilePet.level * 100}
              </div>
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
                  style={{ width: `${(mobilePet.exp / (mobilePet.level * 100)) * 100}%` }}></div>
              </div>
            </div>
          </div>
          {/* 宠物状态提示 */}
          <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            {mobilePet.isSleeping ? '💤 休息中...' :
             mobilePet.isEating ? '🍖 进食中...' :
             mobilePet.isHappy ? '🎉 非常开心!' :
             mobilePet.energy < 30 ? '😪 有点累了...' :
             '🌟 状态良好'}
          </div>
        </div>

        {/* 月份选择器 */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="flex items-center justify-center gap-4 px-2">
            <button
              onClick={() => {
                const newMonth = selectedMonth > 0 ? selectedMonth - 1 : 11
                setSelectedMonth(newMonth)
              }}
              className="p-2 text-gray-500 hover:text-emerald-500 dark:text-gray-400 transition-all duration-300 hover:scale-110"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="text-base font-semibold text-gray-700 dark:text-gray-300 min-w-[4rem] text-center">
              {['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'][selectedMonth]}
            </span>
            <button
              onClick={() => {
                const newMonth = selectedMonth < 11 ? selectedMonth + 1 : 0
                setSelectedMonth(newMonth)
              }}
              className="p-2 text-gray-500 hover:text-emerald-500 dark:text-gray-400 transition-all duration-300 hover:scale-110"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        {/* 月份贡献网格 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-1.5">
            {/* 星期标签 */}
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div key={day} className="h-8 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{day}</span>
              </div>
            ))}

            {/* 当月日期格子 */}
            {getMonthGrid(selectedYear, selectedMonth).map((day, index) => {
              const row = Math.floor(index / 7);
              const col = index % 7;
              const isPetHere = mobilePet.position.x === col && mobilePet.position.y === row;
              const hasContribution = day.contribution && day.contribution.count > 0;

              return (
                <div
                  key={index}
                  className={`aspect-square rounded-md ${
                    day.contribution
                      ? getContributionClass(day.contribution.count)
                      : 'bg-gray-50 dark:bg-gray-900'
                  } transition-all duration-300 relative group touch-manipulation ${
                    hasContribution ? 'hover:scale-110 active:scale-95' : ''
                  } ${isPetHere ? 'cell-active' : ''}`}
                  onClick={(e) => {
                    if (day.contribution) {
                      handleCellClick(col, row, day.contribution);
                    }
                  }}
                  onTouchStart={(e) => {
                    // 记录触摸开始的位置
                    const touch = e.touches[0];
                    const startX = touch.clientX;
                    const startY = touch.clientY;
                    
                    // 将起始位置保存到元素的自定义属性中
                    e.currentTarget.setAttribute('data-touch-start-x', startX);
                    e.currentTarget.setAttribute('data-touch-start-y', startY);
                  }}
                  onTouchMove={(e) => {
                    // 防止页面滚动
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    // 获取触摸结束的位置
                    const touch = e.changedTouches[0];
                    const endX = touch.clientX;
                    const endY = touch.clientY;
                    
                    // 获取起始位置
                    const startX = parseFloat(e.currentTarget.getAttribute('data-touch-start-x'));
                    const startY = parseFloat(e.currentTarget.getAttribute('data-touch-start-y'));
                    
                    // 计算移动距离
                    const moveX = Math.abs(endX - startX);
                    const moveY = Math.abs(endY - startY);
                    
                    // 如果移动距离小于阈值，则认为是点击
                    if (moveX < 10 && moveY < 10) {
                      if (day.contribution) {
                        handleCellClick(col, row, day.contribution);
                      }
                    }
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-white/0 to-white/20 dark:from-white/0 dark:to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md ${
                    hasContribution ? 'group-hover:animate-shine' : ''
                  }`}></div>
                  {isPetHere && (
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-30 blur-sm animate-pulse-glow"></div>
                  )}
                  {isPetHere && renderPet(isPetHere, mobilePet)}
                  {day.date && (
                    <div className="opacity-0 group-hover:opacity-100 group-active:opacity-100 fixed left-1/2 bottom-24 -translate-x-1/2 bg-gray-800/90 dark:bg-gray-700/90 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all duration-200 z-[9999] shadow-lg backdrop-blur-sm transform scale-100 max-w-[90vw] pointer-events-none">
                    {formatTooltip(day.contribution)}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 transform rotate-45 w-2 h-2 bg-gray-800/90 dark:bg-gray-700/90 backdrop-blur-sm"></div>
                  </div>
                  )}
                  {day.date && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500 opacity-50 pointer-events-none transition-all duration-300 group-hover:opacity-80 group-hover:scale-110">
                      {day.date.getDate()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 月度统计 */}
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">当月贡献</div>
                <div className="text-2xl font-bold text-emerald-500">{getMonthlyContributions(selectedYear, selectedMonth)}</div>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">活跃天数</div>
                <div className="text-2xl font-bold text-emerald-500">{getMonthlyActiveDays(selectedYear, selectedMonth)}</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className={`mb-12 bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg relative overflow-hidden transform hover:scale-[1.01] transition-all duration-500 ease-out ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* 高级背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 dark:from-emerald-500/10 dark:via-green-500/5 dark:to-teal-500/10 transition-colors duration-300"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>

      {/* 动态装饰图案 */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-500/20 to-green-500/20 blur-3xl transform rotate-45 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 blur-3xl transform -rotate-45 animate-pulse [animation-delay:1s]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)] pointer-events-none"></div>

      {/* 标题区域 */}
      <div className="relative z-10 flex items-center justify-center md:justify-between mb-8 group">
        <div className="flex items-center gap-3 md:gap-3">
          <div className="flex items-center gap-2 relative">
            <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <i className="fas fa-history text-base md:text-xl text-emerald-500 dark:text-emerald-400 transform transition-all duration-500 hover:rotate-[360deg] relative"></i>
            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200 tracking-wide group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-all duration-300 relative">
              Article Updates
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-500"></span>
            </h3>
          </div>
          <div className="flex items-center gap-2 md:gap-2">
            <button
              onClick={handlePrevYear}
              disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
              className="p-1.5 md:p-2 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-110 hover:rotate-12 relative group/btn"
            >
              <span className="absolute inset-0 bg-emerald-500/10 rounded-full scale-0 group-hover/btn:scale-100 transition-transform duration-300"></span>
              <i className="fas fa-chevron-left text-sm md:text-sm relative z-10"></i>
            </button>
            <span className="text-base md:text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[3rem] md:min-w-[4rem] text-center tracking-wider transition-all duration-300 hover:text-emerald-500 dark:hover:text-emerald-400 relative group/year">
              {selectedYear}
              <span className="absolute -bottom-1 left-0 w-full h-px bg-emerald-500/50 scale-x-0 group-hover/year:scale-x-100 transition-transform duration-300 origin-left"></span>
            </span>
            <button
              onClick={handleNextYear}
              disabled={availableYears.indexOf(selectedYear) === 0}
              className="p-1.5 md:p-2 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-110 hover:-rotate-12 relative group/btn"
            >
              <span className="absolute inset-0 bg-emerald-500/10 rounded-full scale-0 group-hover/btn:scale-100 transition-transform duration-300"></span>
              <i className="fas fa-chevron-right text-sm md:text-sm relative z-10"></i>
            </button>
          </div>
          <div className="relative group/counter">
            <span className="inline-flex items-center px-3 md:px-4 py-1.5 text-base md:text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/30 rounded-full shadow-sm transition-all duration-300 group-hover/counter:shadow-emerald-500/20 group-hover/counter:shadow-lg relative">
              <span className="relative z-10 whitespace-nowrap">{totalContributions} Contributions</span>
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 group-hover/counter:translate-x-full transition-transform duration-1000 ease-in-out"></span>
            </span>
          </div>
          {/* 贪吃蛇开关按钮 */}
          <button
            onClick={toggleSnake}
            className={`hidden md:block p-2 rounded-full transition-all duration-300 ${isSnakeActive
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            <i className="fas fa-snake text-lg"></i>
          </button>
        </div>
      </div>

      {/* 贡献图表 */}
      <div className="relative z-10">
        {/* 桌面端贡献图 */}
        <div className="hidden md:block">
          <div className="flex flex-row gap-2">
            <div className="flex-grow pl-10">
              {/* 月份标签 */}
              <div className="relative h-6 mb-2">
                {Array.from({ length: 12 }).map((_, monthIndex) => {
                  const firstDayOfMonth = new Date(selectedYear, monthIndex, 1)
                  const daysSinceYearStart = Math.floor((firstDayOfMonth - new Date(selectedYear, 0, 1)) / (24 * 60 * 60 * 1000))
                  const weekIndex = Math.floor((daysSinceYearStart + yearInfo.firstDayOfWeek) / 7)
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                  const leftOffset = (weekIndex / yearInfo.totalWeeks) * 100

                  return (
                    <span
                      key={monthIndex}
                      className="absolute text-xs font-medium text-gray-500/80 dark:text-gray-400/80 tracking-wider hover:text-emerald-500 dark:hover:text-emerald-400 transition-all duration-300 hover:-translate-y-0.5 hover:font-semibold"
                      style={{
                        left: `${leftOffset}%`,
                        transform: `translateX(-${monthIndex === 0 ? 0 : 50}%) translateY(${isLoaded ? '0' : '0.5rem'})`,
                        opacity: isLoaded ? 1 : 0,
                        transition: `all 0.5s ease-out ${monthIndex * 0.05}s`
                      }}
                    >
                      {months[monthIndex]}
                    </span>
                  )
                })}
              </div>

              {/* 贡献格子 */}
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${yearInfo.totalWeeks}, minmax(0, 1fr))` }}>
                {Array.from({ length: yearInfo.totalWeeks }).map((_, weekIndex) => (
                  <div key={weekIndex} className="grid grid-rows-7 gap-1">
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      let dataIndex = weekIndex * 7 + dayIndex - yearInfo.firstDayOfWeek
                      const isValidDate = dataIndex >= 0 && dataIndex < contributionData.length
                      const contribution = isValidDate ? contributionData[dataIndex] : null
                      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                      const isFirstColumn = weekIndex === 0
                      const isEaten = eatenCells.has(`${weekIndex}-${dayIndex}`)

                      return (
                        <div key={dayIndex} className="relative" style={{
                          opacity: isLoaded ? 1 : 0,
                          transform: isLoaded ? 'scale(1)' : 'scale(0.8)',
                          transition: `all 0.5s ease-out ${(weekIndex * 7 + dayIndex) * 0.002}s`
                        }}>
                          {isFirstColumn && [1, 3, 5].includes(dayIndex) && (
                            <span className="absolute right-full mr-2 text-xs font-medium text-gray-500/80 dark:text-gray-400/80 w-10 whitespace-nowrap text-left tracking-wide hover:text-emerald-500 dark:hover:text-emerald-400 transition-all duration-300 hover:-translate-x-0.5 hover:font-semibold" style={{ top: '0' }}>
                              {weekDays[dayIndex]}
                            </span>
                          )}
                          <div
                            className={`w-3 h-3 rounded-sm ${snake.isSnakeHead(weekIndex, dayIndex)
                              ? `${snake.isRage ? 'snake-head rage' : 'snake-head'} z-20`
                              : (() => {
                                const bodyStyle = snake.getSnakeBodyStyle(weekIndex, dayIndex)
                                if (bodyStyle) {
                                  return `${bodyStyle.style} z-10`
                                }
                                return isEaten && contribution && contribution.count > 0
                                  ? 'bg-gray-200 dark:bg-gray-700'
                                  : isValidDate
                                    ? (contribution ? getContributionClass(contribution.count) : 'bg-gray-200 dark:bg-gray-700')
                                    : 'bg-transparent'
                              })()
                              } transition-all duration-300 hover:scale-150 hover:rotate-45 cursor-pointer group relative overflow-hidden`}
                            style={(() => {
                              const bodyStyle = snake.getSnakeBodyStyle(weekIndex, dayIndex)
                              if (bodyStyle) {
                                return {
                                  transform: `scale(${bodyStyle.scale}) ${bodyStyle.transform}`,
                                  opacity: bodyStyle.opacity,
                                  '--index': bodyStyle['--index'],
                                  '--rotate-deg': bodyStyle['--rotate-deg'],
                                  '--glow-color': bodyStyle['--glow-color'],
                                  '--pulse-speed': bodyStyle['--pulse-speed']
                                }
                              }
                              return {}
                            })()}
                            title={isValidDate ? formatTooltip(contribution) : ''}
                          >
                            {snake.isSnakeHead(weekIndex, dayIndex) && (
                              <>
                                <div className={`absolute inset-0 bg-gradient-to-br ${snake.isRage
                                  ? 'from-red-400 via-red-500 to-red-600 dark:from-red-500 dark:via-red-600 dark:to-red-700'
                                  : 'from-yellow-300 via-yellow-400 to-yellow-500 dark:from-yellow-400 dark:via-yellow-500 dark:to-yellow-600'
                                  } animate-pulse rounded-sm overflow-hidden ${snake.isRage ? 'snake-head rage' : 'snake-head'}`}>
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"></div>
                                </div>
                                <div className={`absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-black dark:bg-white ${snake.isRage ? 'snake-eyes rage' : 'snake-eyes'}`}>
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-full"></div>
                                </div>
                                <div className={`absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-black dark:bg-white ${snake.isRage ? 'snake-eyes rage' : 'snake-eyes'}`}>
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-full"></div>
                                </div>
                                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-0.5 ${snake.isRage ? 'bg-red-600/90 dark:bg-red-500/90' : 'bg-red-500/80 dark:bg-red-400/80'
                                  } rounded-full transform -translate-y-0.5`}>
                                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full"></div>
                                </div>
                              </>
                            )}
                            {(() => {
                              const bodyStyle = snake.getSnakeBodyStyle(weekIndex, dayIndex)
                              if (bodyStyle) {
                                return (
                                  <>
                                    {!bodyStyle.isRage && (
                                      <>
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 to-yellow-400 dark:from-yellow-300 dark:to-yellow-500 opacity-${Math.floor(bodyStyle.opacity * 100)}"></div>
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/20 dark:from-white/0 dark:to-white/10"></div>
                                      </>
                                    )}
                                  </>
                                )
                              }
                              return null
                            })()}
                            {isEaten && contribution && contribution.count > 0 && !snake.getSnakeBodyStyle(weekIndex, dayIndex) && (
                              <>
                                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 transition-all duration-300"></div>
                                <div className={`absolute inset-0 border-2 border-emerald-400/50 dark:border-emerald-500/50 rounded-sm animate-[borderGlow_2s_ease-in-out_infinite]`}></div>
                                <div className={`absolute inset-0 ${getGlowColor(contribution.count)} animate-[breathe_2s_ease-in-out_infinite]`}></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/20 dark:from-white/0 dark:to-white/10"></div>
                              </>
                            )}
                            {!snake.isSnakeHead(weekIndex, dayIndex) && !snake.getSnakeBodyStyle(weekIndex, dayIndex) && !isEaten && (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/20 dark:from-white/0 dark:to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/10 transition-colors duration-300"></div>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 移动端贡献图 - 垂直布局 */}
        <div className="block md:hidden">
          {renderMobileContent()}
        </div>

        {/* 图例 */}
        <div className="flex justify-center md:justify-end gap-3 mt-6 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-medium">较少</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`w-3 h-3 rounded-sm ${getContributionClass(level)} transition-transform duration-200 hover:scale-125`}
                />
              ))}
            </div>
            <span className="font-medium">较多</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .grid-cols-52 {
          grid-template-columns: repeat(52, minmax(0, 1fr));
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes glow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }
        @keyframes borderPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes breathe {
          0%, 100% { 
            box-shadow: 0 0 15px rgba(16,185,129,0.4);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 25px rgba(16,185,129,0.6);
            transform: scale(1.05);
          }
        }
        @keyframes borderGlow {
          0%, 100% { 
            border-color: rgba(16,185,129,0.4);
            box-shadow: 0 0 10px rgba(16,185,129,0.3);
          }
          50% { 
            border-color: rgba(16,185,129,0.8);
            box-shadow: 0 0 20px rgba(16,185,129,0.6);
          }
        }

        /* 添加移动端滚动条样式 */
        .overflow-x-auto {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }

        /* 添加移动端平滑滚动 */
        @media (max-width: 768px) {
          .min-w-[800px] {
            scroll-behavior: smooth;
          }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-25%); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes pulse {
          50% { opacity: .5; }
        }
      `}</style>
      <style jsx global>{`
        .contribution-grid {
          perspective: 1000px;
          transform-style: preserve-3d;
        }
        .contribution-cell {
          transform-style: preserve-3d;
          transition: all 0.3s ease-out;
        }
        .contribution-cell:hover {
          transform: translateZ(10px) scale(1.2);
          box-shadow: 0 0 20px rgba(250, 204, 21, 0.4);
        }
        ${snake?.styles || ''}

        @keyframes cellActive {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .cell-active {
          position: relative;
          z-index: 10;
        }

        .cell-active::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(45deg, 
            rgba(244, 114, 182, 0.2),
            rgba(251, 113, 133, 0.2),
            rgba(244, 114, 182, 0.2)
          );
          border-radius: 8px;
          z-index: -1;
          animation: borderGlow 2s ease-in-out infinite;
        }

        @keyframes borderGlow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        /* 移动端优化 */
        @media (max-width: 768px) {
          .touch-manipulation {
            touch-action: none;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
          }
          
          .active\:scale-95:active {
            transform: scale(0.95);
            transition: transform 0.15s ease-out;
          }
          
          .hover\:scale-110:hover {
            transform: scale(1.1);
            transition: transform 0.2s ease-out;
          }
          
          .group-active\:opacity-100:active {
            opacity: 1 !important;
          }

          .pointer-events-none {
            pointer-events: none !important;
          }
        }

        /* 日期数字动画 */
        .group:hover span {
          opacity: 0.8;
          transform: scale(1.1);
          transition: all 0.2s ease-out;
        }
        
        span {
          transition: all 0.2s ease-out;
        }

        /* Kirby 动画 */
        @keyframes kirby-jump {
          0%, 100% { 
            transform: translateY(0) scale(1); 
          }
          50% { 
            transform: translateY(-15px) scale(0.9); 
          }
        }

        @keyframes kirby-eat {
          0%, 100% { 
            transform: scale(1); 
          }
          50% { 
            transform: scale(1.1); 
          }
        }

        @keyframes kirby-happy {
          0%, 100% { 
            transform: rotate(0deg); 
          }
          25% { 
            transform: rotate(-15deg); 
          }
          75% { 
            transform: rotate(15deg); 
          }
        }

        @keyframes kirby-sleep {
          0%, 100% { 
            transform: translateY(0); 
          }
          50% { 
            transform: translateY(-2px); 
          }
        }

        @keyframes kirby-tired {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: scale(0.95); 
            opacity: 0.8; 
          }
        }

        @keyframes kirby-levelup {
          0% { 
            transform: scale(1) rotate(0deg); 
          }
          25% { 
            transform: scale(1.2) rotate(90deg); 
          }
          50% { 
            transform: scale(0.8) rotate(180deg); 
          }
          75% { 
            transform: scale(1.1) rotate(270deg); 
          }
          100% { 
            transform: scale(1) rotate(360deg); 
          }
        }

        @keyframes kirby-idle {
          0%, 100% { 
            transform: scale(1); 
          }
          50% { 
            transform: scale(1.05); 
          }
        }

        @keyframes kirby-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes kirby-twinkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0.8) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) rotate(180deg);
          }
        }

        @keyframes kirby-bounce {
          0%, 100% {
            transform: translateY(0) scale(1, 1);
          }
          40% {
            transform: translateY(-10px) scale(0.9, 1.1);
          }
          60% {
            transform: translateY(-5px) scale(1.1, 0.9);
          }
        }

        .animate-kirby-jump { animation: kirby-jump 0.5s ease-in-out; }
        .animate-kirby-eat { animation: kirby-eat 0.3s ease-in-out infinite; }
        .animate-kirby-happy { animation: kirby-happy 1s ease-in-out infinite; }
        .animate-kirby-sleep { animation: kirby-sleep 2s ease-in-out infinite; }
        .animate-kirby-tired { animation: kirby-tired 2s ease-in-out infinite; }
        .animate-kirby-levelup { animation: kirby-levelup 1s ease-in-out; }
        .animate-kirby-idle { animation: kirby-idle 3s ease-in-out infinite; }
        .animate-kirby-float { animation: kirby-float 2s ease-in-out infinite; }
        .animate-kirby-twinkle { animation: kirby-twinkle 2s ease-in-out infinite; }
        .animate-kirby-bounce { animation: kirby-bounce 0.5s ease-in-out; }

        /* Kirby 特效 */
        .kirby-shadow {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .kirby-glow {
          filter: drop-shadow(0 0 8px rgba(244, 114, 182, 0.6));
        }

        .kirby-sparkle::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at center, rgba(244, 114, 182, 0.4) 0%, transparent 70%);
          animation: kirby-twinkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default GitHubContributionCard 