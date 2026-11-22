import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useYuYiStore } from '../../src/context/YuYiStore';
import {
  breakdownTaskWithAI,
  CARD_COLORS,
  parseNaturalLanguageTask,
  PARTNERS,
} from '../../src/services/nlpAndAiEngine';
import { CollaborationMode, PartnerId, SubtaskItem } from '../../src/types/todo';

const QUICK_VOICE_TEMPLATES = [
  '明天晚上7点半和Midsummer一起去夜跑5公里，提前半小时提醒我',
  '周末下午4点和AfterRain一起去公园阳光野餐',
  '每天晚上9点背诵30个英语单词并互相抽查 @共同',
  '今晚8点一起下厨做一顿丰盛的双人晚餐',
  '提醒AfterRain明天下午5点顺路去拿快递',
];

export default function AiCreateScreen() {
  const router = useRouter();
  const { currentUserId, partnerUserId, addTask, aiConfig } = useYuYiStore();

  const [inputText, setInputText] = useState('');
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [breakdownSource, setBreakdownSource] = useState<
    'free_cloud' | 'llm_api' | 'smart_local' | null
  >(null);
  const [overrideMode, setOverrideMode] = useState<CollaborationMode | null>(null);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [voiceSimulating, setVoiceSimulating] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const currentProfile = PARTNERS[currentUserId];

  // 实时 NLP 自然语言解析预览 (整合自 mariangle/taskify)
  const nlpResult = useMemo(() => {
    return parseNaturalLanguageTask(
      inputText || '今天晚上8点和慧仪一起读书打卡',
      currentUserId
    );
  }, [inputText, currentUserId]);

  const effectiveMode = overrideMode || nlpResult.collaborationMode;

  // 调用 AI 子任务拆解引擎 (整合自 SahilBacchus/ai-task-breakdown)
  const handleAiBreakdown = async () => {
    const hasText = inputText.trim().length > 0;
    const targetText = hasText ? inputText.trim() : '周末和Midsummer一起去野餐';
    if (!hasText) {
      setInputText(targetText);
    }
    setIsBreakingDown(true);
    try {
      const queryForAi = hasText ? nlpResult.cleanTitle || targetText : targetText;
      const res = await breakdownTaskWithAI(queryForAi, aiConfig);
      setSubtasks(res.subtasks);
      setBreakdownSource(res.source);
      setOverrideMode(res.collaborationMode);
      setFeedbackBanner(
        res.source === 'free_cloud'
          ? '✨ 已通过免费云端 AI 为 AfterRain & Midsummer 智能拆解分工！'
          : res.source === 'llm_api'
          ? '🤖 已通过自定义大模型 API 为 AfterRain & Midsummer 拆解分工！'
          : '⚡ 已通过极速本地智能引擎生成双人子任务清单！'
      );
    } finally {
      setIsBreakingDown(false);
    }
  };

  const cycleSubtaskAssignee = (subId: string) => {
    const order: (PartnerId | 'both')[] = ['both', 'jingyu', 'huiyi'];
    setSubtasks((prev) =>
      prev.map((s) => {
        if (s.id !== subId) return s;
        const nextIdx = (order.indexOf(s.assignee) + 1) % order.length;
        return { ...s, assignee: order[nextIdx] };
      })
    );
  };

  const removeSubtask = (subId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== subId));
  };

  const handleAddManualSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `sub_manual_${Date.now()}`,
        title: newSubtaskInput.trim(),
        assignee: 'both',
        completedBy: [],
        estimatedMinutes: 15,
      },
    ]);
    setNewSubtaskInput('');
  };

  // 模拟长按语音识别输入（兼容真机/网页端）
  const handleSimulateVoice = () => {
    setVoiceSimulating(true);
    setTimeout(() => {
      const sample =
        QUICK_VOICE_TEMPLATES[Math.floor(Math.random() * QUICK_VOICE_TEMPLATES.length)];
      setInputText(sample);
      setVoiceSimulating(false);
      setFeedbackBanner('🎙️ 语音识别成功，已自动提取时间、提醒与协作搭子');
    }, 700);
  };

  const handleSaveTask = () => {
    const finalTitle = nlpResult.cleanTitle || '雨仪新待办';
    const ownerId = nlpResult.ownerId;
    const supervisorId: PartnerId = ownerId === 'jingyu' ? 'huiyi' : 'jingyu';

    addTask({
      title: finalTitle,
      description:
        subtasks.length > 0
          ? `包含 ${subtasks.length} 个 AI 拆解子任务 · 敬雨与慧仪协同完成`
          : `由 ${currentProfile.name} 通过自然语言创建`,
      date: nlpResult.date,
      time: nlpResult.time,
      reminderMinutesBefore: nlpResult.reminderMinutesBefore,
      recurrence: nlpResult.recurrence,
      autoRollover: true,
      category: nlpResult.category,
      cardColor: CARD_COLORS[nlpResult.category],
      creatorId: currentUserId,
      ownerId,
      supervisorId,
      collaborationMode: effectiveMode,
      subtasks,
      isAiGenerated: subtasks.length > 0,
    });

    setInputText('');
    setSubtasks([]);
    setOverrideMode(null);
    router.navigate('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* 标题说明 */}
        <View style={styles.headerBox}>
          <Text style={styles.pageTitle}>✨ AI 帮你写待办 & 智能拆解</Text>
          <Text style={styles.pageSubtitle}>
            融合 Taskify 自然语言时间解析 + AI Task Breakdown 双人分工拆解引擎
          </Text>
        </View>

        {feedbackBanner && (
          <View style={styles.feedbackPill}>
            <Text style={styles.feedbackText}>{feedbackBanner}</Text>
          </View>
        )}

        {/* 自然语言输入框 + 语音输入按钮 */}
        <View style={styles.inputCard}>
          <Text style={styles.label}>🗣️ 输入一句话（自动识别时间、周期、提醒与@搭子）</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="例如：明天晚上7点半和Midsummer一起去夜跑5公里，提前半小时提醒我"
            value={inputText}
            onChangeText={setInputText}
          />

          <View style={styles.inputActionRow}>
            <Pressable
              style={styles.voiceBtn}
              onPress={handleSimulateVoice}
              disabled={voiceSimulating}
            >
              <Ionicons
                name={voiceSimulating ? 'radio-button-on' : 'mic'}
                size={16}
                color="#7E22CE"
              />
              <Text style={styles.voiceBtnText}>
                {voiceSimulating ? '正在聆听语音...' : '🎙️ 语音说待办'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.breakdownBtn, { backgroundColor: currentProfile.themeColor }]}
              onPress={handleAiBreakdown}
              disabled={isBreakingDown}
            >
              {isBreakingDown ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#FFF" />
                  <Text style={styles.breakdownBtnText}>AI 拆解双人子任务</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* 快捷灵感示例句子 */}
        <View style={styles.sampleSection}>
          <Text style={styles.sampleHeader}>💡 点击试试自然语言指令：</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.sampleChipRow}>
              {QUICK_VOICE_TEMPLATES.map((tpl, i) => (
                <Pressable
                  key={i}
                  style={styles.sampleChip}
                  onPress={() => {
                    setInputText(tpl);
                    setOverrideMode(null);
                  }}
                >
                  <Text style={styles.sampleChipText}>{tpl}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* NLP 实时解析结果卡片 */}
        <View style={[styles.nlpPreviewCard, { backgroundColor: nlpResult.cardColor }]}>
          <View style={styles.nlpHeaderRow}>
            <Text style={styles.nlpCardBadge}>🔍 NLP 实时结构化解析预览</Text>
            <Text style={styles.nlpCategoryTag}>{nlpResult.category}</Text>
          </View>

          <Text style={styles.nlpParsedTitle}>{nlpResult.cleanTitle}</Text>

          <View style={styles.nlpTagWrap}>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>
                📅 {nlpResult.dateLabel} ({nlpResult.date})
              </Text>
            </View>
            {nlpResult.time && (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>⏰ {nlpResult.time}</Text>
              </View>
            )}
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>🔁 {nlpResult.recurrenceLabel}</Text>
            </View>
            {nlpResult.reminderMinutesBefore && (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>
                  🔔 提前 {nlpResult.reminderMinutesBefore} 分钟提醒
                </Text>
              </View>
            )}
          </View>

          {/* 协作监督模式选择器 */}
          <Text style={styles.modeSelectTitle}>👩‍❤️‍👨 选择雨仪协作模式：</Text>
          <View style={styles.modeSelectorRow}>
            {(
              [
                { key: 'both_required', label: '🌧️🌸 两人共同打勾' },
                { key: 'either_one', label: '🤝 任一人完成即可' },
                { key: 'supervised', label: '👀 个人执行+对方监督' },
              ] as { key: CollaborationMode; label: string }[]
            ).map((m) => {
              const selected = effectiveMode === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setOverrideMode(m.key)}
                  style={[
                    styles.modeOptionBtn,
                    selected && {
                      backgroundColor: '#1E293B',
                      borderColor: '#1E293B',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeOptionText,
                      selected && { color: '#FFFFFF' },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* AI 拆解出的子任务编辑与分工区 */}
        <View style={styles.subtaskEditorCard}>
          <View style={styles.subtaskHeaderRow}>
            <Text style={styles.subtaskCardTitle}>
              📋 AI 子任务拆解与搭子分工 ({subtasks.length})
            </Text>
            {breakdownSource && (
              <Text style={styles.sourceTag}>
                {breakdownSource === 'free_cloud'
                  ? '✨ 免费云端 AI 生成'
                  : breakdownSource === 'llm_api'
                  ? '🤖 自定义大模型生成'
                  : '⚡ 本地智能引擎'}
              </Text>
            )}
          </View>
          <Text style={styles.subtaskHint}>
            点击右侧头像标签可在「🌧️AfterRain」「☀️Midsummer」「🌧️☀️共同」之间切换分工
          </Text>

          {subtasks.map((sub, idx) => {
            const badgeText =
              sub.assignee === 'both'
                ? '🌧️☀️ 共同完成'
                : sub.assignee === 'jingyu'
                ? '🌧️ AfterRain'
                : '☀️ Midsummer';
            const badgeBg =
              sub.assignee === 'both'
                ? '#F3E8FF'
                : sub.assignee === 'jingyu'
                ? PARTNERS.jingyu.lightBg
                : PARTNERS.huiyi.lightBg;

            return (
              <View key={sub.id} style={styles.subEditRow}>
                <Text style={styles.subIndex}>{idx + 1}.</Text>
                <Text style={styles.subEditTitle}>{sub.title}</Text>
                <Pressable
                  style={[styles.assigneeSwitchBtn, { backgroundColor: badgeBg }]}
                  onPress={() => cycleSubtaskAssignee(sub.id)}
                >
                  <Text style={styles.assigneeSwitchText}>{badgeText}</Text>
                </Pressable>
                <Pressable onPress={() => removeSubtask(sub.id)}>
                  <Ionicons name="close-circle-outline" size={20} color="#94A3B8" />
                </Pressable>
              </View>
            );
          })}

          {/* 手动追加子任务 */}
          <View style={styles.addSubRow}>
            <TextInput
              style={styles.addSubInput}
              placeholder="手动添加一条子任务步骤..."
              value={newSubtaskInput}
              onChangeText={setNewSubtaskInput}
              onSubmitEditing={handleAddManualSubtask}
            />
            <Pressable style={styles.addSubBtn} onPress={handleAddManualSubtask}>
              <Text style={styles.addSubBtnText}>+ 添加</Text>
            </Pressable>
          </View>
        </View>

        {/* 发布保存按钮 */}
        <Pressable
          style={[styles.publishBtn, { backgroundColor: currentProfile.themeColor }]}
          onPress={handleSaveTask}
        >
          <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
          <Text style={styles.publishBtnText}>
            发布到「雨仪待办」并同步给{PARTNERS[partnerUserId].name}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 16,
    paddingBottom: 36,
  },
  headerBox: {
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  feedbackPill: {
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B21A8',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 74,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  inputActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  voiceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7E22CE',
  },
  breakdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  breakdownBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sampleSection: {
    marginBottom: 14,
  },
  sampleHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  sampleChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sampleChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sampleChipText: {
    fontSize: 12,
    color: '#334155',
  },
  nlpPreviewCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  nlpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nlpCardBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  nlpCategoryTag: {
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    color: '#1E293B',
  },
  nlpParsedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  nlpTagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  metaPill: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  modeSelectTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  modeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modeOptionBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
  },
  modeOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  subtaskEditorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  subtaskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtaskCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  sourceTag: {
    fontSize: 11,
    color: '#7E22CE',
    fontWeight: '700',
  },
  subtaskHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 10,
  },
  subEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  subIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  subEditTitle: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  assigneeSwitchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  assigneeSwitchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  addSubRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  addSubInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  addSubBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 10,
  },
  addSubBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
