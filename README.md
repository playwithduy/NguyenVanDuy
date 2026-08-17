# Deadline Manager

Website quản lý **Project · Deadline/Task · Calendar · Notes** dành cho nhóm 1–2 người.
100% chạy trên **GitHub Pages** (HTML/CSS/JS thuần) + **Supabase** (Auth, Postgres, RLS). Không backend riêng.

```
GitHub Pages  →  HTML + CSS + JS  →  Supabase (Auth · PostgreSQL · RLS)
```

---

## 1. Tính năng

- Đăng nhập bằng Supabase Auth (email/password)
- Danh sách Project, mỗi Project có **mật khẩu riêng** (kiểm tra an toàn qua RPC ở server, không có secret trong frontend)
- Trong mỗi Project: Dashboard, Tasks/Deadline (CRUD, filter, search, sort), Calendar (theo tháng), Notes (CRUD, search)
- Row Level Security: chỉ member của project mới đọc/ghi được dữ liệu của project đó
- Responsive: sidebar trên desktop, bottom navigation trên mobile
- Toast + loading state cho mọi thao tác, không để lỗi JS lộ ra ngoài giao diện

---

## 2. Cấu trúc project

```
deadline-manager/
├── index.html            # redirect theo trạng thái đăng nhập
├── login.html
├── projects.html
├── dashboard.html
├── tasks.html
├── calendar.html
├── notes.html
├── settings.html         # cài đặt project (owner only)
├── css/
├── js/
│   ├── supabase.js        # cấu hình SUPABASE_URL + ANON_KEY
│   ├── auth.js
│   ├── guard.js            # bảo vệ route
│   ├── utils.js
│   ├── projects.js
│   ├── dashboard.js
│   ├── tasks.js
│   ├── calendar.js
│   ├── notes.js
│   └── settings.js
├── components/
│   ├── sidebar.js
│   ├── modal.js
│   └── toast.js
└── supabase/
    ├── schema.sql         # chạy 1 lần trong Supabase SQL Editor
    └── seed.sql           # dữ liệu mẫu (tùy chọn)
```

---

## 3. Cài đặt Supabase

### 3.1. Tạo project
1. Vào [supabase.com](https://supabase.com) → **New project**.
2. Đợi project khởi tạo xong.

### 3.2. Chạy SQL schema
1. Mở **SQL Editor** trong Supabase Dashboard.
2. Copy toàn bộ nội dung `supabase/schema.sql` → dán vào → **Run**.
   - Script này tạo bảng, index, trigger, RLS policies, và các hàm RPC (`create_project`, `verify_project_password`, `change_project_password`).

### 3.3. Cấu hình Auth
1. Vào **Authentication → Providers** → đảm bảo **Email** provider đang bật.
2. (Khuyến nghị cho nhóm nhỏ) Tắt "Confirm email" trong **Authentication → Settings** nếu muốn đăng nhập ngay không cần xác thực email, hoặc giữ bật nếu muốn bảo mật cao hơn.
3. Tạo tài khoản cho 1–2 người dùng qua **Authentication → Users → Add user** (hoặc để họ tự đăng ký nếu bạn build thêm trang signup).

### 3.4. Lấy API keys
1. Vào **Project Settings → API**.
2. Copy **Project URL** và **anon public key** (KHÔNG copy `service_role` key).

### 3.5. (Tùy chọn) Seed dữ liệu mẫu
1. Đăng nhập ít nhất 1 lần qua app để Supabase tạo user.
2. Chạy `supabase/seed.sql` trong SQL Editor.
   - Project mẫu "Đồ án tốt nghiệp" sẽ có mật khẩu: `demo1234`.

---

## 4. Cấu hình frontend

Mở `js/supabase.js` và điền thông tin của bạn:

```js
const SUPABASE_URL = "https://xxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

> Chỉ dùng `SUPABASE_URL` + `anon key` ở frontend. Không bao giờ đưa `service_role_key` vào code.

---

## 5. Deploy lên GitHub Pages

1. Tạo repository mới trên GitHub.
2. Push toàn bộ thư mục `deadline-manager/` lên repository (đã điền `js/supabase.js`).
3. Vào **Settings → Pages** của repository.
4. Ở **Source**, chọn branch `main` và thư mục `/ (root)`.
5. Bấm **Save**, đợi vài phút để GitHub build trang.
6. Truy cập URL dạng `https://<username>.github.io/<repo>/` — trang `index.html` sẽ tự chuyển đến `login.html`.

Không cần server riêng, không cần build step.

---

## 6. Bảo mật

- **Password Project không lưu plaintext** — chỉ lưu `password_hash` (bcrypt qua `pgcrypto`).
- **Kiểm tra mật khẩu Project qua RPC `verify_project_password`** (chạy trong Postgres với `security definer`), không so sánh ở frontend, không có secret trong JS.
- **RLS bật cho toàn bộ bảng.** User chỉ đọc/ghi được `projects`, `tasks`, `notes` của project mà họ là `project_members`. Biết `project_id` không có nghĩa là truy cập được — RLS chặn ở tầng database.
- Project password chỉ là lớp bảo vệ **bổ sung** (UX), không thay thế RLS.
- `localStorage`/`sessionStorage` chỉ lưu dữ liệu tạm (project đã unlock trong phiên, id project hiện tại) — không lưu password hay bất kỳ key bí mật nào.

---

## 7. Định nghĩa trạng thái Deadline

```
deadline < hiện tại  AND status != completed   → 🔴 Overdue
deadline trong vòng 24h  AND status != completed → 🟠 Due soon
status == completed                              → 🟢 Completed
còn lại                                          → 🔵 Upcoming
```

---

## 8. Giới hạn hiện tại / hướng mở rộng

- Chưa có trang đăng ký tự phục vụ (tạo user qua Supabase Dashboard) — dễ thêm sau bằng `supabase.auth.signUp`.
- Notes dùng editor văn bản thuần (chưa rich text) — theo đúng yêu cầu ban đầu.
- Kiến trúc `project_members` đã sẵn sàng mở rộng thêm nhiều thành viên/role trong tương lai mà không cần đổi schema.
