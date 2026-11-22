import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { AuthUser, Gender, SpaceInfo, SpaceMember, UsageMode, YuYiTask } from '../types/todo';

function resolveDefaultApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (Platform.OS === 'web') {
    const host =
      typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname
        : 'localhost';
    return `http://${host}:3001/api`;
  }
  // iOS / Android 真机通过 Expo Go 或开发包运行时，自动提取电脑局域网 IP
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const lanHost = hostUri.split(':')[0];
    if (lanHost) {
      return `http://${lanHost}:3001/api`;
    }
  }
  // Android 模拟器访问宿主机默认网段为 10.0.2.2，iOS 模拟器为 localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001/api';
  }
  return 'http://localhost:3001/api';
}

export const API_BASE_URL = resolveDefaultApiBaseUrl();

export interface AuthPayloadResponse {
  token?: string;
  user: AuthUser;
  space: SpaceInfo | null;
  members: SpaceMember[];
  dbMode: 'mysql' | 'local_fallback';
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data as T;
}

export const authApi = {
  register(username: string, password: string, gender: Gender) {
    return requestJson<AuthPayloadResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, gender }),
    });
  },
  login(username: string, password: string) {
    return requestJson<AuthPayloadResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  getMe(token: string) {
    return requestJson<AuthPayloadResponse>('/auth/me', { method: 'GET' }, token);
  },
  updateUsageMode(token: string, usageMode: UsageMode) {
    return requestJson<AuthPayloadResponse>(
      '/space/mode',
      {
        method: 'PUT',
        body: JSON.stringify({ usageMode }),
      },
      token
    );
  },
  joinByInviteCode(token: string, inviteCode: string) {
    return requestJson<AuthPayloadResponse>(
      '/space/join',
      {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      },
      token
    );
  },
  getSpaceTasks(token: string) {
    return requestJson<{ tasks: YuYiTask[] }>('/space/tasks', { method: 'GET' }, token);
  },
  saveSpaceTasks(token: string, tasks: YuYiTask[]) {
    return requestJson<{ ok: boolean; count: number }>(
      '/space/tasks',
      {
        method: 'PUT',
        body: JSON.stringify({ tasks }),
      },
      token
    );
  },
  sendCrossSpaceNudge(
    token: string,
    targetUsername: string,
    emoji = '👋',
    message?: string
  ) {
    return requestJson<{
      ok: boolean;
      nudge: {
        fromUsername: string;
        toUsername: string;
        emoji: string;
        message: string;
      };
    }>(
      '/nudges/send',
      {
        method: 'POST',
        body: JSON.stringify({ targetUsername, emoji, message }),
      },
      token
    );
  },
  getCrossSpaceNudges(token: string) {
    return requestJson<{ nudges: any[] }>('/nudges', { method: 'GET' }, token);
  },
};
