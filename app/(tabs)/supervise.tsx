import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useYuYiStore } from '../../src/context/YuYiStore';
import { PARTNERS } from '../../src/services/nlpAndAiEngine';
import { PartnerId } from '../../src/types/todo';

const NUDGE_PRESETS = [
  {
    emoji: '👋',
    label: '拍一拍催打卡',
    getTemplate: (from: string, to: string) =>
      `${from} 拍了拍 ${to} 的小脑袋：今天还有待办没打勾哦，快行动起来！`,
  },
  {
    emoji: '🌸',
    label: '送朵小红花',
    getTemplate: (from: string, to: string) =>
      `${from} 给 ${to} 送了一朵小红花：表现超棒，我们继续保持默契连击！`,
  },
  {
    emoji: '📵',
    label: '提醒放下手机',
    getTemplate: (from: string, to: string) =>
      `${from} 开启了监工雷达：${to} 快放下短视频，专注完成今日小目标！`,
  },
  {
    emoji: '💖',
    label: '贴贴加油打气',
    getTemplate: (from: string, to: string) =>
      `${from} 抱了抱 ${to}：雨落知夏，心仪同行，和你一起完成每件小事都很开心～`,
  },
];

export default function SuperviseScreen() {
  const {
    currentUserId,
    partnerUserId,
    authUser,
    spaceInfo,
    tasks,
    nudgeLogs,
    habitChallenges,
    sendNudge,
    sendCrossSpaceNudge,
    checkInHabit,
    addHabitChallenge,
  } = useYuYiStore();

  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitReward, setHabitReward] = useState('');
  const [habitDays, setHabitDays] = useState('21');
  const [crossNudgeTarget, setCrossNudgeTarget] = useState('');
  const [bannerText, setBannerText] = useState<string | null>(null);

  const currentProfile = PARTNERS[currentUserId];
  const partnerProfile = PARTNERS[partnerUserId];

  const triggerBanner = (msg: string) => {
    setBannerText(msg);
    setTimeout(() => setBannerText(null), 2600);
  };

  // 计算搭子各自的打勾统计
  const partnerStats = useMemo(() => {
    const computeFor = (pid: PartnerId) => {
      const relevant = tasks.filter(
        (t) => t.collaborationMode !== 'supervised' || t.ownerId === pid
      );
      const checked = relevant.filter((t) => t.completedBy.includes(pid));
      const rate =
        relevant.length > 0 ? Math.round((checked.length / relevant.length) * 100) : 100;
      return {
        total: relevant.length,
        done: checked.length,
        rate,
      };
    };
    return {
      jingyu: computeFor('jingyu'),
      huiyi: computeFor('huiyi'),
    };
  }, [tasks]);

  const isSoloMode = spaceInfo?.usage_mode === 'solo';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerBox}>
          <Text style={styles.pageTitle}>
            {isSoloMode ? '🔥 个人习惯自律 · 独立空间' : '👩‍❤️‍👨 雨仪监工小队 · 共同打卡'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {isSoloMode
              ? '当前为「一个人用」模式：已关闭空间内搭子监督，专注个人习惯打卡（仍可跨空间拍一拍好友）'
              : '融合 HabitSync 社交习惯挑战 + DuoDo 好友监督与拍一拍提醒'}
          </Text>
        </View>

        {bannerText && (
          <View style={styles.bannerBox}>
            <Text style={styles.bannerText}>{bannerText}</Text>
          </View>
        )}

        {/* 空间隔离说明 + 跨空间拍一拍提醒好友 */}
        <View style={styles.nudgePanel}>
          <Text style={styles.sectionTitle}>🔒 空间隔离 & 👋 跨空间拍一拍提醒</Text>
          <Text style={styles.isolationDesc}>
            单独空间严格隔离，无法查看或干涉其他空间的待办事项；但你可以直接输入好友账号昵称，发送「拍一拍」提醒对方按时打卡！
          </Text>
          <View style={styles.crossNudgeRow}>
            <TextInput
              style={styles.crossNudgeInput}
              placeholder="输入好友昵称（如 1 / 2 / 3）"
              value={crossNudgeTarget}
              onChangeText={setCrossNudgeTarget}
            />
            <Pressable
              style={[styles.crossNudgeBtn, { backgroundColor: currentProfile.themeColor }]}
              onPress={async () => {
                const target = crossNudgeTarget.trim();
                if (!target) return;
                try {
                  await sendCrossSpaceNudge(target, '👋');
                  setCrossNudgeTarget('');
                  triggerBanner(`👋 已跨空间拍了拍「${target}」提醒对方看待办！`);
                } catch (err: any) {
                  triggerBanner(`❌ ${err.message}`);
                }
              }}
            >
              <Text style={styles.crossNudgeBtnText}>拍一拍TA</Text>
            </Pressable>
          </View>
        </View>

        {/* 协作模式才显示双人默契对比榜 */}
        {spaceInfo?.usage_mode !== 'solo' && (
          <View style={styles.pkCard}>
            <Text style={styles.pkTitle}>🏆 今日双人打勾默契榜</Text>
            <View style={styles.pkRow}>
              {(['jingyu', 'huiyi'] as PartnerId[]).map((pid) => {
                const p = PARTNERS[pid];
                const st = partnerStats[pid];
                return (
                  <View
                    key={pid}
                    style={[styles.partnerBox, { backgroundColor: p.lightBg }]}
                  >
                    <Text style={styles.partnerEmoji}>{p.avatarEmoji}</Text>
                    <Text style={[styles.partnerName, { color: p.themeColor }]}>
                      {p.name}
                    </Text>
                    <Text style={styles.partnerRate}>{st.rate}%</Text>
                    <Text style={styles.partnerMeta}>
                      已打勾 {st.done} / {st.total} 项
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${st.rate}%`, backgroundColor: p.themeColor },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 协作模式才显示空间内搭子花式拍一拍互动面板 */}
        {!isSoloMode && (
          <View style={styles.nudgePanel}>
            <Text style={styles.sectionTitle}>
              👋 一键拍一拍督促 / 鼓励 {partnerProfile.name}
            </Text>
            <View style={styles.nudgeGrid}>
              {NUDGE_PRESETS.map((preset, idx) => (
                <Pressable
                  key={idx}
                  style={styles.nudgePresetBtn}
                  onPress={() => {
                    const msg = preset.getTemplate(
                      authUser?.username || currentProfile.name,
                      partnerProfile.name
                    );
                    sendNudge({
                      customMessage: msg,
                      emoji: preset.emoji,
                    });
                    triggerBanner(`${preset.emoji} 已发送：${msg}`);
                  }}
                >
                  <Text style={styles.nudgePresetEmoji}>{preset.emoji}</Text>
                  <Text style={styles.nudgePresetLabel}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* HabitSync 习惯打卡墙（单人模式仅显示自己，协作模式显示各自打卡状态且不可代打卡） */}
        <View style={styles.habitSection}>
          <View style={styles.habitHeaderRow}>
            <Text style={styles.sectionTitle}>
              {isSoloMode ? '🔥 个人习惯自律挑战' : '🔥 空间共同习惯挑战'}
            </Text>
            <Pressable
              style={[styles.addHabitBtn, { backgroundColor: currentProfile.themeColor }]}
              onPress={() => setShowAddHabitModal(true)}
            >
              <Text style={styles.addHabitBtnText}>+ 新约定</Text>
            </Pressable>
          </View>

          {habitChallenges.map((habit) => {
            const jingyuDone = habit.todayCheckedBy.includes('jingyu');
            const huiyiDone = habit.todayCheckedBy.includes('huiyi');
            const bothDone = jingyuDone && huiyiDone;

            return (
              <View key={habit.id} style={styles.habitCard}>
                <View style={styles.habitTopRow}>
                  <View style={styles.habitTitleGroup}>
                    <Text style={styles.habitIcon}>{habit.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.habitTitle}>{habit.title}</Text>
                      <Text style={styles.habitRewardText}>
                        🎁 约定奖励：{habit.rewardPromise}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakBadgeText}>
                      🔥 连击 {habit.streakDays}/{habit.targetDays}天
                    </Text>
                  </View>
                </View>

                <View style={styles.habitActionRow}>
                  {(isSoloMode ? [currentUserId] : (['jingyu', 'huiyi'] as PartnerId[])).map(
                    (pid) => {
                      const p = PARTNERS[pid];
                      const checked = habit.todayCheckedBy.includes(pid);
                      const isSelf = pid === currentUserId;
                      const displayName =
                        isSoloMode && authUser ? authUser.username : p.name;
                      const displayEmoji =
                        isSoloMode && authUser ? authUser.avatar_emoji : p.avatarEmoji;

                      return (
                        <Pressable
                          key={pid}
                          onPress={() => {
                            if (!isSelf) {
                              triggerBanner(`🔒 不能代 ${p.name} 打卡哦，可拍一拍提醒 TA！`);
                              return;
                            }
                            checkInHabit(habit.id, pid);
                            if (!checked) {
                              triggerBanner(
                                `${displayEmoji} ${displayName} 完成了习惯打卡「${habit.title}」！`
                              );
                            }
                          }}
                          style={[
                            styles.habitCheckBtn,
                            checked
                              ? { backgroundColor: p.themeColor }
                              : isSelf
                              ? { backgroundColor: '#F1F5F9' }
                              : { backgroundColor: '#F8FAFC', opacity: 0.7 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.habitCheckBtnText,
                              {
                                color: checked
                                  ? '#FFFFFF'
                                  : isSelf
                                  ? '#475569'
                                  : '#94A3B8',
                              },
                            ]}
                          >
                            {displayEmoji} {displayName}{' '}
                            {checked
                              ? '今日已打卡 ✓'
                              : isSelf
                              ? '点击打卡'
                              : '待对方打卡'}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>

                {!isSoloMode && bothDone && (
                  <Text style={styles.habitBothDoneHint}>
                    ✨ 今日空间成员均已完成打卡，默契值 +10！
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* 监工互动动态流 */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>📡 敬雨 & 慧仪 实时监督动态</Text>
          {nudgeLogs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <Text style={styles.logEmoji}>{log.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.logMessage}>{log.message}</Text>
                <Text style={styles.logTime}>{log.createdAt}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 新增共同习惯挑战约定弹窗 */}
      <Modal
        visible={showAddHabitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddHabitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>✨ 新建共同习惯约定</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="习惯名称（例如：每天一起背30个单词）"
              value={habitTitle}
              onChangeText={setHabitTitle}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="目标坚持天数（如 21）"
              keyboardType="numeric"
              value={habitDays}
              onChangeText={setHabitDays}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="达成后的奖励约定（例如：一起去吃烤肉）"
              value={habitReward}
              onChangeText={setHabitReward}
            />

            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setShowAddHabitModal(false)}
              >
                <Text style={styles.cancelBtnText}>取消</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: currentProfile.themeColor }]}
                onPress={() => {
                  if (!habitTitle.trim()) return;
                  addHabitChallenge(
                    habitTitle,
                    '🌟',
                    parseInt(habitDays, 10) || 21,
                    habitReward
                  );
                  setHabitTitle('');
                  setHabitReward('');
                  setShowAddHabitModal(false);
                  triggerBanner('🎉 已创建新的雨仪共同习惯挑战！');
                }}
              >
                <Text style={styles.confirmBtnText}>开启共同挑战</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  bannerBox: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  pkTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  pkRow: {
    flexDirection: 'row',
    gap: 12,
  },
  partnerBox: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  partnerEmoji: {
    fontSize: 24,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  partnerRate: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 4,
  },
  partnerMeta: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 8,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  nudgePanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  nudgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nudgePresetBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nudgePresetEmoji: {
    fontSize: 18,
  },
  nudgePresetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  habitSection: {
    marginBottom: 14,
  },
  habitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addHabitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addHabitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  habitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  habitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  habitTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  habitIcon: {
    fontSize: 22,
  },
  habitTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  habitRewardText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  habitActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  habitCheckBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  habitCheckBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  habitBothDoneHint: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logEmoji: {
    fontSize: 18,
  },
  logMessage: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  logTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  isolationDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  crossNudgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  crossNudgeInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  crossNudgeBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
  },
  crossNudgeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
