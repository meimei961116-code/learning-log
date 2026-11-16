# 我的學習紀錄

純 HTML、CSS、JavaScript 的個人學習紀錄網站，透過 Supabase Auth 登入，並使用資料庫 RLS 保護每位使用者的紀錄。

## 設定 Supabase

1. 前往 [Supabase](https://supabase.com/dashboard) 建立一個 project，設定資料庫密碼並選擇離你較近的區域。
2. 開啟左側 **SQL Editor**，選 **New query**，貼上 `schema.sql` 全文，按 **Run**。成功後會建立 `learning_logs` 表、索引、權限與 RLS 政策。
3. 開啟 **Project Settings → API**（部分介面顯示為 **API Keys**），複製 **Project URL** 與 **publishable key**。Publishable key 通常以 `sb_publishable_` 開頭。不要複製 `secret` 或 `service_role` key。
4. 編輯 `config.js`，把兩個「貼上…」文字各自替換為剛才複製的值，並保留單引號。例如：

   ```js
   const SUPABASE_URL = 'https://你的專案代碼.supabase.co';
   const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_你的公開金鑰';
   ```

5. 開啟 **Authentication → Providers → Email**，確認 Email provider 已啟用。需要驗證 Email 時，註冊後請使用者點擊收到的確認連結。
6. 開啟 **Authentication → URL Configuration**，將網站網址加入 **Site URL**。本機測試可用 `http://localhost:8000`；部署後將 Site URL 設為部署網址，並將本機與部署網址加入 **Redirect URLs**。
7. 在這個資料夾啟動任一免安裝的靜態 HTTP 伺服器，或將六個檔案部署到靜態網站主機。直接用 `file://` 開啟可能會受到瀏覽器模組或網路限制；例如若電腦已有 Python，可在資料夾執行 `python -m http.server 8000`，然後開啟 `http://localhost:8000`。網站程式本身不需要 npm 或建置步驟。

## 安全設計

- `schema.sql` 啟用 `learning_logs` 的 Row Level Security，並只授予 `authenticated` 讀取、新增、刪除權限。
- SELECT、INSERT、DELETE 政策都以 `auth.uid() = user_id` 限制為本人資料。新增時 `user_id` 預設取自登入者；即使有人直接呼叫資料 API，也不能讀取或刪除別人的紀錄，或替別人新增紀錄。
- 瀏覽器只使用 Project URL 與 publishable key。隔離權限由資料庫 RLS 執行，不依賴網頁隱藏資料。
- 使用者輸入的紀錄以 DOM `textContent` 建立純文字節點，不當作 HTML 解譯。
