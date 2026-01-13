function initSettingsModalEvents() {
	document.getElementById('ambientIntensity').addEventListener('input', (e) => {
		document.getElementById('ambientIntensityValue').textContent = e.target.value + '%'
	})
	document.getElementById('ambientColor').addEventListener('input', (e) => {
		document.getElementById('ambientColorHex').value = e.target.value
	})
	document.getElementById('ambientColorHex').addEventListener('input', (e) => {
		if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
			document.getElementById('ambientColor').value = e.target.value
		}
	})
	document.getElementById('lightingModalConfirm').addEventListener('click', () => {
		const intensity = parseInt(document.getElementById('ambientIntensity').value) / 100
		const color = document.getElementById('ambientColor').value
		lighting.ambient.intensity = intensity
		lighting.ambient.color = color
		const building = resources.building.find(b => b.id === state.currentBuildingInterior)
		if (building && building.interior) {
			building.interior.lighting.ambient.intensity = parseInt(document.getElementById('ambientIntensity').value)
			building.interior.lighting.ambient.color = color
		}
		document.getElementById('lightingModal').classList.remove('open')
		render()
	})
	document.getElementById('lightingModalCancel').addEventListener('click', () => {
		document.getElementById('lightingModal').classList.remove('open')
	})
	document.getElementById('floorModalConfirm').addEventListener('click', () => {
		const building = resources.building.find(b => b.id === state.currentBuildingInterior)
		if (building && building.interior) {
			building.interior.floor.color = document.getElementById('floorColor').value
		}
		document.getElementById('floorModal').classList.remove('open')
		render()
	})
	document.getElementById('floorModalCancel').addEventListener('click', () => {
		document.getElementById('floorModal').classList.remove('open')
	})
	document.getElementById('wallModalConfirm').addEventListener('click', () => {
		const building = resources.building.find(b => b.id === state.currentBuildingInterior)
		if (building && building.interior) {
			building.interior.walls.color = document.getElementById('wallColor').value
			building.interior.walls.height = parseInt(document.getElementById('wallHeight').value) || 3
			building.interior.walls.opacity = parseInt(document.getElementById('wallOpacity').value) / 100
		}
		document.getElementById('wallModal').classList.remove('open')
		render()
	})
	document.getElementById('wallModalCancel').addEventListener('click', () => {
		document.getElementById('wallModal').classList.remove('open')
	})
	document.getElementById('floorColor').addEventListener('input', (e) => {
		document.getElementById('floorColorHex').value = e.target.value
	})
	document.getElementById('floorColorHex').addEventListener('input', (e) => {
		if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
			document.getElementById('floorColor').value = e.target.value
		}
	})
	document.getElementById('wallColor').addEventListener('input', (e) => {
		document.getElementById('wallColorHex').value = e.target.value
	})
	document.getElementById('wallColorHex').addEventListener('input', (e) => {
		if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
			document.getElementById('wallColor').value = e.target.value
		}
	})
	document.getElementById('wallHeight').addEventListener('input', (e) => {
		document.getElementById('wallHeightValue').textContent = e.target.value + '格'
	})
	document.getElementById('wallOpacity').addEventListener('input', (e) => {
		document.getElementById('wallOpacityValue').textContent = e.target.value + '%'
	})
}
