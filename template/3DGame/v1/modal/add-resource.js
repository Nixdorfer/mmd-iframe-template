let currentAddResourceTab = 'terrain'
function openAddResourceModal(tab) {
	currentAddResourceTab = tab
	const modal = document.getElementById('addResourceModal')
	const title = document.getElementById('addResourceModalTitle')
	const heightRow = document.getElementById('heightRow')
	const spriteRow = document.getElementById('spritePickerRow')
	const titles = {
		terrain: '添加地形',
		entity: '添加实体',
		structure: '添加结构',
		furniture: '添加家具',
		decor: '添加内饰'
	}
	title.textContent = titles[tab] || '添加资源'
	heightRow.style.display = tab === 'entity' ? 'block' : 'none'
	spriteRow.style.display = ['terrain', 'entity', 'furniture', 'decor'].includes(tab) ? 'block' : 'none'
	document.getElementById('newResourceName').value = ''
	document.getElementById('newResourceColor').value = '#166d3b'
	document.getElementById('newResourceColorHex').value = '#166d3b'
	document.getElementById('newResourceSprite').innerHTML = '点击选择图片'
	document.getElementById('newResourceSprite').classList.remove('has-image')
	document.getElementById('newResourceSprite').dataset.sprite = ''
	if (tab === 'entity') document.getElementById('newResourceHeight').value = '32'
	modal.classList.add('open')
}
function closeAddResourceModal() {
	document.getElementById('addResourceModal').classList.remove('open')
}
function initAddResourceModalEvents() {
	document.getElementById('addResourceConfirm').addEventListener('click', () => {
		const name = document.getElementById('newResourceName').value.trim()
		if (!name) return alert('请输入名称')
		const color = document.getElementById('newResourceColor').value
		const sprite = document.getElementById('newResourceSprite').dataset.sprite || null
		const id = currentAddResourceTab + '_' + Date.now()
		const item = { id, name, color }
		if (sprite) item.sprite = sprite
		if (currentAddResourceTab === 'entity') {
			item.height = parseInt(document.getElementById('newResourceHeight').value) || 32
		}
		resources[currentAddResourceTab].push(item)
		closeAddResourceModal()
		renderResourceGrid()
	})
	document.getElementById('addResourceCancel').addEventListener('click', closeAddResourceModal)
	document.getElementById('newResourceColor').addEventListener('input', (e) => {
		document.getElementById('newResourceColorHex').value = e.target.value
	})
	document.getElementById('newResourceColorHex').addEventListener('input', (e) => {
		if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
			document.getElementById('newResourceColor').value = e.target.value
		}
	})
}
