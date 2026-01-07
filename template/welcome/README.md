# Welcome 模块参数说明

该项目为您的卡片定义了一个高度可自定义的启动界面

## 使用方式

启动正则表达式为 `/\[WELCOME:(.+)\]/`

在文本中插入 `[WELCOME:k1=v1;k2=v2;kx=vx]` 样的指令即可

如果参数值包含 `;` 或 `=`，需要进行URL编码：
- `;` → `%3B`
- `=` → `%3D`

## 参数列表

### 行为控制

| 参数 | 说明 | 默认值 |
|------|------|--------|
| autoExpand | 是否自动展开页面 | true |
| allowReplay | 是否允许重复操作 | true |

### 按钮配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| btnLoadContent | 加载中显示文字 | 正在获取资源... |
| btnLoadColor | 加载中颜色(6位hex) | b8860b |
| btnFailContent | 失败时显示文字 | 获取远程资源失败 点击重试 |
| btnFailColor | 失败时颜色(6位hex) | 8b0000 |
| btnContinueContent | 可点击时显示文字 | 打开操作面板 |
| btnContinueColor | 可点击时颜色(6位hex) | 166d3b |
| btnDoneContent | 完成后显示文字 | 您已完成了该轮操作 |
| btnDoneColor | 完成后颜色(6位hex) | 666666 |

### 全局颜色

| 参数 | 说明 | 默认值 |
|------|------|--------|
| backgroundColor | 背景颜色(6位hex) | 050505 |
| modalColor | 窗口颜色(6位hex) | 0d0d0d |
| btnColor | 按钮颜色(6位hex) | 166d3b |

### 页面配置

页面索引 `x` 从 1 开始

| 参数 | 说明 |
|------|------|
| page.x.title | 页面标题 |
| page.x.content | 页面内容 |
| page.x.next.content | 下一步按钮文字（最后一页默认"完成"，其他默认"下一页"）|
| page.x.hide.content | 隐藏按钮文字（默认"隐藏"）|
| page.x.background.color | 页面背景颜色(6位hex) |
| page.x.modal.color | 页面窗口颜色(6位hex) |
| page.x.btn.color | 页面按钮颜色(6位hex) |

### 下拉框配置

下拉框索引 `y` 从 1 开始，选项索引 `z` 从 1 开始

| 参数 | 说明 |
|------|------|
| page.x.options.y.title | 下拉框标题 |
| page.x.options.y.key | 返回数据时的键名 |
| page.x.options.y.default | 默认选中第几项（从1开始）|
| page.x.options.y.option.z | 第z个选项的内容 |

### 输入框配置

输入框索引 `y` 从 1 开始

| 参数 | 说明 |
|------|------|
| page.x.input.y.title | 输入框标题 |
| page.x.input.y.desc | 输入框占位提示文字 |
| page.x.input.y.key | 返回数据时的键名 |
| page.x.input.y.nullable | 是否允许为空（true/false，默认false）|

## 示例

```
[WELCOME:autoExpand=false;page.1.title=欢迎;page.1.content=请填写以下信息;page.1.input.1.title=您的名字;page.1.input.1.key=name;page.1.input.1.desc=请输入您的名字;page.1.options.1.title=选择选项;page.1.options.1.key=choice;page.1.options.1.option.1=选项A;page.1.options.1.option.2=选项B;page.1.options.1.default=1]
```

## 多页面示例

```
[WELCOME:page.1.title=第一页;page.1.input.1.title=姓名;page.1.input.1.key=name;page.1.next.content=继续;page.2.title=第二页;page.2.options.1.title=爱好;page.2.options.1.key=hobby;page.2.options.1.option.1=阅读;page.2.options.1.option.2=运动;page.2.options.1.option.3=音乐]
```
