export interface PanelConfig {
	id: string
	title: string
	position: 'left' | 'right' | 'bottom'
	width?: number
	height?: number
	collapsible?: boolean
	collapsed?: boolean
}

export class Panel {
	el: HTMLElement
	cfg: PanelConfig
	content: HTMLElement
	header: HTMLElement
	collapsed: boolean
	onCollapse: ((collapsed: boolean) => void) | null

	constructor(container: HTMLElement, cfg: PanelConfig) {
		this.cfg = cfg
		this.collapsed = cfg.collapsed ?? false
		this.onCollapse = null
		this.el = document.createElement('div')
		this.el.className = `panel panel-${cfg.position}`
		this.el.id = cfg.id
		this.header = document.createElement('div')
		this.header.className = 'panel-hdr'
		this.content = document.createElement('div')
		this.content.className = 'panel-ctt'
		this.el.appendChild(this.header)
		this.el.appendChild(this.content)
		container.appendChild(this.el)
		this.iniStyle()
		this.render()
	}

	private iniStyle() {
		if (document.getElementById('panel-style')) return
		const style = document.createElement('style')
		style.id = 'panel-style'
		style.textContent = `
.panel {
	background: #252525;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.panel-left, .panel-right {
	width: 280px;
	height: 100%;
	border-right: 1px solid #1a1a1a;
}

.panel-right {
	border-right: none;
	border-left: 1px solid #1a1a1a;
}

.panel-bottom {
	width: 100%;
	height: 200px;
	border-top: 1px solid #1a1a1a;
}

.panel.clp {
	width: 32px !important;
	height: 32px !important;
}

.panel-hdr {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 32px;
	padding: 0 8px;
	background: #2a2a2a;
	border-bottom: 1px solid #1a1a1a;
	cursor: pointer;
	user-select: none;
}

.panel-hdr-txt {
	color: #ccc;
	font-size: 12px;
	font-weight: 500;
}

.panel-hdr-btn {
	background: none;
	border: none;
	color: #888;
	cursor: pointer;
	font-size: 14px;
}

.panel-hdr-btn:hover {
	color: #ccc;
}

.panel-ctt {
	flex: 1;
	overflow-y: auto;
	padding: 8px;
}

.panel.clp .panel-ctt {
	display: none;
}

.panel-section {
	margin-bottom: 12px;
}

.panel-section-hdr {
	color: #888;
	font-size: 11px;
	text-transform: uppercase;
	margin-bottom: 8px;
}

.panel-row {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 4px;
}

.panel-lbl {
	color: #999;
	font-size: 12px;
	width: 80px;
	flex-shrink: 0;
}

.panel-ipt {
	flex: 1;
	height: 24px;
	background: #1a1a1a;
	border: 1px solid #3a3a3a;
	border-radius: 4px;
	color: #ccc;
	padding: 0 8px;
	font-size: 12px;
}

.panel-ipt:focus {
	outline: none;
	border-color: #4a6a8a;
}

.panel-sel {
	flex: 1;
	height: 24px;
	background: #1a1a1a;
	border: 1px solid #3a3a3a;
	border-radius: 4px;
	color: #ccc;
	padding: 0 4px;
	font-size: 12px;
}

.panel-btn {
	height: 28px;
	background: #3a3a3a;
	border: none;
	border-radius: 4px;
	color: #ccc;
	padding: 0 12px;
	font-size: 12px;
	cursor: pointer;
}

.panel-btn:hover {
	background: #4a4a4a;
}

.panel-btn.pri {
	background: #4a6a8a;
}

.panel-btn.pri:hover {
	background: #5a7a9a;
}
`
		document.head.appendChild(style)
	}

	render() {
		this.header.innerHTML = `
			<span class="panel-hdr-txt">${this.cfg.title}</span>
			${this.cfg.collapsible ? '<button class="panel-hdr-btn">▼</button>' : ''}
		`
		if (this.cfg.collapsible) {
			this.header.onclick = () => this.toggle()
		}
		if (this.collapsed) {
			this.el.classList.add('clp')
		} else {
			this.el.classList.remove('clp')
		}
	}

	toggle() {
		this.collapsed = !this.collapsed
		this.render()
		this.onCollapse?.(this.collapsed)
	}

	setContent(html: string) {
		this.content.innerHTML = html
	}

	addSection(title: string): HTMLElement {
		const section = document.createElement('div')
		section.className = 'panel-section'
		section.innerHTML = `<div class="panel-section-hdr">${title}</div>`
		this.content.appendChild(section)
		return section
	}

	addRow(label: string, input: HTMLElement): HTMLElement {
		const row = document.createElement('div')
		row.className = 'panel-row'
		row.innerHTML = `<span class="panel-lbl">${label}</span>`
		row.appendChild(input)
		this.content.appendChild(row)
		return row
	}

	createInput(type: string, value: string, onChange?: (val: string) => void): HTMLInputElement {
		const ipt = document.createElement('input')
		ipt.type = type
		ipt.className = 'panel-ipt'
		ipt.value = value
		if (onChange) {
			ipt.onchange = () => onChange(ipt.value)
		}
		return ipt
	}

	createSelect(options: { value: string; label: string }[], selected: string, onChange?: (val: string) => void): HTMLSelectElement {
		const sel = document.createElement('select')
		sel.className = 'panel-sel'
		for (const opt of options) {
			const option = document.createElement('option')
			option.value = opt.value
			option.textContent = opt.label
			if (opt.value === selected) option.selected = true
			sel.appendChild(option)
		}
		if (onChange) {
			sel.onchange = () => onChange(sel.value)
		}
		return sel
	}

	createButton(label: string, primary: boolean, onClick: () => void): HTMLButtonElement {
		const btn = document.createElement('button')
		btn.className = 'panel-btn' + (primary ? ' pri' : '')
		btn.textContent = label
		btn.onclick = onClick
		return btn
	}
}
