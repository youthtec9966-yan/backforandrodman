# 管理端 API 接口使用说明

## 1. 文档目的

本文档说明 `d:\code\code_android_siberman\assets\admin\blhbf` 这个管理端项目当前已经提供的 API 接口，重点回答：

- 每个接口是做什么的
- 请求方法和路径是什么
- 请求参数怎么传
- 返回结构大致是什么
- 典型业务流程应该怎么串起来调用

本文档基于当前项目源码整理，适合：

- Web 管理端前端联调
- App 端对接激活与配置同步
- 知识库上传/构建联调
- Live2D 模型管理与预览联调

## 2. 基础约定

### 2.1 Base URL

开发环境默认是 Next.js 本地服务地址，例如：

```text
http://localhost:3000
```

所有接口都挂在：

```text
/api/*
```

### 2.2 统一返回格式

接口统一通过 `ok()` / `fail()` 返回 JSON。

成功时：

```json
{
  "ok": true,
  "data": {}
}
```

失败时：

```json
{
  "ok": false,
  "error": {
    "message": "错误信息",
    "httpStatus": 400
  }
}
```

说明：

- `ok`：是否成功
- `data`：成功返回体
- `error.message`：可直接展示给调用方的错误文案
- `error.httpStatus`：部分错误会携带 HTTP 状态码

### 2.3 运行时说明

当前路由基本都声明为：

```ts
export const runtime = "nodejs";
```

也就是说这些接口依赖 Node.js 运行时，不是 Edge Route。

## 3. 接口总览

当前接口大致分成 6 类：

1. 环境与初始化
2. 数字人角色管理
3. 角色运营数据管理
4. App 激活与配置同步
5. 百炼知识库与文件任务
6. Live2D 模型与播放器资源

## 4. 环境与初始化接口

### 4.1 获取服务端配置状态

- 方法：`GET`
- 路径：`/api/config/status`
- 用途：检查百炼服务端环境变量是否已配置好

成功返回示例：

```json
{
  "ok": true,
  "data": {
    "ready": true,
    "endpoint": "bailian.cn-beijing.aliyuncs.com",
    "workspaceIdMasked": "wsab***1234",
    "missing": []
  }
}
```

字段说明：

- `ready`：是否已具备调用百炼接口的条件
- `endpoint`：当前百炼 endpoint
- `workspaceIdMasked`：脱敏后的 workspaceId
- `missing`：缺失的环境变量列表

适用场景：

- 管理端首页加载时检测后端是否可用
- 运维排查 `.env.local` 是否缺失关键配置

## 5. 数字人角色管理接口

这一组接口负责角色本身和其主配置版本。

### 5.1 获取数字人列表

- 方法：`GET`
- 路径：`/api/digital-humans`
- 用途：获取所有数字人角色基础信息列表

调用示例：

```bash
curl http://localhost:3000/api/digital-humans
```

### 5.2 创建数字人

- 方法：`POST`
- 路径：`/api/digital-humans`
- 用途：创建一个角色，并可选地同时创建初始配置、交互配置、固定问答

请求体主要字段：

```json
{
  "code": "police-001",
  "name": "大厅警官",
  "sceneType": "公安政务大厅",
  "assistantName": "小鹿警官",
  "description": "大厅默认角色",
  "status": "draft",
  "initialConfig": {
    "live2dModelPath": "yange/yange.model3.json",
    "systemPrompt": "你是大厅数字人",
    "openingMessage": "你好，请问有什么可以帮您？",
    "wakeWordEnabled": true,
    "wakeWordText": "小鹿警官"
  },
  "initialInteraction": {
    "openingMessages": ["你好，请问有什么可以帮您？"],
    "wakeWords": ["小鹿警官"],
    "interruptWords": ["停一下"],
    "standbyCommands": [],
    "fallbackMessages": []
  },
  "fixedQaItems": [
    {
      "question": "身份证在哪里办理？",
      "answer": "请到一楼户政窗口办理。",
      "status": "enabled"
    }
  ]
}
```

说明：

- `code`、`name` 必填
- `initialConfig`、`initialInteraction`、`fixedQaItems` 选填
- 成功时返回新建的数字人基础信息，HTTP 状态为 `201`

### 5.3 获取单个数字人

- 方法：`GET`
- 路径：`/api/digital-humans/:id`
- 用途：按角色 ID 读取基础信息

失败场景：

- 角色不存在时返回 `404`

### 5.4 更新数字人基础信息

- 方法：`PUT`
- 路径：`/api/digital-humans/:id`
- 用途：修改角色名称、场景、状态、描述等基础信息

请求体示例：

```json
{
  "name": "石拐公安图警官",
  "assistantName": "石拐公安图警官",
  "status": "enabled",
  "description": "大厅正式角色"
}
```

说明：

- `code` 不在更新接口中修改
- 成功返回更新后的角色记录

### 5.5 删除数字人

- 方法：`DELETE`
- 路径：`/api/digital-humans/:id`
- 用途：删除角色及其关联 bundle 数据

成功返回示例：

```json
{
  "ok": true,
  "data": {
    "id": "xxx",
    "deleted": true
  }
}
```

### 5.6 获取当前配置

- 方法：`GET`
- 路径：`/api/digital-humans/:id/config`
- 用途：读取角色当前正在使用的配置版本

成功返回示例：

```json
{
  "ok": true,
  "data": {
    "digitalHuman": {},
    "configVersion": {},
    "config": {}
  }
}
```

说明：

- `digitalHuman`：角色基础信息
- `configVersion`：当前版本元数据
- `config`：当前版本内的具体配置内容

### 5.7 新建一版配置

- 方法：`PUT`
- 路径：`/api/digital-humans/:id/config`
- 用途：保存新的配置版本

请求体字段来自 `digitalHumanConfigSchema`，主要包含：

- `dashscopeApiKey`
- `baseUrl`
- `llmModel`
- `asrModel`
- `ttsModel`
- `ttsVoice`
- `systemPrompt`
- `prefixPrompt`
- `openingMessage`
- `live2dModelPath`
- `knowledgeBaseIndexId`
- `selectedFixedQaIds`
- `wakeWordEnabled`
- `wakeWordText`
- `videoItems`
- `videoLoopMode`
- `videoOrientation`
- `weatherCity`
- `fontScale`
- `modelScale`
- `wakeWordHintOffsetDp`
- `frontCameraRotationDegrees`
- `frontCameraDiameterDp`
- `remark`

说明：

- 这是“保存版本”的接口，不是原地覆盖数据库某一行
- 成功时返回新的配置版本记录，HTTP 状态为 `201`

### 5.8 获取配置版本历史

- 方法：`GET`
- 路径：`/api/digital-humans/:id/config/versions`
- 用途：查看角色所有配置版本

成功返回示例：

```json
{
  "ok": true,
  "data": {
    "digitalHuman": {},
    "versions": []
  }
}
```

## 6. 角色运营数据接口

这一组接口挂在 `/api/digital-humans/:id/*` 下，负责角色的交互、问答、热词、设备、激活码、发布记录等。

### 6.1 交互设置

- `GET /api/digital-humans/:id/interaction`
- `PUT /api/digital-humans/:id/interaction`

请求体结构：

```json
{
  "openingMessages": ["你好，请问有什么可以帮您？"],
  "wakeWords": ["小鹿警官", "警官"],
  "standbyCommands": ["请靠近一点，我可以为您介绍办事流程。"],
  "interruptWords": ["停一下", "等一下"],
  "fallbackMessages": ["这个问题我再帮您换一种方式查询。"]
}
```

用途：

- 管理角色级交互文案
- 管理唤醒词、打断词、待机提示语等

### 6.2 固定问答

- `GET /api/digital-humans/:id/qa`
- `PUT /api/digital-humans/:id/qa`

请求体结构：

```json
{
  "items": [
    {
      "id": "optional-id",
      "question": "身份证在哪里办理？",
      "answer": "请到一楼户政窗口办理。",
      "status": "enabled"
    }
  ]
}
```

说明：

- `status` 可选值：`enabled` / `pending` / `disabled`

### 6.3 FAQ

- `GET /api/digital-humans/:id/faq`
- `PUT /api/digital-humans/:id/faq`

请求结构与固定问答相同，区别只在数据含义：

- `qa` 更偏“固定问答池”
- `faq` 更偏角色 FAQ 列表

### 6.4 热词组

- `GET /api/digital-humans/:id/hotwords`
- `PUT /api/digital-humans/:id/hotwords`

请求体结构：

```json
{
  "groups": [
    {
      "id": "optional-id",
      "name": "业务热词",
      "words": ["身份证补办", "无犯罪记录证明"],
      "type": "business",
      "enabled": true
    }
  ]
}
```

字段说明：

- `type`：`business` / `campaign` / `sensitive`
- `enabled`：是否启用

### 6.5 设备绑定

- `GET /api/digital-humans/:id/devices`
- `PUT /api/digital-humans/:id/devices`

请求体结构：

```json
{
  "devices": [
    {
      "id": "optional-id",
      "deviceCode": "android-app-test-001",
      "deviceName": "大厅主屏",
      "bindStatus": "active",
      "appVersion": "1.0.0"
    }
  ]
}
```

说明：

- `bindStatus`：`active` / `inactive`

### 6.6 激活码管理

- `GET /api/digital-humans/:id/activation-codes`
- `POST /api/digital-humans/:id/activation-codes`

创建激活码请求体：

```json
{
  "deviceCode": "android-app-test-001",
  "deviceName": "大厅主屏",
  "remark": "一楼大屏"
}
```

用途：

- 为某角色生成一机一码激活码
- 查看该角色历史激活码记录

### 6.7 发布记录

- `GET /api/digital-humans/:id/publishes`
- `POST /api/digital-humans/:id/publishes`

创建发布记录请求体：

```json
{
  "summary": "更新开场白与固定问答",
  "publishScope": "all",
  "remark": "大厅版本 2026-06-26"
}
```

字段说明：

- `publishScope`：`all` / `partial`

用途：

- 管理端记录一次“发布动作”
- 给后续设备同步和版本追踪留痕

## 7. App 激活与配置同步接口

这组接口是给 Android App 直接调用的。

### 7.1 传统激活码验证

- 方法：`POST`
- 路径：`/api/activation-codes/verify`
- 用途：只做激活码验证

请求体：

```json
{
  "activationCode": "AA7W-RWS7",
  "deviceCode": "android-app-test-001",
  "deviceName": "大厅主屏",
  "appVersion": "1.0.0"
}
```

说明：

- 这是“验证接口”
- 返回的是激活结果相关信息，不是完整角色包

### 7.2 App 首次激活并获取完整配置

- 方法：`POST`
- 路径：`/api/app/activate`
- 用途：App 首次激活时直接获取完整角色配置包

请求体与 `activation-codes/verify` 相同：

```json
{
  "activationCode": "AA7W-RWS7",
  "deviceCode": "android-app-test-001",
  "deviceName": "大厅主屏",
  "appVersion": "1.0.0"
}
```

成功返回核心字段：

- `success`
- `digitalHumanId`
- `activation`
- `device`
- `rolePackage`

其中 `rolePackage` 包含：

- `version`
- `service`
- `role`
- `interaction`
- `content`

详细结构可参考现有文档：

- [App端激活与角色配置接口文档.md](file:///D:/code/code_android_siberman/assets/admin/blhbf/doc/App%E7%AB%AF%E6%BF%80%E6%B4%BB%E4%B8%8E%E8%A7%92%E8%89%B2%E9%85%8D%E7%BD%AE%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3.md)

### 7.3 App 按设备码拉取最新配置

- 方法：`POST`
- 路径：`/api/app/config`
- 用途：App 启动后或配置同步时按 `deviceCode` 拉取最新角色配置

请求体：

```json
{
  "deviceCode": "android-app-test-001"
}
```

成功返回：

- `success`
- `digitalHumanId`
- `device`
- `rolePackage`

适用时机：

- App 启动时
- App 回到前台时
- 手动点击“同步配置”时
- 服务端配置变更后轮询同步

## 8. 百炼知识库与文件接口

这一组接口用于百炼知识库管理、文件上传和检索联调。

### 8.1 获取知识库列表

- 方法：`GET`
- 路径：`/api/indices`
- 用途：列出当前 workspace 下的知识库

### 8.2 删除知识库

- 方法：`DELETE`
- 路径：`/api/indices/:indexId`
- 用途：删除指定知识库

### 8.3 获取知识库文档列表

- 方法：`GET`
- 路径：`/api/indices/:indexId/documents`
- 查询参数：
  - `pageNumber`
  - `pageSize`

示例：

```text
/api/indices/idx-001/documents?pageNumber=1&pageSize=100
```

### 8.4 删除知识库中的一个文档

- 方法：`DELETE`
- 路径：`/api/indices/:indexId/documents/:documentId`

### 8.5 检索测试

- 方法：`POST`
- 路径：`/api/retrieve`

请求体：

```json
{
  "indexId": "idx-001",
  "query": "身份证补办需要什么材料"
}
```

成功返回示例：

```json
{
  "ok": true,
  "data": {
    "requestId": "xxx",
    "nodes": [],
    "raw": {}
  }
}
```

说明：

- `nodes`：接口已经从百炼原始响应中抽出的节点列表
- `raw`：保留百炼原始返回，方便调试

## 9. 文件上传与任务接口

这一组接口对应“浏览器直传文件 -> 提交百炼 -> 建索引/追加文档任务”流程。

### 9.1 申请上传租约

- 方法：`POST`
- 路径：`/api/files/lease`

请求体：

```json
{
  "fileName": "办事指南.pdf",
  "md5": "xxxxxxxxxxxxxxxx",
  "sizeInBytes": 123456,
  "categoryId": "default"
}
```

说明：

- 会先校验文件名和大小是否合法
- 成功后返回百炼上传租约信息

### 9.2 提交文件

- 方法：`POST`
- 路径：`/api/files/commit`

请求体：

```json
{
  "leaseId": "lease-xxx",
  "categoryId": "default",
  "parser": "DASHSCOPE_DOCMIND"
}
```

成功返回示例：

```json
{
  "ok": true,
  "data": {
    "requestId": "xxx",
    "fileId": "file-xxx",
    "raw": {}
  }
}
```

说明：

- 文件真正完成对百炼的“注册”后，会得到 `fileId`
- 后续建索引或追加文档都要基于 `fileId`

### 9.3 创建“建知识库”任务

- 方法：`POST`
- 路径：`/api/tasks/create-index`

请求体：

```json
{
  "fileId": "file-xxx",
  "name": "大厅知识库",
  "description": "办事指南知识库"
}
```

说明：

- 接口会先创建本地任务记录
- 再异步推进：
  - 等待文件解析完成
  - 创建知识库
  - 提交建索引任务
  - 轮询任务结果

### 9.4 创建“追加文档”任务

- 方法：`POST`
- 路径：`/api/tasks/add-documents`

请求体：

```json
{
  "indexId": "idx-001",
  "fileId": "file-new",
  "oldFileId": "file-old"
}
```

说明：

- `oldFileId` 选填
- 如果传了，且追加成功，任务完成后会删除旧文档

### 9.5 获取任务列表

- 方法：`GET`
- 路径：`/api/tasks`
- 用途：获取最近任务列表

### 9.6 查询/推进单个任务

- 方法：`GET`
- 路径：`/api/tasks/:taskId`

说明：

- 这个接口不仅是“查任务”
- 它内部还会推进一次状态机
- 所以前端可以用轮询方式不断请求它，直到任务变成：
  - `completed`
  - `failed`

任务关键字段说明：

- `kind`：`create-index` / `add-documents`
- `status`：`running` / `completed` / `failed`
- `stage`：
  - `waiting_file_parse`
  - `creating_index`
  - `submitting_index_job`
  - `submitting_add_documents_job`
  - `waiting_index_job`
  - `deleting_old_document`
  - `completed`
  - `failed`

## 10. Live2D 资源接口

这一组接口给管理端页面提供模型选择、预览和静态资源读取能力。

### 10.1 获取模型列表

- 方法：`GET`
- 路径：`/api/live2d/models`

成功返回示例：

```json
{
  "ok": true,
  "data": [
    {
      "id": "yange",
      "name": "小鹿警官",
      "folderName": "yange",
      "modelPath": "yange/yange.model3.json",
      "previewUrl": "/api/live2d/preview?model=%2Fapi%2Flive2d%2Fmodel-files%2Fyange%2Fyange.model3.json&preview=1"
    }
  ]
}
```

### 10.2 获取预览 HTML

- 方法：`GET`
- 路径：`/api/live2d/preview`
- 用途：返回可直接嵌入 iframe 的 Live2D 预览页面 HTML

说明：

- 返回的不是 JSON，而是 `text/html`
- HTML 内部会把播放器依赖重写到 `/api/live2d/player-files/*`

### 10.3 获取模型资源文件

- 方法：`GET`
- 路径：`/api/live2d/model-files/:assetPath`
- 用途：按路径读取模型资源，例如 `.model3.json`、`.moc3`、贴图

示例：

```text
/api/live2d/model-files/yange/yange.model3.json
```

### 10.4 获取播放器静态资源

- 方法：`GET`
- 路径：`/api/live2d/player-files/:assetPath`
- 用途：返回 `pixi.min.js`、`cubism4.min.js` 等播放器文件

示例：

```text
/api/live2d/player-files/pixi.min.js
```

## 11. 推荐调用流程

### 11.1 管理端创建一个角色

推荐顺序：

1. `POST /api/digital-humans`
2. `PUT /api/digital-humans/:id/config`
3. `PUT /api/digital-humans/:id/interaction`
4. `PUT /api/digital-humans/:id/qa`
5. `PUT /api/digital-humans/:id/faq`
6. `PUT /api/digital-humans/:id/hotwords`

### 11.2 管理端绑定设备并生成激活码

推荐顺序：

1. `PUT /api/digital-humans/:id/devices`
2. `POST /api/digital-humans/:id/activation-codes`
3. App 侧调用 `POST /api/app/activate`

### 11.3 上传知识文件并建库

推荐顺序：

1. `POST /api/files/lease`
2. 浏览器直传文件到预签名地址
3. `POST /api/files/commit`
4. `POST /api/tasks/create-index`
5. 轮询 `GET /api/tasks/:taskId`
6. 完成后 `GET /api/indices` 查看知识库

### 11.4 向已有知识库追加文档

推荐顺序：

1. `POST /api/files/lease`
2. 直传文件
3. `POST /api/files/commit`
4. `POST /api/tasks/add-documents`
5. 轮询 `GET /api/tasks/:taskId`

### 11.5 App 拉配置

推荐顺序：

1. 首次激活：`POST /api/app/activate`
2. 后续同步：`POST /api/app/config`

## 12. 常见注意点

### 12.1 配置接口和交互接口不是一回事

- `/config` 负责模型、提示词、语音参数、知识库绑定等“运行配置”
- `/interaction` 负责开场白数组、唤醒词数组、打断词数组、待机文案等“交互内容”

### 12.2 任务接口是异步状态机

- `/api/tasks/create-index` 和 `/api/tasks/add-documents` 不会一步完成
- 真正的进度需要靠 `/api/tasks/:taskId` 轮询推进和读取

### 12.3 Live2D 预览接口返回的是 HTML

- `/api/live2d/preview` 不能按 JSON 解析
- 正确用法是直接放进 iframe 或浏览器打开

### 12.4 App 推荐走专用接口

给 Android App 用时，优先使用：

- `/api/app/activate`
- `/api/app/config`

不建议让 App 直接拼装调用管理端内部的角色运营接口。

## 13. 对应源码位置

主要 API 路由目录：

- [app/api](file:///D:/code/code_android_siberman/assets/admin/blhbf/app/api)

主要服务与校验文件：

- [api.ts](file:///D:/code/code_android_siberman/assets/admin/blhbf/src/lib/api.ts)
- [digitalHumanValidation.ts](file:///D:/code/code_android_siberman/assets/admin/blhbf/src/lib/digitalHumanValidation.ts)
- [digitalHumanOpsValidation.ts](file:///D:/code/code_android_siberman/assets/admin/blhbf/src/lib/digitalHumanOpsValidation.ts)
- [appDeviceService.ts](file:///D:/code/code_android_siberman/assets/admin/blhbf/src/lib/appDeviceService.ts)
- [tasks.ts](file:///D:/code/code_android_siberman/assets/admin/blhbf/src/lib/tasks.ts)
- [live2dAssets.ts](file:///D:/code/code_android_siberman/assets/admin/blhbf/src/lib/live2dAssets.ts)

