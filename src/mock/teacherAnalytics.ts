export interface StudentOverview {
  id: string
  displayName: string
  avatarUrl: string
  major: string
  grade: string
  totalLearningMinutes: number
  weekLearningMinutes: number
  pathProgressPercent: number
  weakCount: number
  avgQuizScore: number | null
  lastActiveAt: string
  riskTags: string[]
}

export interface ClassOverviewData {
  classStats: {
    totalStudents: number
    avgLearningHours: number
    avgPathProgress: number
    avgQuizScore: number
    atRiskCount: number
  }
  distributions: {
    completionBrackets: { range: string; count: number }[]
    weakCountBrackets: { range: string; count: number }[]
    weeklyTrend: { week: string; avgHours: number }[]
  }
  students: StudentOverview[]
}

export interface StudentStats {
  totalLearningMinutes: number
  resourceCompleted: number
  pathProgressPercent: number
  avgQuizScore: number | null
}

export interface ProfileData {
  version: number
  createdAt: string
  trigger: string
  label: string
  summary: string[]
  radarData: { name: string; value: number }[]
}

export interface PlanModule {
  moduleId: string
  title: string
  scope: string
  status: string
  mastery: number
  estimatedHours: number
  actualHours: number
  progress: string
}

export interface PlanData {
  planId: string
  modules: PlanModule[]
  edges: { from: string; to: string }[]
  currentModuleId: string
  currentActivityId: string
  currentActivityTitle: string
}

export interface QuizAttempt {
  id: string
  topic: string
  score: number
  durationSeconds: number
  weakTags: string[]
  createdAt: string
}

export interface KpAnchor {
  kpId: string
  kpName: string
  kpType: string
  relationType: string
  confidence: number
  source: string
  scope: string
}

export interface StudentDetailData {
  stats: StudentStats
  profile: ProfileData
  plan: PlanData
  quizAttempts: {
    attempts: QuizAttempt[]
    classAvgScore: number
  }
  kpAnchors: KpAnchor[]
  profiles: ProfileData[]
}

const majors = ['计算机科学', '软件工程', '数据科学', '人工智能', '网络工程', '信息安全']
const grades = ['大一', '大二', '大三', '大四']
// 真实用户排在前面，假用户在后面
const names = ['XGY', '小华', '小明', '小红', '小刚', '小丽', '小伟', '001', '张伟', '王芳', '李娜', '刘洋', '陈静', '杨磊', '赵敏', '黄丽', '周强', '吴婷', '徐明', '孙悦', '马超', '朱红', '胡波', '林涛', '何雪', '高飞', '郭阳', '罗琳', '梁峰', '宋雨', '唐倩', '韩冰']

// 确定性伪随机函数（mulberry32），基于 index 生成稳定数据
function seededRandom(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ===== 优化：基于真实学习模式的学生原型 =====
// 8种典型学习者画像，每种有不同的行为模式
interface StudentArchetype {
  major: string
  grade: string
  // 学习时长模式（16周）
  weeklyHours: number[]
  // 路径完成度基础值
  progressBase: number
  // 薄弱项数量
  weakBase: number
  // 测验分数基础
  scoreBase: number
  // 分数波动范围
  scoreVariance: number
  // 是否容易流失
  highChurn: boolean
  // 最近活跃天数
  recentActiveDays: number
}

const archetypes: StudentArchetype[] = [
  // 1. 稳健型：持续稳定学习，成绩中上
  { major: '计算机科学', grade: '大二', weeklyHours: [2.5,3.0,3.5,4.0,4.2,4.5,4.0,3.8,4.5,5.0,5.2,5.5,6.0,6.5,7.0,7.5], progressBase: 72, weakBase: 2, scoreBase: 78, scoreVariance: 6, highChurn: false, recentActiveDays: 1 },
  // 2. 冲刺型：前期懈怠，期末突击
  { major: '软件工程', grade: '大二', weeklyHours: [1.0,0.5,0.8,1.2,0.3,0.5,1.0,0.8,2.0,3.5,5.0,6.5,8.0,8.5,9.0,8.0], progressBase: 45, weakBase: 6, scoreBase: 65, scoreVariance: 12, highChurn: true, recentActiveDays: 2 },
  // 3. 高效型：时间少但效率高
  { major: '人工智能', grade: '大三', weeklyHours: [1.5,1.8,2.0,2.2,2.0,2.5,2.3,2.0,2.5,2.8,3.0,3.2,3.5,3.0,3.5,3.8], progressBase: 68, weakBase: 3, scoreBase: 85, scoreVariance: 5, highChurn: false, recentActiveDays: 1 },
  // 4. 波动型：学习极不稳定，忽高忽低
  { major: '数据科学', grade: '大三', weeklyHours: [3.0,5.0,1.0,4.5,0.5,3.5,6.0,2.0,4.0,1.5,5.5,3.0,6.5,2.5,5.0,4.0], progressBase: 55, weakBase: 5, scoreBase: 70, scoreVariance: 15, highChurn: true, recentActiveDays: 3 },
  // 5. 低投入型：持续低迷，需要关注
  { major: '网络工程', grade: '大二', weeklyHours: [0.5,0.3,0.8,0.2,0.5,0.3,0.8,0.2,0.5,0.3,0.8,0.5,0.3,0.5,0.8,0.5], progressBase: 15, weakBase: 9, scoreBase: 48, scoreVariance: 10, highChurn: true, recentActiveDays: 7 },
  // 6. 中等型：表现平平，有提升空间
  { major: '信息安全', grade: '大二', weeklyHours: [1.5,1.8,2.0,2.2,2.0,2.5,2.3,2.0,2.5,2.8,3.0,2.5,3.0,2.8,3.2,3.0], progressBase: 42, weakBase: 5, scoreBase: 62, scoreVariance: 8, highChurn: false, recentActiveDays: 2 },
  // 7. 潜力型：后期发力，进步明显
  { major: '计算机科学', grade: '大一', weeklyHours: [0.5,0.8,1.0,1.2,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0,5.5,6.0,6.5,7.0], progressBase: 58, weakBase: 4, scoreBase: 72, scoreVariance: 8, highChurn: false, recentActiveDays: 1 },
  // 8. 优秀型：全面领先，持续保持
  { major: '人工智能', grade: '大三', weeklyHours: [4.0,4.5,5.0,5.5,5.0,5.5,6.0,5.5,6.0,6.5,7.0,7.5,8.0,8.5,9.0,9.5], progressBase: 85, weakBase: 1, scoreBase: 90, scoreVariance: 4, highChurn: false, recentActiveDays: 0 },
]

// 为所有学生分配原型并生成个性化数据
const studentProfiles: {
  major: string; grade: string; weeklyHours: number[];
  progressBase: number; weakBase: number; scoreBase: number; scoreVariance: number;
  recentActiveDays: number
}[] = (() => {
  const result: typeof archetypes = []
  for (let i = 0; i < names.length; i++) {
    const archetype = archetypes[i % archetypes.length]
    const rng = seededRandom(i * 7919 + 3571)
    // 在原型基础上添加个性化噪声
    const tweakHours = archetype.weeklyHours.map(h =>
      Math.max(0, +(h + (rng() - 0.5) * h * 0.4).toFixed(1))
    )
    result.push({
      ...archetype,
      weeklyHours: tweakHours,
      progressBase: Math.round(Math.max(5, Math.min(95, archetype.progressBase + (rng() - 0.5) * 16))),
      weakBase: Math.round(Math.max(0, Math.min(12, archetype.weakBase + Math.floor((rng() - 0.5) * 3)))),
      scoreBase: Math.round(Math.max(25, Math.min(98, archetype.scoreBase + (rng() - 0.5) * 12))),
      recentActiveDays: Math.round(Math.max(0, Math.min(14, archetype.recentActiveDays + Math.floor((rng() - 0.5) * 4)))),
    })
  }
  return result
})()

// 缓存已生成的学生概览，确保同一次会话内数据一致
const _overviewCache = new Map<number, StudentOverview>()

export function generateStudentOverview(index: number): StudentOverview {
  const cached = _overviewCache.get(index)
  if (cached) return cached

  const p = studentProfiles[index]
  const rng = seededRandom(index * 7919 + 3571)

  const weekHours = p.weeklyHours
  const totalMin = Math.round(weekHours.reduce((a, b) => a + b, 0) * 60)
  const weekMin = Math.round(weekHours[weekHours.length - 1] * 60)
  const progress = Math.round(Math.max(2, Math.min(98, p.progressBase + (rng() - 0.5) * 10)))
  const weakCount = Math.max(0, Math.min(14, p.weakBase + Math.floor((rng() - 0.5) * 2)))
  const hasScore = rng() > 0.05
  const score = hasScore
    ? Math.round(Math.max(20, Math.min(98, p.scoreBase + (rng() - 0.5) * p.scoreVariance)))
    : null

  const tags: string[] = []
  if (weekMin < 30) tags.push('低投入')
  if (progress < 25) tags.push('低完成')
  if (weakCount > 6) tags.push('薄弱多')
  if (score !== null && score < 55) tags.push('低分')
  if (progress < 5 && totalMin < 180) tags.push('未开始')
  // 新增：学习不连续标签
  const recentHours = weekHours.slice(-3)
  if (recentHours.filter(h => h < 0.5).length >= 2) tags.push('近期不活跃')

  const lastActive = new Date()
  lastActive.setDate(lastActive.getDate() - p.recentActiveDays)

  const result: StudentOverview = {
    id: `stu-${String(index + 1).padStart(3, '0')}`,
    displayName: names[index],
    avatarUrl: '',
    major: p.major,
    grade: p.grade,
    totalLearningMinutes: totalMin,
    weekLearningMinutes: weekMin,
    pathProgressPercent: progress,
    weakCount,
    avgQuizScore: score,
    lastActiveAt: lastActive.toISOString(),
    riskTags: tags,
  }
  _overviewCache.set(index, result)
  return result
}

export function generateClassOverview(): ClassOverviewData {
  const students = Array.from({ length: names.length }, (_, i) => generateStudentOverview(i))

  const validScores = students.filter(s => s.avgQuizScore !== null).map(s => s.avgQuizScore as number)
  const avgScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0
  const totalHours = students.reduce((s, st) => s + st.totalLearningMinutes, 0) / 60
  const avgProgress = students.reduce((s, st) => s + st.pathProgressPercent, 0) / names.length

  // ===== 优化：更真实的周趋势 =====
  // 模拟16周学期：开学适应→稳步上升→期中低谷→恢复→期末冲刺
  // 添加随机噪声使曲线更自然
  const baseTrend = [1.8, 2.2, 2.8, 3.2, 3.5, 3.8, 3.2, 2.5, 3.0, 3.8, 4.5, 5.2, 5.8, 6.5, 7.2, 8.0]
  const rng = seededRandom(20260718)
  const trend = baseTrend.map((v, i) => {
    // 期中考试周（第7-8周）自然下降
    const midtermDip = (i === 6 || i === 7) ? -0.8 : 0
    // 周末/假期效应（第4周清明节前后）
    const holidayEffect = i === 3 ? -0.5 : 0
    // 随机噪声 ±15%
    const noise = (rng() - 0.5) * v * 0.3
    return Math.max(0.5, +(v + midtermDip + holidayEffect + noise).toFixed(1))
  })

  const weeks = ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周', '第7周', '第8周', '第9周', '第10周', '第11周', '第12周', '第13周', '第14周', '第15周', '第16周']

  return {
    classStats: {
      totalStudents: names.length,
      avgLearningHours: Math.round(totalHours / names.length * 10) / 10,
      avgPathProgress: Math.round(avgProgress * 10) / 10,
      avgQuizScore: Math.round(avgScore * 10) / 10,
      atRiskCount: students.filter(s => s.riskTags.length > 0).length,
    },
    distributions: {
      completionBrackets: [
        { range: '0-20%', count: students.filter(s => s.pathProgressPercent >= 0 && s.pathProgressPercent < 20).length },
        { range: '20-40%', count: students.filter(s => s.pathProgressPercent >= 20 && s.pathProgressPercent < 40).length },
        { range: '40-60%', count: students.filter(s => s.pathProgressPercent >= 40 && s.pathProgressPercent < 60).length },
        { range: '60-80%', count: students.filter(s => s.pathProgressPercent >= 60 && s.pathProgressPercent < 80).length },
        { range: '80-100%', count: students.filter(s => s.pathProgressPercent >= 80 && s.pathProgressPercent <= 100).length },
      ],
      weakCountBrackets: [
        { range: '0-2', count: students.filter(s => s.weakCount <= 2).length },
        { range: '3-5', count: students.filter(s => s.weakCount > 2 && s.weakCount <= 5).length },
        { range: '6-8', count: students.filter(s => s.weakCount > 5 && s.weakCount <= 8).length },
        { range: '9+', count: students.filter(s => s.weakCount > 8).length },
      ],
      weeklyTrend: weeks.map((w, i) => ({ week: w, avgHours: trend[i] })),
    },
    students,
  }
}

// ===== 优化：为更多学生生成个性化详情 =====
const studentDetailProfiles: Record<string, {
  statsBase: [number, number, number, number | null]; summary: string[]; radarBase: number[]
  planVariant: string; kpSet: string
}> = {
  'stu-001': { statsBase: [150, 0, 8, 42], summary: ['学习投入严重不足', '近7天仅学习0.5h', '排序算法和树结构基础薄弱'], radarBase: [35, 55, 45, 30, 42, 50], planVariant: 'lagging_more', kpSet: 'set1' },
  'stu-002': { statsBase: [1800, 6, 25, 61], summary: ['路径完成度偏低', '薄弱知识点集中在排序和查找', '课堂参与度较好但作业完成不及时'], radarBase: [48, 62, 55, 40, 55, 58], planVariant: 'standard', kpSet: 'set1' },
  'stu-003': { statsBase: [3200, 12, 42, 58], summary: ['薄弱项偏多但投入尚可', '实践能力强于理论', '适合动手练习巩固'], radarBase: [55, 70, 65, 52, 62, 72], planVariant: 'standard', kpSet: 'set2' },
  'stu-004': { statsBase: [3800, 15, 68, 45], summary: ['投入时间多但成绩不理想', '学习方法可能低效', '需要优化学习策略'], radarBase: [62, 85, 55, 58, 72, 68], planVariant: 'standard', kpSet: 'set2' },
  'stu-005': { statsBase: [800, 2, 5, 55], summary: ['接近未开始状态', '连续缺勤超过一周', '可能面临学业困难'], radarBase: [30, 50, 40, 25, 38, 42], planVariant: 'barely_started', kpSet: 'set3' },
  'stu-006': { statsBase: [2600, 10, 40, 70], summary: ['学习态度端正', '基础较扎实', '需要在图论和动态规划上加强'], radarBase: [58, 75, 68, 55, 60, 72], planVariant: 'standard', kpSet: 'set2' },
  'stu-007': { statsBase: [3000, 12, 52, 65], summary: ['稳步跟进中', '栈和队列掌握良好', '二叉树和排序需加强'], radarBase: [60, 72, 60, 52, 65, 68], planVariant: 'standard', kpSet: 'set1' },
  'stu-008': { statsBase: [4500, 20, 75, 80], summary: ['投入时间充裕', '综合表现良好', '算法分析和优化部分有潜力'], radarBase: [72, 88, 70, 65, 78, 82], planVariant: 'standard', kpSet: 'set2' },
  'stu-009': { statsBase: [1200, 4, 18, 48], summary: ['基础薄弱需重视', '缺勤较多', '建议从线性表重新巩固'], radarBase: [38, 50, 48, 35, 45, 52], planVariant: 'lagging_more', kpSet: 'set3' },
  'stu-010': { statsBase: [3600, 14, 58, 75], summary: ['表现中上', '数组和链表已达标', '难度在递归和树结构'], radarBase: [65, 80, 72, 58, 70, 78], planVariant: 'standard', kpSet: 'set2' },
  'stu-011': { statsBase: [2200, 8, 35, 52], summary: ['学习节奏不稳定', '偶尔有爆发但难以持续', '需要建立固定学习习惯'], radarBase: [45, 58, 50, 38, 50, 55], planVariant: 'standard', kpSet: 'set1' },
  'stu-012': { statsBase: [4800, 22, 82, 88], summary: ['全面发展型学生', '各模块掌握均衡', '可挑战更高难度内容'], radarBase: [82, 92, 78, 72, 85, 88], planVariant: 'advanced', kpSet: 'set2' },
  'stu-013': { statsBase: [900, 2, 12, 45], summary: ['学习动力不足', '多次未提交作业', '建议安排一对一谈话'], radarBase: [32, 45, 42, 28, 40, 45], planVariant: 'lagging_more', kpSet: 'set3' },
  'stu-014': { statsBase: [2800, 10, 45, 68], summary: ['理论扎实但实践偏弱', '概念理解到位', '编码实现需要更多练习'], radarBase: [60, 72, 62, 48, 65, 70], planVariant: 'standard', kpSet: 'set1' },
  'stu-015': { statsBase: [1600, 5, 22, 55], summary: ['期中后投入下降', '需要重新激发学习兴趣', '推荐互动式学习资源'], radarBase: [42, 55, 52, 35, 48, 55], planVariant: 'standard', kpSet: 'set2' },
  'stu-016': { statsBase: [5200, 25, 88, 92], summary: ['班级标杆学生', '学习方法高效', '可担任学习小组组长'], radarBase: [88, 95, 82, 78, 90, 85], planVariant: 'advanced', kpSet: 'set2' },
  'stu-017': { statsBase: [2000, 7, 30, 60], summary: ['中等偏下但有进步趋势', '近期学习态度改善', '保持当前势头有望提升'], radarBase: [50, 65, 55, 42, 55, 60], planVariant: 'standard', kpSet: 'set1' },
  'stu-018': { statsBase: [3400, 13, 55, 72], summary: ['学习主动性强', '自主探索能力好', '在算法优化方面有天赋'], radarBase: [62, 78, 68, 55, 68, 75], planVariant: 'standard', kpSet: 'set2' },
  'stu-019': { statsBase: [1100, 3, 15, 50], summary: ['出勤率低', '基础知识掌握不牢', '建议从基础概念重新梳理'], radarBase: [35, 48, 45, 30, 42, 48], planVariant: 'lagging_more', kpSet: 'set3' },
  'stu-020': { statsBase: [4000, 16, 65, 78], summary: ['学习规划清晰', '按部就班推进', '薄弱项集中在高级主题'], radarBase: [68, 82, 70, 60, 72, 80], planVariant: 'standard', kpSet: 'set2' },
  'stu-021': { statsBase: [1800, 6, 28, 58], summary: ['偏科明显', '数据结构好但算法弱', '建议加强算法思维训练'], radarBase: [52, 60, 55, 40, 52, 58], planVariant: 'standard', kpSet: 'set1' },
  'stu-022': { statsBase: [2500, 9, 38, 65], summary: ['学习态度好但效率待提升', '投入时间与产出不成正比', '推荐优化学习方法'], radarBase: [55, 68, 58, 45, 58, 62], planVariant: 'standard', kpSet: 'set2' },
  'stu-023': { statsBase: [700, 1, 8, 40], summary: ['几乎未参与课程学习', '需要紧急干预', '建议与辅导员沟通'], radarBase: [25, 40, 35, 20, 35, 40], planVariant: 'barely_started', kpSet: 'set3' },
  'stu-024': { statsBase: [3500, 14, 58, 70], summary: ['稳步提升中', '薄弱项逐周减少', '保持当前学习节奏即可'], radarBase: [60, 75, 65, 55, 65, 72], planVariant: 'standard', kpSet: 'set2' },
  'stu-025': { statsBase: [2100, 7, 32, 62], summary: ['学习波动较大', '考试前突击明显', '建议培养日常学习习惯'], radarBase: [48, 62, 55, 40, 52, 58], planVariant: 'standard', kpSet: 'set1' },
  'stu-026': { statsBase: [4200, 18, 72, 82], summary: ['综合能力较强', '理论与实践均衡', '可尝试挑战性项目'], radarBase: [75, 88, 72, 65, 78, 82], planVariant: 'standard', kpSet: 'set2' },
  'stu-027': { statsBase: [1400, 4, 20, 52], summary: ['学习基础较弱', '需要更多辅导支持', '建议安排学习伙伴'], radarBase: [38, 52, 48, 32, 42, 50], planVariant: 'lagging_more', kpSet: 'set3' },
  'stu-028': { statsBase: [3100, 12, 48, 68], summary: ['学习主动性好', '独立思考能力强', '在系统设计方面有潜力'], radarBase: [58, 72, 62, 50, 62, 70], planVariant: 'standard', kpSet: 'set2' },
  'stu-029': { statsBase: [2400, 9, 35, 60], summary: ['学习节奏适中', '需要加强复杂问题解决能力', '推荐案例分析学习'], radarBase: [52, 65, 58, 45, 55, 62], planVariant: 'standard', kpSet: 'set1' },
  'stu-030': { statsBase: [3800, 15, 62, 75], summary: ['表现稳定', '各维度均衡发展', '在递归和分治方面有优势'], radarBase: [65, 80, 68, 58, 70, 78], planVariant: 'standard', kpSet: 'set2' },
  'stu-031': { statsBase: [1000, 3, 12, 48], summary: ['学习投入不足', '基础知识掌握不牢', '建议从基础概念重新学习'], radarBase: [32, 45, 42, 28, 38, 45], planVariant: 'lagging_more', kpSet: 'set3' },
  'stu-032': { statsBase: [4600, 20, 78, 85], summary: ['学习效率高', '知识掌握扎实', '可担任课程助教'], radarBase: [78, 90, 75, 68, 82, 85], planVariant: 'advanced', kpSet: 'set2' },
}

export function getStudentDetail(studentId: string): StudentDetailData {
  const sp = studentDetailProfiles[studentId]
  if (!sp) {
    // 不应该到这里，但作为安全网
    return {
      stats: { totalLearningMinutes: 2000, resourceCompleted: 7, pathProgressPercent: 40, avgQuizScore: 65 },
      profile: { version: 1, createdAt: new Date().toISOString(), trigger: 'chat', label: '对话更新', summary: ['基础画像', '建议进一步对话完善'], radarData: [{ name: '知识基础', value: 50 }, { name: '学习目标', value: 60 }, { name: '认知风格', value: 55 }, { name: '学习节奏', value: 50 }, { name: '专业理解', value: 55 }, { name: '兴趣广度', value: 60 }] },
      plan: { planId: 'lplan-000', modules: [], edges: [], currentModuleId: '', currentActivityId: '', currentActivityTitle: '' },
      quizAttempts: { attempts: [], classAvgScore: 68 },
      kpAnchors: [], profiles: [],
    }
  }
  const [totalMin, resCom, progress, score] = sp.statsBase
  const radarVals = sp.radarBase

  // 根据进度确定当前模块
  const moduleStatuses = progress > 70 ? ['done','done','done','in_progress','locked','locked','locked']
    : progress > 40 ? ['done','done','in_progress','locked','locked','locked','locked']
    : progress > 20 ? ['done','in_progress','locked','locked','locked','locked','locked']
    : ['in_progress','locked','locked','locked','locked','locked','locked']

  const moduleMasteries = [92, 88, 60, 35, 0, 0, 0]
  const moduleActualHours = [2.5, 3.2, 2.5, 1.0, 0, 0, 0]

  return {
    stats: {
      totalLearningMinutes: totalMin,
      resourceCompleted: resCom,
      pathProgressPercent: progress,
      avgQuizScore: score,
    },
    profile: {
      version: 5,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      trigger: 'chat',
      label: '对话更新',
      summary: sp.summary,
      radarData: [
        { name: '知识基础', value: radarVals[0] },
        { name: '学习目标', value: radarVals[1] },
        { name: '认知风格', value: radarVals[2] },
        { name: '学习节奏', value: radarVals[3] },
        { name: '专业理解', value: radarVals[4] },
        { name: '兴趣广度', value: radarVals[5] },
      ],
    },
    plan: {
      planId: 'lplan-001',
      modules: [
        { moduleId: 'mod-1', title: '线性表', scope: 'core', status: moduleStatuses[0], mastery: moduleMasteries[0], estimatedHours: 2, actualHours: moduleActualHours[0], progress: moduleStatuses[0] === 'done' ? '100%' : moduleStatuses[0] === 'in_progress' ? '60%' : '0%' },
        { moduleId: 'mod-2', title: '栈和队列', scope: 'core', status: moduleStatuses[1], mastery: moduleMasteries[1], estimatedHours: 3, actualHours: moduleActualHours[1], progress: moduleStatuses[1] === 'done' ? '100%' : moduleStatuses[1] === 'in_progress' ? '60%' : '0%' },
        { moduleId: 'mod-3', title: '树与二叉树', scope: 'core', status: moduleStatuses[2], mastery: moduleMasteries[2], estimatedHours: 4, actualHours: moduleActualHours[2], progress: moduleStatuses[2] === 'done' ? '100%' : moduleStatuses[2] === 'in_progress' ? '60%' : '0%' },
        { moduleId: 'mod-4', title: '排序算法', scope: 'core', status: moduleStatuses[3], mastery: moduleMasteries[3], estimatedHours: 3, actualHours: moduleActualHours[3], progress: moduleStatuses[3] === 'done' ? '100%' : moduleStatuses[3] === 'in_progress' ? '35%' : '0%' },
        { moduleId: 'mod-5', title: '查找算法', scope: 'core', status: moduleStatuses[4], mastery: moduleMasteries[4], estimatedHours: 3, actualHours: moduleActualHours[4], progress: '0%' },
        { moduleId: 'mod-6', title: '图', scope: 'supp', status: moduleStatuses[5], mastery: moduleMasteries[5], estimatedHours: 3, actualHours: moduleActualHours[5], progress: '0%' },
        { moduleId: 'mod-7', title: '哈希表', scope: 'supp', status: moduleStatuses[6], mastery: moduleMasteries[6], estimatedHours: 2, actualHours: moduleActualHours[6], progress: '0%' },
      ],
      edges: [
        { from: 'mod-1', to: 'mod-2' },
        { from: 'mod-2', to: 'mod-3' },
        { from: 'mod-3', to: 'mod-5' },
        { from: 'mod-4', to: 'mod-5' },
        { from: 'mod-5', to: 'mod-6' },
        { from: 'mod-5', to: 'mod-7' },
      ],
      currentModuleId: moduleStatuses.indexOf('in_progress') >= 0 ? `mod-${moduleStatuses.indexOf('in_progress') + 1}` : 'mod-1',
      currentActivityId: 'act-3-2',
      currentActivityTitle: '二叉树的遍历',
    },
    quizAttempts: {
      attempts: [
        { id: 'quiz-1', topic: '绪论', score: 85, durationSeconds: 900, weakTags: ['时间复杂度'], createdAt: new Date(Date.now() - 84 * 86400000).toISOString() },
        { id: 'quiz-2', topic: '线性表', score: 72, durationSeconds: 1100, weakTags: ['链式存储', '指针'], createdAt: new Date(Date.now() - 77 * 86400000).toISOString() },
        { id: 'quiz-3', topic: '栈和队列', score: 65, durationSeconds: 950, weakTags: ['递归'], createdAt: new Date(Date.now() - 70 * 86400000).toISOString() },
        { id: 'quiz-4', topic: '树与二叉树', score: 78, durationSeconds: 1300, weakTags: ['二叉树', '遍历'], createdAt: new Date(Date.now() - 63 * 86400000).toISOString() },
        { id: 'quiz-5', topic: '查找算法', score: 55, durationSeconds: 800, weakTags: ['二分查找', '哈希冲突'], createdAt: new Date(Date.now() - 56 * 86400000).toISOString() },
        { id: 'quiz-6', topic: '排序算法', score: 68, durationSeconds: 1200, weakTags: ['快速排序', '递归'], createdAt: new Date(Date.now() - 49 * 86400000).toISOString() },
      ],
      classAvgScore: 72.0,
    },
    kpAnchors: [
      { kpId: 'kp-1', kpName: '快速排序', kpType: 'concept', relationType: 'weak', confidence: 0.85, source: 'quiz_result', scope: 'core_curriculum' },
      { kpId: 'kp-2', kpName: '希尔排序', kpType: 'concept', relationType: 'weak', confidence: 0.72, source: 'llm_inference', scope: 'core_curriculum' },
      { kpId: 'kp-3', kpName: '图的邻接表', kpType: 'concept', relationType: 'weak', confidence: 0.55, source: 'quiz_result', scope: 'core_curriculum' },
      { kpId: 'kp-4', kpName: '哈希冲突处理', kpType: 'concept', relationType: 'weak', confidence: 0.68, source: 'quiz_result', scope: 'core_curriculum' },
      { kpId: 'kp-5', kpName: '递归思想', kpType: 'skill', relationType: 'weak', confidence: 0.60, source: 'llm_inference', scope: 'core_curriculum' },
      { kpId: 'kp-6', kpName: '链式存储', kpType: 'concept', relationType: 'weak', confidence: 0.45, source: 'quiz_result', scope: 'core_curriculum' },
    ],
    profiles: [
      {
        version: 1, createdAt: new Date(Date.now() - 90 * 86400000).toISOString(), trigger: 'chat', label: '初始画像',
        summary: ['初始画像建立', '知识基础中等', '学习目标明确'],
        radarData: [
          { name: '知识基础', value: radarVals[0] - 20 }, { name: '学习目标', value: radarVals[1] - 10 },
          { name: '认知风格', value: radarVals[2] - 8 }, { name: '学习节奏', value: radarVals[3] - 12 },
          { name: '专业理解', value: radarVals[4] - 15 }, { name: '兴趣广度', value: radarVals[5] - 12 },
        ],
      },
      {
        version: 2, createdAt: new Date(Date.now() - 70 * 86400000).toISOString(), trigger: 'quiz', label: '练习更新',
        summary: ['练习数据补充', '薄弱项识别：数据结构', '认知风格细化'],
        radarData: [
          { name: '知识基础', value: radarVals[0] - 15 }, { name: '学习目标', value: radarVals[1] - 8 },
          { name: '认知风格', value: radarVals[2] - 5 }, { name: '学习节奏', value: radarVals[3] - 10 },
          { name: '专业理解', value: radarVals[4] - 10 }, { name: '兴趣广度', value: radarVals[5] - 8 },
        ],
      },
      {
        version: 3, createdAt: new Date(Date.now() - 50 * 86400000).toISOString(), trigger: 'chat', label: '对话更新',
        summary: ['兴趣方向更新', '增加前端开发方向', '学习节奏调整为每天45分钟'],
        radarData: [
          { name: '知识基础', value: radarVals[0] - 10 }, { name: '学习目标', value: radarVals[1] - 5 },
          { name: '认知风格', value: radarVals[2] - 3 }, { name: '学习节奏', value: radarVals[3] - 6 },
          { name: '专业理解', value: radarVals[4] - 5 }, { name: '兴趣广度', value: radarVals[5] - 5 },
        ],
      },
      {
        version: 4, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), trigger: 'path_update', label: '路径调整',
        summary: ['路径调整后画像同步', '薄弱项减少3个', '知识基础维度提升12%'],
        radarData: [
          { name: '知识基础', value: radarVals[0] - 5 }, { name: '学习目标', value: radarVals[1] - 2 },
          { name: '认知风格', value: radarVals[2] - 1 }, { name: '学习节奏', value: radarVals[3] - 3 },
          { name: '专业理解', value: radarVals[4] - 2 }, { name: '兴趣广度', value: radarVals[5] - 2 },
        ],
      },
      {
        version: 5, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), trigger: 'chat', label: '对话更新',
        summary: ['对排序算法补充了更多细节', '薄弱项置信度提升', '学习计划调整建议'],
        radarData: [
          { name: '知识基础', value: radarVals[0] }, { name: '学习目标', value: radarVals[1] },
          { name: '认知风格', value: radarVals[2] }, { name: '学习节奏', value: radarVals[3] },
          { name: '专业理解', value: radarVals[4] }, { name: '兴趣广度', value: radarVals[5] },
        ],
      },
    ],
  }
}

// ============ Expanded Analytics Data ============

export interface QuizQuestionStat {
  questionId: string
  topic: string
  question: string
  correctRate: number
  difficulty: 'easy' | 'medium' | 'hard'
  discrimination: number
  topErrors: string[]
}

export interface ScoreDeepDive {
  overallStats: {
    avgScore: number
    median: number
    highest: number
    lowest: number
    stdDev: number
    passRate: number
    totalQuizzes: number
  }
  questionStats: QuizQuestionStat[]
  recentTrend: { date: string; classAvg: number; topAvg: number; bottomAvg: number }[]
  topGainers: { name: string; delta: number; current: number; previous: number }[]
  topDecliners: { name: string; delta: number; current: number; previous: number }[]
}

export interface KpCorrelation {
  source: string
  target: string
  strength: number
  direction: 'positive' | 'negative'
}

export interface StudentKpMastery {
  studentName: string
  kpName: string
  mastery: number
}

export interface KnowledgeAnalytics {
  kpMastery: StudentKpMastery[]
  kpAvgMastery: { kpName: string; avgMastery: number; studentCount: number }[]
  correlations: KpCorrelation[]
  commonErrorPairs: { pair: [string, string]; frequency: number }[]
}

export interface HourlyActivity {
  hour: number
  monday: number
  tuesday: number
  wednesday: number
  thursday: number
  friday: number
  saturday: number
  sunday: number
}

export interface BehaviorAnalytics {
  hourlyHeatmap: HourlyActivity[]
  resourceTypePreference: { type: string; count: number; avgScore: number }[]
  weeklyConsistency: { week: string; activeDays: number; avgSessionMin: number; sessions: number }[]
  deviceBreakdown: { device: string; pct: number; color: string }[]
}

export interface RiskFactor {
  name: string
  contribution: number
  color: string
  trend: 'up' | 'down' | 'stable'
  detail: string
}

export interface RiskStudent {
  id: string
  name: string
  riskScore: number
  prevRiskScore: number
  factors: RiskFactor[]
  predictedTrend: { date: string; score: number }[]
  suggestedIntervention: string
}

export interface RiskAnalytics {
  riskThresholds: { level: string; min: number; max: number; count: number; color: string }[]
  atRiskStudents: RiskStudent[]
  interventionLibrary: { title: string; desc: string; targetTags: string[]; effectHours: number; effectPct: number }[]
}

export function generateScoreDeepDive(): ScoreDeepDive {
  const questions: QuizQuestionStat[] = [
    { questionId: 'q1', topic: '线性表', question: '单链表的插入操作时间复杂度', correctRate: 0.85, difficulty: 'easy', discrimination: 0.32, topErrors: ['混淆头插尾插'] },
    { questionId: 'q2', topic: '线性表', question: '双向链表删除节点操作', correctRate: 0.72, difficulty: 'medium', discrimination: 0.45, topErrors: ['指针更新顺序错误'] },
    { questionId: 'q3', topic: '栈和队列', question: '后缀表达式求值', correctRate: 0.58, difficulty: 'medium', discrimination: 0.61, topErrors: ['运算符优先级', '栈操作时机'] },
    { questionId: 'q4', topic: '栈和队列', question: '循环队列判满条件', correctRate: 0.63, difficulty: 'medium', discrimination: 0.38, topErrors: ['牺牲单元法理解'] },
    { questionId: 'q5', topic: '树与二叉树', question: '二叉树前中后序遍历', correctRate: 0.78, difficulty: 'easy', discrimination: 0.29, topErrors: ['递归终止条件'] },
    { questionId: 'q6', topic: '树与二叉树', question: 'AVL树旋转操作', correctRate: 0.35, difficulty: 'hard', discrimination: 0.72, topErrors: ['LL/LR/RR/RL混淆'] },
    { questionId: 'q7', topic: '排序算法', question: '快速排序划分过程', correctRate: 0.42, difficulty: 'hard', discrimination: 0.68, topErrors: ['pivot选择策略', '边界条件'] },
    { questionId: 'q8', topic: '排序算法', question: '堆排序建堆过程', correctRate: 0.38, difficulty: 'hard', discrimination: 0.55, topErrors: ['下沉操作方向'] },
    { questionId: 'q9', topic: '查找算法', question: '二分查找边界条件', correctRate: 0.52, difficulty: 'medium', discrimination: 0.58, topErrors: ['mid计算溢出', '左右移动'] },
    { questionId: 'q10', topic: '图', question: 'Dijkstra最短路径', correctRate: 0.45, difficulty: 'hard', discrimination: 0.63, topErrors: ['松弛操作理解', '已确定节点'] },
    { questionId: 'q11', topic: '哈希表', question: '开放地址法探查序列', correctRate: 0.55, difficulty: 'medium', discrimination: 0.48, topErrors: ['二次探查步长', '删除标记'] },
    { questionId: 'q12', topic: '图', question: '拓扑排序序列判断', correctRate: 0.62, difficulty: 'medium', discrimination: 0.41, topErrors: ['入度为0选择顺序'] },
  ]

  // 优化：成绩趋势更真实，有波动和分化
  const trend = [
    { date: '3/1', classAvg: 72, topAvg: 92, bottomAvg: 45 },
    { date: '3/8', classAvg: 68, topAvg: 88, bottomAvg: 42 },
    { date: '3/15', classAvg: 74, topAvg: 91, bottomAvg: 48 },
    { date: '3/22', classAvg: 71, topAvg: 89, bottomAvg: 44 },
    { date: '3/29', classAvg: 65, topAvg: 86, bottomAvg: 38 },
    { date: '4/5', classAvg: 76, topAvg: 94, bottomAvg: 50 },
    { date: '4/12', classAvg: 78, topAvg: 93, bottomAvg: 52 },
    { date: '4/19', classAvg: 73, topAvg: 90, bottomAvg: 46 },
  ]

  return {
    overallStats: {
      avgScore: 72.3, median: 74, highest: 96, lowest: 28,
      stdDev: 14.2, passRate: 0.72, totalQuizzes: 8,
    },
    questionStats: questions,
    recentTrend: trend,
    topGainers: [
      { name: '林涛', delta: 22, current: 82, previous: 60 },
      { name: '何雪', delta: 18, current: 78, previous: 60 },
      { name: '吴婷', delta: 15, current: 85, previous: 70 },
      { name: '杨磊', delta: 14, current: 76, previous: 62 },
      { name: '徐明', delta: 12, current: 80, previous: 68 },
    ],
    topDecliners: [
      { name: '朱红', delta: -20, current: 52, previous: 72 },
      { name: '周强', delta: -16, current: 58, previous: 74 },
      { name: '赵敏', delta: -12, current: 65, previous: 77 },
      { name: '李娜', delta: -10, current: 68, previous: 78 },
      { name: '马超', delta: -8, current: 70, previous: 78 },
    ],
  }
}

export function generateKnowledgeAnalytics(): KnowledgeAnalytics {
  const kaRng = seededRandom(20260718)
  const kpNames = ['线性表', '栈和队列', '二叉树', '图论', '排序算法', '查找算法', '哈希表', '递归', '动态规划', '字符串']
  const studentNames = ['张伟', '王芳', '李娜', '刘洋', '陈静', '杨磊', '赵敏', '黄丽', '周强', '吴婷', '徐明', '孙悦', '马超', '朱红', '胡波', '林涛']

  // 优化：更真实的掌握度分布，各知识点难度不同
  const kpDifficulty: Record<string, number> = {
    '线性表': 75, '栈和队列': 68, '二叉树': 60, '图论': 38,
    '排序算法': 42, '查找算法': 55, '哈希表': 50, '递归': 48,
    '动态规划': 32, '字符串': 58,
  }

  const kpMastery: StudentKpMastery[] = []
  for (const sn of studentNames) {
    for (const kp of kpNames) {
      const base = kpDifficulty[kp] || 50
      // 学生间差异：好学生在所有知识点都更好
      const studentBonus = (studentNames.indexOf(sn) % 4) * 8 - 12
      kpMastery.push({
        studentName: sn,
        kpName: kp,
        mastery: Math.max(10, Math.min(100, base + studentBonus + Math.floor(kaRng() * 25) - 12)),
      })
    }
  }

  return {
    kpMastery,
    kpAvgMastery: kpNames.map(kp => ({
      kpName: kp,
      avgMastery: Math.round(kpMastery.filter(m => m.kpName === kp).reduce((s, m) => s + m.mastery, 0) / studentNames.length),
      studentCount: kpMastery.filter(m => m.kpName === kp && m.mastery < 60).length,
    })),
    correlations: [
      { source: '排序算法', target: '递归', strength: 0.82, direction: 'positive' },
      { source: '二叉树', target: '递归', strength: 0.76, direction: 'positive' },
      { source: '图论', target: '动态规划', strength: 0.71, direction: 'positive' },
      { source: '线性表', target: '栈和队列', strength: 0.68, direction: 'positive' },
      { source: '哈希表', target: '查找算法', strength: 0.65, direction: 'positive' },
      { source: '排序算法', target: '线性表', strength: 0.42, direction: 'positive' },
      { source: '动态规划', target: '递归', strength: 0.78, direction: 'positive' },
      { source: '二叉树', target: '图论', strength: 0.55, direction: 'positive' },
    ],
    commonErrorPairs: [
      { pair: ['快速排序', '递归'], frequency: 28 },
      { pair: ['AVL旋转', '二叉树遍历'], frequency: 22 },
      { pair: ['Dijkstra', '拓扑排序'], frequency: 18 },
      { pair: ['哈希冲突', '二分查找'], frequency: 15 },
      { pair: ['堆排序', '二叉树'], frequency: 14 },
    ],
  }
}

export function generateBehaviorAnalytics(): BehaviorAnalytics {
  const hourlyHeatmap: HourlyActivity[] = []
  const rng = seededRandom(20260718)
  for (let h = 0; h < 24; h++) {
    // 优化：更真实的学习时间分布
    // 凌晨几乎无人学习，上午和晚上是高峰，午休有低谷
    let base: number
    if (h >= 0 && h <= 6) base = 0  // 凌晨
    else if (h >= 7 && h <= 8) base = 3  // 早起
    else if (h >= 9 && h <= 11) base = 10  // 上午高峰
    else if (h >= 12 && h <= 13) base = 2  // 午休
    else if (h >= 14 && h <= 17) base = 8  // 下午
    else if (h >= 18 && h <= 19) base = 4  // 晚饭
    else if (h >= 20 && h <= 22) base = 12  // 晚间高峰
    else base = 5  // 深夜

    hourlyHeatmap.push({
      hour: h,
      monday: base + Math.floor(rng() * 5),
      tuesday: base + Math.floor(rng() * 4),
      wednesday: base + Math.floor(rng() * 6),
      thursday: base + Math.floor(rng() * 4),
      friday: base + Math.floor(rng() * 5),
      // 周末学习活跃度自然低于工作日
      saturday: Math.max(0, Math.floor(base * 0.5)) + Math.floor(rng() * 3),
      sunday: Math.max(0, Math.floor(base * 0.3)) + Math.floor(rng() * 2),
    })
  }

  return {
    hourlyHeatmap,
    resourceTypePreference: [
      { type: '文档', count: 156, avgScore: 74 },
      { type: '视频', count: 98, avgScore: 68 },
      { type: '练习题', count: 212, avgScore: 65 },
      { type: '代码示例', count: 134, avgScore: 78 },
      { type: '思维导图', count: 67, avgScore: 71 },
      { type: '测验', count: 180, avgScore: 72 },
    ],
    weeklyConsistency: [
      { week: '第7周', activeDays: 4, avgSessionMin: 28, sessions: 42 },
      { week: '第8周', activeDays: 5, avgSessionMin: 32, sessions: 48 },
      { week: '第9周', activeDays: 3, avgSessionMin: 25, sessions: 35 },
      { week: '第10周', activeDays: 6, avgSessionMin: 35, sessions: 55 },
      { week: '第11周', activeDays: 5, avgSessionMin: 30, sessions: 50 },
      { week: '第12周', activeDays: 4, avgSessionMin: 22, sessions: 38 },
      { week: '第13周', activeDays: 6, avgSessionMin: 38, sessions: 58 },
      { week: '第14周', activeDays: 5, avgSessionMin: 33, sessions: 52 },
    ],
    deviceBreakdown: [
      { device: 'PC Web', pct: 55.2, color: '#2B6FFF' },
      { device: '手机端', pct: 28.5, color: '#7C5CFC' },
      { device: '平板', pct: 16.3, color: '#FF8C42' },
    ],
  }
}

export function generateRiskAnalytics(): RiskAnalytics {
  const factorConfigs = [
    { name: '学习投入不足', color: '#FF3B30', detail: '近7天学习时长 < 1h' },
    { name: '路径完成滞后', color: '#FF9F0A', detail: '路径完成度低于班级均值30%' },
    { name: '薄弱知识点多', color: '#7C5CFC', detail: '薄弱项数 > 5' },
    { name: '测验成绩低下', color: '#FF8C42', detail: '测验均分 < 60' },
    { name: '学习不连续', color: '#FF6B6B', detail: '连续缺勤天数 > 3' },
  ]

  // 优化：风险学生数据更真实，风险分数分布更广
  const riskStudents: RiskStudent[] = [
    {
      id: 'stu-001', name: '张伟', riskScore: 92, prevRiskScore: 78,
      factors: [
        { ...factorConfigs[0], contribution: 38, trend: 'up' },
        { ...factorConfigs[1], contribution: 25, trend: 'up' },
        { ...factorConfigs[2], contribution: 15, trend: 'stable' },
        { ...factorConfigs[3], contribution: 12, trend: 'up' },
        { ...factorConfigs[4], contribution: 10, trend: 'up' },
      ],
      predictedTrend: [
        { date: '4/1', score: 78 }, { date: '4/8', score: 82 },
        { date: '4/15', score: 85 }, { date: '4/22', score: 88 },
        { date: '4/29', score: 90 }, { date: '5/6', score: 92 },
      ],
      suggestedIntervention: '紧急干预：安排一对一辅导，制定每日学习计划（最低1h），每3天一次小测验追踪，联系辅导员关注',
    },
    {
      id: 'stu-005', name: '陈静', riskScore: 85, prevRiskScore: 70,
      factors: [
        { ...factorConfigs[0], contribution: 32, trend: 'up' },
        { ...factorConfigs[1], contribution: 28, trend: 'up' },
        { ...factorConfigs[2], contribution: 20, trend: 'stable' },
        { ...factorConfigs[3], contribution: 15, trend: 'stable' },
        { ...factorConfigs[4], contribution: 5, trend: 'up' },
      ],
      predictedTrend: [
        { date: '4/1', score: 70 }, { date: '4/8', score: 74 },
        { date: '4/15', score: 77 }, { date: '4/22', score: 80 },
        { date: '4/29', score: 83 }, { date: '5/6', score: 85 },
      ],
      suggestedIntervention: '重点关注：降低学习目标量，培养学习习惯，安排学习伙伴互助',
    },
    {
      id: 'stu-009', name: '杨磊', riskScore: 78, prevRiskScore: 68,
      factors: [
        { ...factorConfigs[0], contribution: 25, trend: 'stable' },
        { ...factorConfigs[1], contribution: 30, trend: 'up' },
        { ...factorConfigs[2], contribution: 22, trend: 'stable' },
        { ...factorConfigs[3], contribution: 18, trend: 'stable' },
        { ...factorConfigs[4], contribution: 5, trend: 'down' },
      ],
      predictedTrend: [
        { date: '4/1', score: 68 }, { date: '4/8', score: 70 },
        { date: '4/15', score: 73 }, { date: '4/22', score: 75 },
        { date: '4/29', score: 77 }, { date: '5/6', score: 78 },
      ],
      suggestedIntervention: '重点突破薄弱模块（排序/图论），推荐视频+练习的组合学习方式',
    },
    {
      id: 'stu-013', name: '马超', riskScore: 72, prevRiskScore: 75,
      factors: [
        { ...factorConfigs[0], contribution: 18, trend: 'down' },
        { ...factorConfigs[1], contribution: 20, trend: 'stable' },
        { ...factorConfigs[2], contribution: 32, trend: 'up' },
        { ...factorConfigs[3], contribution: 25, trend: 'stable' },
        { ...factorConfigs[4], contribution: 5, trend: 'stable' },
      ],
      predictedTrend: [
        { date: '4/1', score: 75 }, { date: '4/8', score: 74 },
        { date: '4/15', score: 73 }, { date: '4/22', score: 72 },
        { date: '4/29', score: 72 }, { date: '5/6', score: 72 },
      ],
      suggestedIntervention: '薄弱知识点专项练习，使用错题本功能，每周一次知识复盘',
    },
    {
      id: 'stu-019', name: '高飞', riskScore: 68, prevRiskScore: 55,
      factors: [
        { ...factorConfigs[0], contribution: 30, trend: 'up' },
        { ...factorConfigs[1], contribution: 25, trend: 'up' },
        { ...factorConfigs[2], contribution: 15, trend: 'stable' },
        { ...factorConfigs[3], contribution: 18, trend: 'stable' },
        { ...factorConfigs[4], contribution: 12, trend: 'up' },
      ],
      predictedTrend: [
        { date: '4/1', score: 55 }, { date: '4/8', score: 58 },
        { date: '4/15', score: 62 }, { date: '4/22', score: 64 },
        { date: '4/29', score: 66 }, { date: '5/6', score: 68 },
      ],
      suggestedIntervention: '家长/导师沟通，设置学习提醒，降低每日目标量培养学习习惯',
    },
    {
      id: 'stu-023', name: '唐倩', riskScore: 88, prevRiskScore: 82,
      factors: [
        { ...factorConfigs[0], contribution: 35, trend: 'up' },
        { ...factorConfigs[1], contribution: 22, trend: 'stable' },
        { ...factorConfigs[2], contribution: 18, trend: 'up' },
        { ...factorConfigs[3], contribution: 15, trend: 'stable' },
        { ...factorConfigs[4], contribution: 10, trend: 'up' },
      ],
      predictedTrend: [
        { date: '4/1', score: 82 }, { date: '4/8', score: 84 },
        { date: '4/15', score: 85 }, { date: '4/22', score: 86 },
        { date: '4/29', score: 87 }, { date: '5/6', score: 88 },
      ],
      suggestedIntervention: '紧急干预：几乎未参与课程学习，建议与辅导员和家长沟通，了解原因',
    },
    {
      id: 'stu-031', name: '钱程', riskScore: 75, prevRiskScore: 62,
      factors: [
        { ...factorConfigs[0], contribution: 28, trend: 'up' },
        { ...factorConfigs[1], contribution: 25, trend: 'up' },
        { ...factorConfigs[2], contribution: 20, trend: 'stable' },
        { ...factorConfigs[3], contribution: 17, trend: 'stable' },
        { ...factorConfigs[4], contribution: 10, trend: 'stable' },
      ],
      predictedTrend: [
        { date: '4/1', score: 62 }, { date: '4/8', score: 65 },
        { date: '4/15', score: 68 }, { date: '4/22', score: 70 },
        { date: '4/29', score: 73 }, { date: '5/6', score: 75 },
      ],
      suggestedIntervention: '学习投入不足，基础知识掌握不牢，建议从基础概念重新学习',
    },
  ]

  return {
    riskThresholds: [
      { level: '高危', min: 80, max: 100, count: riskStudents.filter(s => s.riskScore >= 80).length, color: '#FF3B30' },
      { level: '中危', min: 60, max: 79, count: riskStudents.filter(s => s.riskScore >= 60 && s.riskScore < 80).length, color: '#FF9F0A' },
      { level: '关注', min: 40, max: 59, count: riskStudents.filter(s => s.riskScore >= 40 && s.riskScore < 60).length, color: '#FF8C42' },
      { level: '安全', min: 0, max: 39, count: riskStudents.filter(s => s.riskScore < 40).length, color: '#34C759' },
    ],
    atRiskStudents: riskStudents,
    interventionLibrary: [
      { title: '每日学习计划', desc: '制定最低1h/天的学习计划，系统自动提醒', targetTags: ['低投入'], effectHours: 24, effectPct: 35 },
      { title: '一对一辅导', desc: '安排教师或助教进行针对性辅导', targetTags: ['低完成', '薄弱多'], effectHours: 48, effectPct: 45 },
      { title: '专项练习包', desc: '针对薄弱知识点自动生成练习包', targetTags: ['薄弱多', '低分'], effectHours: 12, effectPct: 30 },
      { title: '错题重练', desc: '基于历史错题生成重练计划', targetTags: ['低分'], effectHours: 6, effectPct: 25 },
      { title: '学习习惯培养', desc: '降低每日目标量，小步快跑培养学习习惯', targetTags: ['未开始', '低投入'], effectHours: 72, effectPct: 40 },
      { title: '家长/导师通知', desc: '自动生成学情报告并通知家长/导师', targetTags: ['低投入', '低完成', '未开始'], effectHours: 12, effectPct: 20 },
    ],
  }
}
