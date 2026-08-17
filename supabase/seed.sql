-- ============================================================
-- SEED DATA (optional) — run AFTER you have signed up at least
-- one user through the app's login page (Supabase Auth creates
-- the auth.users row; this script uses that user as the owner).
--
-- Steps:
-- 1. Sign up / log in once through login.html so auth.users has a row.
-- 2. Run this whole script in the Supabase SQL Editor.
-- ============================================================

do $$
declare
  demo_user_id uuid;
  demo_project_id uuid;
begin
  -- Grab the first user found (fine for a 1-2 person workspace)
  select id into demo_user_id from auth.users order by created_at asc limit 1;

  if demo_user_id is null then
    raise notice 'No users found. Sign up through the app first, then re-run this script.';
    return;
  end if;

  -- Create the demo project (password: "demo1234")
  insert into projects (name, description, password_hash, created_by)
  values (
    'Đồ án tốt nghiệp',
    'Website đặt vé xem phim',
    crypt('demo1234', gen_salt('bf')),
    demo_user_id
  )
  returning id into demo_project_id;

  insert into project_members (project_id, user_id, role)
  values (demo_project_id, demo_user_id, 'owner');

  insert into tasks (project_id, title, description, deadline, priority, status, created_by) values
    (demo_project_id, 'Nộp báo cáo thực tập', 'Hoàn thiện và nộp báo cáo cho giảng viên hướng dẫn', '2026-08-18 17:00:00+07', 'high', 'todo', demo_user_id),
    (demo_project_id, 'Hoàn thành database', 'Thiết kế schema và viết RLS policies', '2026-08-20 23:59:00+07', 'medium', 'in_progress', demo_user_id),
    (demo_project_id, 'Thiết kế giao diện', 'Thiết kế UI cho trang chủ và trang đặt vé', '2026-08-22 23:59:00+07', 'low', 'todo', demo_user_id);

  insert into notes (project_id, title, content, created_by) values
    (demo_project_id, 'Ý tưởng project', 'Các chức năng cần hoàn thiện: đặt vé online, chọn ghế, thanh toán, gửi email xác nhận.', demo_user_id);

  raise notice 'Seed data created. Project password is: demo1234';
end $$;
