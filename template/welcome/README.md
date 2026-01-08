# 对话首页模板参数说明

该项目为您的卡片定义了一个高度可自定义的启动界面

## 使用方式

启动正则表达式为 `/\[WELCOME:([^\]]+)\]/`

替换内容为 [inject.html](./inject.html)（其中 `$1` 会被替换为捕获组1的内容）

在 `第一句话` 中插入 `[WELCOME:k1=v1;k2=v2;kx=vx]` 样的指令即可

如果参数值包含 `;` 或 `=`，需要进行URL编码：
- `;` → `%3B`
- `=` → `%3D`

**注意：所有参数必须写在同一行内**

如果参数值需要换行，使用 `\n` 表示：
```
page.1.content=第一行\n第二行\n第三行
```

## 参数树

```
├── 行为控制
│   ├── autoExpand
│   └── allowReplay
├── 入口按钮
│   ├── btnLoadContent / btnLoadColor
│   ├── btnFailContent / btnFailColor
│   ├── btnContinueContent / btnContinueColor
│   └── btnDoneContent / btnDoneColor
├── page (全局)
│   ├── background
│   │   ├── color
│   │   └── image.[pc|mobile|cut]
│   ├── modal.[color|transparency|blur]
│   ├── btn.[color|content.color|transparency|blur]
│   ├── [next|last|hide].content.color
│   ├── content.[align|style|distance|color]
│   ├── animation.[type|duration]
│   └── image.[size|cut]
└── page.x (页面级)
    ├── title
    ├── [next|last]
    ├── [next|last|hide].content / [next|last|hide].content.color
    ├── background.color
    ├── modal.[color|transparency|blur]
    ├── btn.[color|content.color|transparency|blur]
    ├── btn.lock.[all|height|width]
    ├── content.[align|style|distance|color]
    ├── animation.[type|duration]
    ├── image.[size|cut]
    ├── row.height
    ├── content.y (内容块)
    ├── options.y (下拉框)
    ├── input.y (输入框)
    ├── btn.y (按钮元素)
    ├── image.y (图片元素)
    └── row.y (行布局)
```

## 参数详情

### 行为控制

```
autoExpand
├── 类型: boolean
├── 取值: true / false
├── 默认: true
├── 必填: 否
└── 说明: 页面加载后是否自动展开操作面板

allowReplay
├── 类型: boolean
├── 取值: true / false
├── 默认: true
├── 必填: 否
└── 说明: 完成操作后是否允许再次打开面板
```

### 入口按钮配置

```
btnLoadContent
├── 类型: string
├── 取值: 任意文本
├── 默认: "正在获取资源..."
├── 必填: 否
└── 说明: 资源加载中时按钮显示的文字

btnLoadColor
├── 类型: hex
├── 取值: 6位十六进制颜色 (不含#)
├── 默认: b8860b
├── 必填: 否
└── 说明: 资源加载中时按钮的背景颜色

btnFailContent
├── 类型: string
├── 取值: 任意文本
├── 默认: "获取失败 点击重试"
├── 必填: 否
└── 说明: 资源加载失败时按钮显示的文字

btnFailColor
├── 类型: hex
├── 取值: 6位十六进制颜色
├── 默认: 8b0000
├── 必填: 否
└── 说明: 资源加载失败时按钮的背景颜色

btnContinueContent
├── 类型: string
├── 取值: 任意文本
├── 默认: "打开操作面板"
├── 必填: 否
└── 说明: 资源加载成功后按钮显示的文字

btnContinueColor
├── 类型: hex
├── 取值: 6位十六进制颜色
├── 默认: 166d3b
├── 必填: 否
└── 说明: 资源加载成功后按钮的背景颜色

btnDoneContent
├── 类型: string
├── 取值: 任意文本
├── 默认: "已完成操作"
├── 必填: 否
└── 说明: allowReplay=false时完成操作后按钮显示的文字

btnDoneColor
├── 类型: hex
├── 取值: 6位十六进制颜色
├── 默认: 666666
├── 必填: 否
└── 说明: allowReplay=false时完成操作后按钮的背景颜色
```

### 全局配置 (page.*)

```
page
├── background
│   ├── color
│   │   ├── 类型: hex
│   │   ├── 取值: 6位十六进制颜色
│   │   ├── 默认: 050505
│   │   ├── 必填: 否
│   │   └── 说明: 全屏遮罩层的背景颜色
│   │
│   └── image
│       ├── pc
│       │   ├── 类型: url
│       │   ├── 取值: 有效的图片URL
│       │   ├── 默认: 无
│       │   ├── 必填: 否
│       │   └── 说明: PC端(宽高比接近16:9)的背景图片
│       │
│       ├── mobile
│       │   ├── 类型: url
│       │   ├── 取值: 有效的图片URL
│       │   ├── 默认: 无
│       │   ├── 必填: 否
│       │   └── 说明: 移动端(宽高比接近9:19)的背景图片
│       │
│       └── cut
│           ├── 类型: boolean
│           ├── 取值: true / false
│           ├── 默认: false
│           ├── 必填: 否
│           └── 说明: true=cover裁剪填充 false=contain完整显示
│
├── modal
│   ├── color
│   │   ├── 类型: hex
│   │   ├── 取值: 6位十六进制颜色
│   │   ├── 默认: 0d0d0d
│   │   ├── 必填: 否
│   │   └── 说明: 弹窗容器的背景颜色
│   │
│   ├── transparency
│   │   ├── 类型: integer
│   │   ├── 取值: 0-100
│   │   ├── 默认: 0
│   │   ├── 必填: 否
│   │   └── 说明: 弹窗背景透明度(0=不透明 100=全透明)
│   │
│   └── blur
│       ├── 类型: integer
│       ├── 取值: 0-100
│       ├── 默认: 0
│       ├── 必填: 否
│       └── 说明: 弹窗背景模糊度(0=清晰 100=最大模糊20px)
│
├── btn
│   ├── color
│   │   ├── 类型: hex
│   │   ├── 取值: 6位十六进制颜色
│   │   ├── 默认: 166d3b
│   │   ├── 必填: 否
│   │   └── 说明: 所有按钮的默认背景颜色
│   │
│   ├── content.color
│   │   ├── 类型: hex
│   │   ├── 取值: 6位十六进制颜色
│   │   ├── 默认: 无(白色)
│   │   ├── 必填: 否
│   │   └── 说明: 所有按钮的默认文字颜色
│   │
│   ├── transparency
│   │   ├── 类型: integer
│   │   ├── 取值: 0-100
│   │   ├── 默认: 0
│   │   ├── 必填: 否
│   │   └── 说明: 按钮背景透明度
│   │
│   └── blur
│       ├── 类型: integer
│       ├── 取值: 0-100
│       ├── 默认: 0
│       ├── 必填: 否
│       └── 说明: 按钮背景模糊度
│
├── next.content.color
│   ├── 类型: hex
│   ├── 取值: 6位十六进制颜色
│   ├── 默认: 无(白色)
│   ├── 必填: 否
│   └── 说明: 下一步按钮的文字颜色
│
├── last.content.color
│   ├── 类型: hex
│   ├── 取值: 6位十六进制颜色
│   ├── 默认: 无(白色)
│   ├── 必填: 否
│   └── 说明: 上一页按钮的文字颜色
│
├── hide.content.color
│   ├── 类型: hex
│   ├── 取值: 6位十六进制颜色
│   ├── 默认: 无(白色)
│   ├── 必填: 否
│   └── 说明: 隐藏按钮的文字颜色
│
├── content
│   ├── align
│   │   ├── 类型: enum
│   │   ├── 取值: left / middle / right
│   │   ├── 默认: middle
│   │   ├── 必填: 否
│   │   └── 说明: 所有内容块的默认对齐方式
│   │
│   ├── style
│   │   ├── 类型: enum[]
│   │   ├── 取值: quote\title\bold\tilt\underline\delete\url (用\分隔)
│   │   ├── 默认: 无
│   │   ├── 必填: 否
│   │   └── 说明: 所有内容块的默认样式
│   │
│   ├── distance
│   │   ├── 类型: enum
│   │   ├── 取值: none / min / 1 / 2 / 3 / max
│   │   ├── 默认: 无
│   │   ├── 必填: 否
│   │   └── 说明: 所有内容块的默认间距
│   │
│   └── color
│       ├── 类型: hex
│       ├── 取值: 6位十六进制颜色
│       ├── 默认: 无(白色)
│       ├── 必填: 否
│       └── 说明: 所有内容块的默认文字颜色(不含title样式)
│
├── animation
│   ├── type
│   │   ├── 类型: enum
│   │   ├── 取值: slide / fade / rotate / zoomin / zoomout / random / none
│   │   ├── 默认: 无
│   │   ├── 必填: 否
│   │   └── 说明: 页面切换的默认动画类型
│   │
│   └── duration
│       ├── 类型: integer
│       ├── 取值: 正整数(毫秒)
│       ├── 默认: 300
│       ├── 必填: 否
│       └── 说明: 页面切换动画的默认持续时间
│
└── image
    ├── size
    │   ├── 类型: integer
    │   ├── 取值: 0-100
    │   ├── 默认: 100
    │   ├── 必填: 否
    │   └── 说明: 所有图片的默认宽度百分比
    │
    └── cut
        ├── 类型: boolean
        ├── 取值: true / false
        ├── 默认: false
        ├── 必填: 否
        └── 说明: 是否允许图片上下裁剪以适应宽度
```

### 页面配置 (page.x.*)

**索引说明**: `x` 为页面编号，从1开始，可不连续

```
page.x
├── title
│   ├── 类型: string
│   ├── 取值: 任意文本
│   ├── 默认: 无
│   ├── 必填: 否
│   └── 说明: 页面顶部标题
│
├── next
│   ├── 类型: integer
│   ├── 取值: 0 或 存在的page编号
│   ├── 默认: 顺序下一页
│   ├── 必填: 否
│   └── 说明: 点击下一步跳转的页面(0=最后一页触发完成)
│
├── last
│   ├── 类型: integer
│   ├── 取值: 0 或 存在的page编号
│   ├── 默认: 顺序上一页
│   ├── 必填: 否
│   └── 说明: 点击上一页跳转的页面(0=隐藏上一页按钮)
│
├── next.content
│   ├── 类型: string
│   ├── 取值: 任意文本
│   ├── 默认: "下一页" (最后一页为"完成")
│   ├── 必填: 否
│   └── 说明: 下一步按钮显示的文字
│
├── next.content.color
│   ├── 类型: hex
│   ├── 取值: 6位十六进制颜色
│   ├── 默认: 继承全局page.next.content.color
│   ├── 必填: 否
│   └── 说明: 下一步按钮的文字颜色
│
├── last.content
│   ├── 类型: string
│   ├── 取值: 任意文本
│   ├── 默认: "上一页"
│   ├── 必填: 否
│   └── 说明: 上一页按钮显示的文字
│
├── last.content.color
│   ├── 类型: hex
│   ├── 取值: 6位十六进制颜色
│   ├── 默认: 继承全局page.last.content.color
│   ├── 必填: 否
│   └── 说明: 上一页按钮的文字颜色
│
├── hide.content
│   ├── 类型: string
│   ├── 取值: 任意文本
│   ├── 默认: "隐藏"
│   ├── 必填: 否
│   └── 说明: 隐藏按钮显示的文字
│
├── hide.content.color
│   ├── 类型: hex
│   ├── 取值: 6位十六进制颜色
│   ├── 默认: 继承全局page.hide.content.color
│   ├── 必填: 否
│   └── 说明: 隐藏按钮的文字颜色
│
├── background.color
│   ├── 类型: hex
│   ├── 取值: 6位十六进制颜色
│   ├── 默认: 继承全局page.background.color
│   ├── 必填: 否
│   └── 说明: 本页的背景颜色
│
├── modal
│   ├── color
│   │   ├── 类型: hex
│   │   ├── 取值: 6位十六进制颜色
│   │   ├── 默认: 继承全局page.modal.color
│   │   ├── 必填: 否
│   │   └── 说明: 本页弹窗的背景颜色
│   │
│   ├── transparency
│   │   ├── 类型: integer
│   │   ├── 取值: 0-100
│   │   ├── 默认: 继承全局page.modal.transparency
│   │   ├── 必填: 否
│   │   └── 说明: 本页弹窗的背景透明度
│   │
│   └── blur
│       ├── 类型: integer
│       ├── 取值: 0-100
│       ├── 默认: 继承全局page.modal.blur
│       ├── 必填: 否
│       └── 说明: 本页弹窗的背景模糊度
│
├── btn
│   ├── color
│   │   ├── 类型: hex
│   │   ├── 取值: 6位十六进制颜色
│   │   ├── 默认: 继承全局page.btn.color
│   │   ├── 必填: 否
│   │   └── 说明: 本页按钮的默认背景颜色
│   │
│   ├── content.color
│   │   ├── 类型: hex
│   │   ├── 取值: 6位十六进制颜色
│   │   ├── 默认: 继承全局page.btn.content.color
│   │   ├── 必填: 否
│   │   └── 说明: 本页按钮的默认文字颜色
│   │
│   ├── transparency
│   │   ├── 类型: integer
│   │   ├── 取值: 0-100
│   │   ├── 默认: 继承全局page.btn.transparency
│   │   ├── 必填: 否
│   │   └── 说明: 本页按钮的背景透明度
│   │
│   ├── blur
│   │   ├── 类型: integer
│   │   ├── 取值: 0-100
│   │   ├── 默认: 继承全局page.btn.blur
│   │   ├── 必填: 否
│   │   └── 说明: 本页按钮的背景模糊度
│   │
│   └── lock
│       ├── all
│       │   ├── 类型: string
│       │   ├── 取值: 逗号分隔的按钮ID列表
│       │   ├── 默认: 无
│       │   ├── 必填: 否
│       │   └── 说明: 需要同步宽高的按钮ID
│       │
│       ├── height
│       │   ├── 类型: string
│       │   ├── 取值: 逗号分隔的按钮ID列表
│       │   ├── 默认: 无
│       │   ├── 必填: 否
│       │   └── 说明: 需要同步高度的按钮ID
│       │
│       └── width
│           ├── 类型: string
│           ├── 取值: 逗号分隔的按钮ID列表
│           ├── 默认: 无
│           ├── 必填: 否
│           └── 说明: 需要同步宽度的按钮ID
│
│           按钮ID格式:
│           - 独立按钮: 编号 (如 1,2,3)
│           - Row内按钮: row.行号.列号 (如 row.1.1,row.1.2)
│           - 可混合: 1,row.1.1,row.2.1
│
├── content
│   ├── align    (同全局,仅作用于本页)
│   ├── style    (同全局,仅作用于本页)
│   ├── distance (同全局,仅作用于本页)
│   └── color    (同全局,仅作用于本页)
│
├── animation
│   ├── type     (同全局,从本页切换到下一页时使用)
│   └── duration (同全局,从本页切换到下一页时使用)
│
├── image
│   ├── size     (同全局,仅作用于本页)
│   └── cut      (同全局,仅作用于本页)
│
└── row.height
    ├── 类型: string
    ├── 取值: 分组格式如 1,2:3,4 (冒号分隔不同组,逗号分隔同组行号)
    ├── 默认: 无
    ├── 必填: 否
    └── 说明: 需要同步高度的行组(1,2同高,3,4同高)
```

### 内容块 (page.x.content.y.*)

**索引说明**: `y` 为内容块编号，从1开始，可不连续，按编号顺序显示

```
page.x.content.y
├── (无后缀)
│   ├── 类型: string
│   ├── 取值: 任意文本 (支持\n换行)
│   ├── 默认: 无
│   ├── 必填: 是
│   └── 说明: 内容块的文字内容
│
├── align
│   ├── 类型: enum
│   ├── 取值: left / middle / right
│   ├── 默认: 继承页面或全局content.align
│   ├── 必填: 否
│   └── 说明: 本内容块的对齐方式
│
├── style
│   ├── 类型: enum[]
│   ├── 取值: quote\title\bold\tilt\underline\delete\url (用\分隔)
│   ├── 默认: 继承页面或全局content.style
│   ├── 必填: 否
│   └── 说明: 本内容块的样式
│
│   样式说明:
│   - quote: 引用块(左侧竖线)
│   - title: 标题(大号加粗)
│   - bold: 加粗
│   - tilt: 斜体
│   - underline: 下划线
│   - delete: 删除线
│   - url: 可点击链接(需配合.url参数)
│
├── distance
│   ├── 类型: enum
│   ├── 取值: none / min / 1 / 2 / 3 / max
│   ├── 默认: 继承页面或全局content.distance
│   ├── 必填: 否
│   └── 说明: 本内容块与下一个元素的间距
│
├── url
│   ├── 类型: url
│   ├── 取值: http:// 或 https:// 开头的链接
│   ├── 默认: 无
│   ├── 必填: 当style含url时必填
│   └── 说明: 点击后打开的链接地址
│
├── enter
│   ├── 类型: boolean
│   ├── 取值: true / false
│   ├── 默认: true
│   ├── 必填: 否
│   └── 说明: 是否在本内容块末尾换行
│
└── color
    ├── text
    │   ├── 类型: hex
    │   ├── 取值: 6位十六进制颜色
    │   ├── 默认: 继承页面或全局content.color
    │   ├── 必填: 否
    │   └── 说明: 本内容块的文字颜色
    │
    └── background
        ├── 类型: hex
        ├── 取值: 6位十六进制颜色
        ├── 默认: 无(透明)
        ├── 必填: 否
        └── 说明: 本内容块的背景颜色
```

### 下拉框 (page.x.options.y.*)

**索引说明**: `y` 为下拉框编号，从1开始

```
page.x.options.y
├── title
│   ├── 类型: string
│   ├── 取值: 任意文本
│   ├── 默认: 无
│   ├── 必填: 是
│   └── 说明: 下拉框上方显示的标题
│
├── key
│   ├── 类型: string
│   ├── 取值: 有效的变量名
│   ├── 默认: 无
│   ├── 必填: 是
│   └── 说明: 完成时postMessage中使用的键名
│
├── default
│   ├── 类型: integer
│   ├── 取值: 存在的option编号(从1开始)
│   ├── 默认: 1
│   ├── 必填: 否
│   └── 说明: 默认选中的选项编号
│
└── option.z
    ├── 类型: string
    ├── 取值: 任意文本
    ├── 默认: 无
    ├── 必填: 至少一个
    └── 说明: 第z个选项的显示文本(z从1开始)
```

### 输入框 (page.x.input.y.*)

**索引说明**: `y` 为输入框编号，从1开始

```
page.x.input.y
├── title
│   ├── 类型: string
│   ├── 取值: 任意文本
│   ├── 默认: 无
│   ├── 必填: 是
│   └── 说明: 输入框上方显示的标题
│
├── key
│   ├── 类型: string
│   ├── 取值: 有效的变量名
│   ├── 默认: 无
│   ├── 必填: 是
│   └── 说明: 完成时postMessage中使用的键名
│
├── desc
│   ├── 类型: string
│   ├── 取值: 任意文本
│   ├── 默认: 无
│   ├── 必填: 否
│   └── 说明: 输入框的占位提示文字
│
└── nullable
    ├── 类型: boolean
    ├── 取值: true / false
    ├── 默认: false
    ├── 必填: 否
    └── 说明: 是否允许提交空值
```

### 按钮元素 (page.x.btn.y.*)

**索引说明**: `y` 为按钮编号，从1开始

```
page.x.btn.y
├── content
│   ├── 类型: string
│   ├── 取值: 任意文本
│   ├── 默认: 无
│   ├── 必填: 是
│   └── 说明: 按钮显示的文字
│
├── color
│   ├── 类型: hex
│   ├── 取值: 6位十六进制颜色
│   ├── 默认: 继承页面或全局btn.color
│   ├── 必填: 否
│   └── 说明: 按钮的背景颜色
│
├── content.color
│   ├── 类型: hex
│   ├── 取值: 6位十六进制颜色
│   ├── 默认: 继承页面或全局btn.content.color
│   ├── 必填: 否
│   └── 说明: 按钮的文字颜色
│
├── align
│   ├── 类型: enum
│   ├── 取值: left / middle / right
│   ├── 默认: middle
│   ├── 必填: 否
│   └── 说明: 按钮的对齐方式
│
├── page
│   ├── 类型: integer
│   ├── 取值: 存在的page编号
│   ├── 默认: 无
│   ├── 必填: 否
│   └── 说明: 点击后跳转的页面编号
│
├── mode
│   ├── 类型: enum
│   ├── 取值: redirect / cover
│   ├── 默认: cover
│   ├── 必填: 否
│   └── 说明: redirect=替换当前页 cover=覆盖弹出
│
├── reclickable
│   ├── 类型: boolean
│   ├── 取值: true / false
│   ├── 默认: true (设置message后锁定为false)
│   ├── 必填: 否
│   └── 说明: 是否可重复点击
│
├── killer
│   ├── 类型: boolean
│   ├── 取值: true / false
│   ├── 默认: false
│   ├── 必填: 否
│   └── 说明: 是否为结束按钮(点击后触发完成)
│
├── message
│   ├── 类型: string
│   ├── 取值: 任意文本
│   ├── 默认: 无
│   ├── 必填: 否
│   └── 说明: 点击后附加到postMessage的内容(设置后自动触发完成)
│
├── death
│   ├── type
│   │   ├── 类型: enum
│   │   ├── 取值: remove / disable
│   │   ├── 默认: disable
│   │   ├── 必填: 否
│   │   └── 说明: reclickable=false时点击后的行为
│   │
│   └── content
│       ├── 类型: string
│       ├── 取值: 任意文本
│       ├── 默认: 无
│       ├── 必填: 否
│       └── 说明: death.type=disable时替换显示的文字
│
└── animation
    ├── type
    │   ├── 类型: enum
    │   ├── 取值: slide / fade / rotate / zoomin / zoomout / random / none
    │   ├── 默认: 无
    │   ├── 必填: 否
    │   └── 说明: 打开页面时的动画类型
    │
    └── duration
        ├── 类型: integer
        ├── 取值: 正整数(毫秒)
        ├── 默认: 300
        ├── 必填: 否
        └── 说明: 动画持续时间
```

### 图片元素 (page.x.image.y.*)

**索引说明**: `y` 为图片编号，从1开始

```
page.x.image.y
├── url
│   ├── 类型: url
│   ├── 取值: 有效的图片URL
│   ├── 默认: 无
│   ├── 必填: 是
│   └── 说明: 图片的地址
│
├── align
│   ├── 类型: enum
│   ├── 取值: left / middle / right
│   ├── 默认: middle
│   ├── 必填: 否
│   └── 说明: 图片的对齐方式
│
├── size
│   ├── 类型: integer
│   ├── 取值: 0-100
│   ├── 默认: 继承页面或全局image.size
│   ├── 必填: 否
│   └── 说明: 图片宽度占容器的百分比
│
├── cut
│   ├── 类型: boolean
│   ├── 取值: true / false
│   ├── 默认: 继承页面或全局image.cut
│   ├── 必填: 否
│   └── 说明: 是否允许裁剪图片以适应宽度
│
├── click.type
│   ├── 类型: enum
│   ├── 取值: disable / modal / switch / detail
│   ├── 默认: disable
│   ├── 必填: 否
│   └── 说明: 点击图片的行为类型
│
│   类型说明:
│   - disable: 不可点击
│   - modal: 打开指定页面
│   - switch: 切换图片
│   - detail: 全屏查看原图
│
├── modal (click.type=modal时生效)
│   ├── modal
│   │   ├── 类型: integer
│   │   ├── 取值: 存在的page编号
│   │   ├── 默认: 无
│   │   ├── 必填: click.type=modal时必填
│   │   └── 说明: 点击后打开的页面编号
│   │
│   ├── mode
│   │   ├── 类型: enum
│   │   ├── 取值: redirect / cover
│   │   ├── 默认: cover
│   │   ├── 必填: 否
│   │   └── 说明: 打开模式
│   │
│   └── animation
│       ├── type
│       │   ├── 类型: enum
│       │   ├── 取值: slide / fade / rotate / zoomin / zoomout / random / none
│       │   ├── 默认: 无
│       │   ├── 必填: 否
│       │   └── 说明: 动画类型
│       │
│       └── duration
│           ├── 类型: integer
│           ├── 取值: 正整数(毫秒)
│           ├── 默认: 300
│           ├── 必填: 否
│           └── 说明: 动画时长
│
└── switch (click.type=switch时生效)
    ├── z
    │   ├── 类型: url
    │   ├── 取值: 有效的图片URL
    │   ├── 默认: 无
    │   ├── 必填: 至少一个(z从1开始)
    │   └── 说明: 第z张切换图片的地址
    │
    └── cycle
        ├── 类型: boolean
        ├── 取值: true / false
        ├── 默认: false
        ├── 必填: 否
        └── 说明: 是否循环切换(原图作为第0张参与循环)
```

### 行布局 (page.x.row.y.*)

**索引说明**: `y` 为行编号，`z` 为列编号，均从1开始

```
page.x.row.y
├── ratio
│   ├── 类型: string
│   ├── 取值: 数字:数字:... 格式 (如 1:2:1)
│   ├── 默认: 等分
│   ├── 必填: 否
│   └── 说明: 各列的宽度比例
│
└── z (列配置)
    ├── type
    │   ├── 类型: enum
    │   ├── 取值: content / btn / image
    │   ├── 默认: content
    │   ├── 必填: 否
    │   └── 说明: 列内容的类型
    │
    ├── align
    │   ├── 类型: enum
    │   ├── 取值: left / middle / right
    │   ├── 默认: middle
    │   ├── 必填: 否
    │   └── 说明: 水平对齐方式
    │
    ├── valign
    │   ├── 类型: enum
    │   ├── 取值: top / middle / bottom
    │   ├── 默认: middle
    │   ├── 必填: 否
    │   └── 说明: 垂直对齐方式
    │
    ├── content (type=content时)
    │   ├── (无后缀)
    │   │   ├── 类型: string
    │   │   ├── 取值: 任意文本
    │   │   ├── 默认: 无
    │   │   ├── 必填: type=content时建议填写
    │   │   └── 说明: 文字内容
    │   │
    │   ├── style
    │   │   ├── 类型: enum[]
    │   │   ├── 取值: quote\title\bold\tilt\underline\delete\url
    │   │   ├── 默认: 无
    │   │   ├── 必填: 否
    │   │   └── 说明: 文字样式
    │   │
    │   ├── url
    │   │   ├── 类型: url
    │   │   ├── 取值: http/https链接
    │   │   ├── 默认: 无
    │   │   ├── 必填: style含url时必填
    │   │   └── 说明: 点击打开的链接
    │   │
    │   └── color
    │       ├── text
    │       │   ├── 类型: hex
    │       │   ├── 默认: 白色
    │       │   └── 说明: 文字颜色
    │       │
    │       └── background
    │           ├── 类型: hex
    │           ├── 默认: 透明
    │           └── 说明: 背景颜色
    │
    ├── btn (type=btn时)
    │   ├── content
    │   │   ├── 类型: string
    │   │   ├── 必填: 是
    │   │   └── 说明: 按钮文字
    │   │
    │   ├── color
    │   │   ├── 类型: hex
    │   │   ├── 默认: 继承btn.color
    │   │   └── 说明: 按钮背景颜色
    │   │
    │   ├── page
    │   │   ├── 类型: integer
    │   │   ├── 取值: 存在的page编号
    │   │   └── 说明: 跳转页面
    │   │
    │   ├── mode
    │   │   ├── 类型: enum
    │   │   ├── 取值: redirect / cover
    │   │   ├── 默认: cover
    │   │   └── 说明: 打开模式
    │   │
    │   ├── reclickable
    │   │   ├── 类型: boolean
    │   │   ├── 默认: true
    │   │   └── 说明: 是否可重复点击
    │   │
    │   ├── killer
    │   │   ├── 类型: boolean
    │   │   ├── 默认: false
    │   │   └── 说明: 是否为结束按钮
    │   │
    │   ├── message
    │   │   ├── 类型: string
    │   │   └── 说明: 附加到postMessage的内容
    │   │
    │   ├── death.type
    │   │   ├── 类型: enum
    │   │   ├── 取值: remove / disable
    │   │   ├── 默认: disable
    │   │   └── 说明: 不可重复点击后行为
    │   │
    │   ├── death.content
    │   │   ├── 类型: string
    │   │   └── 说明: disable时替换文字
    │   │
    │   ├── animation.type
    │   │   ├── 类型: enum
    │   │   ├── 取值: slide/fade/rotate/zoomin/zoomout/random/none
    │   │   └── 说明: 动画类型
    │   │
    │   └── animation.duration
    │       ├── 类型: integer
    │       ├── 默认: 300
    │       └── 说明: 动画时长(毫秒)
    │
    └── image (type=image时)
        ├── url
        │   ├── 类型: url
        │   ├── 必填: 是
        │   └── 说明: 图片地址
        │
        ├── size
        │   ├── 类型: integer
        │   ├── 取值: 0-100
        │   ├── 默认: 100
        │   └── 说明: 图片宽度百分比
        │
        ├── cut
        │   ├── 类型: boolean
        │   ├── 默认: false
        │   └── 说明: 是否裁剪
        │
        ├── click.type
        │   ├── 类型: enum
        │   ├── 取值: disable / modal / switch / detail
        │   ├── 默认: disable
        │   └── 说明: 点击行为
        │
        ├── modal.modal
        │   ├── 类型: integer
        │   └── 说明: 打开的页面(click.type=modal时)
        │
        ├── modal.mode
        │   ├── 类型: enum
        │   ├── 取值: redirect / cover
        │   └── 说明: 打开模式
        │
        ├── modal.animation.type
        │   ├── 类型: enum
        │   └── 说明: 动画类型
        │
        ├── modal.animation.duration
        │   ├── 类型: integer
        │   └── 说明: 动画时长
        │
        ├── switch.w
        │   ├── 类型: url
        │   └── 说明: 第w张切换图片(click.type=switch时)
        │
        └── switch.cycle
            ├── 类型: boolean
            ├── 默认: false
            └── 说明: 是否循环切换
```

## 界面布局说明

```
┌─────────────────────────────────────┐
│            modal-header             │  ← title
├─────────────────────────────────────┤
│                                     │
│            modal-content            │  ← content/options/input/btn/image/row
│           (可滚动区域)               │
│                                     │
├─────────────────────────────────────┤
│  [上一页]    [隐藏]    [下一页/完成]  │  ← modal-footer
└─────────────────────────────────────┘
```

- **第一页**: 不显示上一页按钮
- **最后一页**: 下一页按钮显示为"完成"
- **快捷键**: Enter=下一页, Escape=隐藏

## 示例

```
[WELCOME:page.background.color=262624;
page.modal.color=30302e;
page.modal.transparency=50;
page.modal.blur=100;
page.btn.color=c6613f;
page.1.title=欢迎使用;
page.1.content.1=这是第一个内容块;
page.1.content.1.style=title;
page.1.content.2=这是普通文本;
page.1.input.1.title=请输入您的名字;
page.1.input.1.key=name;
page.1.options.1.title=选择一个选项;
page.1.options.1.key=choice;
page.1.options.1.option.1=选项A;
page.1.options.1.option.2=选项B;
page.2.title=第二页;
page.2.content.1=感谢使用！;
page.2.content.1.style=title]
```
