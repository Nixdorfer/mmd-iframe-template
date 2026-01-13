function genId() {
	return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}
function renderItemTypes() {
	const list = document.getElementById('itemTypesList')
	list.innerHTML = ''
	for (const type of state.itemTypes) {
		const card = document.createElement('div')
		card.className = 'item-type-card collapse-panel'
		card.innerHTML = `
			<div class="collapse-header">
				<svg class="arrow" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
				<span style="flex:1">${type.name} (${type.id})</span>
				<button class="remove-btn" data-id="${type.id}">
					<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
				</button>
			</div>
			<div class="collapse-body">
				<div class="prop-row">
					<label>ID</label>
					<input type="text" value="${type.id}" data-field="id" data-type-id="${type.id}">
				</div>
				<div class="prop-row">
					<label>名称</label>
					<input type="text" value="${type.name}" data-field="name" data-type-id="${type.id}">
				</div>
				<div class="prop-row">
					<label>标签</label>
					<div class="tags-row" data-type-id="${type.id}">
						${type.tags.map(t => `<span class="tag">${t}<button class="tag-remove" data-tag="${t}">x</button></span>`).join('')}
						<button class="ed-btn sm add-indicator" data-action="add-tag"></button>
					</div>
				</div>
				<div class="prop-row">
					<label>继承</label>
					<select data-field="parent" data-type-id="${type.id}">
						<option value="">无</option>
						${state.itemTypes.filter(t => t.id !== type.id).map(t => `<option value="${t.id}" ${type.parent === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
					</select>
				</div>
				<div class="props-section">
					<div class="props-section-header">
						<span>属性</span>
						<button class="ed-btn sm add-indicator" data-action="add-prop" data-type-id="${type.id}"></button>
					</div>
					<div class="sortable-list" data-props-list="${type.id}">
						${type.properties.map((p, pi) => renderPropertyItem(type.id, p, pi)).join('')}
					</div>
				</div>
			</div>
		`
		card.querySelector('.collapse-header').addEventListener('click', (e) => {
			if (e.target.closest('.remove-btn')) return
			card.querySelector('.collapse-header').classList.toggle('open')
			card.querySelector('.collapse-body').classList.toggle('open')
		})
		card.querySelector('.remove-btn').addEventListener('click', () => {
			state.itemTypes = state.itemTypes.filter(t => t.id !== type.id)
			renderItemTypes()
			renderItemInstances()
		})
		list.appendChild(card)
	}
	bindItemTypeEvents()
}
function renderPropertyItem(typeId, prop, index) {
	const isEnum = prop.type === 'enum'
	return `
		<div class="sortable-item" data-prop-idx="${index}" draggable="true">
			<span class="drag-handle">≡</span>
			<span class="item-content">${prop.name} (${prop.type}${!isEnum ? `: ${prop.min}-${prop.max}` : ''})</span>
			<button class="ed-btn sm" data-action="edit-prop" data-type-id="${typeId}" data-prop-idx="${index}">
				<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
			</button>
			<button class="remove-btn" data-action="remove-prop" data-type-id="${typeId}" data-prop-idx="${index}">
				<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
			</button>
		</div>
	`
}
function bindItemTypeEvents() {
	document.querySelectorAll('[data-field][data-type-id]').forEach(el => {
		el.addEventListener('change', (e) => {
			const typeId = el.dataset.typeId
			const field = el.dataset.field
			const type = state.itemTypes.find(t => t.id === typeId)
			if (type) {
				if (field === 'id') {
					const oldId = type.id
					type.id = e.target.value
					state.items.forEach(item => {
						if (item.typeId === oldId) item.typeId = type.id
					})
				} else if (field === 'parent') {
					type.parent = e.target.value || null
				} else {
					type[field] = e.target.value
				}
				renderItemTypes()
				renderItemInstances()
			}
		})
	})
	document.querySelectorAll('.tags-row').forEach(row => {
		const typeId = row.dataset.typeId
		row.querySelectorAll('.tag-remove').forEach(btn => {
			btn.addEventListener('click', () => {
				const tag = btn.dataset.tag
				const type = state.itemTypes.find(t => t.id === typeId)
				if (type) {
					type.tags = type.tags.filter(t => t !== tag)
					renderItemTypes()
				}
			})
		})
		row.querySelector('[data-action="add-tag"]')?.addEventListener('click', () => {
			const tag = prompt('标签名称:')
			if (tag) {
				const type = state.itemTypes.find(t => t.id === typeId)
				if (type && !type.tags.includes(tag)) {
					type.tags.push(tag)
					renderItemTypes()
				}
			}
		})
	})
	document.querySelectorAll('[data-action="add-prop"]').forEach(btn => {
		btn.addEventListener('click', () => {
			const typeId = btn.dataset.typeId
			const type = state.itemTypes.find(t => t.id === typeId)
			if (type) {
				const name = prompt('属性名称:')
				if (name) {
					type.properties.push({
						name: name,
						type: 'number',
						min: 0,
						max: 100,
						enumValues: []
					})
					renderItemTypes()
				}
			}
		})
	})
	document.querySelectorAll('[data-action="edit-prop"]').forEach(btn => {
		btn.addEventListener('click', () => {
			const typeId = btn.dataset.typeId
			const propIdx = parseInt(btn.dataset.propIdx)
			const type = state.itemTypes.find(t => t.id === typeId)
			if (type && type.properties[propIdx]) {
				editProperty(type, propIdx)
			}
		})
	})
	document.querySelectorAll('[data-action="remove-prop"]').forEach(btn => {
		btn.addEventListener('click', () => {
			const typeId = btn.dataset.typeId
			const propIdx = parseInt(btn.dataset.propIdx)
			const type = state.itemTypes.find(t => t.id === typeId)
			if (type) {
				type.properties.splice(propIdx, 1)
				renderItemTypes()
			}
		})
	})
	document.querySelectorAll('[data-props-list]').forEach(list => {
		const typeId = list.dataset.propsList
		let dragIdx = null
		list.querySelectorAll('.sortable-item').forEach(item => {
			item.addEventListener('dragstart', (e) => {
				dragIdx = parseInt(item.dataset.propIdx)
				item.style.opacity = '0.5'
			})
			item.addEventListener('dragend', () => {
				item.style.opacity = '1'
				dragIdx = null
			})
			item.addEventListener('dragover', (e) => {
				e.preventDefault()
			})
			item.addEventListener('drop', (e) => {
				e.preventDefault()
				const dropIdx = parseInt(item.dataset.propIdx)
				if (dragIdx !== null && dragIdx !== dropIdx) {
					const type = state.itemTypes.find(t => t.id === typeId)
					if (type) {
						const [moved] = type.properties.splice(dragIdx, 1)
						type.properties.splice(dropIdx, 0, moved)
						renderItemTypes()
					}
				}
			})
		})
	})
}
function editProperty(type, propIdx) {
	const prop = type.properties[propIdx]
	const modal = document.createElement('div')
	modal.className = 'ed-gallery-modal open'
	modal.innerHTML = `
		<div class="ed-gallery-box" style="max-width:400px;height:auto">
			<div class="ed-gallery-hd">
				<span style="color:#fff">编辑属性</span>
				<button class="ed-btn sm close-modal">
					<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
				</button>
			</div>
			<div style="padding:16px;display:flex;flex-direction:column;gap:12px">
				<div class="prop-row">
					<label>属性名</label>
					<input type="text" id="propName" value="${prop.name}">
				</div>
				<div class="prop-row">
					<label>类型</label>
					<select id="propType">
						<option value="number" ${prop.type === 'number' ? 'selected' : ''}>数值</option>
						<option value="enum" ${prop.type === 'enum' ? 'selected' : ''}>枚举</option>
					</select>
				</div>
				<div id="numberFields" style="${prop.type === 'enum' ? 'display:none' : ''}">
					<div class="prop-row">
						<label>最小值</label>
						<input type="number" id="propMin" value="${prop.min || 0}">
					</div>
					<div class="prop-row">
						<label>最大值</label>
						<input type="number" id="propMax" value="${prop.max || 100}">
					</div>
				</div>
				<div id="enumFields" class="enum-editor" style="${prop.type !== 'enum' ? 'display:none' : ''}">
					<div style="font-size:11px;color:#666;margin-bottom:8px">枚举值</div>
					<div id="enumList">
						${(prop.enumValues || []).map((v, i) => `<div class="enum-item"><span style="color:#555">≡</span><input type="text" value="${v}" data-enum-idx="${i}"><button class="remove-btn" data-enum-idx="${i}"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>`).join('')}
					</div>
					<button class="ed-btn sm" id="addEnumBtn" style="margin-top:8px">+ 添加枚举值</button>
				</div>
			</div>
			<div class="ed-gallery-ft">
				<button class="gal-upload close-modal">取消</button>
				<button class="gal-confirm" id="saveProp">保存</button>
			</div>
		</div>
	`
	document.body.appendChild(modal)
	const propTypeSelect = modal.querySelector('#propType')
	propTypeSelect.addEventListener('change', () => {
		modal.querySelector('#numberFields').style.display = propTypeSelect.value === 'enum' ? 'none' : ''
		modal.querySelector('#enumFields').style.display = propTypeSelect.value === 'enum' ? '' : 'none'
	})
	modal.querySelector('#addEnumBtn').addEventListener('click', () => {
		const enumList = modal.querySelector('#enumList')
		const idx = enumList.children.length
		const div = document.createElement('div')
		div.className = 'enum-item'
		div.innerHTML = `<span style="color:#555">≡</span><input type="text" value="" data-enum-idx="${idx}"><button class="remove-btn" data-enum-idx="${idx}"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`
		div.querySelector('.remove-btn').addEventListener('click', () => div.remove())
		enumList.appendChild(div)
	})
	modal.querySelectorAll('#enumList .remove-btn').forEach(btn => {
		btn.addEventListener('click', () => btn.closest('.enum-item').remove())
	})
	modal.querySelectorAll('.close-modal').forEach(btn => {
		btn.addEventListener('click', () => modal.remove())
	})
	modal.addEventListener('click', (e) => {
		if (e.target === modal) modal.remove()
	})
	modal.querySelector('#saveProp').addEventListener('click', () => {
		prop.name = modal.querySelector('#propName').value
		prop.type = propTypeSelect.value
		if (prop.type === 'number') {
			prop.min = parseFloat(modal.querySelector('#propMin').value) || 0
			prop.max = parseFloat(modal.querySelector('#propMax').value) || 100
		} else {
			prop.enumValues = [...modal.querySelectorAll('#enumList input')].map(inp => inp.value).filter(v => v)
		}
		modal.remove()
		renderItemTypes()
		renderItemInstances()
	})
}
function getInheritedProperties(typeId) {
	const props = []
	const visited = new Set()
	let currentTypeId = typeId
	while (currentTypeId && !visited.has(currentTypeId)) {
		visited.add(currentTypeId)
		const type = state.itemTypes.find(t => t.id === currentTypeId)
		if (type) {
			for (const p of type.properties) {
				if (!props.find(ep => ep.name === p.name)) {
					props.push({ ...p, fromType: type.id })
				}
			}
			currentTypeId = type.parent
		} else {
			break
		}
	}
	return props
}
function renderItemInstances() {
	const list = document.getElementById('itemInstancesList')
	list.innerHTML = ''
	for (const item of state.items) {
		const type = state.itemTypes.find(t => t.id === item.typeId)
		const inheritedProps = type ? getInheritedProperties(type.id) : []
		const card = document.createElement('div')
		card.className = 'item-instance-card collapse-panel'
		card.innerHTML = `
			<div class="collapse-header">
				<svg class="arrow" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
				<span style="flex:1">${item.name} (${item.id})</span>
				<button class="remove-btn" data-id="${item.id}">
					<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
				</button>
			</div>
			<div class="collapse-body">
				<div class="prop-row">
					<label>ID</label>
					<input type="text" value="${item.id}" data-field="id" data-item-id="${item.id}">
				</div>
				<div class="prop-row">
					<label>名称</label>
					<input type="text" value="${item.name}" data-field="name" data-item-id="${item.id}">
				</div>
				<div class="prop-row">
					<label>种类</label>
					<select data-field="typeId" data-item-id="${item.id}">
						<option value="">无</option>
						${state.itemTypes.map(t => `<option value="${t.id}" ${item.typeId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
					</select>
				</div>
				<div class="prop-row">
					<label>贴图</label>
					<div class="sprite-preview" data-item-id="${item.id}" data-sprite-type="base">
						${item.sprite ? `<img src="${item.sprite}">` : ''}
					</div>
				</div>
				${inheritedProps.length > 0 ? `
				<div class="props-section">
					<div class="props-section-header"><span>继承属性</span></div>
					${inheritedProps.map(p => {
						const val = item.propertyValues[p.name]
						if (p.type === 'enum') {
							return `<div class="prop-row"><label>${p.name}</label><select data-prop-name="${p.name}" data-item-id="${item.id}">${(p.enumValues || []).map(ev => `<option value="${ev}" ${val === ev ? 'selected' : ''}>${ev}</option>`).join('')}</select></div>`
						}
						return `<div class="prop-row"><label>${p.name}</label><input type="number" value="${val !== undefined ? val : p.min}" min="${p.min}" max="${p.max}" data-prop-name="${p.name}" data-item-id="${item.id}"></div>`
					}).join('')}
				</div>` : ''}
				<div class="props-section">
					<div class="props-section-header">
						<span>额外属性</span>
						<button class="ed-btn sm add-indicator" data-action="add-extra-prop" data-item-id="${item.id}"></button>
					</div>
					<div class="sortable-list">
						${(item.extraProperties || []).map((ep, i) => `
							<div class="sortable-item">
								<span class="drag-handle">≡</span>
								<span class="item-content">${ep.name}: ${ep.value}</span>
								<button class="remove-btn" data-action="remove-extra-prop" data-item-id="${item.id}" data-prop-idx="${i}">
									<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
								</button>
							</div>
						`).join('')}
					</div>
				</div>
				<div class="props-section">
					<div class="props-section-header">
						<span>条件贴图</span>
						<button class="ed-btn sm add-indicator" data-action="add-cond-sprite" data-item-id="${item.id}"></button>
					</div>
					${(item.conditionalSprites || []).map((cs, i) => renderCondSpriteItem(item, cs, i, inheritedProps)).join('')}
				</div>
			</div>
		`
		card.querySelector('.collapse-header').addEventListener('click', (e) => {
			if (e.target.closest('.remove-btn')) return
			card.querySelector('.collapse-header').classList.toggle('open')
			card.querySelector('.collapse-body').classList.toggle('open')
		})
		card.querySelector('.collapse-header .remove-btn').addEventListener('click', () => {
			state.items = state.items.filter(i => i.id !== item.id)
			renderItemInstances()
		})
		list.appendChild(card)
	}
	bindItemInstanceEvents()
}
function renderCondSpriteItem(item, cs, idx, inheritedProps) {
	const allProps = [...inheritedProps, ...(item.extraProperties || [])]
	return `
		<div class="cond-sprite-item" data-cond-idx="${idx}">
			<div class="cond-sprite-row">
				<label style="width:40px;font-size:11px;color:#666">优先级</label>
				<input type="number" value="${cs.priority}" style="width:50px" data-cond-field="priority" data-item-id="${item.id}" data-cond-idx="${idx}">
				<button class="remove-btn" data-action="remove-cond-sprite" data-item-id="${item.id}" data-cond-idx="${idx}">
					<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
				</button>
			</div>
			<div class="cond-sprite-row">
				<label style="width:40px;font-size:11px;color:#666">条件</label>
				<select data-cond-field="property" data-item-id="${item.id}" data-cond-idx="${idx}" style="flex:1">
					${allProps.map(p => `<option value="${p.name}" ${cs.condition.property === p.name ? 'selected' : ''}>${p.name}</option>`).join('')}
				</select>
				<select data-cond-field="operator" data-item-id="${item.id}" data-cond-idx="${idx}" style="width:50px">
					<option value=">" ${cs.condition.operator === '>' ? 'selected' : ''}>></option>
					<option value="<" ${cs.condition.operator === '<' ? 'selected' : ''}><</option>
					<option value=">=" ${cs.condition.operator === '>=' ? 'selected' : ''}>>=</option>
					<option value="<=" ${cs.condition.operator === '<=' ? 'selected' : ''}><=</option>
					<option value="==" ${cs.condition.operator === '==' ? 'selected' : ''}>=</option>
					<option value="!=" ${cs.condition.operator === '!=' ? 'selected' : ''}>!=</option>
				</select>
				<input type="text" value="${cs.condition.value}" style="width:60px" data-cond-field="value" data-item-id="${item.id}" data-cond-idx="${idx}">
			</div>
			<div class="cond-sprite-row">
				<label style="width:40px;font-size:11px;color:#666">贴图</label>
				<div class="sprite-preview" data-item-id="${item.id}" data-sprite-type="cond" data-cond-idx="${idx}" style="width:32px;height:32px">
					${cs.sprite ? `<img src="${cs.sprite}">` : ''}
				</div>
			</div>
		</div>
	`
}
function bindItemInstanceEvents() {
	document.querySelectorAll('[data-field][data-item-id]').forEach(el => {
		el.addEventListener('change', (e) => {
			const itemId = el.dataset.itemId
			const field = el.dataset.field
			const item = state.items.find(i => i.id === itemId)
			if (item) {
				if (field === 'id') {
					item.id = e.target.value
				} else if (field === 'typeId') {
					item.typeId = e.target.value || null
					item.propertyValues = {}
				} else {
					item[field] = e.target.value
				}
				renderItemInstances()
			}
		})
	})
	document.querySelectorAll('[data-prop-name][data-item-id]').forEach(el => {
		el.addEventListener('change', (e) => {
			const itemId = el.dataset.itemId
			const propName = el.dataset.propName
			const item = state.items.find(i => i.id === itemId)
			if (item) {
				item.propertyValues[propName] = el.tagName === 'SELECT' ? e.target.value : parseFloat(e.target.value)
			}
		})
	})
	document.querySelectorAll('.sprite-preview[data-item-id]').forEach(el => {
		el.addEventListener('click', () => {
			const itemId = el.dataset.itemId
			const spriteType = el.dataset.spriteType
			const condIdx = el.dataset.condIdx
			const item = state.items.find(i => i.id === itemId)
			if (item) {
				openGallery((url) => {
					if (spriteType === 'base') {
						item.sprite = url
					} else if (spriteType === 'cond' && condIdx !== undefined) {
						item.conditionalSprites[parseInt(condIdx)].sprite = url
					}
					renderItemInstances()
				})
			}
		})
	})
	document.querySelectorAll('[data-action="add-extra-prop"]').forEach(btn => {
		btn.addEventListener('click', () => {
			const itemId = btn.dataset.itemId
			const item = state.items.find(i => i.id === itemId)
			if (item) {
				const name = prompt('属性名称:')
				if (name) {
					if (!item.extraProperties) item.extraProperties = []
					item.extraProperties.push({ name, type: 'number', min: 0, max: 100, value: 0 })
					renderItemInstances()
				}
			}
		})
	})
	document.querySelectorAll('[data-action="remove-extra-prop"]').forEach(btn => {
		btn.addEventListener('click', () => {
			const itemId = btn.dataset.itemId
			const propIdx = parseInt(btn.dataset.propIdx)
			const item = state.items.find(i => i.id === itemId)
			if (item && item.extraProperties) {
				item.extraProperties.splice(propIdx, 1)
				renderItemInstances()
			}
		})
	})
	document.querySelectorAll('[data-action="add-cond-sprite"]').forEach(btn => {
		btn.addEventListener('click', () => {
			const itemId = btn.dataset.itemId
			const item = state.items.find(i => i.id === itemId)
			if (item) {
				if (!item.conditionalSprites) item.conditionalSprites = []
				item.conditionalSprites.push({
					priority: item.conditionalSprites.length + 1,
					condition: { property: '', operator: '<', value: 0 },
					sprite: null
				})
				renderItemInstances()
			}
		})
	})
	document.querySelectorAll('[data-action="remove-cond-sprite"]').forEach(btn => {
		btn.addEventListener('click', () => {
			const itemId = btn.dataset.itemId
			const condIdx = parseInt(btn.dataset.condIdx)
			const item = state.items.find(i => i.id === itemId)
			if (item && item.conditionalSprites) {
				item.conditionalSprites.splice(condIdx, 1)
				renderItemInstances()
			}
		})
	})
	document.querySelectorAll('[data-cond-field][data-item-id]').forEach(el => {
		el.addEventListener('change', (e) => {
			const itemId = el.dataset.itemId
			const condIdx = parseInt(el.dataset.condIdx)
			const field = el.dataset.condField
			const item = state.items.find(i => i.id === itemId)
			if (item && item.conditionalSprites && item.conditionalSprites[condIdx]) {
				const cs = item.conditionalSprites[condIdx]
				if (field === 'priority') {
					cs.priority = parseInt(e.target.value) || 1
				} else if (field === 'property' || field === 'operator' || field === 'value') {
					cs.condition[field] = field === 'value' ? (isNaN(parseFloat(e.target.value)) ? e.target.value : parseFloat(e.target.value)) : e.target.value
				}
			}
		})
	})
}
function initItemEditorEvents() {
	document.getElementById('addItemType').addEventListener('click', () => {
		const id = 'type_' + genId()
		state.itemTypes.push({
			id: id,
			name: '新种类',
			tags: [],
			parent: null,
			properties: []
		})
		renderItemTypes()
	})
	document.getElementById('addItemInstance').addEventListener('click', () => {
		const id = 'item_' + genId()
		state.items.push({
			id: id,
			name: '新物品',
			typeId: null,
			sprite: null,
			propertyValues: {},
			extraProperties: [],
			conditionalSprites: []
		})
		renderItemInstances()
	})
}
