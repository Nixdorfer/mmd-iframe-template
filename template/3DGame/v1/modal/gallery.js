function openGallery(callback) {
	state.gallery.callback = callback
	state.gallery.selected = null
	state.gallery.path = []
	renderGallery()
	document.getElementById('galleryModal').classList.add('open')
}
function closeGallery() {
	document.getElementById('galleryModal').classList.remove('open')
	state.gallery.callback = null
}
function renderGallery() {
	const bread = document.getElementById('galleryBread')
	const grid = document.getElementById('galleryGrid')
	let breadHtml = '<span data-id="">根目录</span>'
	let currentId = null
	for (const fid of state.gallery.path) {
		const folder = state.gallery.items.find(i => i.id === fid)
		if (folder) {
			breadHtml += ` / <span data-id="${fid}">${folder.name}</span>`
			currentId = fid
		}
	}
	bread.innerHTML = breadHtml
	bread.querySelectorAll('span').forEach(span => {
		span.addEventListener('click', () => {
			const id = span.dataset.id
			if (id === '') {
				state.gallery.path = []
			} else {
				const idx = state.gallery.path.indexOf(id)
				if (idx >= 0) state.gallery.path = state.gallery.path.slice(0, idx + 1)
			}
			state.gallery.selected = null
			renderGallery()
		})
	})
	const items = state.gallery.items.filter(i => i.parent === currentId)
	grid.innerHTML = ''
	for (const item of items) {
		const div = document.createElement('div')
		div.className = 'ed-gallery-item' + (item.type === 'folder' ? ' folder' : '') + (state.gallery.selected === item.id ? ' selected' : '')
		if (item.type === 'folder') {
			div.innerHTML = `<svg viewBox="0 0 24 24" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span class="item-name">${item.name}</span>`
			div.addEventListener('dblclick', () => {
				state.gallery.path.push(item.id)
				state.gallery.selected = null
				renderGallery()
			})
		} else {
			div.innerHTML = `<img src="${item.url}"><span class="item-name">${item.name}</span>`
		}
		div.addEventListener('click', (e) => {
			if (e.detail === 1) {
				state.gallery.selected = item.id
				renderGallery()
			}
		})
		grid.appendChild(div)
	}
}
function uploadToGallery(files) {
	const currentParent = state.gallery.path.length > 0 ? state.gallery.path[state.gallery.path.length - 1] : null
	for (const file of files) {
		if (!file.type.startsWith('image/')) continue
		const reader = new FileReader()
		reader.onload = (e) => {
			state.gallery.items.push({
				id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
				type: 'image',
				name: file.name,
				url: e.target.result,
				parent: currentParent
			})
			renderGallery()
		}
		reader.readAsDataURL(file)
	}
}
function createGalleryFolder(name) {
	const currentParent = state.gallery.path.length > 0 ? state.gallery.path[state.gallery.path.length - 1] : null
	state.gallery.items.push({
		id: 'folder_' + Date.now(),
		type: 'folder',
		name: name,
		parent: currentParent
	})
	renderGallery()
}
function initGalleryEvents() {
	document.getElementById('galleryClose').addEventListener('click', closeGallery)
	document.getElementById('galleryModal').addEventListener('click', (e) => {
		if (e.target === e.currentTarget) closeGallery()
	})
	document.getElementById('galleryUpload').addEventListener('click', () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.multiple = true
		input.onchange = (e) => uploadToGallery(e.target.files)
		input.click()
	})
	document.getElementById('galleryNewFolder').addEventListener('click', () => {
		const name = prompt('文件夹名称:')
		if (name) createGalleryFolder(name)
	})
	document.getElementById('galleryConfirm').addEventListener('click', () => {
		if (state.gallery.selected && state.gallery.callback) {
			const item = state.gallery.items.find(i => i.id === state.gallery.selected)
			if (item && item.type === 'image') {
				state.gallery.callback(item.url)
				closeGallery()
			}
		}
	})
}
