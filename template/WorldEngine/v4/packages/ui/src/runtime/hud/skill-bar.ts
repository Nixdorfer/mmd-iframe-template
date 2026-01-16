import { UINode, UINodeCfg } from '../base/node'

export interface SkillData {
	id: string
	icon: string | HTMLImageElement
	cooldown: number
	maxCooldown: number
	manaCost: number
	hotkey?: string
	locked?: boolean
}

export interface SkillBarCfg extends UINodeCfg {
	slotSize?: number
	gap?: number
	maxSlots?: number
	bgColor?: string
	borderColor?: string
	cooldownColor?: string
	lockedColor?: string
}

export class SkillBar extends UINode {
	slotSize: number
	gap: number
	maxSlots: number
	bgColor: string
	borderColor: string
	cooldownColor: string
	lockedColor: string
	skills: (SkillData | null)[]
	private icons: Map<string, HTMLImageElement>
	private hoverIdx: number
	onSkillClick?: (idx: number, skill: SkillData) => void

	constructor(cfg?: SkillBarCfg) {
		super(cfg)
		this.slotSize = cfg?.slotSize ?? 48
		this.gap = cfg?.gap ?? 4
		this.maxSlots = cfg?.maxSlots ?? 8
		this.bgColor = cfg?.bgColor ?? '#222222'
		this.borderColor = cfg?.borderColor ?? '#444444'
		this.cooldownColor = cfg?.cooldownColor ?? 'rgba(0, 0, 0, 0.7)'
		this.lockedColor = cfg?.lockedColor ?? 'rgba(40, 40, 40, 0.9)'
		this.skills = new Array(this.maxSlots).fill(null)
		this.icons = new Map()
		this.hoverIdx = -1
		if (this.w === 0) this.w = (this.slotSize + this.gap) * this.maxSlots - this.gap
		if (this.h === 0) this.h = this.slotSize
	}

	setSkill(idx: number, skill: SkillData | null) {
		if (idx < 0 || idx >= this.maxSlots) return
		this.skills[idx] = skill
		if (skill) {
			if (typeof skill.icon === 'string') {
				const img = new Image()
				img.src = skill.icon
				this.icons.set(skill.id, img)
			} else {
				this.icons.set(skill.id, skill.icon)
			}
		}
		this.dirty = true
	}

	updCooldown(id: string, cooldown: number, maxCooldown?: number) {
		for (const skill of this.skills) {
			if (skill && skill.id === id) {
				skill.cooldown = cooldown
				if (maxCooldown !== undefined) skill.maxCooldown = maxCooldown
				this.dirty = true
				break
			}
		}
	}

	lockSkill(id: string, locked: boolean) {
		for (const skill of this.skills) {
			if (skill && skill.id === id) {
				skill.locked = locked
				this.dirty = true
				break
			}
		}
	}

	upd(dt: number) {
		super.upd(dt)
		for (const skill of this.skills) {
			if (skill && skill.cooldown > 0) {
				skill.cooldown = Math.max(0, skill.cooldown - dt)
				this.dirty = true
			}
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		const x = this.getWorldX()
		const y = this.getWorldY()
		for (let i = 0; i < this.maxSlots; i++) {
			const sx = x + i * (this.slotSize + this.gap)
			const sy = y
			ctx.fillStyle = this.bgColor
			ctx.fillRect(sx, sy, this.slotSize, this.slotSize)
			const skill = this.skills[i]
			if (skill) {
				const icon = this.icons.get(skill.id)
				if (icon && icon.complete) {
					ctx.drawImage(icon, sx + 2, sy + 2, this.slotSize - 4, this.slotSize - 4)
				}
				if (skill.locked) {
					ctx.fillStyle = this.lockedColor
					ctx.fillRect(sx, sy, this.slotSize, this.slotSize)
					ctx.font = 'bold 16px system-ui, sans-serif'
					ctx.fillStyle = '#666666'
					ctx.textAlign = 'center'
					ctx.textBaseline = 'middle'
					ctx.fillText('🔒', sx + this.slotSize / 2, sy + this.slotSize / 2)
				} else if (skill.cooldown > 0 && skill.maxCooldown > 0) {
					const percent = skill.cooldown / skill.maxCooldown
					ctx.fillStyle = this.cooldownColor
					ctx.beginPath()
					ctx.moveTo(sx + this.slotSize / 2, sy + this.slotSize / 2)
					ctx.arc(
						sx + this.slotSize / 2,
						sy + this.slotSize / 2,
						this.slotSize / 2,
						-Math.PI / 2,
						-Math.PI / 2 + Math.PI * 2 * percent,
						false
					)
					ctx.closePath()
					ctx.fill()
					ctx.font = 'bold 14px system-ui, sans-serif'
					ctx.fillStyle = '#ffffff'
					ctx.textAlign = 'center'
					ctx.textBaseline = 'middle'
					ctx.strokeStyle = '#000000'
					ctx.lineWidth = 2
					const cdText = skill.cooldown >= 1 ? Math.ceil(skill.cooldown).toString() : skill.cooldown.toFixed(1)
					ctx.strokeText(cdText, sx + this.slotSize / 2, sy + this.slotSize / 2)
					ctx.fillText(cdText, sx + this.slotSize / 2, sy + this.slotSize / 2)
				}
				if (skill.hotkey) {
					ctx.font = 'bold 10px system-ui, sans-serif'
					ctx.fillStyle = '#ffff00'
					ctx.textAlign = 'left'
					ctx.textBaseline = 'top'
					ctx.strokeStyle = '#000000'
					ctx.lineWidth = 2
					ctx.strokeText(skill.hotkey, sx + 2, sy + 2)
					ctx.fillText(skill.hotkey, sx + 2, sy + 2)
				}
				if (skill.manaCost > 0) {
					ctx.font = '9px system-ui, sans-serif'
					ctx.fillStyle = '#6699ff'
					ctx.textAlign = 'right'
					ctx.textBaseline = 'bottom'
					ctx.strokeStyle = '#000000'
					ctx.lineWidth = 2
					ctx.strokeText(`${skill.manaCost}`, sx + this.slotSize - 2, sy + this.slotSize - 2)
					ctx.fillText(`${skill.manaCost}`, sx + this.slotSize - 2, sy + this.slotSize - 2)
				}
			}
			const borderClr = i === this.hoverIdx ? '#ffcc00' : this.borderColor
			ctx.strokeStyle = borderClr
			ctx.lineWidth = i === this.hoverIdx ? 2 : 1
			ctx.strokeRect(sx, sy, this.slotSize, this.slotSize)
		}
	}

	getSlotAt(screenX: number, screenY: number): number {
		const x = this.getWorldX()
		const y = this.getWorldY()
		if (screenY < y || screenY > y + this.slotSize) return -1
		const idx = Math.floor((screenX - x) / (this.slotSize + this.gap))
		if (idx >= 0 && idx < this.maxSlots) {
			const slotX = x + idx * (this.slotSize + this.gap)
			if (screenX >= slotX && screenX <= slotX + this.slotSize) {
				return idx
			}
		}
		return -1
	}

	onHoverIn() {
		this.dirty = true
	}

	onHoverOut() {
		this.hoverIdx = -1
		this.dirty = true
	}

	setHoverIdx(idx: number) {
		if (this.hoverIdx !== idx) {
			this.hoverIdx = idx
			this.dirty = true
		}
	}

	onClick() {
		if (this.hoverIdx >= 0 && this.onSkillClick) {
			const skill = this.skills[this.hoverIdx]
			if (skill && !skill.locked && skill.cooldown <= 0) {
				this.onSkillClick(this.hoverIdx, skill)
			}
		}
	}
}
