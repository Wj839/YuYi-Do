export type PartnerId = 'jingyu' | 'huiyi';

export type Gender = 'male' | 'female';
export type UsageMode = 'solo' | 'couple' | 'group';

export interface AuthUser {
  id: number;
  username: string;
  gender: Gender;
  avatar_emoji: string;
}

export interface SpaceInfo {
  id: number;
  name: string;
  usage_mode: UsageMode;
  invite_code: string;
  owner_id: number;
}

export interface SpaceMember {
  id: number;
  username: string;
  gender: Gender;
  avatar_emoji: string;
  role: 'owner' | 'member';
}

export interface PartnerProfile {
  id: PartnerId;
  name: string;
  nickname: string;
  avatarEmoji: string;
  themeColor: string;
  lightBg: string;
  motto: string;
}

/**
 * 对应 DuoDo 与 HabitSync 的协作与监督模式：
 * - 'both_required': 共同完成（空间搭子双方都需打勾才算最终完成）
 * - 'either_one': 协同分工（任一人打勾即完成，例如取快递、买水果）
 * - 'supervised': 专属任务 + 搭子监督（一方执行，另一方作为监工搭子可拍一拍督促）
 */
export type CollaborationMode = 'both_required' | 'either_one' | 'supervised';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface SubtaskItem {
  id: string;
  title: string;
  assignee: PartnerId | 'both';
  completedBy: PartnerId[];
  estimatedMinutes?: number;
}

export interface TaskComment {
  id: string;
  authorId: PartnerId;
  content: string;
  createdAt: string;
}

export interface YuYiTask {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  reminderMinutesBefore?: number;
  recurrence: RecurrenceType;
  autoRollover: boolean; // 未完成自动顺延到第二天（DuoDo 核心特性）
  category: '学习提升' | '生活日常' | '运动健康' | '浪漫约定' | '工作计划';
  cardColor: string;
  creatorId: PartnerId;
  ownerId: PartnerId; // 针对 supervised 模式的主执行人
  supervisorId: PartnerId; // 监工搭子
  collaborationMode: CollaborationMode;
  completedBy: PartnerId[]; // 已打勾的成员列表
  subtasks: SubtaskItem[];
  comments: TaskComment[];
  createdAt: string;
  isAiGenerated?: boolean;
}

export interface NudgeActionLog {
  id: string;
  fromId: PartnerId;
  toId: PartnerId;
  taskId?: string;
  taskTitle?: string;
  message: string;
  emoji: string;
  createdAt: string;
}

/**
 * 源自 jofoerster/habitsync 的双人共同习惯打卡挑战模型
 */
export interface SharedHabitChallenge {
  id: string;
  title: string;
  icon: string;
  targetDays: number;
  streakDays: number;
  todayCheckedBy: PartnerId[];
  historyDates: Record<string, PartnerId[]>; // YYYY-MM-DD -> 打卡人
  rewardPromise: string; // 达成奖励约定，例如“连续打卡14天一起去吃火锅”
}

export type AIMode = 'free_auto' | 'local_only' | 'custom_key';

export interface AIConfig {
  aiMode: AIMode;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  enableAutoBreakdown: boolean;
}

export interface NLPParseResult {
  cleanTitle: string;
  date: string;
  dateLabel: string;
  time?: string;
  reminderMinutesBefore?: number;
  recurrence: RecurrenceType;
  recurrenceLabel: string;
  collaborationMode: CollaborationMode;
  ownerId: PartnerId;
  category: YuYiTask['category'];
  cardColor: string;
  detectedKeywords: string[];
}
