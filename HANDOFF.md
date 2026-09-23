# 專案交接筆記

給下一個 Claude Code session 看的背景資訊。這個 session 沒有前一次對話的記憶,請先讀完這份再開始動作。

## 專案是什麼

憂鬱程度自動評估系統,給精神科用。核心是既有的 PyTorch 模型(GRU + BiLSTM,音頻＋文字多模態融合,~11MB,CPU 推論即可)。三種角色:病人、助理、醫師。

技術棧:
- 前端 App:React Native + Expo + TypeScript
- 前端網頁(助理/醫師用):React + TypeScript
- 後端:Python + FastAPI + JWT
- 資料庫:PostgreSQL
- 部署:Docker Compose + Nginx,試驗階段先在自己主機跑,之後上 AWS EC2 + RDS

資料夾規劃(尚未建立,只有 devcontainer 設定好):
```
depression-app/
├── .devcontainer/devcontainer.json   ← 已設定好,一個 container 管全部
├── frontend/web/                     ← Node.js (npm)
└── backend/pyproject.toml            ← Python (uv),尚未建立
```

## 目前檔案狀態

- `CLAUDE.md` — 行為準則,已包含「Environment Safety」段落:**不可修改專案目錄以外的東西,有疑慮就先問**。這條是這次對話中才加上去的,務必遵守。
- `.devcontainer/devcontainer.json` — 已修好並加強:
  - `postCreateCommand` 加了判斷式,`backend/pyproject.toml` 不存在時跳過 `uv sync`(不然 backend/ 資料夾還沒建立,container build 會失敗)
  - 加了 `forwardPorts` + `appPort`:`8081`(Expo Metro)、`19000`~`19002`(舊版 Expo manifest/dev tools),先加好避免之後跑 Expo 才發現要重 build
- `憂鬱評估 App (standalone).html` — **這不是可執行/可搬的程式碼**,是 Claude Artifact 匯出的設計稿 bundle(用專屬的 `x-dc` / `{{ }}` template DSL,只能在該 bundler runtime 裡跑)。純粹當作視覺與互動規格參考,實作時要用真的 React Native 重寫。裡面畫的是「醫師端」畫面:醫師資訊 + 病患資料 + 上傳語音/逐字稿 + 開始分析按鈕 + 結果彈窗(無憂鬱 / 憂鬱兩種狀態)。
- `.devcontainer/devcontainer.json` 的 `postCreateCommand`：`apt-get` 已補上 `sudo`(container 使用者是 `vscode`,沒 sudo 會失敗)。重 build container 後才生效。
- `frontend/app/` — **醫師端 App 已完成第一版**(Expo SDK 57 + TypeScript,blank-typescript 範本,沒用 expo-router)。
  - `App.tsx` → `src/DoctorScreen.tsx`(主畫面)、`src/ResultModal.tsx`(結果彈窗)、`src/analyze.ts`(API 呼叫/本地模擬)、`src/theme.ts`(配色)
  - 圖檔從 mockup bundle 抽出放在 `assets/images/`
  - 後端網址:在 `frontend/app/.env` 設 `EXPO_PUBLIC_API_ENDPOINT=...` 即走真實推論;未設定時延遲 1.6 秒後用身分證字號第一個字元的奇偶決定結果(同 mockup)
  - 已驗證:`tsc --noEmit`、`expo-doctor` 21/21、`expo export --platform android` 可打包。**尚未在實機上跑過。**
  - 注意:`create-expo-app` 自動在 `frontend/app/` 建了一個 `.git`(內含一個 Initial commit)。
- `frontend/web/` — 空資料夾,之後的網頁版預留(future work)。
- `backend/` — 還沒建立。
- `.claude/settings.local.json` — 常用指令的免確認清單(使用者要求:一般指令不用問,重大的才問)。

## 這次對話定案的決策

1. **先做醫師端畫面,用 React Native (Expo)**,不是網頁。網頁(助理/醫師的角色分工細節)之後再說,現在不用管。
2. **從 mockup 萃取出的規格**(之後接後端時可以直接用):
   - 表單驗證:身分證字號需符合「1 英文字母 + 9 數字」;語音檔必填(WAV/MP3/M4A,上限 200MB);逐字稿選填(TXT/CSV/DOCX)
   - API 合約(mockup 裡已經寫好、但目前沒真的接):`POST {API_ENDPOINT}`,`multipart/form-data`,欄位為 `audio`、`transcript`、`patient`(JSON:name/pid/birth)、`doctor`(JSON:name/dept),回傳 `{ label: 0 | 1 }` 驅動結果彈窗(0 = 無憂鬱,1 = 憂鬱)
3. Container 已經 build 完成。

## 還沒決定 / 待確認

- 病患本人操作的畫面完全還沒有 mockup,也還沒規劃時程
- 助理/醫師網頁的角色分工細節(原規劃是助理上傳、醫師看報告,但 mockup 把這兩件事合在醫師一人身上)——使用者說這個之後再確認,現在不用管
- **Expo + Tailscale 的坑**:用手機透過 Tailscale 連 container 裡跑的 Expo Metro 時,QR Code 內建的網址預設會抓 container 內部的 docker 網段 IP,不會自動變成 Tailscale IP,手機掃了會連不上。實際跑 `expo start` 時要加上環境變數手動指定:
  ```
  EXPO_PACKAGER_HOSTNAME=<host 的 Tailscale IP> npx expo start
  ```

## 建議下一步

1. 用手機 Expo Go 實機測試醫師端畫面(需要 host 的 Tailscale IP,見上方 Tailscale 注意事項;在 `frontend/app/` 執行)
2. 建立 FastAPI 後端,實作上述 API 合約後設定 `EXPO_PUBLIC_API_ENDPOINT` 串接
3. Git 由使用者自己初始化(不要替使用者 `git init`)
