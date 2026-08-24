# 人脉知识库系统 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 项目脚手架与数据库设计
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 初始化 monorepo 目录结构：/client（React Vite 项目）+ /server（Node.js Express 项目）+ /data（SQLite 数据库文件存储）
  - 配置 package.json 根脚本：npm run dev 同时启动前后端，npm run build 构建前端到后端 public 目录
  - 设计并创建 SQLite 数据库表结构：persons（人物表）、tags（标签表）、person_tags（人物标签多对多）、relationships（关系表）、interactions（互动记录表）、interaction_todos（互动待办）、opportunities（业务机会表，预留）、users（用户表），共 8 张表
  - 编写数据库初始化脚本：首次启动自动建表 + 插入默认标签数据 + 引导设置管理员账号密码
  - 编写数据库种子脚本：插入 30 条示例人物、若干关系和互动记录，便于开发调试
- **Acceptance Criteria Addressed**: AC-1, AC-8
- **Test Requirements**:
  - programmatic TR-1.1: 执行 node server/init-db.js 成功生成 data/app.db 文件，所有表创建成功
  - programmatic TR-1.2: 执行 node server/seed.js 后，persons 表至少有 30 条数据，relationships 表至少有 40 条关系
  - human-judgement TR-1.3: 目录结构清晰，README 说明启动命令，代码无明显语法错误
- **Notes**: 关系表 relationships 字段：id, person_a_id, person_b_id, relation_type, strength(1-5), introduced_by(可选，引荐人ID), created_at。这是图谱功能的核心表。

## [x] Task 2: 后端 API 基础层与认证
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 搭建 Express 服务：跨域、JSON 解析、静态文件托管、统一错误处理中间件、请求日志中间件
  - 封装 SQLite DB 模块：统一的 query 方法、事务包装、SQL 参数化防注入
  - 认证模块：bcryptjs 密码加密、JWT Token 签发与验证（express-jwt 中间件）、登录接口 POST /api/auth/login
  - 账号初始化流程：GET /api/auth/status 检查是否已初始化；未初始化时 POST /api/auth/init 设置管理员账号
  - 认证路由保护：除 /api/auth/* 外所有 /api 路由需携带有效 JWT
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - programmatic TR-2.1: 未登录请求 GET /api/persons 返回 401 状态码
  - programmatic TR-2.2: POST /api/auth/init（首次）成功创建用户后，再调用返回 400
  - programmatic TR-2.3: POST /api/auth/login 正确账号密码返回 token 和 user，错误密码返回 401
  - programmatic TR-2.4: 携带 Authorization: Bearer token 请求受保护接口正常通过
- **Notes**: JWT 有效期设为 7 天，配合前端 localStorage 持久化。

## [x] Task 3: 人物档案 CRUD 后端 API
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - GET /api/persons 列表接口：支持 query 参数 keyword（搜索）、tags（标签ID数组逗号分隔）、tagLogic（and/or）、intimacy（亲密度最小值）、city、company、sortBy（intimacy/last_interacted_at/created_at）、sortOrder、page、pageSize
  - GET /api/persons/:id 详情接口：返回人物基本信息 + 标签数组 + 最近互动时间 + 统计数据
  - POST /api/persons 新增接口：保存基本信息 + 批量关联标签
  - PUT /api/persons/:id 编辑接口：更新基本信息 + 全量替换标签关联
  - DELETE /api/persons/:id 删除接口：级联删除关系和互动
  - POST /api/persons/:id/avatar 头像上传接口：multer 处理文件，保存到 /server/uploads/avatars
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - programmatic TR-3.1: POST 新增人物（必填字段齐全）返回 201，GET 列表可查询到
  - programmatic TR-3.2: GET 列表 keyword 模糊搜索姓名/公司/职位正确
  - programmatic TR-3.3: GET 列表多标签 AND 逻辑筛选正确
  - programmatic TR-3.4: PUT 更新后 GET 详情字段变更正确
  - programmatic TR-3.5: DELETE 后 GET 列表不包含该人物
- **Notes**: 列表接口 SQL 查询优化，keyword 使用 LIKE，分页默认 pageSize=20。

## [x] Task 4: 标签与全局通用接口
- **Priority**: medium
- **Depends On**: Task 2
- **Description**:
  - GET /api/tags 获取所有标签列表
  - POST /api/tags 新增自定义标签
  - PUT /api/tags/:id 和 DELETE /api/tags/:id 编辑删除标签
  - GET /api/meta/stats 返回全局统计：总人数、标签分布、近30天互动数
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - programmatic TR-4.1: GET /api/tags 返回至少 8 个默认标签
  - programmatic TR-4.2: POST 新增标签成功后 GET 列表包含
  - programmatic TR-4.3: 删除标签后，关联的 person_tags 对应行同步删除

## [ ] Task 5: 前端项目初始化与布局框架
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 使用 Vite 创建 React 18 项目，配置路径别名 @
  - 安装并配置 Ant Design 5：自定义主题色（蓝紫系主色 #5B6CFF）、全局重置样式
  - 安装 React Router 6、Zustand、Axios、dayjs、echarts、echarts-for-react
  - 封装 Axios 实例：统一 baseURL、请求拦截带 JWT、401 自动跳转登录页、统一错误 toast
  - 搭建整体布局：左侧菜单栏（Logo + 导航 + 版本号）+ 顶部搜索条 + 内容区 + 移动端汉堡菜单抽屉
  - 路由页面骨架：/login、/dashboard、/persons、/persons/:id、/graph、/import、/settings
  - 登录页：未初始化显示设置管理员表单，已初始化显示登录表单
  - 左上角 Logo 下方显示版本号 V1.0.0
- **Acceptance Criteria Addressed**: AC-7, AC-8, NFR-1
- **Test Requirements**:
  - human-judgement TR-5.1: 桌面端三栏布局对齐整齐，无错乱
  - human-judgement TR-5.2: 手机 375px 侧栏收起为汉堡抽屉，内容单列
  - programmatic TR-5.3: 未登录访问受保护路由重定向到 /login
  - human-judgement TR-5.4: UI 浅色简洁风，留白适中，卡片阴影柔和
- **Notes**: Zustand authStore 管理登录态持久化 localStorage。

## [ ] Task 6: 人物列表页与筛选
- **Priority**: high
- **Depends On**: Task 3, Task 5
- **Description**:
  - 顶部全局搜索框 + 筛选区域（标签多选 + AND/OR 切换 + 亲密度筛选 + 公司/城市 + 重置）+ 排序
  - 卡片网格布局：桌面 3-4 列、平板 2 列、手机 1 列
  - 人物卡片：首字母头像 + 姓名 + 公司职位 + 亲密度星 + 标签 chips + 最近联系 + 操作按钮
  - 底部分页器，支持每页 10/20/50
  - 右上角新增人物主按钮打开抽屉 Modal
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-7
- **Test Requirements**:
  - programmatic TR-6.1: 多标签筛选 + 亲密度筛选参数正确传递给 API
  - human-judgement TR-6.2: 三端断点下卡片列数自适应，无横向滚动
  - programmatic TR-6.3: 搜索输入防抖 300ms 后请求，列表更新
  - human-judgement TR-6.4: 新增人物表单分区块，填写流畅

## [ ] Task 7: 人物详情页与互动记录
- **Priority**: high
- **Depends On**: Task 3, Task 6
- **Description**:
  - 详情页顶部：大头像 + 姓名职位 + 亲密度 + 编辑/删除/返回
  - 基本信息分区卡片：基础信息、联系方式、资源描述、需求描述、私域备注
  - 关系网络区：直接关系列表（关系类型 + 对方 + 引荐人）+ 添加关系按钮
  - 互动时间线：Timeline 组件，方式图标 + 日期 + 内容 + 待办勾选
  - 新增互动抽屉：日期、方式、内容、动态待办列表
  - 编辑互动 + 删除二次确认
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - programmatic TR-7.1: 新增互动后时间线顶部立即出现新记录
  - programmatic TR-7.2: 待办勾选完成持久化，刷新后保持
  - human-judgement TR-7.3: 时间线样式美观，层级清晰，图标区分互动方式
  - programmatic TR-7.4: 所有字段正确显示，编辑保存后刷新变更持久

## [x] Task 8: 关系管理后端 API 和图谱数据接口
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - POST /api/relationships 新增关系
  - GET /api/persons/:id/relationships 获取某个人所有直接关系
  - DELETE /api/relationships/:id 删除关系
  - GET /api/graph/:centerId?depth=2 图谱核心接口：返回 nodes 和 links，去重
  - GET /api/graph/random 随机返回有连接的中心人物
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - programmatic TR-8.1: 新增关系后双方 relationships 接口都返回对方
  - programmatic TR-8.2: 图谱 depth=2 节点去重，links source/target 对应存在
  - programmatic TR-8.3: 设置 introduced_by 的关系返回包含引荐人信息
- **Notes**: 性能关键，5000 人 depth=2 需在 500ms 内返回。

## [ ] Task 9: 关系图谱可视化页面
- **Priority**: high
- **Depends On**: Task 5, Task 8
- **Description**:
  - 顶部工具栏：中心人物搜索选择 + 深度切换 + 全屏 + 重置 + 图例
  - ECharts Graph 力导向布局，repulsion/edgeLength/gravity 参数调优
  - 节点：按主标签颜色（10 色板），symbolSize=30+intimacy*8，中心人物特殊高亮
  - 连线：strength 越高线越粗；引荐关系虚线带箭头
  - 交互：tooltip 显示摘要，单击弹出菜单（查看详情/设为中心），双击跳转详情
  - 滚轮缩放、画布拖拽平移、节点可单独拖拽固定
- **Acceptance Criteria Addressed**: AC-3, AC-10
- **Test Requirements**:
  - human-judgement TR-9.1: 100 节点图谱节点无重叠、连线清晰、颜色差异明显
  - human-judgement TR-9.2: 单击和双击节点交互都执行正确
  - human-judgement TR-9.3: 深度 1 到 2 切换布局不崩溃，重置恢复初始
  - human-judgement TR-9.4: 全屏模式充满屏幕，工具栏可用
- **Notes**: 先用种子数据调好力导向布局参数。

## [ ] Task 10: 首页 Dashboard 与提醒
- **Priority**: medium
- **Depends On**: Task 3, Task 5
- **Description**:
  - GET /api/dashboard/summary 返回：近期生日、超期未联系、未完成待办、最近互动
  - 顶部 4 个统计卡：总人数、本周互动、待办、高危未联系
  - 近期生日：30 天内排序显示，倒计时天数
  - 超期未联系：按亲密度排序，点击跳转详情
  - 待办事项汇总：可直接勾选完成
  - 最近互动：14 天时间线
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - programmatic TR-10.1: Dashboard 接口 4 分组数据字段齐全
  - human-judgement TR-10.2: 统计卡片数字突出，配色和谐
  - programmatic TR-10.3: Dashboard 待办勾选同步更新 interaction_todos
  - human-judgement TR-10.4: 生日倒计时今天/明天/N天后显示醒目

## [ ] Task 11: Excel/CSV 导入导出功能
- **Priority**: high
- **Depends On**: Task 3, Task 5
- **Description**:
  - 后端安装 xlsx 和 multer
  - GET /api/import/template 下载标准模板 Excel
  - POST /api/import/preview 解析上传文件，返回前 20 行 + 列名 + cacheId
  - POST /api/import/execute 执行导入，返回报告（成功/跳过/失败）
  - 前端导入向导 4 步：下载和上传 -> 预览和映射 -> 选策略 -> 报告
  - GET /api/export/persons 和 /api/export/interactions 导出接口
  - 列表页导出按钮，设置页导入入口
- **Acceptance Criteria Addressed**: AC-6, AC-9
- **Test Requirements**:
  - programmatic TR-11.1: 下载模板 Excel 可正常打开，包含所有列
  - programmatic TR-11.2: 上传 50 行文件 preview 返回前 20 行正确
  - programmatic TR-11.3: 重复策略 skip：5 条重复导入报告成功 45 跳过 5
  - programmatic TR-11.4: 导出人物文件未修改重新上传，字段自动映射成功
- **Notes**: 重复检测：姓名+电话完全一致。导入用事务，失败回滚。

## [ ] Task 12: 设置页与数据备份
- **Priority**: medium
- **Depends On**: Task 2, Task 5
- **Description**:
  - 修改管理员账号密码
  - 数据管理：手动备份（下载 .db）、恢复备份（上传覆盖）、清空数据（输入密码二次确认）
  - 标签管理：独立增删改界面
  - 提醒设置：生日提前天数、久未联系阈值自定义（config 表）
  - 关于：版本号 V1.0.0、技术栈说明
- **Acceptance Criteria Addressed**: NFR-3
- **Test Requirements**:
  - programmatic TR-12.1: 备份下载文件大小与 data/app.db 一致
  - programmatic TR-12.2: 改密码后旧密码失败新密码成功
  - human-judgement TR-12.3: 清空数据红色警告 + 密码确认弹窗
  - programmatic TR-12.4: 修改阈值后 Dashboard 数据同步变化

## [ ] Task 13: 整体联调、性能优化与兼容测试
- **Priority**: high
- **Depends On**: Task 1-12 全部完成
- **Description**:
  - 全流程冒烟测试：初始化 -> 新增和导入 -> 建关系 -> 图谱 -> 互动 -> Dashboard -> 导出备份
  - 性能测试：5000 人、10000 关系、20000 互动，列表加载 <1s，图谱 depth=2 <2s
  - 响应式测试：375/768/1280 三档宽度逐页检查
  - 浏览器兼容：Chrome/Edge/Safari 最新版核心功能
  - 代码审查：移除 console.log、补注释、ESLint+Prettier 统一风格
  - 编写启动 README：Win/Mac 步骤、FAQ
- **Acceptance Criteria Addressed**: AC-1 至 AC-10 全量
- **Test Requirements**:
  - programmatic TR-13.1: 5000 人列表首屏 <1000ms
  - human-judgement TR-13.2: 三端断点无错位无横向滚动无遮挡
  - programmatic TR-13.3: 冒烟全流程无接口报错无白屏
  - human-judgement TR-13.4: README 清晰，10 分钟内能启动

## [ ] Task 14: 版本号更新与产品收尾
- **Priority**: low
- **Depends On**: Task 13
- **Description**:
  - 顶部 Logo 下方版本号更新为 V1.0.0
  - 整理目录，清理临时文件
  - 最终构建 npm run build + npm run preview 验证
- **Acceptance Criteria Addressed**: 版本号显示偏好
- **Test Requirements**:
  - human-judgement TR-14.1: 左上角 Logo 下方清晰显示 V1.0.0
  - programmatic TR-14.2: 生产构建成功无报错




