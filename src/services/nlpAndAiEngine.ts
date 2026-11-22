import type {
  AIConfig,
  CollaborationMode,
  NLPParseResult,
  PartnerId,
  RecurrenceType,
  SubtaskItem,
  YuYiTask,
} from '../types/todo';

export const PARTNERS: Record<
  PartnerId,
  {
    id: PartnerId;
    name: string;
    nickname: string;
    avatarEmoji: string;
    themeColor: string;
    lightBg: string;
    motto: string;
  }
> = {
  jingyu: {
    id: 'jingyu',
    name: 'AfterRain',
    nickname: 'AfterRain',
    avatarEmoji: '🌧️',
    themeColor: '#5B6CFF',
    lightBg: '#EEF0FF',
    motto: '春雨润物，行稳致远',
  },
  huiyi: {
    id: 'huiyi',
    name: 'Midsummer',
    nickname: 'Midsummer',
    avatarEmoji: '☀️',
    themeColor: '#FF6B9D',
    lightBg: '#FFF0F5',
    motto: '盛夏繁花，心有灵犀',
  },
};

export const CARD_COLORS: Record<YuYiTask['category'], string> = {
  浪漫约定: '#FFE4F0',
  学习提升: '#E6EBFF',
  运动健康: '#E3F9EE',
  生活日常: '#FFF4DE',
  工作计划: '#EFE8FF',
};

export function formatDateYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(baseDateStr: string, days: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatDateYYYYMMDD(dt);
}

/**
 * 整合自 mariangle/taskify 的中文自然语言时间、周期、提醒、搭子指派解析器
 * 支持识别诸如：
 * - "明天晚上7点半和Midsummer一起去夜跑5公里，提前半小时提醒"
 * - "每周日下午3点给奶奶打电话 @AfterRain"
 * - "后天上午9点陪Midsummer去图书馆复习高数"
 */
export function parseNaturalLanguageTask(
  rawText: string,
  currentUserId: PartnerId,
  referenceDateStr?: string
): NLPParseResult {
  const todayStr = referenceDateStr || formatDateYYYYMMDD(new Date());
  let text = rawText.trim();
  const detectedKeywords: string[] = [];

  // 1. 解析日期
  let targetDate = todayStr;
  let dateLabel = '今天';

  if (text.includes('大后天')) {
    targetDate = addDays(todayStr, 3);
    dateLabel = '大后天';
    detectedKeywords.push('日期: 大后天');
    text = text.replace(/大后天/g, '');
  } else if (text.includes('后天')) {
    targetDate = addDays(todayStr, 2);
    dateLabel = '后天';
    detectedKeywords.push('日期: 后天');
    text = text.replace(/后天/g, '');
  } else if (text.includes('明天') || text.includes('明日') || text.includes('明早') || text.includes('明晚')) {
    targetDate = addDays(todayStr, 1);
    dateLabel = '明天';
    detectedKeywords.push('日期: 明天');
    if (text.includes('明早')) {
      text = text.replace(/明早/g, '早上');
    } else if (text.includes('明晚')) {
      text = text.replace(/明晚/g, '晚上');
    } else {
      text = text.replace(/明天|明日/g, '');
    }
  } else if (text.includes('今天') || text.includes('今日') || text.includes('今晚') || text.includes('今早')) {
    targetDate = todayStr;
    dateLabel = '今天';
    detectedKeywords.push('日期: 今天');
    if (text.includes('今晚')) {
      text = text.replace(/今晚/g, '晚上');
    } else if (text.includes('今早')) {
      text = text.replace(/今早/g, '早上');
    } else {
      text = text.replace(/今天|今日/g, '');
    }
  } else if (text.includes('周末') || text.includes('周六') || text.includes('周日')) {
    const [y, m, d] = todayStr.split('-').map(Number);
    const cur = new Date(y, m - 1, d);
    const dayOfWeek = cur.getDay(); // 0 is Sun, 6 is Sat
    const targetDow = text.includes('周日') ? 0 : 6;
    let diff = (targetDow - dayOfWeek + 7) % 7;
    if (diff === 0) diff = 7;
    targetDate = addDays(todayStr, diff);
    dateLabel = text.includes('周日') ? '本周日' : '本周六';
    detectedKeywords.push(`日期: ${dateLabel}`);
  }

  // 2. 解析重复周期 (Recurrence)
  let recurrence: RecurrenceType = 'none';
  let recurrenceLabel = '单次任务';
  if (/每天|每日|天天/.test(rawText)) {
    recurrence = 'daily';
    recurrenceLabel = '每天重复';
    detectedKeywords.push('周期: 每天重复');
    text = text.replace(/每天|每日|天天/g, '');
  } else if (/每周[一二三四五六日天]?|每星期/.test(rawText)) {
    recurrence = 'weekly';
    recurrenceLabel = '每周重复';
    detectedKeywords.push('周期: 每周重复');
    text = text.replace(/每周[一二三四五六日天]?|每星期[一二三四五六日天]?/g, '');
  } else if (/每月(\d+号)?|每个月/.test(rawText)) {
    recurrence = 'monthly';
    recurrenceLabel = '每月重复';
    detectedKeywords.push('周期: 每月重复');
    text = text.replace(/每月|每个月/g, '');
  }

  // 3. 解析提醒时间 (Reminder)
  let reminderMinutesBefore: number | undefined = 15;
  if (/提前半小时提醒(我)?|提前30分钟提醒(我)?/.test(rawText)) {
    reminderMinutesBefore = 30;
    detectedKeywords.push('提醒: 提前30分钟');
    text = text.replace(/，?提前(半小时|30分钟)提醒(我)?/g, '');
  } else if (/提前一?小时提醒(我)?|提前60分钟提醒(我)?/.test(rawText)) {
    reminderMinutesBefore = 60;
    detectedKeywords.push('提醒: 提前1小时');
    text = text.replace(/，?提前(一?小时|60分钟)提醒(我)?/g, '');
  } else if (/提前(\d+)分钟提醒(我)?/.test(rawText)) {
    const m = rawText.match(/提前(\d+)分钟提醒(我)?/);
    if (m) {
      reminderMinutesBefore = parseInt(m[1], 10);
      detectedKeywords.push(`提醒: 提前${reminderMinutesBefore}分钟`);
      text = text.replace(/，?提前\d+分钟提醒(我)?/g, '');
    }
  } else if (/准时提醒(我)?|提醒我/.test(rawText)) {
    reminderMinutesBefore = 5;
    detectedKeywords.push('提醒: 提前5分钟');
    text = text.replace(/，?(准时)?提醒(我)?/g, '');
  }

  // 4. 解析具体时间 (Time: 早上/上午/中午/下午/傍晚/晚上 + X点Y分)
  let time: string | undefined;
  const cnNumMap: Record<string, number> = {
    零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12,
  };

  const timeRegex = /(早上|清晨|上午|中午|下午|傍晚|晚上|夜里)?\s*(\d{1,2}|[一二两三四五六七八九十]{1,2})\s*(?:点|:|时)(?:(半|[0-5]?\d)\s*分?)?/;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    const period = timeMatch[1] || '';
    const rawHour = timeMatch[2];
    const rawMin = timeMatch[3];

    let hour = /^\d+$/.test(rawHour) ? parseInt(rawHour, 10) : (cnNumMap[rawHour] ?? 9);
    if ((period === '下午' || period === '傍晚' || period === '晚上' || period === '夜里') && hour < 12) {
      hour += 12;
    } else if (period === '中午' && hour < 11) {
      hour += 12;
    }
    let minute = 0;
    if (rawMin === '半') {
      minute = 30;
    } else if (rawMin && /^\d+$/.test(rawMin)) {
      minute = parseInt(rawMin, 10);
    }
    time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    detectedKeywords.push(`时间: ${time}`);
    text = text.replace(timeRegex, '');
  } else if (text.includes('傍晚')) {
    time = '18:00';
    detectedKeywords.push('时间: 18:00 (傍晚)');
    text = text.replace(/傍晚/g, '');
  } else if (text.includes('晚上')) {
    time = '20:00';
    detectedKeywords.push('时间: 20:00 (晚上)');
    text = text.replace(/晚上/g, '');
  } else if (text.includes('早上') || text.includes('上午')) {
    time = '09:00';
    detectedKeywords.push('时间: 09:00 (上午)');
    text = text.replace(/早上|上午/g, '');
  }

  // 5. 解析参与人与协作模式（围绕 AfterRain & Midsummer）
  let collaborationMode: CollaborationMode = 'supervised';
  let ownerId: PartnerId = currentUserId;

  const mentionsBoth =
    /一起|共同|我们|两人|两个人|@共同|@所有人|AfterRain和Midsummer|Midsummer和AfterRain|雨仪/i.test(
      rawText
    ) ||
    (rawText.includes('AfterRain') && rawText.includes('Midsummer'));

  if (mentionsBoth) {
    collaborationMode = 'both_required';
    detectedKeywords.push('模式: 🌧️AfterRain & ☀️Midsummer 共同打勾');
  } else if (/任一|谁有空|或者/.test(rawText)) {
    collaborationMode = 'either_one';
    detectedKeywords.push('模式: 任一人完成即可');
  } else if (/让AfterRain|提醒AfterRain|@AfterRain|督促AfterRain|监督AfterRain/i.test(rawText)) {
    collaborationMode = 'supervised';
    ownerId = 'jingyu';
    detectedKeywords.push('指派: 🌧️AfterRain 执行（☀️Midsummer 监督）');
    text = text.replace(/让AfterRain|提醒AfterRain|@AfterRain|督促AfterRain|监督AfterRain/gi, '');
  } else if (/让Midsummer|提醒Midsummer|@Midsummer|督促Midsummer|监督Midsummer/i.test(rawText)) {
    collaborationMode = 'supervised';
    ownerId = 'huiyi';
    detectedKeywords.push('指派: ☀️Midsummer 执行（🌧️AfterRain 监督）');
    text = text.replace(/让Midsummer|提醒Midsummer|@Midsummer|督促Midsummer|监督Midsummer/gi, '');
  } else if (/和Midsummer|陪Midsummer|和AfterRain|陪AfterRain/i.test(rawText)) {
    collaborationMode = 'both_required';
    detectedKeywords.push('模式: 🌧️AfterRain & ☀️Midsummer 共同打勾');
  }

  // 6. 解析任务分类与卡片主题色
  let category: YuYiTask['category'] = '生活日常';
  if (/约会|电影|野餐|纪念日|散步|看海|旅行|礼物|火锅|晚餐|做饭|拍照/.test(rawText)) {
    category = '浪漫约定';
  } else if (/背单词|英语|复习|看书|阅读|高数|代码|编程|考研|学习|刷题|论文/.test(rawText)) {
    category = '学习提升';
  } else if (/跑步|夜跑|健身|游泳|减肥|早睡|喝水|瑜伽|八段锦|羽毛球|运动/.test(rawText)) {
    category = '运动健康';
  } else if (/周报|会议|方案|汇报|项目|打卡上班|面试/.test(rawText)) {
    category = '工作计划';
  }

  const cleanTitle =
    text
      .replace(/^[，,、。\s]+|[，,、。\s]+$/g, '')
      .replace(/\s+/g, ' ') || rawText.trim();

  return {
    cleanTitle,
    date: targetDate,
    dateLabel,
    time,
    reminderMinutesBefore,
    recurrence,
    recurrenceLabel,
    collaborationMode,
    ownerId,
    category,
    cardColor: CARD_COLORS[category],
    detectedKeywords,
  };
}

/**
 * 整合自 SahilBacchus/ai-task-breakdown 的 AI 子任务智能拆解引擎（小白免配置版）
 * 1. 默认 'free_auto' 模式：无需任何 API Key，优先调用免注册免费云端 AI 接口（6秒超时保护），失败/离线自动秒级回退本地智能场景引擎；
 * 2. 'local_only' 模式：纯离线极速拆解，零网络等待；
 * 3. 'custom_key' 模式（开发者高级选项）：使用用户自定义的 DeepSeek / 通义千问 / OpenAI 兼容 API Key。
 */
export async function breakdownTaskWithAI(
  goalText: string,
  aiConfig?: AIConfig
): Promise<{
  suggestedTitle: string;
  category: YuYiTask['category'];
  collaborationMode: CollaborationMode;
  subtasks: SubtaskItem[];
  source: 'free_cloud' | 'llm_api' | 'smart_local';
}> {
  const trimmed = goalText.trim();
  const mode = aiConfig?.aiMode || 'free_auto';

  const systemPrompt = `你是“雨仪待办 (YuYi Do)”的专属 AI 任务规划师，服务于“AfterRain (jingyu)”和“Midsummer (huiyi)”两位搭子。
请把用户输入的目标拆解为 3~5 个具体、可执行的子任务清单，并合理分配给 jingyu（AfterRain）、huiyi（Midsummer）或 both（两人共同完成）。
请严格返回 JSON 格式（不要包含 markdown 代码块标记）：
{
  "suggestedTitle": "精简后的主任务标题",
  "category": "浪漫约定" | "学习提升" | "运动健康" | "生活日常" | "工作计划",
  "collaborationMode": "both_required" | "either_one" | "supervised",
  "subtasks": [
    { "title": "子任务描述", "assignee": "jingyu" | "huiyi" | "both", "estimatedMinutes": 20 }
  ]
}`;

  const parseAiJsonResult = (
    rawContent: string,
    source: 'free_cloud' | 'llm_api'
  ) => {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.subtasks) || parsed.subtasks.length === 0) return null;
    return {
      suggestedTitle: String(parsed.suggestedTitle || trimmed),
      category: (['浪漫约定', '学习提升', '运动健康', '生活日常', '工作计划'].includes(
        parsed.category
      )
        ? parsed.category
        : '生活日常') as YuYiTask['category'],
      collaborationMode: (['both_required', 'either_one', 'supervised'].includes(
        parsed.collaborationMode
      )
        ? parsed.collaborationMode
        : 'both_required') as CollaborationMode,
      subtasks: parsed.subtasks.map((s: any, idx: number) => ({
        id: `sub_${Date.now()}_${idx}`,
        title: String(s.title),
        assignee:
          s.assignee === 'jingyu' || s.assignee === 'huiyi' || s.assignee === 'both'
            ? s.assignee
            : 'both',
        completedBy: [],
        estimatedMinutes: Number(s.estimatedMinutes) || 15,
      })),
      source,
    };
  };

  // 1. 开发者自定义 API Key 模式
  if (mode === 'custom_key' && aiConfig?.apiKey && aiConfig.apiKey.trim().length > 5) {
    try {
      const endpoint = aiConfig.apiBaseUrl.replace(/\/$/, '') + '/chat/completions';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: aiConfig.modelName || 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: trimmed },
          ],
          temperature: 0.4,
        }),
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const rawContent: string = data?.choices?.[0]?.message?.content || '';
        const parsed = parseAiJsonResult(rawContent, 'llm_api');
        if (parsed) return parsed;
      }
    } catch {
      // 回退至本地智能拆解引擎
    }
  }

  // 2. 小白免 Key 免费云端 AI 模式（默认开启）
  if (mode === 'free_auto') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6500);
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: trimmed },
          ],
          model: 'openai',
          jsonMode: true,
        }),
      });
      clearTimeout(timer);

      if (response.ok) {
        const rawText = await response.text();
        const parsed = parseAiJsonResult(rawText, 'free_cloud');
        if (parsed) return parsed;
      }
    } catch {
      // 免费云端接口超时或离线时，无缝回退本地智能场景引擎
    }
  }

  // 本地智能场景拆解引擎（融合 ai-task-breakdown 的结构化分解模板）
  const now = Date.now();
  const makeSub = (
    idx: number,
    title: string,
    assignee: PartnerId | 'both',
    estimatedMinutes: number
  ): SubtaskItem => ({
    id: `sub_${now}_${idx}`,
    title,
    assignee,
    completedBy: [],
    estimatedMinutes,
  });

  if (/野餐|露营|春游|秋游|公园/.test(trimmed)) {
    return {
      suggestedTitle: '🌧️AfterRain & ☀️Midsummer 周末阳光野餐计划',
      category: '浪漫约定',
      collaborationMode: 'both_required',
      source: 'smart_local',
      subtasks: [
        makeSub(1, '查看周末天气并选定草坪公园位置', 'jingyu', 15),
        makeSub(2, '准备野餐垫、蓝牙音箱、拍立得与纸巾湿巾', 'jingyu', 20),
        makeSub(3, '挑选洗净草莓、蓝莓等水果与气泡饮品', 'huiyi', 25),
        makeSub(4, '准备三明治/小零食并装入保温野餐篮', 'huiyi', 25),
        makeSub(5, '一起出发去草坪晒太阳、拍照打卡留念', 'both', 120),
      ],
    };
  }

  if (/做饭|晚餐|下厨|火锅|大餐|买菜/.test(trimmed)) {
    return {
      suggestedTitle: '敬雨 & 慧仪 甜蜜双人厨房料理',
      category: '浪漫约定',
      collaborationMode: 'both_required',
      source: 'smart_local',
      subtasks: [
        makeSub(1, '共同敲定今晚菜单并列出食材采购清单', 'both', 10),
        makeSub(2, '前往超市/生鲜店采购新鲜蔬菜、肉类与调料', 'jingyu', 30),
        makeSub(3, '清洗食材、备菜切配与调配秘制酱汁', 'huiyi', 20),
        makeSub(4, '大厨掌勺烹饪主菜，搭子在旁试味递调料', 'both', 35),
        makeSub(5, '饭后分工洗碗收拾厨房，一起散步消食', 'both', 20),
      ],
    };
  }

  if (/背单词|英语|四级|六级|雅思|考研|学习|复习|看书|阅读/.test(trimmed)) {
    return {
      suggestedTitle: `${trimmed}（雨仪互助学习打卡）`,
      category: '学习提升',
      collaborationMode: 'both_required',
      source: 'smart_local',
      subtasks: [
        makeSub(1, '开启专注模式，放下手机静音 30 分钟', 'both', 5),
        makeSub(2, '完成今日核心新知识点 / 单词记忆目标', 'both', 30),
        makeSub(3, '整理今日错题或读书重点笔记 3 条', 'huiyi', 15),
        makeSub(4, '整理核心框架复盘并准备抽查题目', 'jingyu', 15),
        makeSub(5, 'AfterRain 与 Midsummer 互相抽查提问 & 拍照打卡验收', 'both', 15),
      ],
    };
  }

  if (/跑步|夜跑|健身|运动|减肥|羽毛球|游泳/.test(trimmed)) {
    return {
      suggestedTitle: `${trimmed}（雨仪运动燃脂挑战）`,
      category: '运动健康',
      collaborationMode: 'both_required',
      source: 'smart_local',
      subtasks: [
        makeSub(1, '换好运动装备、带好水杯与运动耳机', 'both', 10),
        makeSub(2, '运动前关节动态热身与拉伸 5 分钟', 'both', 5),
        makeSub(3, '完成今日主运动目标（配速平稳不偷懒）', 'both', 35),
        makeSub(4, '运动后泡沫轴/腿部拉伸放松并互相打勾认证', 'both', 10),
      ],
    };
  }

  if (/旅行|旅游|出游|机票|酒店|攻略/.test(trimmed)) {
    return {
      suggestedTitle: `${trimmed}（雨仪出行全攻略）`,
      category: '浪漫约定',
      collaborationMode: 'both_required',
      source: 'smart_local',
      subtasks: [
        makeSub(1, '收藏小红书必去景点与美食店铺清单', 'huiyi', 30),
        makeSub(2, '规划每日路线、预订往返车票与住宿酒店', 'jingyu', 40),
        makeSub(3, '整理穿搭衣物、洗漱用品与防晒护肤包', 'huiyi', 25),
        makeSub(4, '准备充电宝、相机、身份证件与常备药品', 'jingyu', 20),
        makeSub(5, '出发前夜共同核对行李清单，安心入睡', 'both', 15),
      ],
    };
  }

  if (/大扫除|整理房间|收拾|卫生|搬家/.test(trimmed)) {
    return {
      suggestedTitle: `${trimmed}（双人高效家务分工）`,
      category: '生活日常',
      collaborationMode: 'both_required',
      source: 'smart_local',
      subtasks: [
        makeSub(1, '整理桌面杂物、衣柜收纳与更换床单被套', 'huiyi', 25),
        makeSub(2, '清扫地面、拖地并清理厨房与卫浴死角', 'jingyu', 30),
        makeSub(3, '分类打包垃圾并下楼丢弃', 'jingyu', 10),
        makeSub(4, '点上香薰或摆上鲜花，共同验收整洁小窝', 'both', 10),
      ],
    };
  }

  if (/电影|约会|看展|游乐场|逛街/.test(trimmed)) {
    return {
      suggestedTitle: `${trimmed}（雨仪甜蜜约会指南）`,
      category: '浪漫约定',
      collaborationMode: 'both_required',
      source: 'smart_local',
      subtasks: [
        makeSub(1, '一起挑选心仪场次/展馆并提前在线锁座购票', 'jingyu', 10),
        makeSub(2, '挑选今天约会的搭配穿搭与小饰品', 'huiyi', 20),
        makeSub(3, '顺路买好爆米花/热饮或对方爱吃的小零食', 'jingyu', 15),
        makeSub(4, '见面拥抱打卡，享受专注陪伴的二人时光', 'both', 120),
      ],
    };
  }

  if (/纪念日|生日|情人节|七夕|礼物|惊喜/.test(trimmed)) {
    return {
      suggestedTitle: `${trimmed}（专属仪式感筹备）`,
      category: '浪漫约定',
      collaborationMode: 'both_required',
      source: 'smart_local',
      subtasks: [
        makeSub(1, '提前选好餐厅/花束或准备一份手写小卡片', 'jingyu', 30),
        makeSub(2, '挑选记录日常点滴的合照并准备小惊喜', 'huiyi', 25),
        makeSub(3, '共同留出完整晚间时间，拍照记录今天的美好瞬间', 'both', 90),
      ],
    };
  }

  if (/超市|买菜|采购|日用品|快递/.test(trimmed)) {
    return {
      suggestedTitle: `${trimmed}（高效率生活采购）`,
      category: '生活日常',
      collaborationMode: 'either_one',
      source: 'smart_local',
      subtasks: [
        makeSub(1, '清点家里缺少的纸巾、水果、牛奶等清单', 'huiyi', 10),
        makeSub(2, '下班/下课顺路到超市或驿站集中采购取件', 'jingyu', 25),
        makeSub(3, '回家分类放进冰箱与收纳柜，各自打勾确认', 'both', 10),
      ],
    };
  }

  if (/汇报|周报|PPT|面试|工作|项目|方案/.test(trimmed)) {
    return {
      suggestedTitle: `${trimmed}（高效推进清单）`,
      category: '工作计划',
      collaborationMode: 'supervised',
      source: 'smart_local',
      subtasks: [
        makeSub(1, '梳理核心结论与 3 个关键要点大纲', 'jingyu', 20),
        makeSub(2, '补充数据图表与案例细节，完成初稿制作', 'jingyu', 40),
        makeSub(3, '由搭子帮忙快速通读查错、给出优化建议', 'huiyi', 15),
        makeSub(4, '定稿提交并在雨仪待办打勾庆祝下班', 'both', 10),
      ],
    };
  }

  // 通用目标智能四步拆解
  return {
    suggestedTitle: trimmed,
    category: '生活日常',
    collaborationMode: 'both_required',
    source: 'smart_local',
    subtasks: [
      makeSub(1, `明确「${trimmed}」的具体完成标准与时间节点`, 'both', 10),
      makeSub(2, `AfterRain 负责准备前半程资料/工具并推进执行`, 'jingyu', 25),
      makeSub(3, `Midsummer 负责细节完善与核心环节跟进`, 'huiyi', 25),
      makeSub(4, `两人互相检查成果、留言复盘并共同打勾完成`, 'both', 10),
    ],
  };
}
