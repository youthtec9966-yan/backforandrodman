# App端激活与角色配置接口文档

## 1. 文档说明

本文档用于说明数字人 App 与管理端的对接方式，覆盖以下两个接口：

- `POST /api/app/activate`
- `POST /api/app/config`

接口用途：

- 设备首次激活时，提交设备码和激活码，完成角色绑定并直接获取完整角色配置
- 设备后续启动、重连或主动同步时，按设备码重新拉取当前角色配置

统一返回格式：

```json
{
  "ok": true,
  "data": {}
}
```

失败时返回：

```json
{
  "ok": false,
  "error": {
    "message": "错误信息"
  }
}
```

## 2. 对接流程

推荐调用顺序：

1. App 首次安装或未激活时，调用 `POST /api/app/activate`
2. 激活成功后，保存本地的 `deviceCode`
3. App 后续启动时，调用 `POST /api/app/config`
4. 管理端如更新了角色配置，App 可再次调用 `POST /api/app/config` 拉取最新配置

## 3. 接口一：设备激活并获取角色配置

### 3.1 请求信息

- 方法：`POST`
- 路径：`/api/app/activate`
- Content-Type：`application/json`

### 3.2 请求参数

```json
{
  "deviceCode": "android-app-test-001",
  "deviceName": "大厅主屏",
  "activationCode": "AA7W-RWS7",
  "appVersion": "1.0.0"
}
```

字段说明：

- `deviceCode`
  - 设备唯一编码
  - 必填
- `deviceName`
  - 设备名称
  - 选填，建议传
- `activationCode`
  - 管理端生成的一机一码激活码
  - 必填
- `appVersion`
  - 当前 App 版本号
  - 选填，建议传

### 3.3 curl 示例

本地联调示例：

```bash
curl -X POST "http://dev.imtim.cn:3000/api/app/activate" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceCode": "666",
    "deviceName": "aaa",
    "activationCode": "VG76-P3N6",
    "appVersion": "1.0.0"
  }'
```

### 3.4 成功响应

```json
{
  "ok": true,
  "data": {
    "success": true,
    "digitalHumanId": "316a4beb-a667-4749-8aa1-cafdb10fba67",
    "activation": {
      "id": "0ef1a6b9-1f9c-47dd-9a3c-6e6d4d7be001",
      "digitalHumanId": "316a4beb-a667-4749-8aa1-cafdb10fba67",
      "deviceCode": "android-app-test-001",
      "deviceName": "大厅主屏",
      "activationCode": "AA7W-RWS7",
      "activationCodeMasked": "AA7W-****",
      "status": "activated",
      "remark": "app接口联调",
      "publishedAt": "2026-06-25T10:00:00.000Z",
      "activatedAt": "2026-06-25T10:02:00.000Z",
      "appVersion": "1.0.0"
    },
    "device": {
      "id": "2a8e4c5b-8d45-4b89-8c37-9d2c59ac3001",
      "deviceCode": "android-app-test-001",
      "deviceName": "大厅主屏",
      "bindStatus": "active",
      "appVersion": "1.0.0",
      "lastSyncAt": "2026-06-25T10:02:00.000Z"
    },
    "rolePackage": {
      "version": {
        "id": "cfg-001",
        "versionNo": 3,
        "updatedAt": "2026-06-25T09:50:00.000Z"
      },
      "service": {
        "dashscopeApiKey": "sk-xxxx",
        "baseUrl": "https://dashscope.aliyuncs.com",
        "llmModel": "qwen-plus",
        "asrModel": "qwen3-asr-flash-realtime",
        "ttsModel": "cosyvoice-v3-flash",
        "ttsVoice": "longanyang"
      },
      "role": {
        "id": "316a4beb-a667-4749-8aa1-cafdb10fba67",
        "code": "shiguai-police-001",
        "name": "石拐公安图警官",
        "assistantName": "石拐公安图警官",
        "sceneType": "公安政务大厅",
        "status": "enabled",
        "description": "默认种子数字人，用于管理后台联调。",
        "live2dModelPath": "mrlu/mrlu.model3.json",
        "systemPrompt": "你是部署在大厅里的公安数字人...",
        "prefixPrompt": "请优先结合当前政务大厅场景回答...",
        "openingMessage": "您好，我是石拐公安图警官...",
        "openingMessages": [
          "您好，我是石拐公安图警官，很高兴为您服务。"
        ],
        "knowledgeBaseIndexId": "xxx",
        "wakeWordEnabled": true,
        "wakeWordText": "阿喜警官",
        "wakeWords": [
          "阿喜警官",
          "警官"
        ],
        "interruptWords": [
          "等等",
          "停一下"
        ]
      },
      "interaction": {
        "standbyCommands": [
          "请靠近一点，我可以为您介绍办事流程。"
        ],
        "fallbackMessages": [
          "这个问题我再帮您换一种方式查询。"
        ]
      },
      "content": {
        "fixedQaItems": [
          {
            "id": "preset-id-card-location",
            "question": "身份证在哪里办理？",
            "answer": "请到一楼户政窗口办理。",
            "status": "enabled"
          }
        ],
        "faqItems": [
          {
            "id": "faq-001",
            "question": "周末可以办理吗？",
            "answer": "请以大厅窗口公示时间为准。",
            "status": "enabled"
          }
        ],
        "hotwordGroups": [
          {
            "id": "hotword-001",
            "name": "业务热词",
            "words": [
              "身份证补办",
              "无犯罪记录证明"
            ],
            "type": "business",
            "enabled": true
          }
        ]
      }
    }
  }
}
```

### 3.5 失败场景

常见失败响应：

```json
{
  "ok": false,
  "error": {
    "message": "激活码不存在"
  }
}
```

```json
{
  "ok": false,
  "error": {
    "message": "激活码已被使用"
  }
}
```

```json
{
  "ok": false,
  "error": {
    "message": "设备编码与激活码不匹配"
  }
}
```

## 4. 接口二：按设备码拉取角色配置

### 4.1 请求信息

- 方法：`POST`
- 路径：`/api/app/config`
- Content-Type：`application/json`

### 4.2 请求参数

```json
{
  "deviceCode": "android-app-test-001"
}
```

字段说明：

- `deviceCode`
  - 设备唯一编码
  - 必填

### 4.3 curl 示例

本地联调示例：

```bash
curl -X POST "http://localhost:3000/api/app/config" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceCode": "android-app-test-001"
  }'
```

### 4.4 成功响应

```json
{
  "ok": true,
  "data": {
    "success": true,
    "digitalHumanId": "316a4beb-a667-4749-8aa1-cafdb10fba67",
    "device": {
      "id": "2a8e4c5b-8d45-4b89-8c37-9d2c59ac3001",
      "deviceCode": "android-app-test-001",
      "deviceName": "大厅主屏",
      "bindStatus": "active",
      "appVersion": "1.0.0",
      "lastSyncAt": "2026-06-25T10:02:00.000Z"
    },
    "rolePackage": {
      "version": {
        "id": "cfg-001",
        "versionNo": 3,
        "updatedAt": "2026-06-25T09:50:00.000Z"
      },
      "service": {},
      "role": {},
      "interaction": {},
      "content": {}
    }
  }
}
```

说明：

- `rolePackage` 结构与 `POST /api/app/activate` 返回一致
- 建议 App 启动后优先调用本接口进行配置同步

### 4.5 失败场景

```json
{
  "ok": false,
  "error": {
    "message": "deviceCode 不能为空"
  }
}
```

```json
{
  "ok": false,
  "error": {
    "message": "设备未绑定角色，请先完成激活"
  }
}
```

## 5. rolePackage 字段说明

### 5.1 version

- `id`
  - 当前配置版本 ID
- `versionNo`
  - 当前配置版本号
- `updatedAt`
  - 当前配置更新时间

### 5.2 service

设备端运行服务参数：

- `dashscopeApiKey`
- `baseUrl`
- `llmModel`
- `asrModel`
- `ttsModel`
- `ttsVoice`

### 5.3 role

角色核心信息：

- `id`
- `code`
- `name`
- `assistantName`
- `sceneType`
- `status`
- `description`
- `live2dModelPath`
- `systemPrompt`
- `prefixPrompt`
- `openingMessage`
- `openingMessages`
- `knowledgeBaseIndexId`
- `wakeWordEnabled`
- `wakeWordText`
- `wakeWords`
- `interruptWords`

### 5.4 interaction

交互控制信息：

- `standbyCommands`
- `fallbackMessages`

### 5.5 content

业务内容信息：

- `fixedQaItems`
  - 当前角色实际绑定的固定问答
- `faqItems`
  - 启用状态的 FAQ
- `hotwordGroups`
  - 启用状态的热词组

## 6. App端建议

### 6.1 首次激活

建议 App 在用户输入激活码后：

1. 调用 `POST /api/app/activate`
2. 成功后保存：
   - `deviceCode`
   - `digitalHumanId`
   - `rolePackage`
3. 立即使用返回的 `rolePackage` 初始化数字人

### 6.2 后续同步

建议 App 在以下时机调用 `POST /api/app/config`：

- App 启动时
- 回到前台时
- 手动点击“同步配置”时
- 发现角色配置可能被后台更新时

### 6.3 本地缓存建议

建议 App 本地缓存以下内容：

- 上次成功拉取的 `rolePackage`
- `version.versionNo`
- `version.updatedAt`

若新返回版本与本地一致，可按需跳过重建资源。

## 7. 当前实现说明

当前管理端已实现：

- 激活成功后直接返回完整角色配置
- 按设备码重新拉取完整角色配置

当前 `rolePackage` 已包含：

- 角色基础信息
- 大模型与语音模型参数
- Live2D 模型路径
- 系统提示词与前置提示词
- 开场白、唤醒词、打断词
- 知识库绑定 ID
- 固定问答、FAQ、热词
- 待机指令与兜底话术

## 8. 对应接口文件

- 激活接口：
  - [activate route](file:///D:/code/code_android_siberman/assets/admin/blhbf/app/api/app/activate/route.ts)
- 配置拉取接口：
  - [config route](file:///D:/code/code_android_siberman/assets/admin/blhbf/app/api/app/config/route.ts)
- 角色包组装逻辑：
  - [appDeviceService.ts](file:///D:/code/code_android_siberman/assets/admin/blhbf/src/lib/appDeviceService.ts)
