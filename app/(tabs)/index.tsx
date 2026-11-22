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
import { useRouter } from 'expo-router';
import { useYuYiStore } from '../../src/context/YuYiStore';
import { addDays, formatDateYYYYMMDD, PARTNERS } from '../../src/services/nlpAndAiEngine';
import { PartnerId, YuYiTask } from '../../src/types/todo';

type FilterTab = 'all' | 'both' | 'jingyu' | 'huiyi';

export default function TodoHomeScreen() {
  const router = useRouter();
  const {
    currentUserId,
    partnerUserId,
    authUser,
    spaceInfo,
    selectedDate,
    setSelectedDate,
    switchUser,
    tasks,
    toggleTaskCheck,
    toggleSubtaskCheck,
    addComment,
    sendNudge,
    deleteTask,
    isTaskFullyCompleted,
  } = useYuYiStore();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [activeTaskModalId, setActiveTaskModalId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const currentProfile = PARTNERS[currentUserId];
  const partnerProfile = PARTNERS[partnerUserId];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  // 生成7天周日历条
  const weekDays = useMemo(() => {
    const todayStr = formatDateYYYYMMDD(new Date());
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
    return [-2, -1, 0, 1, 2, 3, 4].map((offset) => {
      const dateStr = addDays(todayStr, offset);
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return {
        dateStr,
        dayNum: d,
        weekLabel: offset === 0 ? '今' : dayLabels[dt.getDay()],
        isToday: dateStr === todayStr,
      };
    });
  }, []);

  // 按日期与筛选条件过滤任务
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchDate =
        t.date === selectedDate ||
        t.recurrence === 'daily' ||
        (t.autoRollover && !isTaskFullyCompleted(t));
      if (!matchDate) return false;

      if (filter === 'both') return t.collaborationMode !== 'supervised';
      if (filter === 'jingyu') {
        return t.collaborationMode === 'both_required' || t.ownerId === 'jingyu';
      }
      if (filter === 'huiyi') {
        return t.collaborationMode === 'both_required' || t.ownerId === 'huiyi';
      }
      return true;
    });
  }, [tasks, selectedDate, filter]);

  const completedCount = filteredTasks.filter((t) => isTaskFullyCompleted(t)).length;
  const activeTask = tasks.find((t) => t.id === activeTaskModalId) || null;

  const getModeBadgeText = (task: YuYiTask) => {
    if (task.collaborationMode === 'both_required') {
      return '🌧️敬雨 & 🌸慧仪 共同打勾';
    }
    if (task.collaborationMode === 'either_one') {
      return '🤝 协同任务 · 任一完成即可';
    }
    const owner = PARTNERS[task.ownerId];
    const sup = PARTNERS[task.supervisorId];
    return `${owner.avatarEmoji}${owner.nickname}执行 · ${sup.avatarEmoji}${sup.nickname}监督`;
  };

  const handleQuickNudge = (task: YuYiTask) => {
    sendNudge({
      taskId: task.id,
      taskTitle: task.title,
      emoji: '👋',
    });
    showToast(`已拍了拍 ${partnerProfile.name}，提醒 TA 完成「${task.title}」！`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 顶部品牌栏 */}
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.appTitle}>雨仪待办</Text>
            <View style={styles.subtitlePill}>
              <Text style={styles.subtitlePillText}>Meet Summer After Rain · 雨落知夏，心仪同行</Text>
            </View>
          </View>
          <Text style={styles.dateSubtitle}>
            {authUser
              ? `${authUser.avatar_emoji} ${authUser.username} · ${
                  spaceInfo?.usage_mode === 'solo'
                    ? '一个人用'
                    : spaceInfo?.usage_mode === 'group'
                    ? '多人空间'
                    : '双人协作'
                }`
              : `当前视角：${currentProfile.avatarEmoji} ${currentProfile.name}（搭子：${partnerProfile.avatarEmoji} ${partnerProfile.name}）`}
          </Text>
        </View>

        {authUser ? (
          <Pressable
            style={[styles.switchUserBtn, { backgroundColor: currentProfile.lightBg }]}
            onPress={() => router.navigate('/settings')}
          >
            <Text style={{ fontSize: 14 }}>{authUser.avatar_emoji}</Text>
            <Text style={[styles.switchUserText, { color: currentProfile.themeColor }]}>
              我的空间
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.switchUserBtn, { backgroundColor: currentProfile.lightBg }]}
            onPress={() => {
              switchUser();
              showToast(`已切换至 ${partnerProfile.avatarEmoji} ${partnerProfile.name} 的视角`);
            }}
          >
            <Ionicons name="swap-horizontal" size={16} color={currentProfile.themeColor} />
            <Text style={[styles.switchUserText, { color: currentProfile.themeColor }]}>
              切换{partnerProfile.nickname}
            </Text>
          </Pressable>
        )}
      </View>

      {/* 顶部浮层提示 */}
      {toastMsg && (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* 周视图日历切换条 */}
      <View style={styles.calendarBar}>
        {weekDays.map((item) => {
          const isSelected = item.dateStr === selectedDate;
          return (
            <Pressable
              key={item.dateStr}
              onPress={() => setSelectedDate(item.dateStr)}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: currentProfile.themeColor },
              ]}
            >
              <Text style={[styles.dayWeekLabel, isSelected && styles.dayTextSelected]}>
                {item.weekLabel}
              </Text>
              <Text style={[styles.dayNumLabel, isSelected && styles.dayTextSelected]}>
                {item.dayNum}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 双人分类筛选胶囊 + 今日完成进度 */}
      <View style={styles.filterRow}>
        {(
          [
            { key: 'all', label: '全部待办' },
            { key: 'both', label: '👩‍❤️‍👨 雨仪共同' },
            { key: 'jingyu', label: '🌧️ AfterRain' },
            { key: 'huiyi', label: '☀️ Midsummer' },
          ] as { key: FilterTab; label: string }[]
        ).map((tab) => {
          const active = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[
                styles.filterChip,
                active && {
                  backgroundColor: currentProfile.themeColor,
                  borderColor: currentProfile.themeColor,
                },
              ]}
            >
              <Text style={[styles.filterChipText, active && { color: '#FFFFFF' }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 今日默契概览横幅 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryTitle}>
              今日达成 {completedCount} / {filteredTasks.length} 项
            </Text>
            <Text style={styles.summaryDesc}>
              {spaceInfo?.usage_mode === 'solo'
                ? '🔒 当前为独立个人空间，仅展示与管理你自己的待办事项'
                : '不必独行，空间成员一起打勾的每一件小事都算数 ✨'}
            </Text>
          </View>
          <Pressable
            style={[styles.aiQuickEntryBtn, { backgroundColor: currentProfile.themeColor }]}
            onPress={() => router.navigate('/ai-create')}
          >
            <Ionicons name="sparkles" size={15} color="#FFF" />
            <Text style={styles.aiQuickEntryText}>AI 写待办</Text>
          </Pressable>
        </View>

        {/* 独立新空间空状态 */}
        {filteredTasks.length === 0 && (
          <View style={styles.emptySpaceCard}>
            <Text style={styles.emptySpaceEmoji}>📝</Text>
            <Text style={styles.emptySpaceTitle}>当前空间还没有待办事项</Text>
            <Text style={styles.emptySpaceDesc}>
              已为你严格隔离其他空间的待办；点击下方按钮用 AI 写一条属于本空间的待办吧！
            </Text>
            <Pressable
              style={[styles.aiQuickEntryBtn, { backgroundColor: currentProfile.themeColor, marginTop: 10 }]}
              onPress={() => router.navigate('/ai-create')}
            >
              <Ionicons name="sparkles" size={15} color="#FFF" />
              <Text style={styles.aiQuickEntryText}>立即创建本空间待办</Text>
            </Pressable>
          </View>
        )}

        {/* 任务卡片列表 */}
        {filteredTasks.map((task) => {
          const isSoloMode = spaceInfo?.usage_mode === 'solo';
          const fullyDone = isTaskFullyCompleted(task);
          const jingyuChecked = task.completedBy.includes('jingyu');
          const huiyiChecked = task.completedBy.includes('huiyi');
          const partnerChecked = task.completedBy.includes(partnerUserId);

          return (
            <View
              key={task.id}
              style={[
                styles.taskCard,
                { backgroundColor: task.cardColor || '#F8FAFC' },
                fullyDone && styles.taskCardCompleted,
              ]}
            >
              {/* 顶部标签行：分类 + 协作模式 + 时间 + 拍一拍监督 */}
              <View style={styles.taskCardTopRow}>
                <View style={styles.badgeGroup}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{task.category}</Text>
                  </View>
                  <View style={styles.modeBadge}>
                    <Text style={styles.modeBadgeText}>{getModeBadgeText(task)}</Text>
                  </View>
                  {task.isAiGenerated && (
                    <View style={styles.aiTag}>
                      <Text style={styles.aiTagText}>✨ AI拆解</Text>
                    </View>
                  )}
                </View>

                {task.time && (
                  <View style={styles.timeTag}>
                    <Ionicons name="time-outline" size={13} color="#475569" />
                    <Text style={styles.timeTagText}>{task.time}</Text>
                  </View>
                )}
              </View>

              {/* 主标题与双人独立打勾区 */}
              <View style={styles.taskMainRow}>
                <Pressable
                  style={styles.taskTitleArea}
                  onPress={() => setActiveTaskModalId(task.id)}
                >
                  <Text style={[styles.taskTitle, fullyDone && styles.taskTitleDone]}>
                    {task.title}
                  </Text>
                  {task.description ? (
                    <Text style={styles.taskDesc} numberOfLines={2}>
                      {task.description}
                    </Text>
                  ) : null}
                </Pressable>

                {/* 打勾按钮组：单独空间仅显示自己，协作空间显示成员打勾 */}
                <View style={styles.dualCheckGroup}>
                  {(isSoloMode ? [currentUserId] : (['jingyu', 'huiyi'] as PartnerId[])).map((pid) => {
                    const p = PARTNERS[pid];
                    const checked = pid === 'jingyu' ? jingyuChecked : huiyiChecked;
                    const isRelevant =
                      isSoloMode ||
                      task.collaborationMode !== 'supervised' ||
                      task.ownerId === pid;
                    if (!isRelevant) return null;

                    const isOwnButton = pid === currentUserId;
                    const displayLabel = isSoloMode && authUser ? authUser.username : p.nickname;
                    const displayEmoji = isSoloMode && authUser ? authUser.avatar_emoji : p.avatarEmoji;

                    return (
                      <Pressable
                        key={pid}
                        onPress={() => {
                          if (!isOwnButton) {
                            showToast(
                              `🔒 不能代 ${p.name} 打勾哦，可点击下方「拍一拍」提醒 TA！`
                            );
                            return;
                          }
                          toggleTaskCheck(task.id, pid);
                          if (!checked) {
                            showToast(`${displayEmoji} ${displayLabel} 已完成打勾！`);
                          }
                        }}
                        style={[
                          styles.avatarCheckBtn,
                          checked
                            ? { backgroundColor: p.themeColor, borderColor: p.themeColor }
                            : isOwnButton
                            ? { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' }
                            : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', opacity: 0.75 },
                        ]}
                      >
                        <Text style={styles.avatarCheckEmoji}>{displayEmoji}</Text>
                        <Text
                          style={[
                            styles.avatarCheckName,
                            { color: checked ? '#FFFFFF' : isOwnButton ? '#475569' : '#94A3B8' },
                          ]}
                        >
                          {checked
                            ? `${displayLabel}已勾✓`
                            : isOwnButton
                            ? `${displayLabel}打勾`
                            : `待${displayLabel}勾`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 子任务清单 (Subtasks) */}
              {task.subtasks.length > 0 && (
                <View style={styles.subtaskContainer}>
                  <Text style={styles.subtaskHeaderTitle}>
                    📋 子任务拆解 ({task.subtasks.filter((s) => s.completedBy.length > 0).length}/
                    {task.subtasks.length})
                  </Text>
                  {task.subtasks.map((sub) => {
                    const subDone = sub.completedBy.length > 0;
                    const canToggleSub =
                      sub.assignee === 'both' || sub.assignee === currentUserId;
                    const assigneeLabel =
                      sub.assignee === 'both'
                        ? '🌧️🌸共同'
                        : sub.assignee === 'jingyu'
                        ? '🌧️敬雨'
                        : '🌸慧仪';
                    return (
                      <Pressable
                        key={sub.id}
                        onPress={() => {
                          if (!canToggleSub) {
                            const ownerName =
                              sub.assignee === 'jingyu' ? 'AfterRain' : 'Midsummer';
                            showToast(
                              `🔒 该子任务归属「${ownerName}」，不能代 TA 勾选，可拍一拍提醒对方！`
                            );
                            return;
                          }
                          toggleSubtaskCheck(task.id, sub.id, currentUserId);
                        }}
                        style={[styles.subtaskRow, !canToggleSub && { opacity: 0.65 }]}
                      >
                        <Ionicons
                          name={
                            subDone
                              ? 'checkbox'
                              : canToggleSub
                              ? 'square-outline'
                              : 'lock-closed-outline'
                          }
                          size={18}
                          color={
                            subDone
                              ? currentProfile.themeColor
                              : canToggleSub
                              ? '#64748B'
                              : '#94A3B8'
                          }
                        />
                        <Text style={[styles.subtaskText, subDone && styles.subtaskTextDone]}>
                          {sub.title}
                        </Text>
                        <View style={styles.subtaskAssigneePill}>
                          <Text style={styles.subtaskAssigneeText}>{assigneeLabel}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* 底部互动栏：留言数、拍一拍催办对方、共同状态提示 */}
              <View style={styles.taskFooter}>
                <Pressable
                  style={styles.footerBtn}
                  onPress={() => setActiveTaskModalId(task.id)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color="#475569" />
                  <Text style={styles.footerBtnText}>
                    留言 ({task.comments.length})
                  </Text>
                </Pressable>

                {!isSoloMode && !partnerChecked && (
                  <Pressable
                    style={styles.nudgeInlineBtn}
                    onPress={() => handleQuickNudge(task)}
                  >
                    <Text style={styles.nudgeInlineBtnText}>
                      👋 拍一拍{partnerProfile.nickname}督促打勾
                    </Text>
                  </Pressable>
                )}

                {fullyDone && (
                  <View style={styles.doneBannerPill}>
                    <Text style={styles.doneBannerText}>🎉 默契达成</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* 任务详情与双人留言板弹窗 */}
      <Modal
        visible={!!activeTask}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveTaskModalId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {activeTask && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {activeTask.title}
                  </Text>
                  <Pressable onPress={() => setActiveTaskModalId(null)}>
                    <Ionicons name="close-circle" size={26} color="#94A3B8" />
                  </Pressable>
                </View>

                <Text style={styles.modalMeta}>
                  {getModeBadgeText(activeTask)} · 日期 {activeTask.date}{' '}
                  {activeTask.time || ''}
                </Text>

                <ScrollView style={styles.commentList}>
                  <Text style={styles.sectionLabel}>💬 敬雨 & 慧仪 任务留言板</Text>
                  {activeTask.comments.length === 0 ? (
                    <Text style={styles.emptyCommentText}>
                      还没有留言，给{partnerProfile.name}留句加油的话吧～
                    </Text>
                  ) : (
                    activeTask.comments.map((c) => {
                      const author = PARTNERS[c.authorId];
                      return (
                        <View
                          key={c.id}
                          style={[
                            styles.commentBubble,
                            { backgroundColor: author.lightBg },
                          ]}
                        >
                          <View style={styles.commentHeader}>
                            <Text style={[styles.commentAuthor, { color: author.themeColor }]}>
                              {author.avatarEmoji} {author.name}
                            </Text>
                            <Text style={styles.commentTime}>{c.createdAt}</Text>
                          </View>
                          <Text style={styles.commentContent}>{c.content}</Text>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {/* 发送新留言 */}
                <View style={styles.commentInputRow}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder={`以 ${currentProfile.name} 的身份留言...`}
                    value={commentText}
                    onChangeText={setCommentText}
                  />
                  <Pressable
                    style={[
                      styles.sendCommentBtn,
                      { backgroundColor: currentProfile.themeColor },
                    ]}
                    onPress={() => {
                      if (!commentText.trim()) return;
                      addComment(activeTask.id, commentText);
                      setCommentText('');
                    }}
                  >
                    <Text style={styles.sendCommentBtnText}>发送</Text>
                  </Pressable>
                </View>

                <View style={styles.modalBottomActions}>
                  <Pressable
                    style={styles.deleteTaskBtn}
                    onPress={() => {
                      deleteTask(activeTask.id);
                      setActiveTaskModalId(null);
                      showToast('任务已删除');
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.deleteTaskText}>删除此任务</Text>
                  </Pressable>
                </View>
              </>
            )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  subtitlePill: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  subtitlePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7E22CE',
  },
  dateSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  switchUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  switchUserText: {
    fontSize: 13,
    fontWeight: '700',
  },
  toastBanner: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  calendarBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dayCell: {
    width: 44,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  dayWeekLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  dayNumLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryLeft: {
    flex: 1,
    paddingRight: 10,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  aiQuickEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  aiQuickEntryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  taskCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  taskCardCompleted: {
    opacity: 0.78,
  },
  taskCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  modeBadge: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  aiTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7E22CE',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  taskMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskTitleArea: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  taskDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  dualCheckGroup: {
    flexDirection: 'column',
    gap: 6,
  },
  avatarCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatarCheckEmoji: {
    fontSize: 13,
  },
  avatarCheckName: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtaskContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 12,
    padding: 10,
  },
  subtaskHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 7,
  },
  subtaskText: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  subtaskTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  subtaskAssigneePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subtaskAssigneeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.06)',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerBtnText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  nudgeInlineBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  nudgeInlineBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7E22CE',
  },
  doneBannerPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  doneBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 14,
  },
  commentList: {
    maxHeight: 280,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptyCommentText: {
    fontSize: 13,
    color: '#94A3B8',
    paddingVertical: 16,
    textAlign: 'center',
  },
  commentBubble: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  commentContent: {
    fontSize: 13,
    color: '#1E293B',
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  sendCommentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendCommentBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalBottomActions: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'flex-end',
  },
  deleteTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  deleteTaskText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  emptySpaceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  emptySpaceEmoji: {
    fontSize: 34,
    marginBottom: 8,
  },
  emptySpaceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySpaceDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
