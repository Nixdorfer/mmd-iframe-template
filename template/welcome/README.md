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
| page.x.next.content | 下一步按钮文字（最后一页默认"完成"，其他默认"下一页"）|
| page.x.last.content | 上一页按钮文字（默认"上一页"，第一页不显示）|
| page.x.hide.content | 隐藏按钮文字（默认"隐藏"）|
| page.x.background.color | 页面背景颜色(6位hex) |
| page.x.modal.color | 页面窗口颜色(6位hex) |
| page.x.btn.color | 页面按钮颜色(6位hex) |
| page.x.animation.type | 从第x页到第x+1页的过渡动画（最后一页则为消失动画）|
| page.x.animation.duration | 动画持续时间（毫秒，默认300）|

**动画类型**：
- slide - 滑动
- fade - 渐隐
- rotate - 旋转
- zoomin - 放大进入
- zoomout - 缩小进入
- none - 无动画

### 元素排序

页面内的元素（内容、下拉框、输入框）按参数定义顺序显示。例如：
```
page.1.content.1=标题;page.1.options.1.title=选项;page.1.content.2=说明
```
显示顺序为：标题 → 下拉框 → 说明

### 内容配置

内容索引 `y` 从 1 开始，不同 `y` 的内容之间会有换行，每个内容内可用 `\n` 换行

| 参数 | 说明 |
|------|------|
| page.content.align | 所有页面的默认对齐方式 (left/right/middle，默认middle) |
| page.content.style | 所有页面的默认样式 |
| page.x.content.align | 第x页的默认对齐方式 |
| page.x.content.style | 第x页的默认样式 |
| page.x.content.y | 第y个内容块的文字 |
| page.x.content.y.align | 第y个内容块的对齐方式 (left/right/middle) |
| page.x.content.y.style | 第y个内容块的样式 |
| page.x.content.y.url | 当style=url时，指定要打开的链接 |
| page.x.content.y.enter | 是否在末尾换行（true/false，默认true）|

**样式选项**（多个样式用 `\` 分隔）：
- quote - 引用样式（左边框+斜体）
- title - 标题样式（加大加粗）
- bold - 加粗
- tilt - 倾斜
- underline - 下划线
- delete - 删除线
- url - 链接样式（蓝色下划线，点击弹出确认框后打开链接，需配合.url参数指定链接地址）

**兼容模式**：也支持 `page.x.content` 作为单一内容（等同于 `page.x.content.1`）

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

### 界面布局

- **窗口结构**：header（标题）+ content（可滚动内容区）+ footer（按钮区）
- **按钮排列**：上一页（左）| 隐藏（中/灰色）| 下一页/完成（右）
- **第一页**：不显示上一页按钮
- **最后一页**：下一页按钮显示为"完成"

## 示例

``` REGEX_FLAG
[WELCOME:page.1.title=欢迎来到Nix的自定义首页;page.1.content.1.align=left;page.1.content.1=在这里您可以写入您的故事详情\n使用这个字符可以换行(而且两行会比较紧);page.1.content.2=再写一个content也可以换行(两行中间会有点空隙);page.1.content.3=align可以设置对齐方式有leftright和middle可选;page.1.content.3.align=middle;page.1.content.4=page.x.content.align/style可以设置这一页的默认对齐/样式;page.1.content.5=page.content.align/style可以设置所有页的默认对齐/样式;page.1.content.6=style可以设置样式;page.1.content.6.style=title;page.1.content.7=有bold加粗tilt倾斜title标题quote引用可选;page.1.input.1.title=这里是输入框的标题;page.1.input.1.key=input1;page.1.input.1.desc=这里可以写输入框的描述;page.1.options.1.title=这里是选项的标题;page.1.options.1.key=options1;page.1.options.1.option.1=选项A;page.1.options.1.option.2=选项B;page.1.options.1.default=1;page.1.content.8=这就是第一页的全部内容;page.2.title=这里是第二页的标题;page.2.content.1=最后一页的继续按钮如果您未设置会被自动替换为“完成”;page.2.content.3=详细介绍和参数说明请查看;page.2.content.3.enter=false;page.2.content.4.style=url;page.2.content.4=项目说明书;page.2.content.4.url=https://github.com/Nixdorfer/mmd-iframe-template/blob/main/template/welcome/README.md;page.2.content.2.style=title;page.2.content.2=祝您使用愉快！]
```