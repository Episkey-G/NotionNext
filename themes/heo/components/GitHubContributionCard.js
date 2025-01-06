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

  // 添加新的状态和辅助函数
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

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

  // 检查每日登录奖励
  useEffect(() => {
    const lastVisit = getLastVisitTime()
    const now = Date.now()
    const isNewDay = lastVisit ? new Date(lastVisit).getDate() !== new Date(now).getDate() : true
    
    if (isNewDay) {
      setMobilePet(prev => ({
        ...prev,
        exp: prev.exp + BLOG.PET.EXP_GAIN_FACTOR.DAILY_BONUS,
        mood: Math.min(100, prev.mood + BLOG.PET.STATUS_CHANGE.PLAY_MOOD_BOOST),
        isHappy: true
      }))
      saveVisitTime()
    }
  }, [])

  // 定期保存宠物状态
  useEffect(() => {
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

    const interval = setInterval(saveState, 5000) // 每5秒保存一次
    return () => clearInterval(interval)
  }, [mobilePet])

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
      if (now - prev.lastInteractTime > 1000) {
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
          
          const levelUpAnimation = document.createElement('div')
          levelUpAnimation.className = 'level-up-animation'
          document.body.appendChild(levelUpAnimation)
          
          setTimeout(() => {
            levelUpAnimation.remove()
          }, 2000)
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

        // 检查新的成就
        checkAchievements(newState)
        
        return newState
      }
      return prev
    })
  }, [checkAchievements])

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

  // 渲染宠物
  const renderPet = (isPetHere, mobilePet) => {
    if (!isPetHere) return null;

    const getAnimationClass = () => {
      switch (mobilePet.animation) {
        case 'jump':
          return 'animate-bounce';
        case 'eat':
          return 'animate-eat';
        case 'happy':
          return 'animate-happy';
        case 'sleep':
          return 'animate-sleep';
        default:
          return 'animate-idle';
      }
    };

    return (
      <div className={`absolute inset-0 flex items-center justify-center ${getAnimationClass()}`}>
        <div className={`w-5 h-5 relative transform transition-all duration-300 ${
          mobilePet.isHappy ? 'scale-125' : 'scale-100'
        } ${mobilePet.direction === 'left' ? 'scale-x-[-1]' : ''}`}>
          {/* 宠物主体 */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-400 
            shadow-lg transition-all duration-300 ${mobilePet.isSleeping ? 'opacity-75' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
          </div>

          {/* 宠物眼睛 */}
          {mobilePet.isSleeping ? (
            <>
              <div className="absolute top-1.5 left-1 w-1.5 h-0.5 bg-gray-600 rounded-full transform rotate-12"></div>
              <div className="absolute top-1.5 right-1 w-1.5 h-0.5 bg-gray-600 rounded-full transform -rotate-12"></div>
            </>
          ) : (
            <>
              <div className="absolute top-1.5 left-1 w-1.5 h-1.5 rounded-full bg-gray-700">
                <div className="absolute top-0 left-0.5 w-0.5 h-0.5 bg-white rounded-full"></div>
              </div>
              <div className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-gray-700">
                <div className="absolute top-0 left-0.5 w-0.5 h-0.5 bg-white rounded-full"></div>
              </div>
            </>
          )}

          {/* 宠物嘴巴 */}
          {mobilePet.isEating ? (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
          ) : mobilePet.isHappy ? (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-1 border-2 border-gray-700 border-t-0 rounded-b-full"></div>
          ) : (
            <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-1.5 h-0.5 bg-gray-700 rounded-full"></div>
          )}

          {/* 特效 */}
          {mobilePet.isHappy && (
            <div className="absolute -inset-2">
              <div className="absolute inset-0 animate-ping rounded-full bg-yellow-200 opacity-30"></div>
              <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-300 opacity-20"></div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
            {/* 月份选择器 */}
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

                // 创建动画样式对象
                const cellAnimationStyle = isPetHere ? {
                  animationName: 'cellActive',
                  animationDuration: '2s',
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${index * 0.02}s`
                } : {};

                return (
                  <div
                    key={index}
                    className={`aspect-square rounded-md ${
                      day.contribution
                        ? getContributionClass(day.contribution.count)
                        : 'bg-gray-50 dark:bg-gray-900'
                    } transition-all duration-300 hover:scale-110 relative group ${
                      hasContribution ? 'hover:rotate-3 hover:shadow-lg' : ''
                    } ${isPetHere ? 'cell-active' : ''}`}
                    style={cellAnimationStyle}
                    onClick={() => handleCellClick(col, row, day.contribution)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br from-white/0 to-white/20 dark:from-white/0 dark:to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md ${
                      hasContribution ? 'group-hover:animate-shine' : ''
                    }`}></div>
                    {isPetHere && (
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-30 blur-sm animate-pulse-glow"></div>
                    )}
                    {isPetHere && renderPet(isPetHere, mobilePet)}
                    {day.date && (
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800/90 dark:bg-gray-700/90 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all duration-200 z-30 shadow-lg backdrop-blur-sm transform group-hover:scale-100 scale-95">
                        {formatTooltip(day.contribution)}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 transform rotate-45 w-2 h-2 bg-gray-800/90 dark:bg-gray-700/90 backdrop-blur-sm"></div>
                      </div>
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
            rgba(16, 185, 129, 0.2),
            rgba(45, 212, 191, 0.2),
            rgba(16, 185, 129, 0.2)
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
      `}</style>
    </div>
  )
}

export default GitHubContributionCard 