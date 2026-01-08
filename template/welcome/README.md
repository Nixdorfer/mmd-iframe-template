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
| page.background.color | 背景颜色(6位hex) | 050505 |
| page.background.image.pc | PC端背景图片URL | - |
| page.background.image.mobile | 移动端背景图片URL | - |
| page.background.image.cut | 背景图片是否裁剪(true/false) | false |
| page.modal.color | 窗口颜色(6位hex) | 0d0d0d |
| page.modal.transparency | 窗口透明度(0-100) | 0 |
| page.modal.blur | 窗口模糊度(0-100) | 0 |
| page.btn.color | 按钮颜色(6位hex) | 166d3b |
| page.btn.transparency | 按钮透明度(0-100) | 0 |
| page.btn.blur | 按钮模糊度(0-100) | 0 |

### 全局内容样式

| 参数 | 说明 | 默认值 |
|------|------|--------|
| page.content.align | 所有页面的默认对齐方式 | middle |
| page.content.style | 所有页面的默认样式 | - |
| page.content.distance | 所有页面的默认间距 | - |
| page.animation.type | 所有页面的默认动画类型 | - |
| page.animation.duration | 所有页面的默认动画时长(毫秒) | 300 |
| page.image.size | 所有图片的默认宽度百分比(0-100) | 100 |
| page.image.cut | 所有图片是否允许上下裁剪(true/false) | false |

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
| page.x.modal.transparency | 窗口透明度(0-100，越大越透明，默认0) |
| page.x.modal.blur | 窗口模糊度(0-100，越大越模糊，默认0) |
| page.x.btn.color | 页面按钮颜色(6位hex) |
| page.x.btn.transparency | 按钮透明度(0-100，越大越透明，默认0) |
| page.x.btn.blur | 按钮模糊度(0-100，越大越模糊，默认0) |
| page.x.content.align | 第x页的默认对齐方式 |
| page.x.content.style | 第x页的默认样式 |
| page.x.content.distance | 第x页的默认间距 |
| page.x.animation.type | 从第x页到第x+1页的过渡动画 |
| page.x.animation.duration | 动画持续时间（毫秒，默认300）|
| page.x.image.size | 第x页图片的默认宽度百分比(0-100) |
| page.x.image.cut | 第x页图片是否允许上下裁剪(true/false) |

**动画类型**：slide/fade/rotate/zoomin/zoomout/none

**间距类型**：none/min/1/2/3/max

**透明度(transparency)**：整数0-100，0为完全不透明，100为完全透明，通过rgba背景色实现（仅背景透明，内容不透明）

**模糊度(blur)**：整数0-100，0为不模糊，100为最大模糊(20px)，通过CSS backdrop-filter:blur实现

### 内容配置

内容索引 `y` 从 1 开始

| 参数 | 说明 |
|------|------|
| page.x.content.y | 第y个内容块的文字 |
| page.x.content.y.align | 对齐方式 (left/right/middle) |
| page.x.content.y.style | 样式（多个用`\`分隔）|
| page.x.content.y.distance | 间距 (none/min/1/2/3/max) |
| page.x.content.y.url | 当style含url时，指定要打开的链接 |
| page.x.content.y.enter | 是否在末尾换行（true/false，默认true）|
| page.x.content.y.color.text | 文字颜色(6位hex) |
| page.x.content.y.color.background | 文字背景颜色(6位hex) |

**样式选项**：quote/title/bold/tilt/underline/delete/url

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

### 按钮元素配置

按钮索引 `y` 从 1 开始

| 参数 | 说明 |
|------|------|
| page.x.btn.y.content | 按钮文字 |
| page.x.btn.y.color | 按钮颜色(6位hex) |
| page.x.btn.y.align | 对齐方式 (left/right/middle) |
| page.x.btn.y.page | 点击后打开的页面编号 |
| page.x.btn.y.mode | 打开模式 (redirect/cover，默认cover) |
| page.x.btn.y.reclickable | 是否可重复点击（true/false，默认true）|
| page.x.btn.y.killer | 是否为结束按钮(true/false，默认false，点击后视为完成) |
| page.x.btn.y.message | 点击后附加到postMessage的内容(填入后reclickable锁定为false) |
| page.x.btn.y.death.type | 不可重复点击后的行为 (remove/disable，默认disable) |
| page.x.btn.y.death.content | disable时替换的文字 |
| page.x.btn.y.animation.type | 打开页面的动画类型 |
| page.x.btn.y.animation.duration | 动画时长(毫秒) |

### 图片元素配置

图片索引 `y` 从 1 开始

| 参数 | 说明 |
|------|------|
| page.x.image.y.url | 图片地址 |
| page.x.image.y.align | 对齐方式 (left/right/middle，默认middle) |
| page.x.image.y.size | 图片宽度百分比(0-100) |
| page.x.image.y.cut | 是否允许上下裁剪(true/false) |
| page.x.image.y.click.type | 点击类型 (disable/modal/switch/detail，默认disable) |

**modal模式参数**：
| 参数 | 说明 |
|------|------|
| page.x.image.y.modal.modal | 打开的页面编号 |
| page.x.image.y.modal.mode | 打开模式 (redirect/cover) |
| page.x.image.y.modal.animation.type | 动画类型 |
| page.x.image.y.modal.animation.duration | 动画时长 |

**switch模式参数**：
| 参数 | 说明 |
|------|------|
| page.x.image.y.switch.z | 第z张切换图片的地址 |
| page.x.image.y.switch.cycle | 是否循环（true/false，默认false，循环时原图作为第0张参与循环）|

**detail模式**：点击图片后全屏展示原图，再次点击任意处关闭

### 行布局配置

行索引 `y` 从 1 开始，列索引 `z` 从 1 开始

| 参数 | 说明 |
|------|------|
| page.x.row.y.ratio | 列宽比例，用`:`分隔（如1:2:1）|
| page.x.row.y.z.type | 列内容类型 (content/btn/image) |
| page.x.row.y.z.align | 水平对齐 (left/right/middle，默认middle) |
| page.x.row.y.z.valign | 垂直对齐 (top/middle/bottom，默认middle) |

**content类型参数**：
| 参数 | 说明 |
|------|------|
| page.x.row.y.z.content | 文字内容 |
| page.x.row.y.z.content.style | 样式 |
| page.x.row.y.z.content.url | 链接地址 |
| page.x.row.y.z.content.color.text | 文字颜色(6位hex) |
| page.x.row.y.z.content.color.background | 文字背景颜色(6位hex) |

**btn类型参数**：
| 参数 | 说明 |
|------|------|
| page.x.row.y.z.btn.content | 按钮文字 |
| page.x.row.y.z.btn.color | 按钮颜色 |
| page.x.row.y.z.btn.page | 打开页面编号 |
| page.x.row.y.z.btn.mode | 打开模式 |
| page.x.row.y.z.btn.reclickable | 是否可重复点击 |
| page.x.row.y.z.btn.killer | 是否为结束按钮 |
| page.x.row.y.z.btn.message | 点击后附加到postMessage的内容 |
| page.x.row.y.z.btn.death.type | 不可重复点击后行为 |
| page.x.row.y.z.btn.death.content | disable时替换文字 |
| page.x.row.y.z.btn.animation.type | 动画类型 |
| page.x.row.y.z.btn.animation.duration | 动画时长 |

**image类型参数**：
| 参数 | 说明 |
|------|------|
| page.x.row.y.z.image.url | 图片地址 |
| page.x.row.y.z.image.size | 图片宽度百分比(0-100) |
| page.x.row.y.z.image.cut | 是否允许上下裁剪(true/false) |
| page.x.row.y.z.image.click.type | 点击类型 (disable/modal/switch/detail) |
| page.x.row.y.z.image.modal.modal | 打开页面编号 |
| page.x.row.y.z.image.modal.mode | 打开模式 |
| page.x.row.y.z.image.modal.animation.type | 动画类型 |
| page.x.row.y.z.image.modal.animation.duration | 动画时长 |
| page.x.row.y.z.image.switch.w | 第w张切换图片 |
| page.x.row.y.z.image.switch.cycle | 是否循环（循环时原图作为第0张参与循环）|

### 行高度同步

| 参数 | 说明 |
|------|------|
| page.x.row.height | 需要同步高度的行ID组，格式如`1,2:3,4`表示行1和2同高，行3和4同高 |

### 界面布局

- **窗口结构**：header（标题）+ content（可滚动内容区）+ footer（按钮区）
- **按钮排列**：上一页（左）| 隐藏（中/灰色）| 下一页/完成（右）
- **第一页**：不显示上一页按钮
- **最后一页**：下一页按钮显示为"完成"
- **快捷键**：Enter=下一页，Escape=隐藏

## 示例

``` REGEX_FLAG
[WELCOME:page.background.color=262624;
page.background.image.pc=https://github.com/Nixdorfer/mmd-iframe-template/blob/main/template/welcome/src/mobile.png?raw=true;
page.background.image.mobile=https://github.com/Nixdorfer/mmd-iframe-template/blob/main/template/welcome/src/mobile.png?raw=true;
page.modal.color=30302e;
page.modal.transparency=50;
page.modal.blur=100;
page.btn.color=c6613f;
page.btn.transparency=25;
page.btn.blur=100;
page.1.title=欢迎来到Nix的自定义首页;
page.1.content.100=哈哈🐮人 很奇妙吧！;
page.1.content.100.style=title;
page.1.content.100.color.text=ff0000;
page.1.image.1.url=https://static.catai.wiki/loading.webp;
page.1.image.1.align=middle;
page.1.image.1.click.type=switch;
page.1.image.1.switch.cycle=true;
page.1.image.1.switch.2=https://static.catai.wiki/default/user.webp;
page.1.image.1.switch.3=https://static.catai.wiki/default/install-emtry.webp;
page.1.content.1.align=left;
page.1.content.1=在这里您可以写入您的故事详情\n使用这个字符可以换行;
page.1.content.2=再写一个content也可以换行;
page.1.content.3=align可以设置对齐方式有leftright和middle可选;
page.1.content.3.align=middle;
page.1.content.4=pagexcontentalign/style可以设置这一页的默认对齐/样式;
page.1.content.5=pagecontentalign/style可以设置所有页的默认对齐/样式;
page.1.content.6=style可以设置样式;
page.1.content.6.style=title;
page.1.content.7=有bold加粗tilt倾斜title标题quote引用可选;
page.1.input.1.title=这里是输入框的标题;
page.1.input.1.key=input1;
page.1.input.1.desc=这里可以写输入框的描述;
page.1.options.1.title=这里是选项的标题;
page.1.options.1.key=options1;
page.1.options.1.option.1=选项A;
page.1.options.1.option.2=选项B;
page.1.options.1.default=1;
page.1.content.8=这就是第一页的全部内容;
page.2.title=这里是第二页的标题;
page.2.row.1.ratio=1:2;
page.2.row.2.ratio=1:2;
page.2.row.1.1.type=image;
page.2.row.1.2.type=content;
page.2.row.2.1.type=content;
page.2.row.2.2.type=content;
page.2.row.1.1.image.url=https://static.catai.wiki/default/install-emtry.webp;
page.2.row.1.1.align=middle;
page.2.row.1.1.valign=middle;
page.2.row.1.2.align=middle;
page.2.row.1.2.valign=middle;
page.2.row.2.1.align=middle;
page.2.row.2.1.valign=middle;
page.2.row.2.2.align=middle;
page.2.row.2.2.valign=middle;
page.2.row.1.2.content=Row1Line2;
page.2.row.2.1.content=Row2Line1;
page.2.row.2.2.content=Row2Line2;
page.2.row.height=1,2;
page.2.content.1=最后一页的继续按钮如果您未设置会被自动替换为“完成”;
page.2.content.3=详细介绍和参数说明请查看：;
page.2.content.3.enter=false;
page.2.content.4.style=url;
page.2.content.4=项目说明书;
page.2.content.4.url=https://github.com/Nixdorfer/mmd-iframe-template/blob/main/template/welcome/README.md;
page.2.content.2.style=title;
page.2.content.2=祝您使用愉快！]
```
