# 俄语学习 App

项目已经接入 Capacitor，网页端和 Android App 共用同一套 HTML、CSS 和 JavaScript。

## 本地同步网页到 App

在项目根目录运行：

```bash
npm install
npm run cap:sync
```

`cap:sync` 会把根目录中的网页文件复制到 `www/`，再同步到 Android 工程。

## 打开 Android 工程

需要先安装 Android Studio、Android SDK 和 JDK。然后运行：

```bash
npm run cap:open:android
```

也可以直接在 Android Studio 中打开项目里的 `android/` 文件夹。

## 生成测试 APK

在 Android Studio 中选择：

```text
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

生成的 APK 可以安装到 Android 手机进行测试。发布到 Google Play 时，应选择生成 signed AAB。

## 重要配置

- App ID：`com.baishu123.russianapp`
- App 名称：`俄语学习`
- 网页资源目录：`www/`
- GitHub Pages 网页地址仍然保持不变
- Supabase 前端配置继续使用现有 publishable key

如果以后修改了网页代码，重新运行 `pnpm run cap:sync` 即可把最新网页同步到 Android App。
