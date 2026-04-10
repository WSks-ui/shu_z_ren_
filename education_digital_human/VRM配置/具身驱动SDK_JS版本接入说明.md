具身驱动SDK（JS版本）接入说明
概述
魔珐星云具身驱动将 AI 的表达从“文本”升级为“ 3D 多模态”。 它可基于文本输入，实时生成语音、表情与动作，驱动 3D 数字人或人形机器人，实现如真人般自然的表达。 相比传统仅能输出文字或语音的 AI ，星云赋予 AI 更丰富的表现力与更自然的交互体验。

主要功能
1.实时 3D 数字人渲染与驱动

2.语音合成（SSML 支持）与口型同步

3.多状态行为控制（Idle / Listen / Speak 等）

4.Widget 组件展示（图片、字幕、视频等）

5.可自定义事件回调与日志系统

环境要求
JS SDK

1.对浏览器版本的要求：

魔珐星云具身驱动SDK浏览器版本要求

Android SDK

系统要求：Android 11及其以上

芯片要求：

  芯片版本

  建议清晰度

  RK3588

  1080P

  RK3566

  720P

  其它芯片

  可联系我们进行测试



快速开始
1.js sdk
1.1准备工作
1.在页面中引入以下依赖：

<!DOCTYPE html>
<html lang="en">
<body>
  <div style="width: 540px;height: 960px">
    <div id="sdk"></div>
  </div>
  <script src="https://media.xingyun3d.com/xingyun3d/general/litesdk/xmovAvatar@latest.js"></script>
</body>
</html>
请关注JS SDK版本，以助于获取最新SDK特性和最新效果



2.设置虚拟人角色、音色、表演风格，获取App ID、App Secret

请登录魔珐星云（https://xingyun3d.com/），在应用中心创建驱动应用，选择角色、音色、表演风格。



1.2创建实例
const LiteSDK = new XmovAvatar({
  containerId: '#sdk',
  appId: 'your_appid',
	// 您在魔珐星云平台建立的实时驱动应用的appid  
  appSecret: 'your_appsecret',
  // 您在魔珐星云平台建立的实时驱动应用的appsecret 
  gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
  // 自定义渲染器，传递该方法，所有事件sdk均返回，由该方法定义所以类型事件的实现逻辑
  headers: {
    'Authorization': '888jn',
  },
  //自定义请求头
  hardwareAcceleration: "prefer-hardware", // 开启硬件加速
  // 自定义渲染器，传递该方法，所有事件sdk均返回，由该方法定义所以类型事件的实现逻辑
  onWidgetEvent(data) {
    // 处理widget事件
    console.log('Widget事件:', data)
  },
  // 代理渲染器，sdk默认支持subtitle_on、subtitle_off和widget_pic事件。通过代理，
  // 可以修改默认事件，业务侧也可实现各种其他事件。
  proxyWidget: {
    "widget_slideshow": (data: any) => {
      console.log("widget_slideshow", data);
    },
    "widget_video": (data: any) => {
      console.log("widget_video", data);
    },
  },
  onNetworkInfo(networkInfo) {
    console.log('networkInfo:', networkInfo)
  },
  onMessage(message) {
    console.log('SDK message:', message);
  },
  onStateChange(state: string) {
    console.log('SDK State Change:', state);
  },
  onStatusChange(status) {
    console.log('SDK Status Change:', status);
  },
  onStateRenderChange(state: string, duration: number) {
    console.log('SDK State Change Render:', state, duration);
  },
  onVoiceStateChange(status:string) {
      console.log("sdk voice status", status);
  },
  enableLogger: false, // 不展示sdk log，默认为false
})
初始化参数：

参数名

类型

参数

必填

说明

containerId

string



是

容器元素ID

appId

string



是

数字人appId（从业务系统获取）

appSecret

string



是

数字人secretId（从业务系统获取）

gatewayServer

string

https://nebula-agent.xingyun3d.com/user/v1/ttsa/session

是

数字人服务接口完整路径

headers

Object



否

自定义请求头

hardwareAcceleration

string



否

是否开启硬件加速
默认： 'default'

硬件加速："prefer-hardware"

CPU软解："prefer-software"

onWidgetEvent

function



否

Widget事件回调函数

proxyWidget

Object



否

Sdk内默认支持subtitle_on、subtitle_off和widget_pic事件。

用户可以通过两种方式重写默认事件及支持自定义事件。

使用onWidgetEvent代理所有事件，sdk会将事件全部抛出。
使用proxyWidget代理事件，用户可根据需求实现自定义事件或代理默认事件。
事件系统优先级如下：onWidgetEvent > proxyWidget > 默认事件。

onVoiceStateChange

Function

Status: 音频播放状态

"start"：开始播放

"end"：播放结束

否

监控sdk音频播放状态

onNetworkInfo

function

networlnfo:

SDKNetworkInfo（见：参数说明）

否

当前网络状况

onMessage

function

message: 

SDKMessage（见：参数说明）

是

SDK 消息

onStateChange

function

state: string

详见下方数字人state说明

否

监听虚拟人状态变化

onStatusChange

function

status: SDKStatus（见：参数说明）





onStateRenderChange

function



否

监听虚拟人状态变化耗时

从发送action到状态首帧渲染

onStartSessionWarning

function

Message: Object

否

抛出数字人配置不正确的警告信息

enableLogger

boolean



否

是否打印sdk日志

参数说明：

enum EErrorCode {
  // 容器不存在
  CONTAINER_NOT_FOUND = 10001,
  // socket连接错误
  CONNECT_SOCKET_ERROR = 10002,
  // 会话错误，start_session进入catch（/api/session的接口数据异常，均使用response.error_code）
  START_SESSION_ERROR = 10003,
  // 会话错误，stop_session进入catch
  STOP_SESSION_ERROR = 10004,

  VIDEO_FRAME_EXTRACT_ERROR = 20001, // 视频抽帧错误
  INIT_WORKER_ERROR = 20002, // 初始化视频抽帧WORKER错误
  PROCESS_VIDEO_STREAM_ERROR = 20003, // 抽帧视频流处理错误
  FACE_PROCESSING_ERROR = 20004, // 表情处理错误
  
  BACKGROUND_IMAGE_LOAD_ERROR = 30001, // 背景图片加载错误
  FACE_BIN_LOAD_ERROR = 30002, // 表情数据加载错误
  INVALID_BODY_NAME = 30003, // body数据无Name
  VIDEO_DOWNLOAD_ERROR = 30004, // 视频下载错误

  AUDIO_DECODE_ERROR = 40001, // 音频解码错误
  FACE_DECODE_ERROR = 40002, // 表情解码错误
  VIDEO_DECODE_ERROR = 40003, // 身体视频解码错误
  EVENT_DECODE_ERROR = 40004, // 事件解码错误
  INVALID_DATA_STRUCTURE = 40005, // ttsa返回数据类型错误，非audio、body、face、event等
  TTSA_ERROR = 40006, // ttsa下行发送异常信息

  NETWORK_DOWN = 50001, // 离线模式
  NETWORK_UP = 50002, // 在线模式
  NETWORK_RETRY = 50003, // 网络重试
  NETWORK_BREAK = 50004, // 网络断开
}

interface SDKMessage {
  code: EErrorCode
  message: string
  timestamp: number
  originalError?: string
}

interface SDKNetworkInfo {
  rtt: number // 延迟，毫秒
  downlink: number // 下载速率（MB/s）
}

enum SDKStatus {
  online = 0,
  offline = 1,
  network_on = 2,
  network_off = 3,
  close = 4,
  invisible = 5,
  visible = 6，
  stopped = 7,
}
1.3初始化连接房间
初始化：

参数名

类型

参数

必填

说明

onDownloadProgress

function



是

资源下载进度回调，progress取值范围[0, 100]，首次连接bin资源或首个视频资源加载失败时，进度均不会达到100，且内部会调用stopSession。防止用户无法重新连接。

initModel

string

'normal' | 'invisible'
normal: 正常初始化
invisible: 隐身初始化

否

初始化模式，两种模式：正常和隐身

1.4驱动数字人说话
speak：控制虚拟人说话。

speak(ssml: string, is_start: boolean, is_end: boolean): void
参数说明：

ssml:  可以直接传入需要数字人说的内容，也可以传入SSML格式的标记语言用以指定数字人做出KA动作，详见进阶接入。

以下为非流式调用的示例说明：

speak("欢迎使用魔珐星云", is_start = true, is_end  = true)
1.5销毁实例
destroy：销毁SDK实例，断开连接。

destroy(): void


进阶接入
1.数字人状态切换
1.1概述
数字人状态切换

中文名

英文名

终端对应功能说明

API方法

离线模式

offlineMode

进入离线模式，此状态下不消耗积分

offlineMode(): void
在线模式

onlineMode

从离线模式回到在线模式

onlineMode(): void
待机等待

idle

机器未识别人脸，长时间无用户做交互

idle(): void​
待机互动

interactive_idle

交互状态切换前的循环状态

interactiveidle(): void
可用于打断当前状态，回到待机状态

倾听

listen

用户输入语音，数字人处于倾听状态

listen(): void
思考

think

用户提问后，未开始回复的状态

think(): void
数字人说话

speak

控制虚拟人说话

speak(ssml: string, is_start: boolean, is_end: boolean): void
详见 Speak详解

1.2Speak详解
1.2.1 对接大模型流式输出：

可以流式的调用speak方法，通过处理is_start和is_end标识来控制流式传入。

第一句speak的时候，is_start = true

最后一次speak的时候，is_end = true

其它的，is_start、is_end的都是false

可以参考

流式调用示例

1.2.2 SSML结构

Speak SSML样例

语义KA指令

<speak>
  热烈
  <ue4event>
    <type>ka_intent</type>
    <data><ka_intent>Welcome</ka_intent></data>
  </ue4event>
  欢迎各位贵宾在百忙之中拨冗莅临指导！您的到来如春风拂面，为我们带来宝贵的经验与智慧，这份肯定与支持让我们备受鼓舞。期待在您的指点下，我们能收获更多成长与启发，共同书写更精彩的篇章！
</speak>
技能KA指令

<speak>
<ue4event>
    <type>ka</type>
    <data><action_semantic>dance</action_semantic></data>
  </ue4event>
</speak>
Speak KA指令

<speak>
  <ue4event>
    <type>ka</type>
    <data><action_semantic>Hello</action_semantic></data>
  </ue4event>
  欢迎来到星云具身 3D 数字人平台，这里有超多精彩内容等你发现～
</speak>
KA查询接口详见：具身驱动KA查询接口使用说明

注：

 1.为了保证较好的数字人呈现，建议流式调用中的首次可以积攒一小段内容后调用，保证后续数字人说话速度（对于文本内容的消耗速度）低于大模型后续流式输出的速度。

 2.speak不允许连续多次调用（即前一次speak调用中is_end=true之后，接续speak），建议中间使用interactive_idle或者listen方法做一次数字人状态切换

 3.speak过程中onVoiceStateChange会抛出事件，voice_start表示开始讲话 ，voice_end表示讲话结束，可以用管理数字人说话状态。

2.其它方法
setVolume：控制声音 取值范围0->1 0:静音 1:最大音量

setVolume(volume: number): void


showDebugInfo：显示调试信息

hideDebugInfo：隐藏调试信息

showDebugInfo(): void
hideDebugInfo(): void


switchInvisibleMode：主动切换隐身/在线

switchInvisibleMode()


changeAvatarVisible：主动UI层面隐藏和显示数字人，cnavas display: block/none

changeAvatarVisible(visible: boolean):void


消耗查询
host: https://nebula-agent.xingyun3d.com

请求路径：GET:  /user/v1/external/consume_record

请求参数

参数名

类型

名称

是否必填

X-APP-ID

string

驱动应用appid

必填

X-TOKEN

string

驱动应用appsecret

必填

X-TIMESTAMP

timestamp

时间戳

必填

返回参数：

一级参数名

二级参数名

类型

名称

备注

error_code



int

错误码



error_reason



string

错误原因



data



list

数据





id

int

数据id





create_time

timestamp

创建时间





update_time

timestamp

更新时间





app_type

int

应用类型





app_name

string

应用名称





app_id

string

应用id编号





data_source

int

数据来源





task_id

string

任务编号





session_id

string

会话id





amount

float

积分消耗





status

int

状态





start_time

timestamp

会话开始时间





finish_time

timestamp

会话结束时间





duration

int

持续时间





注意事项
1.确保容器元素具有明确的宽高，否则可能影响渲染效果

2.初始化时必须提供所有必填参数

3.使用destroy()方法时会清理所有资源并断开连接

4.建议在开发环境使用showDebugInfo()辅助调试

错误码定义与解决建议
类型

错误码

描述

初始化错误

10001

容器不存在

10002

socket连接错误

10003

会话错误，start_session进入catch（/api/session的接口数据异常，均使用response.error_code）

10004

会话错误，stop_session进入catch

10005

超出房间并发限制，调用destroy() 方法主动释放连接

前端处理逻辑错误

20001

视频抽帧错误

20002

初始化视频抽帧WORKER错误

20003

抽帧视频流处理错误

20004

表情处理错误

资源管理错误

30001

背景图片加载错误

30002

表情数据加载错误

30003

body数据无Name

30004

视频下载错误

sdk 获取ttsa数据解压缩错误

40001

音频解码错误

40002

表情解码错误

40003

身体视频解码错误

40004

事件解码错误

40005

ttsa返回数据类型错误，非audio、body、face、event等

40006

ttsa下行发送异常信息

网络问题

50001

离线模式

50002

在线模式

50003

网络重试

50004

网络断开

最佳实践
1.在页面卸载前调用destroy()方法清理资源

2.合理使用错误回调处理异常情况

3.使用SSML格式控制虚拟人说话效果

4.需要自定义Widget行为时实现onWidgetEvent回调

5.使用KA插件时，建议先测试动作意图识别效果，根据需要调整配置参数

常见问题
Q：如何避免积分消耗过快？

A：调试过程中建议使用基础音色；在长时间不做互动的状态下，可以切入离线模式；



Q：如何切换数字人？

A：可在魔珐星云平台创建多个具身驱动应用，通过销毁示例重新连接（接入新应用）的方式实现数字人切换



Q：通过ip地址启动项目会报错？

A：sdk中使用的某些方法仅支持localhost或者https调用



Q：可以定制数字人吗？

A：可以。若您有这方面的需求，可以扫码联系我们



Q: 能够通过IP+port或者http方式调用驱动SDK？

A: 目前我们的 sdk 仅支持 localhost 或者 https 访问



Q: 参数都正常写了，数字人初始化完毕，但是消息发不过去。

A: 消息发送失败，大概率是大模型权限问题，请先检查对应的模型权限；





兼容性说明
设备类型

设备+型号

系统

系统版本

分辨率

测试是否通过（1080P）

PC

macbook

Mac

mac 15.6

1920x1080（PC）

是

PC

macbook

Mac

mac 15.6

1920x1080（PC）

是

PC

macbook

Mac

mac 15.6

1920x1080（PC）

是

PC

笔记本（Dell）

Win

win10

1920x1080（PC）

是

PC

笔记本
(华为metebook 14)

Win

win10

1920x1080（PC）

是

PC

笔记本
(华硕vivobook)

Win

win10

1920x1080（PC）

是

手机

小米13Ultra

Xiaomi HyperOS

1.0.9.0.UMACNXM

3200*1440（手机竖屏）

是

手机

Oppo

Android

null

375x667（手机竖屏）
812x375（手机横屏）

是

手机

vivo S20 PRo

Android

6.1.84-android14-11

375x667（手机竖屏）

是

手机

Iphone

iOS

IOS 18.6.1

375x667（手机竖屏）

是

手机

Iphone

iOS

IOS 18.6.1

375x667（手机竖屏）

是

手机

Iphone

iOS

IOS 16.6

375x667（手机竖屏）

是

手机

Iphone

iOS

IOS 16.6

375x667（手机竖屏）

是

手机

Iphone

iOS

IOS 18.5

375x667（手机竖屏）
812x375（手机横屏）

是

手机

Iphone

iOS

IOS 18.5

375x667（手机竖屏）
812x375（手机横屏）

是

手机

Iphone

iOS

IOS 18.4

375x667（手机竖屏）
812x375（手机横屏）

是

手机

Iphone

iOS

IOS 18.4

375x667（手机竖屏）
812x375（手机横屏）

是

平板

IPAD

Ipad

ipad os 18.6

1366x768（平板）

是

平板

IPAD

Ipad

ipad os 18.6

1366x768（平板）

是

针对SDK兼容性已在上述设备进行测试（设备/操作系统/分辨率）
如有希望提供更多的设备兼容性测试信息，请联系我们：


版本记录
版本号

发布日期

说明

0.1.0-alpha.45

2025/10/15

新增了onVoiceStateChange方法，帮助更好的控制数字人状态新增插件系统，帮助用户自定义事件并进行响应

0.1.0-alpha.60

2025/10/19

修复人物重叠修复音频播放晚于正确事件

0.1.0-alpha.63

2025/10/23

修复sdk close时，sdk未销毁修复sdk disconnect时，sdk判断是否未销毁，未销毁时先销毁再发送给业务closewebgl 上下文丢失时，增加二次初始化失败处理

0.1.0-alpha.66

2025/10/17

修复离线/在线模式数字人丢失问题优化在微信浏览器环境下的部分兼容问题

0.1.0-alpha.72

2025/10/18

流量优化：降低数据
切换离线模式，清除字幕、停止ui事件和音频播放
socket离线时，发送切换到离线模式。
修复IOS的特殊性，audioContext的初始state='suspended', 不会播放声音
0.1.0-alpha.95

2025/12/31

补充硬解控制，支持通过硬件解算提升稳定性