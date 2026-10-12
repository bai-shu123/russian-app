# 主动训练部署

主动训练是增量功能，不会清空现有账号、反馈、生词本或学习进度。

1. 先在 Supabase SQL Editor 执行现有的 `supabase-schema.sql` 与 `admin-setup.sql`。
2. 再执行 `training-schema.sql`，创建题库、版本、作答、掌握度、集合、AI 额度和审计表。
3. 部署 Edge Function：`supabase functions deploy judge-answer`。
4. 设置服务端密钥：`supabase secrets set OPENAI_API_KEY=...`。可选设置 `OPENAI_JUDGE_MODEL`；密钥不得放在 `supabase-config.js` 或其他前端文件。
5. 首次发布可运行 `node tools/generate-training-seed.js`，再通过 `supabase db query --linked --file supabase/.temp/training-seed.sql` 发布第二册前 60 道题；重复执行不会覆盖已存在题目。也可由管理员进入“后台管理 → 主动训练题库”审核并发布教材草稿。
6. 网页部署直接发布根目录静态文件；Capacitor 构建前执行 `node tools/prepare-capacitor.js`。

AI 关闭、达到每日调用上限、达到月度费用上限或服务不可用时，答案会降级为“待复核”，不会降低掌握度。训练主体仍可离线使用，联网后自动同步作答和掌握度。
