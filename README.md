# Equ_Base_Info · 低效淘汰设备库

基于《高耗能落后机电设备（产品）淘汰目录》全四批合并规则库（v1.3），面向建筑设备能效管理的 Vue 3 + Vite 应用。

> 本项目由原 React 18 + Babel CDN 单文件原型迁移而来，重构为 Vue 3（Composition API + `<script setup>`）多文件工程，CSS 与交互逻辑与原型保持一致。

## 技术栈

- **框架**：Vue 3（Composition API / `<script setup>`）
- **构建**：Vite 5
- **状态管理**：Pinia（设备 / 规则库 store，已预留，未来可接入更多模块）
- **HTTP**：Axios（含 `MOCK` 开关，后端未就绪时使用静态数据兜底）
- **样式**：原型 CSS 原样迁移（CSS 变量 + 全局组件类）

## 功能模块

| 模块 | 路径 | 说明 |
|---|---|---|
| 设备总览 | `src/components/overview/` | 设备统计、筛选、卡片列表 |
| 设备档案录入 | `src/components/archive/` | 4 步向导：基础信息（铭牌 OCR）→ 照片文档 → 运行数据接入 → 知识图谱融合 |
| 低效淘汰判定 | `src/components/judge/` | 6 态状态机：模式选择 → 已有设备/快速录入/批量导入 → 判定流水线动画 → 结果报告 |
| 规则库管理 | `src/components/rules/` | 规则筛选、分页表格、详情/编辑/新建表单 |

## 项目结构

```
src/
├── main.js                 # 入口：createApp + Pinia + 全局样式
├── App.vue                 # 顶层 Tab 路由壳
├── style/                  # 全局 CSS（变量 + 组件类）
├── data/                   # 静态数据（设备样例、规则库 v1.3）
├── utils/                  # 判定引擎、日志生成、格式化工具
├── api/                    # API 层（MOCK 开关 + axios）
├── stores/                 # Pinia stores
└── components/
    ├── common/             # AppIcon / TopBar / Breadcrumb
    ├── overview/           # 设备总览
    ├── archive/            # 设备档案录入向导
    ├── judge/              # 低效淘汰判定
    └── rules/              # 规则库管理
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产包
npm run build

# 预览生产构建
npm run preview
```

## 后端接入

所有数据请求集中在 `src/api/` 目录，通过 `src/api/config.js` 中的 `USE_MOCK` 开关控制：

```js
// src/api/config.js
export const USE_MOCK = true   // 改为 false 接入真实后端
export const BASE_URL = '/api'
```

`USE_MOCK = true` 时使用 `src/data/` 中的静态数据作为兜底；切换为 `false` 后，`src/api/devices.js` 与 `src/api/rules.js` 中的方法将通过 Axios 请求 `BASE_URL` 下的真实接口。

## 判定引擎

核心判定逻辑位于 `src/utils/judgeEngine.js`，按以下顺序对设备逐条比对规则库：

1. 一级类型匹配
2. 二级类型 / 产品名关键字匹配
3. 型号系列匹配
4. 规格区间校验（功率 / 容量 / 流量等）
5. 投运年份约束

最终输出四级判定结果：**正常 / 低效（鼓励替换） / 限期淘汰 / 强制淘汰**。
