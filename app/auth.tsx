import React, { useState } from 'react';
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
import { useYuYiStore } from '../src/context/YuYiStore';
import { Gender } from '../src/types/todo';

export default function AuthScreen() {
  const router = useRouter();
  const { authUser, registerAccount, loginAccount } = useYuYiStore();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!username.trim()) {
      setErrorMsg('请输入账号昵称');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('密码至少需要 4 位');
      return;
    }
    if (mode === 'register' && !gender) {
      setErrorMsg('请必须选择你的性别（男生或女生）');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await registerAccount(username.trim(), password, gender!);
      } else {
        await loginAccount(username.trim(), password);
      }
      router.replace('/');
    } catch (err: any) {
      setErrorMsg(err?.message || '操作失败，请检查后端服务是否运行');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoName: string) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginAccount(demoName, '123456');
      router.replace('/');
    } catch (err: any) {
      setErrorMsg(err?.message || '快捷登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {authUser && (
          <View style={styles.topRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#334155" />
              <Text style={styles.backText}>返回</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.brandBox}>
          <Text style={styles.logoEmoji}>🌧️🌸</Text>
          <Text style={styles.title}>雨仪待办 · 账号中心</Text>
          <Text style={styles.subtitle}>
            先注册账号并选择性别，即可创建或通过邀请码加入单人 / 双人 / 多人协作空间
          </Text>
        </View>

        {/* 注册 / 登录切换 */}
        <View style={styles.tabSwitch}>
          <Pressable
            style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
            onPress={() => {
              setMode('register');
              setErrorMsg(null);
            }}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
              注册新账号
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
            onPress={() => {
              setMode('login');
              setErrorMsg(null);
            }}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
              已有账号登录
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Text style={styles.label}>账号 / 昵称</Text>
          <TextInput
            style={styles.input}
            placeholder="例如：AfterRain、Midsummer 或你的昵称"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>登录密码</Text>
          <TextInput
            style={styles.input}
            placeholder="至少 4 位密码"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {mode === 'register' && (
            <>
              <Text style={styles.label}>选择你的性别（必选，注册后自动匹配专属空间）</Text>
              <View style={styles.genderRow}>
                {(
                  [
                    { key: 'male', emoji: '👦', label: '男生' },
                    { key: 'female', emoji: '👧', label: '女生' },
                  ] as { key: Gender; emoji: string; label: string }[]
                ).map((g) => {
                  const selected = gender === g.key;
                  return (
                    <Pressable
                      key={g.key}
                      onPress={() => setGender(g.key)}
                      style={[
                        styles.genderCard,
                        selected && styles.genderCardSelected,
                      ]}
                    >
                      <Text style={styles.genderEmoji}>{g.emoji}</Text>
                      <Text
                        style={[
                          styles.genderLabel,
                          selected && styles.genderLabelSelected,
                        ]}
                      >
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Pressable
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'register' ? '立即注册并进入空间' : '登录账号'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* 快捷演示账号：1(男)、2(男)、3(女) */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>⚡ 一键登录测试账号（默认密码 123456）</Text>
          <View style={styles.demoBtnRow}>
            <Pressable
              style={[styles.demoBtn, { backgroundColor: '#EEF0FF' }]}
              onPress={() => handleQuickDemo('1')}
            >
              <Text style={[styles.demoBtnText, { color: '#5B6CFF' }]}>
                👦 账号 1（男）
              </Text>
            </Pressable>
            <Pressable
              style={[styles.demoBtn, { backgroundColor: '#EEF0FF' }]}
              onPress={() => handleQuickDemo('2')}
            >
              <Text style={[styles.demoBtnText, { color: '#5B6CFF' }]}>
                👦 账号 2（男）
              </Text>
            </Pressable>
            <Pressable
              style={[styles.demoBtn, { backgroundColor: '#FFF0F5' }]}
              onPress={() => handleQuickDemo('3')}
            >
              <Text style={[styles.demoBtnText, { color: '#FF6B9D' }]}>
                👧 账号 3（女）
              </Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  genderCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  genderCardSelected: {
    borderColor: '#5B6CFF',
    backgroundColor: '#EEF0FF',
  },
  genderEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  genderLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  genderLabelSelected: {
    color: '#5B6CFF',
  },
  submitBtn: {
    backgroundColor: '#5B6CFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  demoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    textAlign: 'center',
  },
  demoBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
