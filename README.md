# 人脉知识库系统（个人版 CRM + 关系网络图谱）

## V1.0.0

### 技术栈

- 前端：React 18 / Ant Design 5 / ECharts Graph
- 后端：Node.js Express
- 数据库：SQLite (better-sqlite3)

### 环境要求

- Node.js >= 18

### 快速启动（3 步）

1. **安装依赖**（根目录执行）：
   ```
   npm run install:all
   ```

2. **初始化数据库**：
   ```
   npm --prefix server run init-db
   ```

3. **启动开发**：
   ```
   npm run dev
   ```
   首次启动前端后打开浏览器 http://localhost:5173 ，先设置管理员账号。

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前端和后端开发服务 |
| `npm --prefix server run init-db` | 初始化数据库（建表 + 默认标签/配置） |
| `npm --prefix server run seed` | 填充示例种子数据 |
| `npm run build` | 构建前端生产版本 |
| `npm run preview` | 启动后端生产服务 |

### 目录结构

- `client/`：React 前端项目（Vite）
- `server/`：Node.js 后端项目（Express + SQLite）
- `data/`：SQLite 数据库文件存放目录

### FAQ

**Q1: 数据库文件在哪？怎么备份？**

A1: 在 `data/app.db`，直接复制该文件即可备份，后续设置页也提供一键下载备份。

---

**Q2: 忘记管理员密码怎么办？**

A2: 删除 `data/app.db` 重新初始化（会清空所有数据，谨慎），或手动用 SQLite 工具更新 `users` 表 `password_hash`。
