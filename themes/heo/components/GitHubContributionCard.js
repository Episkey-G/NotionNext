import { useMemo, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Snake from './Snake'

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

  // 贪吃蛇状态
  const [isSnakeActive, setIsSnakeActive] = useState(true)
  const [eatenCells, setEatenCells] = useState(new Set())
  const [isRandomMode, setIsRandomMode] = useState(false)
  const [randomContributions, setRandomContributions] = useState([])

  // 重置贪吃蛇
  const handleSnakeReset = useCallback(() => {
    setEatenCells(new Set())
  }, [])

  // 生成随机贡献数据
  const generateRandomContributions = useCallback(() => {
    const newData = []
    const year = selectedYear
    const startDate = new Date(Date.UTC(year, 0, 1))
    const endDate = new Date(Date.UTC(year, 11, 31))

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // 30%的概率生成贡献
      const hasContribution = Math.random() < 0.3
      newData.push({
        date: new Date(d),
        count: hasContribution ? Math.floor(Math.random() * 4) + 1 : 0,
        createCount: 0,
        updateCount: 0,
        posts: []
      })
    }
    setRandomContributions(newData)
  }, [selectedYear])

  // 切换随机模式
  const toggleRandomMode = useCallback(() => {
    if (!isRandomMode) {
      generateRandomContributions()
    }
    setIsRandomMode(!isRandomMode)
    handleSnakeReset()
  }, [isRandomMode, generateRandomContributions, handleSnakeReset])

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

  // 使用随机或真实贡献数据
  const effectiveContributionData = useMemo(() => {
    return isRandomMode ? randomContributions : contributionData
  }, [isRandomMode, randomContributions, contributionData])

  // 获取某个位置的贡献值
  const getContributionValue = useCallback((weekIndex, dayIndex) => {
    const dataIndex = weekIndex * 7 + dayIndex - yearInfo.firstDayOfWeek
    if (dataIndex >= 0 && dataIndex < effectiveContributionData.length) {
      return effectiveContributionData[dataIndex]?.count || 0
    }
    return -1
  }, [effectiveContributionData, yearInfo.firstDayOfWeek])

  // 获取总贡献数
  const totalContributions = useMemo(() => {
    return effectiveContributionData.reduce((sum, day) => sum + day.count, 0)
  }, [effectiveContributionData])

  // 获取有贡献的格子总数
  const totalContributionCells = useMemo(() => {
    return effectiveContributionData.reduce((sum, day) => sum + (day.count > 0 ? 1 : 0), 0)
  }, [effectiveContributionData])

  // 切换到上一年
  const handlePrevYear = () => {
    const currentIndex = availableYears.indexOf(selectedYear)
    if (currentIndex < availableYears.length - 1) {
      setSelectedYear(availableYears[currentIndex + 1])
    }
  }

  // 分析训练数据
  const analyzeTrainingData = useCallback(() => {
    // 计算贡献格分布
    const contributionDistribution = effectiveContributionData.reduce((acc, day) => {
      const count = day.count || 0
      acc[count] = (acc[count] || 0) + 1
      return acc
    }, {})

    // 计算连续贡献
    let maxStreak = 0
    let currentStreak = 0
    let totalContributionDays = 0

    effectiveContributionData.forEach(day => {
      if (day.count > 0) {
        currentStreak++
        totalContributionDays++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    })

    // 计算贡献密度
    const density = totalContributionDays / effectiveContributionData.length

    // 计算平均贡献值
    const totalValue = effectiveContributionData.reduce((sum, day) => sum + (day.count || 0), 0)
    const averageValue = totalValue / effectiveContributionData.length

    return {
      distribution: contributionDistribution,
      maxStreak,
      density,
      averageValue,
      totalValue,
      totalDays: effectiveContributionData.length,
      contributionDays: totalContributionDays
    }
  }, [effectiveContributionData])

  // 使用 useMemo 缓存分析结果
  const trainingStats = useMemo(() => {
    return analyzeTrainingData()
  }, [analyzeTrainingData])

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

  // 使用 Snake 组件
  const snake = Snake({
    isActive: isSnakeActive,
    yearInfo,
    getContributionValue,
    contributionData,
    onEatCell: handleEatCell,
    onReset: handleSnakeReset,
    totalContributions: totalContributionCells,
    isRandomMode: isRandomMode
  })

  // 添加弹出框状态
  const [showStats, setShowStats] = useState(false)
  const [statsPosition, setStatsPosition] = useState({ x: 0, y: 0 })

  // 处理鼠标进入
  const handleStatsMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setStatsPosition({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY
    })
    setShowStats(true)
  }

  // 处理鼠标离开
  const handleStatsMouseLeave = () => {
    setShowStats(false)
  }

  // 添加训练数据分析状态
  const [showTrainingStats, setShowTrainingStats] = useState(false)
  const [trainingStatsPosition, setTrainingStatsPosition] = useState({ x: 0, y: 0 })

  // 处理训练数据分析按钮点击
  const handleTrainingStatsMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTrainingStatsPosition({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY
    })
    setShowTrainingStats(true)
  }

  const handleTrainingStatsMouseLeave = () => {
    setShowTrainingStats(false)
  }

  // 分析训练进度
  const analyzeTrainingProgress = useCallback(async () => {
    // 检查是否在客户端环境
    if (typeof window === 'undefined') {
      console.log('服务器端渲染环境，返回默认值')
      return {
        episodeCount: 0,
        averageReward: 0,
        successRate: 0,
        explorationRate: 0.3,
        lastEpisodeReward: 0,
        totalSteps: 0,
        convergenceStatus: '未收敛',
        learningProgress: 0
      }
    }

    try {
      // 获取最新的训练数据文件
      const latestDataPath = '/data/snake-training/latest.json'
      console.log('尝试读取最新训练数据:', latestDataPath)

      const response = await fetch(latestDataPath)
      if (!response.ok) {
        throw new Error(`无法读取训练数据: ${response.status} ${response.statusText}`)
      }

      const latestInfo = await response.json()
      console.log('最新训练数据信息:', latestInfo)

      // 从文件名中提取时间戳
      const timestamp = latestInfo.timestamp.split('.')[0] // 移除毫秒部分
      const formattedTimestamp = timestamp.replace(/:/g, '-')

      // 构建训练数据文件路径
      const trainingDataPath = `/data/snake-training/training-data-${formattedTimestamp}.json`
      console.log('训练数据文件路径:', trainingDataPath)

      const dataResponse = await fetch(trainingDataPath)
      if (!dataResponse.ok) {
        throw new Error(`无法读取训练数据文件: ${dataResponse.status} ${dataResponse.statusText}`)
      }

      const data = await dataResponse.json()
      console.log('训练数据:', data)

      // 计算平均奖励
      const recentRewards = data.stats?.rewardHistory?.slice(-50) || []
      const averageReward = recentRewards.length > 0
        ? recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length
        : 0

      // 计算学习进度
      const episodeCount = data.stats?.episodeCount || 0
      const learningProgress = Math.min((episodeCount / 1000) * 100, 100)

      // 计算总步数
      const totalSteps = data.stats?.totalSteps || 0

      // 检查收敛状态
      const hasConverged = data.stats?.convergenceStatus?.hasConverged || false
      const convergenceStatus = hasConverged ? '已收敛' : '训练中'

      // 返回分析结果
      const result = {
        episodeCount,
        averageReward,
        successRate: data.stats?.successRate || 0,
        explorationRate: data.explorationRate || 0.3,
        lastEpisodeReward: recentRewards[recentRewards.length - 1] || 0,
        totalSteps,
        convergenceStatus,
        learningProgress
      }

      console.log('分析结果:', result)
      return result

    } catch (error) {
      console.error('读取训练数据失败:', error)
      return {
        episodeCount: 0,
        averageReward: 0,
        successRate: 0,
        explorationRate: 0.3,
        lastEpisodeReward: 0,
        totalSteps: 0,
        convergenceStatus: '未收敛',
        learningProgress: 0
      }
    }
  }, [])

  // 添加 useEffect 来定期更新训练数据
  useEffect(() => {
    let intervalId
    if (typeof window !== 'undefined' && showTrainingStats && isRandomMode) {  // 添加 isRandomMode 条件
      // 立即更新一次
      analyzeTrainingProgress().then(progress => {
        console.log('初始训练数据更新:', progress)
        setTrainingProgress(progress)
      })

      // 每5秒更新一次训练数据
      intervalId = setInterval(() => {
        analyzeTrainingProgress().then(progress => {
          console.log('定期训练数据更新:', progress)
          setTrainingProgress(progress)
        })
      }, 5000)
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [showTrainingStats, analyzeTrainingProgress, isRandomMode])  // 添加 isRandomMode 依赖

  // 使用 useState 来存储训练进度
  const [trainingProgress, setTrainingProgress] = useState({
    episodeCount: 0,
    averageReward: 0,
    successRate: 0,
    explorationRate: 0.3,
    lastEpisodeReward: 0,
    totalSteps: 0,
    convergenceStatus: '未收敛',
    learningProgress: 0
  })

  // 初始化时加载训练数据
  useEffect(() => {
    analyzeTrainingProgress().then(progress => {
      setTrainingProgress(progress)
    })
  }, [])

  return (
    <>
      <div className={`mb-12 bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg relative overflow-hidden transform hover:scale-[1.01] transition-all duration-500 ease-out ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* 高级背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 dark:from-emerald-500/10 dark:via-green-500/5 dark:to-teal-500/10 transition-colors duration-300"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>

        {/* 动态装饰图案 */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-500/20 to-green-500/20 blur-3xl transform rotate-45 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 blur-3xl transform -rotate-45 animate-pulse [animation-delay:1s]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)] pointer-events-none"></div>

        {/* 标题区域 */}
        <div className="relative z-10 flex items-center justify-between mb-8 group">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <i className="fas fa-history text-xl text-emerald-500 dark:text-emerald-400 transform transition-all duration-500 hover:rotate-[360deg] relative"></i>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 tracking-wide group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-all duration-300 relative">
                Article Updates
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-500"></span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevYear}
                disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
                className="p-2 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-110 hover:rotate-12 relative group/btn"
              >
                <span className="absolute inset-0 bg-emerald-500/10 rounded-full scale-0 group-hover/btn:scale-100 transition-transform duration-300"></span>
                <i className="fas fa-chevron-left relative z-10"></i>
              </button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[4rem] text-center tracking-wider transition-all duration-300 hover:text-emerald-500 dark:hover:text-emerald-400 relative group/year">
                {selectedYear}
                <span className="absolute -bottom-1 left-0 w-full h-px bg-emerald-500/50 scale-x-0 group-hover/year:scale-x-100 transition-transform duration-300 origin-left"></span>
              </span>
              <button
                onClick={handleNextYear}
                disabled={availableYears.indexOf(selectedYear) === 0}
                className="p-2 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-300 hover:scale-110 hover:-rotate-12 relative group/btn"
              >
                <span className="absolute inset-0 bg-emerald-500/10 rounded-full scale-0 group-hover/btn:scale-100 transition-transform duration-300"></span>
                <i className="fas fa-chevron-right relative z-10"></i>
              </button>
            </div>
            <div className="relative group/counter">
              <span className="px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/30 rounded-full shadow-sm transition-all duration-300 group-hover/counter:shadow-emerald-500/20 group-hover/counter:shadow-lg relative">
                <span className="relative z-10">{totalContributions} Contributions</span>
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 group-hover/counter:translate-x-full transition-transform duration-1000 ease-in-out"></span>
              </span>
            </div>
            {/* 训练数据统计触发器 */}
            <div className="relative group/stats ml-2">
              <span
                className="px-4 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100/80 dark:bg-purple-900/30 rounded-full shadow-sm transition-all duration-300 group-hover/stats:shadow-purple-500/20 group-hover/stats:shadow-lg relative cursor-help"
                onMouseEnter={handleStatsMouseEnter}
                onMouseLeave={handleStatsMouseLeave}
              >
                <span className="relative z-10">
                  {isRandomMode ? '随机模式' : '真实模式'} ({Math.round(trainingStats.density * 100)}% 密度)
                </span>
              </span>
            </div>
            {/* 贪吃蛇开关按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSnake}
                className={`p-2 rounded-full transition-all duration-300 ${isSnakeActive
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                title={isSnakeActive ? '关闭贪吃蛇' : '开启贪吃蛇'}
              >
                <i className="fas fa-snake text-lg"></i>
              </button>
              <button
                onClick={toggleRandomMode}
                className={`p-2 rounded-full transition-all duration-300 ${isRandomMode
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                title={isRandomMode ? '使用真实数据' : '使用随机数据'}
              >
                <i className="fas fa-random text-lg"></i>
              </button>
              {isRandomMode && (
                <button
                  className="p-2 rounded-full transition-all duration-300 bg-blue-500 text-white hover:bg-blue-600"
                  title="查看训练进度"
                  onMouseEnter={handleTrainingStatsMouseEnter}
                  onMouseLeave={handleTrainingStatsMouseLeave}
                >
                  <i className="fas fa-chart-line text-lg"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 贡献图表 */}
        <div className="relative z-10">
          <div className="flex gap-2">
            <div className="flex-grow pl-10">
              {/* 月份标签 */}
              <div className="relative h-6 mb-2">
                {Array.from({ length: 12 }).map((_, monthIndex) => {
                  const firstDayOfMonth = new Date(Date.UTC(selectedYear, monthIndex, 1))
                  const daysSinceYearStart = Math.floor((firstDayOfMonth - new Date(Date.UTC(selectedYear, 0, 1))) / (24 * 60 * 60 * 1000))
                  const weekIndex = Math.floor((daysSinceYearStart + yearInfo.firstDayOfWeek) / 7)
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

                  if (firstDayOfMonth.getUTCFullYear() === selectedYear) {
                    return (
                      <span
                        key={monthIndex}
                        className="absolute text-xs font-medium text-gray-500/80 dark:text-gray-400/80 tracking-wider hover:text-emerald-500 dark:hover:text-emerald-400 transition-all duration-300 hover:-translate-y-0.5 hover:font-semibold"
                        style={{
                          left: `${(weekIndex / yearInfo.totalWeeks) * 100}%`,
                          transform: `translateX(-50%) translateY(${isLoaded ? '0' : '0.5rem'})`,
                          opacity: isLoaded ? 1 : 0,
                          transition: `all 0.5s ease-out ${monthIndex * 0.05}s`
                        }}
                      >
                        {months[monthIndex]}
                      </span>
                    )
                  }
                  return null
                })}
              </div>

              {/* 贡献格子 */}
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${yearInfo.totalWeeks}, minmax(0, 1fr))` }}>
                {Array.from({ length: yearInfo.totalWeeks }).map((_, weekIndex) => (
                  <div key={weekIndex} className="grid grid-rows-7 gap-1">
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      let dataIndex = weekIndex * 7 + dayIndex - yearInfo.firstDayOfWeek
                      const isValidDate = dataIndex >= 0 && dataIndex < effectiveContributionData.length
                      const contribution = isValidDate ? effectiveContributionData[dataIndex] : null
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

        {/* 图例 */}
        <div className="flex items-center justify-end gap-3 mt-6 text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium tracking-wide relative group/legend">
            较少
            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-emerald-500/50 group-hover/legend:w-full transition-all duration-300"></span>
          </span>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getContributionClass(level)} border border-gray-300/10 dark:border-gray-700/30 transition-all duration-300 hover:scale-150 hover:rotate-45 hover:ring-1 hover:ring-emerald-300 dark:hover:ring-emerald-600 relative group/box`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/20 dark:from-white/0 dark:to-white/10 opacity-0 group-hover/box:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>
          <span className="font-medium tracking-wide relative group/legend">
            较多
            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-emerald-500/50 group-hover/legend:w-full transition-all duration-300"></span>
          </span>
        </div>
      </div>

      {/* 训练数据分析弹窗 */}
      {typeof window !== 'undefined' && createPortal(
        showTrainingStats && (
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: `${trainingStatsPosition.x}px`,
              top: `${trainingStatsPosition.y - 8}px`,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 text-xs">
              <div className="text-gray-700 dark:text-gray-300 space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">训练进度</span>
                    <span className="text-sm font-medium">{Math.round(trainingProgress.learningProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${trainingProgress.learningProgress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm mb-1">训练回合</p>
                    <p className="text-lg font-semibold">{trainingProgress.episodeCount}</p>
                  </div>
                  <div>
                    <p className="text-sm mb-1">平均奖励</p>
                    <p className="text-lg font-semibold">{trainingProgress.averageReward.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm mb-1">探索率</p>
                    <p className="text-lg font-semibold">{(trainingProgress.explorationRate * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm mb-1">总步数</p>
                    <p className="text-lg font-semibold">{trainingProgress.totalSteps}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">收敛状态</span>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${trainingProgress.convergenceStatus === '已收敛'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                      }`}>
                      {trainingProgress.convergenceStatus}
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute left-1/2 bottom-[-8px] -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-800 rotate-45 transform origin-center"></div>
            </div>
          </div>
        ),
        document.body
      )}

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
        .snake-head {
          animation: snakeHead 0.5s ease-in-out infinite alternate;
        }
        .snake-head.rage {
          animation: snakeHeadRage 0.3s ease-in-out infinite alternate;
        }
        .snake-eyes {
          animation: snakeEyes 2s ease-in-out infinite;
        }
        .snake-eyes.rage {
          animation: snakeEyesRage 0.3s ease-in-out infinite alternate;
        }
        @keyframes snakeHead {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        @keyframes snakeHeadRage {
          0% { transform: scale(1.1) rotate(-5deg); }
          100% { transform: scale(1.2) rotate(5deg); }
        }
        @keyframes snakeEyes {
          0%, 90% { transform: scale(1); }
          95% { transform: scale(0.1); }
          100% { transform: scale(1); }
        }
        @keyframes snakeEyesRage {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.2) translate(1px, -1px); }
        }
        ${snake?.styles || ''}
      `}</style>
    </>
  )
}

export default GitHubContributionCard 