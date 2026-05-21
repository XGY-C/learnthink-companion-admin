// ===================================================================
// Admin shared types
// ===================================================================

export interface UserInfo {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl: string
  role: 'admin' | 'student'
  major: string
  grade: string
}

export interface Course {
  id: string
  name: string
  description: string
  emoji: string
  grade: string
  subject: string
  enabled: boolean
  kpCount?: number
  docCount?: number
  studentCount?: number
  createdAt: string
}

export interface KnowledgePoint {
  id: string
  courseId: string
  parentId: string | null
  name: string
  kpType: 'course' | 'chapter' | 'section' | 'concept' | 'skill'
  scope: 'core_curriculum' | 'prerequisite' | 'supplementary'
  depth: number
  sortOrder: number
  description: string
  learningObjectives: string[]
  difficulty: number
  estimatedMinutes: number
  prerequisiteKps: string[]
  relatedKps: string[]
  keywords: string[]
  children?: KnowledgePoint[]
}

export interface KnowledgeDocument {
  id: string
  courseId: string
  courseName: string
  title: string
  sourceType: 'lecture' | 'glossary' | 'exercise_bank' | 'reading'
  filePath: string
  docHash: string
  chunkCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
  linkedKpCount: number
  createdAt: string
  updatedAt: string
}

export interface ResourceItem {
  id: string
  packId: string
  taskId: string
  type: 'doc' | 'quiz' | 'mindmap' | 'reading' | 'code' | 'video'
  title: string
  status: 'pending' | 'ready' | 'failed' | 'rejected'
  contentRef: string
  contentMime: string
  confidenceScore: number
  qualityScore: number
  sourcesJson: SourceCitation[]
  reviewStatus: 'pending' | 'approved' | 'rejected'
  reviewSummary: string
  courseName: string
  createdAt: string
}

export interface SourceCitation {
  claim: string
  sourceDoc: string
  chunkId: string
  matched: boolean
  matchType?: 'exact' | 'partial' | 'none'
}

export interface ReviewRecord {
  id: string
  resourceItemId: string
  resourcePackId: string
  taskId: string
  result: 'approved' | 'rejected'
  reasonsJson: string[]
  citationCoverage: number
  createdAt: string
}

export interface StudentInfo {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl: string
  major: string
  grade: string
  role: string
  status: 'enabled' | 'disabled'
  courseCount: number
  totalLearningMinutes: number
  lastActiveAt: string
  createdAt: string
}

export interface StudentStats {
  totalLearningMinutes: number
  totalResourcePacks: number
  totalQuizAttempts: number
  totalQuizScoreAvg: number
  pathMasteredNodes: number
  pathTotalNodes: number
  currentWeakCount: number
  weekLearningMinutes: number
  weekResourcePacks: number
  weekQuizAttempts: number
}

export interface ProfileDimension {
  majorContext: number
  knowledgeBasis: number
  learningGoal: number
  cognitiveStyle: number
  learningPace: number
  interestDirection: number
  errorPattern: number
}

export interface ProfileVersion {
  id: string
  version: number
  dimensionsJson: ProfileDimension
  summaryJson: Record<string, any>
  createdAt: string
}

export interface RetrieveResult {
  chunkId: string
  content: string
  score: number
  sourceDoc: string
  courseId: string
  keywords: string[]
}

export interface DashboardStats {
  totalUsers: number
  newUsersThisWeek: number
  activeCourses: number
  totalTasks: number
  tasksThisWeek: number
  taskSuccessRate: number
  activeStudentsThisWeek: number
  totalDocuments: number
  totalChunks: number
}

export interface SystemHealth {
  rag: { status: 'up' | 'down'; latency: number }
  milvus: { status: 'up' | 'down' }
  llm: { status: 'up' | 'down'; successRate: number }
}
