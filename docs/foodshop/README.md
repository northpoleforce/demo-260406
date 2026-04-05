# 文档导航

本目录是项目文档中台：集中放架构、接口、开发、部署、测试与排障文档。

## 核心专题（先读）

1. `architecture-overview.md`：系统边界、组件职责、关键数据流
2. `api-reference.md`：REST/WS 契约、鉴权与错误码
3. `development-guide.md`：本地开发与联调
4. `deployment-runbook.md`：部署、回滚与配置项
5. `testing-strategy.md`：测试分层、执行命令和门禁
6. `troubleshooting.md`：高频故障与恢复路径

## 决策与规划（设计输入）

- `architecture-decision.md`：架构选型记录（ADR）
- `solution1-technical-blueprint.md`：方案1技术蓝图
- `solution1-6week-delivery-plan.md`：方案1六周执行计划

## 读取顺序

1. `architecture-overview.md`
2. `api-reference.md`
3. `development-guide.md`
4. `deployment-runbook.md`
5. `testing-strategy.md`
6. `troubleshooting.md`
7. 再按需查看 ADR 与执行计划

## 维护约定

- 同一主题仅保留一个权威文档，其他文档仅链接引用
- 接口变更时必须同步更新 `api-reference.md`
- 部署参数变更时必须同步更新 `deployment-runbook.md`
- 模块 README 只保留入口和操作，不重复专题全文
