# 人脉知识库系统 - Verification Checklist

## 基础设施与数据库

- [x] Checkpoint 1: npm run dev 启动前后端，前端 5173、后端 3001 端口均正常访问
- [x] Checkpoint 2: 数据库初始化成功，data/app.db 生成，7+ 张核心表存在
- [x] Checkpoint 3: 种子脚本执行后 persons>=30 条，relationships>=40 条，API 可查

## 认证与安全

- [x] Checkpoint 4: 首次访问显示初始化管理员页，设置后跳转登录
- [x] Checkpoint 5: 未登录访问 /dashboard /persons 重定向到 /login
- [x] Checkpoint 6: 无 Token 调用受保护 API 返回 401
- [x] Checkpoint 7: 错误密码提示，正确密码登录后 Token 存 localStorage，7 天免登录
- [x] Checkpoint 8: 退出登录清除 Token，再次访问需重新登录

## 人物档案管理

- [x] Checkpoint 9: 新增人物必填字段校验，保存后列表立即显示
- [x] Checkpoint 10: 编辑人物保存后刷新页面变更持久化
- [x] Checkpoint 11: 删除人物二次确认，级联清除关系和互动
- [x] Checkpoint 12: 详情页 5 大分区所有字段正确展示
- [x] Checkpoint 13: 上传 JPG/PNG 头像显示正常，删除不影响他人

## 筛选、搜索与排序

- [ ] Checkpoint 14: 搜索姓名/公司/职位中文模糊匹配正确
- [ ] Checkpoint 15: 标签多选用 AND 逻辑，返回同时含所有选中标签的人
- [ ] Checkpoint 16: 亲密度筛选（intimacy>=3）结果正确
- [ ] Checkpoint 17: 三种排序（亲密度/最近联系/创建时间）切换正确
- [ ] Checkpoint 18: 分页超过 20 条显示分页器，页码和每页数量切换正确
- [ ] Checkpoint 19: 重置筛选按钮一键清空条件恢复全量

## 关系管理

- [x] Checkpoint 20: 详情页添加关系，双方关系列表都显示
- [x] Checkpoint 21: 关系类型覆盖默认选项，引荐关系可填写引荐人
- [x] Checkpoint 22: 删除关系后双方列表同步移除
- [x] Checkpoint 23: GET /api/graph/:id depth=2 返回节点去重，links 来源目标都存在于 nodes

## 关系图谱可视化

- [ ] Checkpoint 24: 图谱页默认渲染节点和连线，无白屏报错
- [ ] Checkpoint 25: 节点按标签分至少 5 种颜色，大小与亲密度正相关
- [ ] Checkpoint 26: 中心人物特殊高亮与普通节点视觉区分
- [ ] Checkpoint 27: 强关系线更粗，引荐关系虚线带箭头
- [ ] Checkpoint 28: 悬停节点 tooltip 显示姓名/公司/职位/亲密度，信息完整
- [ ] Checkpoint 29: 单击节点弹出操作菜单（查看详情/设为中心），双击直接跳转详情页，均正常
- [ ] Checkpoint 30: 深度 1 切换到 2 节点数量变化正确，布局自动计算不崩溃
- [ ] Checkpoint 31: 滚轮缩放、画布平移、拖拽单节点操作流畅（响应 <= 300ms）
- [ ] Checkpoint 32: 全屏按钮切换全屏模式，重置布局按钮恢复初始位置
- [ ] Checkpoint 33: 搜索框切换图谱中心人物后，旧节点数据不残留

## 互动记录

- [ ] Checkpoint 34: 新增互动记录后时间线顶部立即出现新记录
- [ ] Checkpoint 35: 6 种互动方式（微信/电话/面谈/饭局/活动/其他）各有不同图标或颜色区分
- [ ] Checkpoint 36: 互动待办勾选完成状态持久化，刷新页面后保持
- [ ] Checkpoint 37: 时间线按日期倒序排列，日期显示清晰
- [ ] Checkpoint 38: 编辑互动记录和删除互动记录功能正常，删除有二次确认
- [ ] Checkpoint 39: 新增互动记录后，列表页该人物的最近联系时间更新为最新日期

## 首页 Dashboard

- [ ] Checkpoint 40: 顶部 4 个统计卡片（总人数/本周新增互动/待办待处理/超期未联系高危数）数字与实际一致
- [ ] Checkpoint 41: 近期生日模块 30 天内过生日人物按日期升序展示，倒计时天数显示正确（今天/明天/N天后）
- [ ] Checkpoint 42: 超期未联系模块按亲密度从高到低排序，点击跳转对应详情页
- [ ] Checkpoint 43: 待办事项模块汇总所有未完成待办，勾选后同步更新数据库状态
- [ ] Checkpoint 44: 最近互动模块显示近 14 天互动，与详情页数据一致
- [ ] Checkpoint 45: 数据为 0 时，各模块显示友好的空状态，不报错不空白

## Excel / CSV 导入导出

- [ ] Checkpoint 46: 下载导入模板 Excel 可正常打开，列名完整（姓名/电话/微信/邮箱/生日/城市/公司/职位/标签/亲密度/资源描述/需求描述/备注等 13+ 列）
- [ ] Checkpoint 47: 上传文件后 Step2 预览前 20 行数据内容和列名正确显示
- [ ] Checkpoint 48: 字段映射：默认列名自动匹配，不匹配列可手动下拉选择对应系统字段
- [ ] Checkpoint 49: 三种重复策略（Skip/Overwrite/Duplicate）都可选择并实际生效
- [ ] Checkpoint 50: 导入结果报告显示成功数/跳过数/失败数，失败记录有具体原因说明
- [ ] Checkpoint 51: 导入事务安全：中途某行失败时，已导入的行全部回滚，不产生部分成功脏数据
- [ ] Checkpoint 52: 导出人物 Excel 列名与模板一致，未修改的导出文件再次上传可自动映射成功导入
- [ ] Checkpoint 53: 导出互动 Excel 包含互动日期、方式、内容、关联人物等核心字段

## 设置与数据备份

- [ ] Checkpoint 54: 修改管理员密码：需正确的旧密码 + 两次一致的新密码，修改后旧密码登录失败
- [ ] Checkpoint 55: 标签管理页新增/编辑/删除标签功能正常，删除标签后对应人物的标签关联同步清除
- [ ] Checkpoint 56: 修改生日提前天数或久未联系阈值后，Dashboard 对应数据同步变化
- [ ] Checkpoint 57: 手动备份下载的 .db 文件大小与 data/app.db 完全一致
- [ ] Checkpoint 58: 恢复备份上传 .db 文件后数据还原（显示有风险提示）
- [ ] Checkpoint 59: 清空所有数据：有红色警告提示 + 输入账号密码二次确认，确认后数据清空恢复初始空库
- [ ] Checkpoint 60: 关于页面显示系统版本号 V1.0.0 和技术栈说明

## UI / UX 与响应式

- [ ] Checkpoint 61: 页面左上角 Logo 下方清晰显示版本号 V1.0.0
- [ ] Checkpoint 62: 桌面端 1280px+ 三栏布局（侧栏+顶栏+内容）导航切换正常
- [ ] Checkpoint 63: 平板端 768px 宽度下列表卡片为 2 列，无横向滚动条
- [ ] Checkpoint 64: 手机端 375px 宽度下侧栏收起为汉堡菜单抽屉，列表卡片 1 列，表单适配键盘弹出
- [ ] Checkpoint 65: UI 整体为现代简洁浅色风，蓝紫主色调 #5B6CFF，留白适中，卡片阴影柔和
- [ ] Checkpoint 66: 所有表单提交有 loading 状态和成功/失败 toast，删除等高危操作有 Modal 二次确认
- [ ] Checkpoint 67: 页面切换和骨架屏 loading 流畅，无突兀白屏闪烁
- [ ] Checkpoint 68: 移动端快速录入体验：从点击新增到保存一个基础人物（姓名+电话+标签+备注）时间 <= 30 秒

## 性能与构建

- [ ] Checkpoint 69: 5000 条人物数据场景下，列表接口响应 + 前端渲染合计 <= 1000ms
- [ ] Checkpoint 70: 5000 人场景 depth=2 图谱接口响应 <= 500ms，前端 ECharts 渲染完成 <= 2000ms
- [ ] Checkpoint 71: npm run build 生产构建成功无报错，构建产物可正常启动运行
- [ ] Checkpoint 72: 项目根目录 README.md 文档齐全，包含环境要求（Node 18+）、安装步骤、启动命令、常见问题 FAQ

## 端到端冒烟

- [ ] Checkpoint 73: 初始化管理员 -> 新增 3 个（A、B、C）人物 -> 建立 A-B 大学同学关系、B-C 引荐关系 -> 图谱页选择 A 为中心可看到 3 人完整链路
- [ ] Checkpoint 74: 打开 A 详情页新增 2 条互动记录（其中 1 条带 2 个待办事项）-> 时间线显示正确 + Dashboard 待办模块显示 2 条未完成待办
- [ ] Checkpoint 75: 下载导入模板 -> 手动填写 5 条人物数据 -> 导入向导 4 步走完 -> 报告显示成功 5 条 -> 列表搜索能找到这 5 人
- [ ] Checkpoint 76: 导出全部人物 Excel -> 使用清空数据功能（密码确认）-> 重新导入刚才导出的 Excel -> 人物数据恢复
- [ ] Checkpoint 77: 切换到手机视口（375px 宽度）-> 快速新增 1 个人物 -> 打开图谱查看 -> 全程无报错无白屏



