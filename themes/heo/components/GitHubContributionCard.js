import { useMemo, useState } from 'react'

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

  // 使用 useMemo 缓存贡献数据
  const contributionData = useMemo(() => {
    return generateContributionData(selectedYear)
  }, [posts, selectedYear])

  // 获取总贡献数
  const totalContributions = useMemo(() => {
    return contributionData.reduce((sum, day) => sum + day.count, 0)
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

  // 使用 useMemo 缓存年份信息
  const yearInfo = useMemo(() => {
    return getYearWeeksInfo(selectedYear)
  }, [selectedYear])

  return (
    <div className="mb-12 bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg relative overflow-hidden transform hover:scale-[1.01] transition-all duration-200">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 dark:from-emerald-500/10 dark:via-green-500/5 dark:to-teal-500/10 transition-colors duration-300"></div>

      {/* 装饰图案 */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-500/20 to-green-500/20 blur-3xl transform rotate-45"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 blur-3xl transform -rotate-45"></div>

      {/* 标题区域 */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-history text-xl text-emerald-500 dark:text-emerald-400"></i>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Article Updates</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevYear}
              disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
              className="p-1 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[4rem] text-center">
              {selectedYear}
            </span>
            <button
              onClick={handleNextYear}
              disabled={availableYears.indexOf(selectedYear) === 0}
              className="p-1 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          <span className="px-2 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
            {totalContributions} Contributions
          </span>
        </div>
      </div>

      {/* 贡献图表 */}
      <div className="relative z-10">
        {/* 月份标签 */}
        <div className="flex justify-between mb-2 text-xs text-gray-500 dark:text-gray-400">
          {getMonthLabels().map((month, index) => (
            <span key={index} className="font-medium">{month}</span>
          ))}
        </div>

        {/* 星期标签和贡献格子 */}
        <div className="flex gap-2">
          {/* 星期标签 */}
          <div className="flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* 贡献格子 */}
          <div className="grid gap-1 flex-grow" style={{ gridTemplateColumns: `repeat(${yearInfo.totalWeeks}, minmax(0, 1fr))` }}>
            {Array.from({ length: yearInfo.totalWeeks }).map((_, weekIndex) => (
              <div key={weekIndex} className="grid grid-rows-7 gap-1">
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  // 计算实际的数据索引
                  let dataIndex = weekIndex * 7 + dayIndex - yearInfo.firstDayOfWeek

                  // 检查是否是有效的日期
                  const isValidDate = dataIndex >= 0 && dataIndex < contributionData.length
                  const contribution = isValidDate ? contributionData[dataIndex] : null

                  return (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 rounded-sm ${isValidDate ? (contribution ? getContributionClass(contribution.count) : 'bg-gray-200 dark:bg-gray-700') : 'bg-transparent'} transition-all duration-200 hover:scale-110 hover:ring-2 hover:ring-emerald-300 dark:hover:ring-emerald-600 cursor-pointer group`}
                      title={isValidDate ? formatTooltip(contribution) : ''}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 图例 */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
          <span>较少</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getContributionClass(level)} border border-gray-300/10 dark:border-gray-700/30 transition-transform hover:scale-110`}
              />
            ))}
          </div>
          <span>较多</span>
        </div>
      </div>

      <style jsx>{`
        .grid-cols-52 {
          grid-template-columns: repeat(52, minmax(0, 1fr));
        }
      `}</style>
    </div>
  )
}

export default GitHubContributionCard 