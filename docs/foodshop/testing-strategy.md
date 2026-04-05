# Testing Strategy

## 适用范围

本文定义本项目测试分层、执行命令与最低通过标准。

## 测试分层

1. **Backend 单元测试**
   - 位置：`backend/app/tests/unit/`
   - 覆盖：状态机、订单服务核心逻辑
2. **Backend 集成测试**
   - 位置：`backend/app/tests/integration/`
   - 覆盖：API 与存储交互
3. **Frontend 构建验证**
   - 位置：`kitchen-tablet/`
   - 覆盖：TypeScript 编译与产物构建

## 执行命令

### Backend

```bash
cd backend
python3 -m pytest -q
```

### Frontend

```bash
cd kitchen-tablet
npm run build
```

## 质量门禁

- backend 测试无失败
- frontend 构建成功
- 文档改动不引入失效链接（手动抽查 docs 导航）

## 文档一致性校验（文档改动时）

1. 接口路径与 `backend/app/api/*.py` 保持一致
2. 环境变量命名与 `.env.example`、`backend/app/infra/settings.py` 保持一致
3. 版本信息与 `package.json`、`pyproject.toml` 保持一致

## 常见失败与处理

- `ModuleNotFoundError`：Python 依赖未安装
- `invalid transition`：测试用例状态迁移不合法
- TypeScript 报错：前端接口类型与后端响应不一致

## 关联文档

- `docs/development-guide.md`
- `docs/api-reference.md`
