# 雨仪待办 (YuYi Do) — Meet Summer After Rain · 雨落知夏，心仪同行 🌧️×☀️

> **「Meet Summer After Rain · 雨落知夏，心仪同行」— 跨平台 iOS / Android 双端协作监督与 AI 待办拆解移动端工程**
> 基于 **React Native + Expo (`expo-router`)** 构建，深度整合以下开源项目核心特性与原版 `DuoDo` APK 的双人监督交互体验：
> - **好友监督 / 社交协作打卡**：整合自 [`jofoerster/habitsync`](https://github.com/jofoerster/habitsync) 与 `DuoDo`「监工小队 / 共同打勾 / 拍一拍提醒」
> - **AI 自然语言解析与子任务拆解**：整合自 [`mariangle/taskify`](https://github.com/mariangle/taskify)（中文日期/时间/周期/提醒/@搭子解析）与 [`SahilBacchus/ai-task-breakdown`](https://github.com/SahilBacchus/ai-task-breakdown)（LLM + 本地智能场景双引擎子任务分工拆解）

---

## ✨ 核心功能一览

1. **🌧️ AfterRain & ☀️ Midsummer 专属协作模式（支持单人 / 双人 / 多人）**
   - 以「Meet Summer After Rain · 雨落知夏，心仪同行」为意象，支持独立个人空间、双人协作、多人团队空间与邀请码加入。
   - 支持三种协作模式：
     - **共同打勾 (`both_required`)**：空间搭子各自独立打勾，双方均打勾后触发「🎉 默契达成」。
     - **协同分工 (`either_one`)**：任一人打勾即完成（如顺路取快递、买水果）。
     - **个人执行 + 搭子监督 (`supervised`)**：一方执行，另一方作为监工搭子可随时拍一拍提醒。
2. **✨ AI 帮你写待办 & 智能拆解双人子任务**
   - **NLP 自然语言实时解析**：输入如 `明天晚上7点半和Midsummer一起去夜跑5公里，提前半小时提醒我`，自动提取日期、时间、重复周期、提前提醒时长与双人协作模式。
   - **AI 子任务拆解与搭子分工**：输入一句话目标（如 `周末和Midsummer一起去野餐`、`一起做一顿丰盛的晚餐`、`背单词互相抽查`），一键拆解为带可执行步骤的子任务清单，并自动分配给「🌧️AfterRain」「☀️Midsummer」或「🌧️☀️共同完成」。
   - 支持在「雨仪空间」配置 DeepSeek / 通义千问 / OpenAI 兼容大模型 API Key，未配置时自带免费免配置智能拆解引擎，开箱即用。
3. **👩‍❤️‍👨 雨仪监工小队 & 共同习惯挑战**
   - **今日打勾默契榜 PK**：实时对比搭子今日待办完成率。
   - **花式拍一拍互动**：一键发送「👋 拍一拍催打卡」「🌸 送朵小红花」「📵 提醒放下手机」「💖 贴贴加油打气」并记录在实时监督动态流。
   - **共同习惯挑战墙**：设定如「23:30 前放下手机互道晚安」「每日共同学习 45 分钟」及达成奖励约定，追踪共同连击天数（Streak）。

---

## 🚀 快速运行与打包 Android APK 指南

### 1. 安装依赖
```bash
npm install
```

### 2. 手机真机扫码体验 (Expo Go) 或网页预览
```bash
# 启动开发服务器（手机下载 Expo Go 扫码即可在真机运行）
npx expo start

# 或直接在浏览器中预览移动端界面
npx expo start --web
```

### 3. 打包生成 Android 安装包 (`base.apk`)

#### 方式 A：使用 Expo EAS 云端一键打包 APK（无需本地配置 Android Studio）
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
> 项目根目录已配置好 `eas.json`（`buildType: "apk"`），构建完成后会直接生成可发到微信安装使用的 `.apk` 文件。

#### 方式 B：本地 Android Gradle 打包 APK
```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
生成的 APK 位于 `android/app/build/outputs/apk/release/app-release.apk`。
