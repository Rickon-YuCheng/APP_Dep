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

資料夾結構:
```
depression-app/
├── .devcontainer/devcontainer.json   ← 一個 container 管全部
├── frontend/app/                     ← Expo App (npm)
├── frontend/web/                     ← 網頁版預留,空的
└── backend/                          ← FastAPI (uv)
```

## 目前檔案狀態

- `CLAUDE.md` — 行為準則,已包含「Environment Safety」段落:**不可修改專案目錄以外的東西,有疑慮就先問**。這條是這次對話中才加上去的,務必遵守。
- `.devcontainer/devcontainer.json` — 已修好並加強:
  - `postCreateCommand` 加了判斷式,`backend/pyproject.toml` 不存在時跳過 `uv sync`(不然 backend/ 資料夾還沒建立,container build 會失敗)
  - Port:`8000`(FastAPI)、`8081`(Expo Metro)、`19000`~`19002`(舊版 Expo 用,SDK 57 其實用不到)。用 `runArgs -p 0.0.0.0:...` 發佈(不用 `appPort`,原因見下方 Tailscale 段落)
  - 現在 `backend/pyproject.toml` 已存在,Rebuild 時 `postCreateCommand` 會自動 `uv sync`
- `憂鬱評估 App (standalone).html` — **這不是可執行/可搬的程式碼**,是 Claude Artifact 匯出的設計稿 bundle(用專屬的 `x-dc` / `{{ }}` template DSL,只能在該 bundler runtime 裡跑)。純粹當作視覺與互動規格參考,實作時要用真的 React Native 重寫。裡面畫的是「醫師端」畫面:醫師資訊 + 病患資料 + 上傳語音/逐字稿 + 開始分析按鈕 + 結果彈窗(無憂鬱 / 憂鬱兩種狀態)。
- `.devcontainer/devcontainer.json` 的 `postCreateCommand`：`apt-get` 已補上 `sudo`(container 使用者是 `vscode`,沒 sudo 會失敗)。重 build container 後才生效。
- `frontend/app/` — **醫師端 App 已完成第一版**(Expo SDK 57 + TypeScript,blank-typescript 範本,沒用 expo-router)。
  - `App.tsx` → `src/DoctorScreen.tsx`(主畫面)、`src/ResultModal.tsx`(結果彈窗)、`src/analyze.ts`(API 呼叫/本地模擬)、`src/theme.ts`(配色)
  - 圖檔從 mockup bundle 抽出放在 `assets/images/`
  - 後端網址:在 `frontend/app/.env` 設 `EXPO_PUBLIC_API_ENDPOINT=...` 即走真實推論;未設定時延遲 1.6 秒後用身分證字號第一個字元的奇偶決定結果(同 mockup)
  - 已驗證:`tsc --noEmit`、`expo-doctor` 21/21、`expo export --platform android` 可打包,**iPhone Expo Go 經 Tailscale 實機跑成功**。
  - Expo Go 連 Tailscale IP(非區網位址)時,手機 Expo Go 與 container 內 `npx expo login` 必須登入同一個 Expo 帳號,否則會被擋。登入資訊存在 `~/.expo/`,Rebuild Container 後要重登。
  - Android:已用 EAS 雲端打包 APK 並在實機安裝成功(`eas.json` 的 `preview` profile;套件名稱 `com.rickon2533.depressionapp`;Expo 帳號 `rickon2533`)。指令:`npx eas-cli@latest build -p android --profile preview`。目前 APK 走本地模擬,`EXPO_PUBLIC_API_ENDPOINT` 是打包時寫死的,串後端要重新打包。
  - iOS:沒有 Apple Developer 帳號也沒有 Mac,iOS 暫時只用 Expo Go。
  - `expo start` 時出現 `libdbus-1.so.3` 的 React Native DevTools 錯誤可忽略,只影響除錯器(按 `j`),不影響 App。
- `backend/` — FastAPI 後端第一版(uv 專案,`src/depression_backend/`)
  - `main.py`:`POST /analyze`,依上述 API 合約接收並驗證資料,回傳 `{label}`
  - `inference.py`:`predict()` 目前是模擬推論(同 App mockup 邏輯)。使用者有模型但推論程式還沒寫好,之後只換這個函式
  - 測試:`cd backend && uv run pytest`(6 個通過)
  - 啟動:`uv run uvicorn depression_backend.main:app --host 0.0.0.0 --port <port>`。後端用 port 8000,已加進 devcontainer `runArgs`(`0.0.0.0:8000:8000`),需 Rebuild Container 才生效
- `frontend/web/` — 空資料夾,之後的網頁版預留(future work)。
- `.claude/settings.local.json` — 常用指令的免確認清單(使用者要求:一般指令不用問,重大的才問)。

## 這次對話定案的決策

1. **先做醫師端畫面,用 React Native (Expo)**,不是網頁。網頁(助理/醫師的角色分工細節)之後再說,現在不用管。
2. **從 mockup 萃取出的規格**(之後接後端時可以直接用):
   - 表單驗證:身分證字號需符合「1 英文字母 + 9 數字」;語音檔必填(WAV/MP3/M4A,上限 200MB);逐字稿選填(TXT/CSV/DOCX)
   - API 合約(mockup 裡已經寫好、但目前沒真的接):`POST {API_ENDPOINT}`,`multipart/form-data`,欄位為 `audio`、`transcript`、`patient`(JSON:name/pid/birth)、`doctor`(JSON:name/dept),回傳 `{ label: 0 | 1 }` 驅動結果彈窗(0 = 無憂鬱,1 = 憂鬱)
3. 後端 port 用 8000;推論先用模擬,只做分析 API(JWT、PostgreSQL 之後再做)。
4. iOS 用 Expo Go 測,Android 用 EAS 打包 APK。

## 還沒決定 / 待確認

- 病患本人操作的畫面完全還沒有 mockup,也還沒規劃時程
- 助理/醫師網頁的角色分工細節(原規劃是助理上傳、醫師看報告,但 mockup 把這兩件事合在醫師一人身上)——使用者說這個之後再確認,現在不用管
- **Expo + Tailscale 的坑**:用手機透過 Tailscale 連 container 裡跑的 Expo Metro 時,QR Code 內建的網址預設會抓 container 內部的 docker 網段 IP,不會自動變成 Tailscale IP,手機掃了會連不上。實際跑 `expo start` 時要加上環境變數手動指定:
  ```
  REACT_NATIVE_PACKAGER_HOSTNAME=<host 的 Tailscale IP> npx expo start
  ```
  - 注意變數名稱是 `REACT_NATIVE_PACKAGER_HOSTNAME`;`EXPO_PACKAGER_HOSTNAME` 不會被讀(已查過 `@expo/cli` 原始碼),QR Code 會變成 `172.17.0.2`
  - host 是 `leopold-altos-p30-f6`,Tailscale IP `100.91.82.45`
  - 另一個坑:devcontainer 的 `appPort` 只會發佈到 host 的 `127.0.0.1`(`docker ps` 看到 `127.0.0.1:8081->8081`),手機連會 request timed out。已改成 `runArgs -p 0.0.0.0:...`(8081 已驗證可用)。host 的 ufw 是 inactive。
  - 使用者的 iPhone(`iphone173`)Tailscale 金鑰曾過期(Expired Jun 18, 2026),連不上時先檢查這個

## 建議下一步

1. ~~用手機 Expo Go 實機測試醫師端畫面~~(已完成)
2. ~~建立 FastAPI 後端~~(已完成,推論為模擬)→ Rebuild Container 讓 port 8000 生效、設定 `EXPO_PUBLIC_API_ENDPOINT` 讓 App 真的串接後端
3. 使用者寫好推論程式後,替換 `backend/src/depression_backend/inference.py` 的 `predict()`
3. Git 由使用者自己初始化(不要替使用者 `git init`)
