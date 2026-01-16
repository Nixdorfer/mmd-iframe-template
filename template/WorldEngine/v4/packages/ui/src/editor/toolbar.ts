export interface ToolbarItem {
	id: string
	icon: string
	label: string
	shortcut?: string
	onClick: () => void
	active?: boolean
	disabled?: boolean
}

export interface ToolbarGroup {
	id: string
	items: ToolbarItem[]
}

export class Toolbar {
	el: HTMLElement
	groups: ToolbarGroup[]
	onItemClick: ((id: string) => void) | null

	constructor(container: HTMLElement) {
		this.el = document.createElement('div')
		this.el.className = 'toolbar'
		this.groups = []
		this.onItemClick = null
		container.appendChild(this.el)
		this.iniStyle()
	}

	private iniStyle() {
		const style = document.createElement('style')
		style.textContent = `
.toolbar {
	display: flex;
	align-items: center;
	height: 40px;
	background: #2a2a2a;
	border-bottom: 1px solid #1a1a1a;
	padding: 0 8px;
	gap: 4px;
}

.toolbar-group {
	display: flex;
	gap: 2px;
	padding: 0 8px;
	border-right: 1px solid #3a3a3a;
}

.toolbar-group:last-child {
	border-right: none;
}

.toolbar-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	background: transparent;
	border: none;
	border-radius: 4px;
	color: #ccc;
	cursor: pointer;
	font-size: 16px;
}

.toolbar-btn:hover {
	background: #3a3a3a;
}

.toolbar-btn.act {
	background: #4a6a8a;
	color: #fff;
}

.toolbar-btn.dis {
	opacity: 0.4;
	cursor: not-allowed;
}

.toolbar-btn:hover .toolbar-tip {
	display: block;
}

.toolbar-tip {
	display: none;
	position: absolute;
	top: 100%;
	left: 50%;
	transform: translateX(-50%);
	background: #1a1a1a;
	color: #ccc;
	padding: 4px 8px;
	border-radius: 4px;
	font-size: 12px;
	white-space: nowrap;
	z-index: 100;
}
`
		document.head.appendChild(style)
	}

	addGroup(group: ToolbarGroup) {
		this.groups.push(group)
		this.render()
	}

	setItemActive(id: string, active: boolean) {
		for (const group of this.groups) {
			const item = group.items.find(i => i.id === id)
			if (item) {
				item.active = active
				break
			}
		}
		this.render()
	}

	setItemDisabled(id: string, disabled: boolean) {
		for (const group of this.groups) {
			const item = group.items.find(i => i.id === id)
			if (item) {
				item.disabled = disabled
				break
			}
		}
		this.render()
	}

	render() {
		this.el.innerHTML = ''
		for (const group of this.groups) {
			const groupEl = document.createElement('div')
			groupEl.className = 'toolbar-group'
			for (const item of group.items) {
				const btn = document.createElement('button')
				btn.className = 'toolbar-btn'
				if (item.active) btn.classList.add('act')
				if (item.disabled) btn.classList.add('dis')
				btn.innerHTML = item.icon
				btn.title = item.label + (item.shortcut ? ` (${item.shortcut})` : '')
				if (!item.disabled) {
					btn.onclick = () => {
						item.onClick()
						this.onItemClick?.(item.id)
					}
				}
				groupEl.appendChild(btn)
			}
			this.el.appendChild(groupEl)
		}
	}
}
