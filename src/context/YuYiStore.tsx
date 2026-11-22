import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AIConfig,
  AuthUser,
  Gender,
  NudgeActionLog,
  PartnerId,
  SharedHabitChallenge,
  SpaceInfo,
  SpaceMember,
  SubtaskItem,
  UsageMode,
  YuYiTask,
} from '../types/todo';
import { CARD_COLORS, formatDateYYYYMMDD, PARTNERS } from '../services/nlpAndAiEngine';
import { authApi } from '../services/authApi';

const STORAGE_KEY = '@yuyi_do_state_v1';

interface YuYiStoreContextValue {
  hydrated: boolean;
  currentUserId: PartnerId;
  partnerUserId: PartnerId;
  authToken: string | null;
  authUser: AuthUser | null;
  spaceInfo: SpaceInfo | null;
  spaceMembers: SpaceMember[];
  dbMode: 'mysql' | 'local_fallback';
  registerAccount: (username: string, password: string, gender: Gender) => Promise<void>;
  loginAccount: (username: string, password: string) => Promise<void>;
  logoutAccount: () => void;
  changeUsageMode: (mode: UsageMode) => Promise<void>;
  joinSpaceByInviteCode: (code: string) => Promise<void>;
  sendCrossSpaceNudge: (targetUsername: string, emoji?: string, customMessage?: string) => Promise<void>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  switchUser: (target?: PartnerId) => void;
  tasks: YuYiTask[];
  nudgeLogs: NudgeActionLog[];
  habitChallenges: SharedHabitChallenge[];
  aiConfig: AIConfig;
  addTask: (task: Omit<YuYiTask, 'id' | 'createdAt' | 'comments' | 'completedBy'>) => YuYiTask;
  toggleTaskCheck: (taskId: string, actorId?: PartnerId) => void;
  toggleSubtaskCheck: (taskId: string, subtaskId: string, actorId?: PartnerId) => void;
  addComment: (taskId: string, content: string) => void;
  deleteTask: (taskId: string) => void;
  sendNudge: (opts: {
    taskId?: string;
    taskTitle?: string;
    customMessage?: string;
    emoji?: string;
  }) => void;
  checkInHabit: (habitId: string, actorId?: PartnerId) => void;
  addHabitChallenge: (title: string, icon: string, targetDays: number, rewardPromise: string) => void;
  updateAiConfig: (partial: Partial<AIConfig>) => void;
  exportSyncPayload: () => string;
  importSyncPayload: (payload: string) => boolean;
  isTaskFullyCompleted: (task: YuYiTask) => boolean;
}

const YuYiStoreContext = createContext<YuYiStoreContextValue | undefined>(undefined);

function createInitialTasks(today: string): YuYiTask[] {
  return [
    {
      id: 'task_yuyi_1',
      title: '🌧️敬雨 & 🌸慧仪 晚间夜跑或散步 30 分钟',
      description: '一起放下手机出门吹吹晚风，聊聊今天发生的开心事',
      date: today,
      time: '19:30',
      reminderMinutesBefore: 30,
      recurrence: 'daily',
      autoRollover: true,
      category: '运动健康',
      cardColor: CARD_COLORS['运动健康'],
      creatorId: 'jingyu',
      ownerId: 'jingyu',
      supervisorId: 'huiyi',
      collaborationMode: 'both_required',
      completedBy: ['jingyu'],
      isAiGenerated: true,
      subtasks: [
        {
          id: 'sub_init_1',
          title: '换好舒适运动鞋，带好水杯与蓝牙耳机',
          assignee: 'both',
          completedBy: ['jingyu', 'huiyi'],
          estimatedMinutes: 5,
        },
        {
          id: 'sub_init_2',
          title: '热身拉伸 5 分钟，开启运动记录',
          assignee: 'jingyu',
          completedBy: ['jingyu'],
          estimatedMinutes: 5,
        },
        {
          id: 'sub_init_3',
          title: '并肩慢跑/快走 3 公里并拍照打卡',
          assignee: 'both',
          completedBy: [],
          estimatedMinutes: 25,
        },
      ],
      comments: [
        {
          id: 'cmt_1',
          authorId: 'jingyu',
          content: '我已经换好运动鞋啦，慧仪准备好我们就出发！💪',
          createdAt: '18:50',
        },
        {
          id: 'cmt_2',
          authorId: 'huiyi',
          content: '马上好！今晚天气超舒服～🌸',
          createdAt: '18:55',
        },
      ],
      createdAt: today,
    },
    {
      id: 'task_yuyi_2',
      title: '背诵今日 30 个核心英语单词 & 互相抽查',
      description: '陪伴上线，拖延下线！背完后在评论区留言抽查 5 个词',
      date: today,
      time: '21:00',
      reminderMinutesBefore: 15,
      recurrence: 'daily',
      autoRollover: true,
      category: '学习提升',
      cardColor: CARD_COLORS['学习提升'],
      creatorId: 'huiyi',
      ownerId: 'huiyi',
      supervisorId: 'jingyu',
      collaborationMode: 'both_required',
      completedBy: ['huiyi'],
      isAiGenerated: true,
      subtasks: [
        {
          id: 'sub_init_21',
          title: '专注刷完今日新词 30 个（期间不刷短视频）',
          assignee: 'both',
          completedBy: ['huiyi'],
          estimatedMinutes: 20,
        },
        {
          id: 'sub_init_22',
          title: 'AfterRain 抽查 Midsummer 5 个易错词',
          assignee: 'jingyu',
          completedBy: [],
          estimatedMinutes: 5,
        },
        {
          id: 'sub_init_23',
          title: 'Midsummer 抽查 AfterRain 5 个易错词',
          assignee: 'huiyi',
          completedBy: ['huiyi'],
          estimatedMinutes: 5,
        },
      ],
      comments: [
        {
          id: 'cmt_3',
          authorId: 'huiyi',
          content: '我今天先背完打勾啦！敬雨快跟上，等你来抽查～✨',
          createdAt: '20:15',
        },
      ],
      createdAt: today,
    },
    {
      id: 'task_yuyi_3',
      title: '周末双人浪漫野餐 & 料理采购清单',
      description: '由 AI 子任务拆解自动生成的双人分工清单',
      date: today,
      time: '16:00',
      reminderMinutesBefore: 60,
      recurrence: 'none',
      autoRollover: true,
      category: '浪漫约定',
      cardColor: CARD_COLORS['浪漫约定'],
      creatorId: 'jingyu',
      ownerId: 'jingyu',
      supervisorId: 'huiyi',
      collaborationMode: 'both_required',
      completedBy: [],
      isAiGenerated: true,
      subtasks: [
        {
          id: 'sub_init_31',
          title: 'AfterRain 负责：准备野餐垫、充电宝与便携小音箱',
          assignee: 'jingyu',
          completedBy: ['jingyu'],
          estimatedMinutes: 15,
        },
        {
          id: 'sub_init_32',
          title: 'Midsummer 负责：挑选草莓、蓝莓与气泡果饮',
          assignee: 'huiyi',
          completedBy: ['huiyi'],
          estimatedMinutes: 20,
        },
        {
          id: 'sub_init_33',
          title: '共同完成：傍晚去公园草坪看日落拍照',
          assignee: 'both',
          completedBy: [],
          estimatedMinutes: 90,
        },
      ],
      comments: [],
      createdAt: today,
    },
    {
      id: 'task_yuyi_4',
      title: '顺路去驿站取放在门卫的快递',
      description: '任一人完成即可（谁下班/下课早谁顺手拿一下）',
      date: today,
      time: '18:00',
      reminderMinutesBefore: 15,
      recurrence: 'none',
      autoRollover: true,
      category: '生活日常',
      cardColor: CARD_COLORS['生活日常'],
      creatorId: 'huiyi',
      ownerId: 'jingyu',
      supervisorId: 'huiyi',
      collaborationMode: 'either_one',
      completedBy: [],
      subtasks: [],
      comments: [],
      createdAt: today,
    },
  ];
}

function createInitialHabits(today: string): SharedHabitChallenge[] {
  return [
    {
      id: 'habit_1',
      title: '23:30 前放下手机互道晚安',
      icon: '🌙',
      targetDays: 21,
      streakDays: 12,
      todayCheckedBy: ['huiyi'],
      historyDates: { [today]: ['huiyi'] },
      rewardPromise: '满 21 天一起去吃最爱的火锅大餐 🍲',
    },
    {
      id: 'habit_2',
      title: '每日共同阅读 / 学习专注 45 分钟',
      icon: '📚',
      targetDays: 30,
      streakDays: 8,
      todayCheckedBy: ['jingyu', 'huiyi'],
      historyDates: { [today]: ['jingyu', 'huiyi'] },
      rewardPromise: '满 30 天互送一份神秘心愿礼物 🎁',
    },
    {
      id: 'habit_3',
      title: '每天喝满 8 杯水 & 拒绝高糖奶茶',
      icon: '💧',
      targetDays: 14,
      streakDays: 5,
      todayCheckedBy: ['jingyu'],
      historyDates: { [today]: ['jingyu'] },
      rewardPromise: '满 14 天周末一起去看场电影 🎬',
    },
  ];
}

function createInitialNudges(): NudgeActionLog[] {
  return [
    {
      id: 'nudge_1',
      fromId: 'huiyi',
      toId: 'jingyu',
      taskId: 'task_yuyi_2',
      taskTitle: '背诵今日 30 个核心英语单词 & 互相抽查',
      message: 'Midsummer 拍了拍 AfterRain 的小脑袋：我已经背完单词啦，快点来打勾！',
      emoji: '👋',
      createdAt: '20:16',
    },
    {
      id: 'nudge_2',
      fromId: 'jingyu',
      toId: 'huiyi',
      taskId: 'task_yuyi_1',
      taskTitle: '🌧️AfterRain & ☀️Midsummer 晚间夜跑或散步 30 分钟',
      message: 'AfterRain 给 Midsummer 送了一朵小红花：今晚一起加油完成夜跑目标！',
      emoji: '🌸',
      createdAt: '18:52',
    },
  ];
}

export const YuYiStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const todayStr = formatDateYYYYMMDD(new Date());
  const [currentUserId, setCurrentUserId] = useState<PartnerId>('jingyu');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [tasksBySpace, setTasksBySpace] = useState<Record<string, YuYiTask[]>>(() => ({
    demo_default: createInitialTasks(todayStr),
    space_1: createInitialTasks(todayStr),
  }));
  const [nudgeLogs, setNudgeLogs] = useState<NudgeActionLog[]>(() => createInitialNudges());
  const [habitChallenges, setHabitChallenges] = useState<SharedHabitChallenge[]>(() =>
    createInitialHabits(todayStr)
  );
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    aiMode: 'free_auto',
    apiBaseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    modelName: 'deepseek-chat',
    enableAutoBreakdown: true,
  });
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);
  const [dbMode, setDbMode] = useState<'mysql' | 'local_fallback'>('local_fallback');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.currentUserId) setCurrentUserId(parsed.currentUserId);
          if (parsed.tasksBySpace && typeof parsed.tasksBySpace === 'object') {
            setTasksBySpace(parsed.tasksBySpace);
          } else if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
            setTasksBySpace((prev) => ({ ...prev, demo_default: parsed.tasks, space_1: parsed.tasks }));
          }
          if (Array.isArray(parsed.nudgeLogs)) setNudgeLogs(parsed.nudgeLogs);
          if (Array.isArray(parsed.habitChallenges)) setHabitChallenges(parsed.habitChallenges);
          if (parsed.aiConfig) setAiConfig((prev) => ({ ...prev, ...parsed.aiConfig }));
          if (parsed.authToken) {
            setAuthToken(parsed.authToken);
            if (parsed.authUser) setAuthUser(parsed.authUser);
            if (parsed.spaceInfo) setSpaceInfo(parsed.spaceInfo);
            if (Array.isArray(parsed.spaceMembers)) setSpaceMembers(parsed.spaceMembers);
            // 尝试从后端刷新最新 MySQL 用户/空间成员状态
            authApi
              .getMe(parsed.authToken)
              .then((res) => {
                setAuthUser(res.user);
                setSpaceInfo(res.space);
                setSpaceMembers(res.members);
                setDbMode(res.dbMode);
              })
              .catch(() => {});
          }
        }
      } catch {
        // ignore storage errors
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload = JSON.stringify({
      currentUserId,
      tasksBySpace,
      nudgeLogs,
      habitChallenges,
      aiConfig,
      authToken,
      authUser,
      spaceInfo,
      spaceMembers,
    });
    AsyncStorage.setItem(STORAGE_KEY, payload).catch(() => {});
  }, [
    hydrated,
    currentUserId,
    tasksBySpace,
    nudgeLogs,
    habitChallenges,
    aiConfig,
    authToken,
    authUser,
    spaceInfo,
    spaceMembers,
  ]);

  const activeSpaceKey = spaceInfo ? `space_${spaceInfo.id}` : 'demo_default';
  const tasks: YuYiTask[] = tasksBySpace[activeSpaceKey] || [];

  const setTasks = (updater: YuYiTask[] | ((prev: YuYiTask[]) => YuYiTask[])) => {
    setTasksBySpace((prev) => {
      const currentList = prev[activeSpaceKey] || [];
      const nextList = typeof updater === 'function' ? updater(currentList) : updater;
      if (authToken && spaceInfo) {
        authApi.saveSpaceTasks(authToken, nextList).catch(() => {});
      }
      return {
        ...prev,
        [activeSpaceKey]: nextList,
      };
    });
  };

  const partnerUserId: PartnerId = currentUserId === 'jingyu' ? 'huiyi' : 'jingyu';

  const switchUser = (target?: PartnerId) => {
    setCurrentUserId((prev) => target || (prev === 'jingyu' ? 'huiyi' : 'jingyu'));
  };

  const isTaskFullyCompleted = (task: YuYiTask): boolean => {
    if (spaceInfo?.usage_mode === 'solo') {
      return task.completedBy.includes(currentUserId);
    }
    if (task.collaborationMode === 'both_required') {
      return task.completedBy.includes('jingyu') && task.completedBy.includes('huiyi');
    }
    if (task.collaborationMode === 'either_one') {
      return task.completedBy.length > 0;
    }
    return task.completedBy.includes(task.ownerId);
  };

  const addTask: YuYiStoreContextValue['addTask'] = (input) => {
    const newTask: YuYiTask = {
      ...input,
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      completedBy: [],
      comments: [],
      createdAt: formatDateYYYYMMDD(new Date()),
    };
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  };

  const toggleTaskCheck = (taskId: string, actorId?: PartnerId) => {
    const user = actorId || currentUserId;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const already = t.completedBy.includes(user);
        const nextCompletedBy = already
          ? t.completedBy.filter((id) => id !== user)
          : [...t.completedBy, user];
        return {
          ...t,
          completedBy: nextCompletedBy,
        };
      })
    );
  };

  const toggleSubtaskCheck = (taskId: string, subtaskId: string, actorId?: PartnerId) => {
    const user = actorId || currentUserId;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updatedSubs: SubtaskItem[] = t.subtasks.map((s) => {
          if (s.id !== subtaskId) return s;
          const has = s.completedBy.includes(user);
          return {
            ...s,
            completedBy: has
              ? s.completedBy.filter((id) => id !== user)
              : [...s.completedBy, user],
          };
        });
        return {
          ...t,
          subtasks: updatedSubs,
        };
      })
    );
  };

  const addComment = (taskId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          comments: [
            ...t.comments,
            {
              id: `cmt_${Date.now()}`,
              authorId: currentUserId,
              content: trimmed,
              createdAt: timeStr,
            },
          ],
        };
      })
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const sendNudge: YuYiStoreContextValue['sendNudge'] = ({
    taskId,
    taskTitle,
    customMessage,
    emoji = '👋',
  }) => {
    const fromProfile = PARTNERS[currentUserId];
    const toProfile = PARTNERS[partnerUserId];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const defaultMsg = taskTitle
      ? `${fromProfile.name} 拍了拍 ${toProfile.name}：快去完成「${taskTitle}」并一起打勾吧！`
      : `${fromProfile.name} 拍了拍 ${toProfile.name} 的小脑袋：今天也要元气满满一起打卡哦！`;

    const newLog: NudgeActionLog = {
      id: `nudge_${Date.now()}`,
      fromId: currentUserId,
      toId: partnerUserId,
      taskId,
      taskTitle,
      message: customMessage || defaultMsg,
      emoji,
      createdAt: timeStr,
    };
    setNudgeLogs((prev) => [newLog, ...prev]);
  };

  const checkInHabit = (habitId: string, actorId?: PartnerId) => {
    const user = actorId || currentUserId;
    setHabitChallenges((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const already = h.todayCheckedBy.includes(user);
        const nextChecked = already
          ? h.todayCheckedBy.filter((id) => id !== user)
          : [...h.todayCheckedBy, user];
        const bothDoneNow =
          nextChecked.includes('jingyu') && nextChecked.includes('huiyi');
        const bothDoneBefore =
          h.todayCheckedBy.includes('jingyu') && h.todayCheckedBy.includes('huiyi');
        let nextStreak = h.streakDays;
        if (bothDoneNow && !bothDoneBefore) nextStreak += 1;
        if (!bothDoneNow && bothDoneBefore && nextStreak > 0) nextStreak -= 1;

        return {
          ...h,
          todayCheckedBy: nextChecked,
          streakDays: nextStreak,
          historyDates: {
            ...h.historyDates,
            [todayStr]: nextChecked,
          },
        };
      })
    );
  };

  const addHabitChallenge = (
    title: string,
    icon: string,
    targetDays: number,
    rewardPromise: string
  ) => {
    const newHabit: SharedHabitChallenge = {
      id: `habit_${Date.now()}`,
      title: title.trim(),
      icon: icon || '✨',
      targetDays: targetDays || 21,
      streakDays: 0,
      todayCheckedBy: [],
      historyDates: {},
      rewardPromise: rewardPromise.trim() || '达成目标一起去庆祝 🎉',
    };
    setHabitChallenges((prev) => [newHabit, ...prev]);
  };

  const updateAiConfig = (partial: Partial<AIConfig>) => {
    setAiConfig((prev) => ({ ...prev, ...partial }));
  };

  const exportSyncPayload = (): string => {
    return JSON.stringify({
      tasks,
      nudgeLogs,
      habitChallenges,
    });
  };

  const importSyncPayload = (payload: string): boolean => {
    try {
      const parsed = JSON.parse(payload);
      if (Array.isArray(parsed.tasks)) {
        setTasks(parsed.tasks);
        if (Array.isArray(parsed.nudgeLogs)) setNudgeLogs(parsed.nudgeLogs);
        if (Array.isArray(parsed.habitChallenges)) setHabitChallenges(parsed.habitChallenges);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const applyAuthContext = (res: {
    token?: string;
    user: AuthUser;
    space: SpaceInfo | null;
    members: SpaceMember[];
    dbMode: 'mysql' | 'local_fallback';
  }) => {
    const activeToken = res.token || authToken;
    if (res.token) setAuthToken(res.token);
    setAuthUser(res.user);
    setSpaceInfo(res.space);
    setSpaceMembers(res.members);
    setDbMode(res.dbMode);
    setCurrentUserId(res.user.gender === 'female' ? 'huiyi' : 'jingyu');
    if (activeToken && res.space) {
      const key = `space_${res.space.id}`;
      authApi
        .getSpaceTasks(activeToken)
        .then((tRes) => {
          if (Array.isArray(tRes.tasks)) {
            setTasksBySpace((prev) => ({ ...prev, [key]: tRes.tasks }));
          }
        })
        .catch(() => {});
    }
  };

  const registerAccount = async (username: string, password: string, gender: Gender) => {
    const res = await authApi.register(username, password, gender);
    applyAuthContext(res);
  };

  const loginAccount = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    applyAuthContext(res);
  };

  const logoutAccount = () => {
    setAuthToken(null);
    setAuthUser(null);
    setSpaceInfo(null);
    setSpaceMembers([]);
  };

  const changeUsageMode = async (mode: UsageMode) => {
    if (!authToken) throw new Error('请先登录后再修改使用模式');
    const res = await authApi.updateUsageMode(authToken, mode);
    setAuthUser(res.user);
    setSpaceInfo(res.space);
    setSpaceMembers(res.members);
    setDbMode(res.dbMode);
  };

  const joinSpaceByInviteCode = async (code: string) => {
    if (!authToken) throw new Error('请先登录账号后再填写邀请码加入');
    const res = await authApi.joinByInviteCode(authToken, code);
    applyAuthContext(res);
  };

  const sendCrossSpaceNudge = async (
    targetUsername: string,
    emoji = '👋',
    customMessage?: string
  ) => {
    if (!authToken) throw new Error('请先登录账号后再发送跨空间拍一拍提醒');
    const res = await authApi.sendCrossSpaceNudge(
      authToken,
      targetUsername,
      emoji,
      customMessage
    );
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    setNudgeLogs((prev) => [
      {
        id: `cross_nudge_${Date.now()}`,
        fromId: currentUserId,
        toId: partnerUserId,
        message: res.nudge.message,
        emoji: res.nudge.emoji,
        createdAt: timeStr,
      },
      ...prev,
    ]);
  };

  return (
    <YuYiStoreContext.Provider
      value={{
        hydrated,
        currentUserId,
        partnerUserId,
        authToken,
        authUser,
        spaceInfo,
        spaceMembers,
        dbMode,
        registerAccount,
        loginAccount,
        logoutAccount,
        changeUsageMode,
        joinSpaceByInviteCode,
        sendCrossSpaceNudge,
        selectedDate,
        setSelectedDate,
        switchUser,
        tasks,
        nudgeLogs,
        habitChallenges,
        aiConfig,
        addTask,
        toggleTaskCheck,
        toggleSubtaskCheck,
        addComment,
        deleteTask,
        sendNudge,
        checkInHabit,
        addHabitChallenge,
        updateAiConfig,
        exportSyncPayload,
        importSyncPayload,
        isTaskFullyCompleted,
      }}
    >
      {children}
    </YuYiStoreContext.Provider>
  );
};

export function useYuYiStore(): YuYiStoreContextValue {
  const ctx = useContext(YuYiStoreContext);
  if (!ctx) {
    throw new Error('useYuYiStore must be used inside YuYiStoreProvider');
  }
  return ctx;
}
