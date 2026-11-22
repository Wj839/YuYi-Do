import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useYuYiStore } from '../../src/context/YuYiStore';
import { PARTNERS } from '../../src/services/nlpAndAiEngine';
import { AIMode, Gender, PartnerId, UsageMode } from '../../src/types/todo';

const GENDER_THEMES: Record<
  Gender,
  { label: string; spaceBadge: string; color: string; bg: string; motto: string }
> = {
  male: {
    label: '👦 男生',
    spaceBadge: '👦 男生专属空间',
    color: '#5B6CFF',
    bg: '#EEF0FF',
    motto: '专注当下，稳步前行',
  },
  female: {
    label: '👧 女生',
    spaceBadge: '👧 女生专属空间',
    color: '#FF6B9D',
    bg: '#FFF0F5',
    motto: '温柔自律，闪闪发光',
  },
};

const USAGE_MODE_TEXT: Record<UsageMode, string> = {
  solo: '👤 一个人用 · 专注模式',
  couple: '👩‍❤️‍👨 两个人用 · 双人协作',
  group: '👥 多人使用 · 团队空间',
};

export default function SettingsScreen() {
  const router = useRouter();
  const {
    currentUserId,
    switchUser,
    authUser,
    spaceInfo,
    spaceMembers,
    dbMode,
    logoutAccount,
    changeUsageMode,
    joinSpaceByInviteCode,
    aiConfig,
    updateAiConfig,
    exportSyncPayload,
    importSyncPayload,
  } = useYuYiStore();

  const [apiBaseUrl, setApiBaseUrl] = useState(aiConfig.apiBaseUrl);
  const [apiKey, setApiKey] = useState(aiConfig.apiKey);
  const [modelName, setModelName] = useState(aiConfig.modelName);
  const [showAdvancedAi, setShowAdvancedAi] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [syncText, setSyncText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const currentProfile = PARTNERS[currentUserId];
  const genderTheme = authUser ? GENDER_THEMES[authUser.gender] : GENDER_THEMES.male;

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2600);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* 根据性别生成的专属个人/协作空间名片 */}
        <View style={styles.heroCard}>
          {authUser ? (
            <>
              <View style={styles.aiHeaderRow}>
                <View style={[styles.genderSpaceBadge, { backgroundColor: genderTheme.bg }]}>
                  <Text style={[styles.genderSpaceBadgeText, { color: genderTheme.color }]}>
                    {genderTheme.spaceBadge}
                  </Text>
                </View>
                <Text style={styles.usageModeTag}>
                  {USAGE_MODE_TEXT[spaceInfo?.usage_mode || 'solo']}
                </Text>
              </View>

              <View style={styles.personalHeroBody}>
                <View style={[styles.personalAvatarCircle, { backgroundColor: genderTheme.bg }]}>
                  <Text style={styles.personalAvatarEmoji}>{authUser.avatar_emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>{authUser.username} 的空间</Text>
                  <Text style={styles.heroDesc}>{genderTheme.motto}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.heroBadge}>✨ 雨仪待办 · YuYi Do</Text>
              <Text style={styles.heroTitle}>欢迎来到你的个人空间</Text>
              <Text style={styles.heroDesc}>
                注册账号并选择性别后，将自动为你生成专属主题空间；也可在下方自由切换单人、双人或多人模式。
              </Text>
            </>
          )}
        </View>

        {notice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        {/* MySQL 账号中心 + 使用人数模式（单人/双人/多人）+ 邀请码加入 */}
        <View style={styles.card}>
          <View style={styles.aiHeaderRow}>
            <Text style={styles.cardTitle}>🔐 账号与协作空间（MySQL）</Text>
            <View
              style={[
                styles.freeBadge,
                { backgroundColor: dbMode === 'mysql' ? '#DCFCE7' : '#FEF3C7' },
              ]}
            >
              <Text
                style={[
                  styles.freeBadgeText,
                  { color: dbMode === 'mysql' ? '#15803D' : '#B45309' },
                ]}
              >
                {dbMode === 'mysql' ? 'MySQL 已连接' : '本地兜底演示中'}
              </Text>
            </View>
          </View>

          {!authUser ? (
            <View style={styles.unauthedBox}>
              <Text style={styles.cardHint}>
                先注册账号并选择性别，即可创建专属空间，或在下方切换一个人用 / 两个人用 / 多人使用，并通过邀请码加入好友空间。
              </Text>
              <Pressable
                style={[styles.saveBtn, { backgroundColor: currentProfile.themeColor }]}
                onPress={() => router.push('/auth')}
              >
                <Text style={styles.saveBtnText}>注册新账号 / 登录已有账号</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {/* 已登录账号名片 */}
              <View style={styles.accountBanner}>
                <Text style={styles.accountAvatar}>{authUser.avatar_emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>{authUser.username}</Text>
                  <Text style={styles.accountMeta}>
                    性别：{GENDER_THEMES[authUser.gender].label} · 空间：{spaceInfo?.name || '个人空间'}
                  </Text>
                </View>
                <Pressable
                  style={styles.logoutBtn}
                  onPress={() => {
                    logoutAccount();
                    router.push('/auth');
                  }}
                >
                  <Text style={styles.logoutBtnText}>退出登录</Text>
                </Pressable>
              </View>

              {/* 使用人数模式选择：一个人用 / 两个人用 / 多人使用 */}
              <Text style={styles.fieldLabel}>⚙️ 选择使用模式（控制可加入人数）：</Text>
              <View style={styles.usageModeRow}>
                {(
                  [
                    { key: 'solo', emoji: '👤', label: '一个人用' },
                    { key: 'couple', emoji: '👩‍❤️‍👨', label: '两个人用' },
                    { key: 'group', emoji: '👥', label: '多人使用' },
                  ] as { key: UsageMode; emoji: string; label: string }[]
                ).map((m) => {
                  const active = (spaceInfo?.usage_mode || 'couple') === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={async () => {
                        try {
                          await changeUsageMode(m.key);
                          showNotice(`✅ 已切换为「${m.label}」模式`);
                        } catch (err: any) {
                          showNotice(`❌ ${err.message}`);
                        }
                      }}
                      style={[
                        styles.usageModeBtn,
                        active && {
                          borderColor: currentProfile.themeColor,
                          backgroundColor: currentProfile.lightBg,
                        },
                      ]}
                    >
                      <Text style={styles.usageModeEmoji}>{m.emoji}</Text>
                      <Text
                        style={[
                          styles.usageModeLabel,
                          active && { color: currentProfile.themeColor },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 我的空间邀请码 & 成员列表 */}
              {spaceInfo && (
                <View style={styles.inviteInfoBox}>
                  <Text style={styles.inviteCodeLabel}>
                    🔑 我的空间邀请码：
                    <Text style={styles.inviteCodeHighlight}>{spaceInfo.invite_code}</Text>
                  </Text>
                  <Text style={styles.memberListTitle}>
                    当前空间成员 ({spaceMembers.length} 人)：
                  </Text>
                  <View style={styles.memberChipRow}>
                    {spaceMembers.map((mem) => (
                      <View key={mem.id} style={styles.memberChip}>
                        <Text style={styles.memberChipText}>
                          {mem.avatar_emoji} {mem.username}（{GENDER_THEMES[mem.gender].label}）
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 填写邀请码加入 */}
              <Text style={styles.fieldLabel}>🤝 填写邀请码加入他人空间：</Text>
              <View style={styles.joinRow}>
                <TextInput
                  style={styles.joinInput}
                  placeholder="输入 6 位邀请码（如 YUYI99）"
                  autoCapitalize="characters"
                  value={inviteCodeInput}
                  onChangeText={setInviteCodeInput}
                />
                <Pressable
                  style={[styles.joinBtn, { backgroundColor: currentProfile.themeColor }]}
                  onPress={async () => {
                    if (!inviteCodeInput.trim()) return;
                    try {
                      await joinSpaceByInviteCode(inviteCodeInput.trim());
                      setInviteCodeInput('');
                      showNotice('🎉 已成功通过邀请码加入空间！');
                    } catch (err: any) {
                      showNotice(`❌ ${err.message}`);
                    }
                  }}
                >
                  <Text style={styles.joinBtnText}>加入</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* AI 智能拆解（小白免配置 · 永久免费） */}
        <View style={styles.card}>
          <View style={styles.aiHeaderRow}>
            <Text style={styles.cardTitle}>✨ AI 智能拆解（免配置 · 永久免费）</Text>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>0 费用可用</Text>
            </View>
          </View>
          <Text style={styles.cardHint}>
            无需注册、无需填写任何 API Key，已自动开启免费云端 AI + 本地智能双引擎，打开「AI 拆解」页面就能直接用！
          </Text>

          <View style={styles.aiModeRow}>
            {(
              [
                {
                  key: 'free_auto',
                  title: '☁️ 免费云端 AI + 本地兜底',
                  desc: '推荐：自动免费联网拆解，断网无缝切本地',
                },
                {
                  key: 'local_only',
                  title: '⚡ 纯离线极速拆解',
                  desc: '零网络等待，秒出双人生活/约会/学习清单',
                },
              ] as { key: AIMode; title: string; desc: string }[]
            ).map((opt) => {
              const active = (aiConfig.aiMode || 'free_auto') === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    updateAiConfig({ aiMode: opt.key });
                    showNotice(`已切换 AI 模式为：${opt.title}`);
                  }}
                  style={[
                    styles.aiModeBox,
                    active && {
                      borderColor: currentProfile.themeColor,
                      backgroundColor: currentProfile.lightBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.aiModeTitle,
                      active && { color: currentProfile.themeColor },
                    ]}
                  >
                    {opt.title} {active ? '✓' : ''}
                  </Text>
                  <Text style={styles.aiModeDesc}>{opt.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* 折叠高级自定义 Key 选项，不打扰小白用户 */}
          <Pressable
            style={styles.advancedToggleBtn}
            onPress={() => setShowAdvancedAi((prev) => !prev)}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvancedAi
                ? '▲ 收起开发者高级选项（自定义 API Key）'
                : '⚙️ 开发者高级选项：自定义 API Key（一般无需填写）'}
            </Text>
          </Pressable>

          {showAdvancedAi && (
            <View style={styles.advancedBox}>
              <Text style={styles.fieldLabel}>API Base URL</Text>
              <TextInput
                style={styles.input}
                value={apiBaseUrl}
                onChangeText={setApiBaseUrl}
                placeholder="https://api.deepseek.com/v1"
              />

              <Text style={styles.fieldLabel}>模型名称 (Model)</Text>
              <TextInput
                style={styles.input}
                value={modelName}
                onChangeText={setModelName}
                placeholder="deepseek-chat 或 gpt-4o-mini"
              />

              <Text style={styles.fieldLabel}>API Key</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
                placeholder="sk-..."
              />

              <Pressable
                style={[styles.saveBtn, { backgroundColor: currentProfile.themeColor }]}
                onPress={() => {
                  updateAiConfig({
                    aiMode: apiKey.trim().length > 5 ? 'custom_key' : 'free_auto',
                    apiBaseUrl,
                    apiKey,
                    modelName,
                  });
                  showNotice(
                    apiKey.trim().length > 5
                      ? '✅ 已启用自定义大模型 API 配置！'
                      : '✅ Key 为空，已自动保持免费免配置模式！'
                  );
                }}
              >
                <Text style={styles.saveBtnText}>保存自定义配置</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 双机任务同步口令 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔄 敬雨 & 慧仪 双机数据同步口令</Text>
          <Text style={styles.cardHint}>
            点击「生成同步数据码」发给对方微信，对方粘贴后点击「导入同步」即可对齐所有共同待办与打卡进度。
          </Text>

          <TextInput
            style={[styles.input, { minHeight: 70 }]}
            multiline
            placeholder="在此粘贴对方发来的同步数据 JSON..."
            value={syncText}
            onChangeText={setSyncText}
          />

          <View style={styles.syncBtnRow}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                const code = exportSyncPayload();
                setSyncText(code);
                showNotice('📋 已生成当前双人待办同步数据，全选复制发给对方即可！');
              }}
            >
              <Text style={styles.secondaryBtnText}>生成同步数据码</Text>
            </Pressable>

            <Pressable
              style={[styles.primarySyncBtn, { backgroundColor: currentProfile.themeColor }]}
              onPress={() => {
                if (!syncText.trim()) return;
                const ok = importSyncPayload(syncText.trim());
                showNotice(ok ? '🎉 双人待办与打卡数据同步成功！' : '❌ 同步码格式有误，请检查');
              }}
            >
              <Text style={styles.primarySyncBtnText}>导入并同步</Text>
            </Pressable>
          </View>
        </View>
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
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  heroBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7E22CE',
    backgroundColor: '#F3E8FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  heroDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
  },
  partnerCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  roleEmoji: {
    fontSize: 26,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  roleMotto: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  roleStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noticeBox: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  noticeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  syncBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  primarySyncBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primarySyncBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  freeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  aiModeRow: {
    gap: 8,
    marginBottom: 10,
  },
  aiModeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiModeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  aiModeDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  advancedToggleBtn: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  advancedToggleText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  advancedBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  unauthedBox: {
    marginTop: 4,
  },
  accountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accountAvatar: {
    fontSize: 28,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  accountMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  usageModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  usageModeBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  usageModeEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  usageModeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  inviteInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inviteCodeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  inviteCodeHighlight: {
    fontSize: 16,
    fontWeight: '900',
    color: '#7E22CE',
    letterSpacing: 1,
  },
  memberListTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 6,
  },
  memberChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  memberChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  joinRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinInput: {
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
  joinBtn: {
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 12,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  genderSpaceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  genderSpaceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  usageModeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  personalHeroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  personalAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalAvatarEmoji: {
    fontSize: 28,
  },
});
