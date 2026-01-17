<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import SplitPanel from '@/components/layout/SplitPanel.vue'
import CfgRow from '@/components/ui/CfgRow.vue'
import CfgSwt from '@/components/ui/CfgSwt.vue'
import CfgSld from '@/components/ui/CfgSld.vue'
import CfgCrd from '@/components/ui/CfgCrd.vue'
import CfgEff from '@/components/ui/CfgEff.vue'

interface PhysicsProps {
	mass: number
	elasticity: number
	hardness: number
	smoothness: number
	roughness: number
	metallic: number
	emissive: boolean
	emissiveColor: string
	emissiveIntensity: number
	emissiveOnlyDark: boolean
}

interface PenetrationRule {
	tags: string[]
	canPenetrate: boolean
	slowdown: number
	damageReduction: number
	destroyOnPenetrate: boolean
	requiredLevel: number
	stopAfter: boolean
}

interface CollisionConfig {
	enabled: boolean
	projectile: PenetrationRule
	melee: PenetrationRule
	explosion: PenetrationRule
	impact: PenetrationRule
}

interface EffectNode {
	type: string
	delay?: number
	entityId?: string
	projectileId?: string
	rangeId?: string
	targetType?: string
	attrName?: string
	modifyType?: string
	modifyVal?: number
	duration?: number
	maxStack?: number
	filterType?: string
	filterColor?: string
	spreadType?: string
}

interface WallData {
	name: string
	desc: string
	tags: string[]
	physics: PhysicsProps
	isDoor: boolean
	isWindow: boolean
	canSupport: boolean
	texture: string
	collision: CollisionConfig
}

interface FloorData {
	name: string
	desc: string
	tags: string[]
	physics: PhysicsProps
}

interface FurnitureData {
	name: string
	desc: string
	tags: string[]
	physics: PhysicsProps
	model: string
	transparent: boolean
	collision: CollisionConfig
	colliderSize: { x: number; y: number; z: number }
}

interface BuffData {
	name: string
	desc: string
	icon: string
	tags: string[]
	visible: boolean
	effects: EffectNode[]
	vfx: string
	sfx: string
}

interface SkillData {
	name: string
	desc: string
	icon: string
	tags: string[]
	level: string
	quickCast: boolean
	sequence: string
	learnTags: string[]
	costType: string
	costVal: number
	effects: EffectNode[]
}

interface ItemData {
	name: string
	desc: string
	model: string
	level: string
	tags: string[]
	itemType: string
	useSpeed: number
	useRange: number
	canAttack: boolean
	effects: EffectNode[]
	useSfx: string
	animPreset: string
	buffs: string[]
}

interface ProjectileData {
	name: string
	desc: string
	texture: string
	usePhysics: boolean
	instant: boolean
	speed: number
	sfx: string
	sfxRange: number
	tags: string[]
	triggerType: string
	effects: EffectNode[]
}

interface RangeEffectData {
	name: string
	desc: string
	animation: string
	tags: string[]
	targetTerrain: boolean
	targetCreature: boolean
	targetProjectile: boolean
	targetItem: boolean
	shape: string
	radius: number
	sizeX: number
	sizeY: number
	sizeZ: number
	duration: number
	effects: EffectNode[]
	instant: boolean
	spreadType: string
	spreadTime: number
	warningEnabled: boolean
	warningType: string
	warningColor: string
}

interface CreatureData {
	name: string
	desc: string
	tags: string[]
	model: string
	physics: PhysicsProps
	locomotion: string
	locomotionMod: string
	size: string
	rarity: string
}

interface AttributeData {
	name: string
	desc: string
	icon: string
	tags: string[]
	counters: { target: string; direction: string; modifier: number; buffs: string[] }[]
}

interface BasicAttrData {
	name: string
	desc: string
	icon: string
	color: string
	maxVal: number
	regenRate: number
	regenDelay: number
	showInHud: boolean
	showOnEntity: boolean
}

interface SkillbarData {
	name: string
	desc: string
	slots: number
	allowQuickCast: boolean
	showCooldown: boolean
	showCost: boolean
	layout: string
}

interface BuildingPresetBlock {
	x: number
	y: number
	z: number
	blockType: string
}

interface BuildingPresetData {
	name: string
	desc: string
	tags: string[]
	sizeX: number
	sizeY: number
	sizeZ: number
	blocks: BuildingPresetBlock[]
	createdAt: number
	updatedAt: number
}

type AssetData = WallData | FloorData | FurnitureData | BuffData | SkillData | ItemData | ProjectileData | RangeEffectData | CreatureData | AttributeData | BasicAttrData | SkillbarData | BuildingPresetData

interface AssetItem {
	id: string
	name: string
	isFolder: boolean
	type: string
	data: AssetData
	children?: AssetItem[]
}

interface FolderNode {
	id: string
	name: string
	open: boolean
	isLeaf: boolean
	type: string
	children: FolderNode[]
	items: AssetItem[]
}

function defPhysics(): PhysicsProps {
	return { mass: 1, elasticity: 0.3, hardness: 5, smoothness: 0.5, roughness: 0.5, metallic: 0, emissive: false, emissiveColor: '#ffffff', emissiveIntensity: 1, emissiveOnlyDark: false }
}

function defPenetration(): PenetrationRule {
	return { tags: [], canPenetrate: false, slowdown: 0, damageReduction: 0, destroyOnPenetrate: false, requiredLevel: 0, stopAfter: true }
}

function defCollision(): CollisionConfig {
	return { enabled: true, projectile: defPenetration(), melee: defPenetration(), explosion: defPenetration(), impact: defPenetration() }
}

function defWall(): WallData {
	return { name: '新墙壁', desc: '', tags: [], physics: defPhysics(), isDoor: false, isWindow: false, canSupport: true, texture: '', collision: defCollision() }
}

function defFloor(): FloorData {
	return { name: '新地面', desc: '', tags: [], physics: defPhysics() }
}

function defFurniture(): FurnitureData {
	return { name: '新家具', desc: '', tags: [], physics: defPhysics(), model: '', transparent: false, collision: defCollision(), colliderSize: { x: 1, y: 1, z: 1 } }
}

function defBuff(): BuffData {
	return { name: '新BUFF', desc: '', icon: '', tags: [], visible: true, effects: [], vfx: '', sfx: '' }
}

function defSkill(): SkillData {
	return { name: '新技能', desc: '', icon: '', tags: [], level: '1', quickCast: false, sequence: '', learnTags: [], costType: 'mp', costVal: 10, effects: [] }
}

function defItem(): ItemData {
	return { name: '新物品', desc: '', model: '', level: '1', tags: [], itemType: 'tool', useSpeed: 1, useRange: 1, canAttack: false, effects: [], useSfx: '', animPreset: '', buffs: [] }
}

function defProjectile(): ProjectileData {
	return { name: '新射弹', desc: '', texture: '', usePhysics: true, instant: false, speed: 20, sfx: '', sfxRange: 10, tags: [], triggerType: 'hit', effects: [] }
}

function defRangeEffect(): RangeEffectData {
	return { name: '新范围效果', desc: '', animation: '', tags: [], targetTerrain: false, targetCreature: true, targetProjectile: false, targetItem: false, shape: 'sphere', radius: 5, sizeX: 10, sizeY: 10, sizeZ: 10, duration: 5, effects: [], instant: true, spreadType: 'center', spreadTime: 500, warningEnabled: true, warningType: 'border', warningColor: '#ff0000' }
}

function defCreature(): CreatureData {
	return { name: '新生物', desc: '', tags: [], model: '', physics: defPhysics(), locomotion: 'biped', locomotionMod: 'none', size: 'medium', rarity: 'common' }
}

function defAttribute(): AttributeData {
	return { name: '新属性', desc: '', icon: '', tags: [], counters: [] }
}

function defBasicAttr(): BasicAttrData {
	return { name: '新属性值', desc: '', icon: '', color: '#ff4444', maxVal: 100, regenRate: 0, regenDelay: 0, showInHud: true, showOnEntity: true }
}

function defSkillbar(): SkillbarData {
	return { name: '新技能条', desc: '', slots: 8, allowQuickCast: true, showCooldown: true, showCost: true, layout: 'horizontal' }
}

function defBuildingPreset(): BuildingPresetData {
	return { name: '新建筑预设', desc: '', tags: [], sizeX: 10, sizeY: 10, sizeZ: 10, blocks: [], createdAt: Date.now(), updatedAt: Date.now() }
}

const tree = reactive<FolderNode[]>([
	{
		id: 'basic', name: '基本', open: false, isLeaf: false, type: '',
		children: [
			{ id: 'basic/attr', name: '属性值', open: false, isLeaf: true, type: 'attribute', children: [], items: [] },
			{ id: 'basic/skillbar', name: '技能条', open: false, isLeaf: true, type: 'skillbar', children: [], items: [] }
		],
		items: []
	},
	{
		id: 'building', name: '建筑', open: true, isLeaf: false, type: '',
		children: [
			{ id: 'building/preset', name: '预设', open: false, isLeaf: true, type: 'buildingPreset', children: [], items: [] },
			{ id: 'building/wall', name: '墙壁', open: false, isLeaf: true, type: 'wall', children: [], items: [] },
			{ id: 'building/floor', name: '地面', open: false, isLeaf: true, type: 'floor', children: [], items: [] },
			{ id: 'building/furniture', name: '家具', open: false, isLeaf: true, type: 'furniture', children: [], items: [] }
		],
		items: []
	},
	{
		id: 'entity', name: '实体', open: false, isLeaf: false, type: '',
		children: [
			{ id: 'entity/creature', name: '生物', open: false, isLeaf: true, type: 'creature', children: [], items: [] },
			{ id: 'entity/attr', name: '属性', open: false, isLeaf: true, type: 'entityAttr', children: [], items: [] },
			{ id: 'entity/buff', name: 'BUFF', open: false, isLeaf: true, type: 'buff', children: [], items: [] },
			{ id: 'entity/skill', name: '技能', open: false, isLeaf: true, type: 'skill', children: [], items: [] },
			{ id: 'entity/projectile', name: '射弹', open: false, isLeaf: true, type: 'projectile', children: [], items: [] },
			{ id: 'entity/range', name: '范围效果', open: false, isLeaf: true, type: 'rangeEffect', children: [], items: [] }
		],
		items: []
	},
	{
		id: 'item', name: '物品', open: false, isLeaf: true, type: 'item', children: [], items: []
	}
])

const selItem = ref<AssetItem | null>(null)
const selFolder = ref<FolderNode | null>(null)

const assetType = computed(() => selFolder.value?.type || '')

const levelOpts = [
	{ value: '1', label: 'Lv.1', desc: '初级' },
	{ value: '2', label: 'Lv.2', desc: '二级' },
	{ value: '3', label: 'Lv.3', desc: '三级' },
	{ value: '4', label: 'Lv.4', desc: '四级' },
	{ value: '5', label: 'Lv.5', desc: '五级' },
	{ value: 'epic', label: '史诗', desc: '史诗级' },
	{ value: 'legend', label: '传说', desc: '传说级' },
	{ value: 'god', label: '神级', desc: '神级' },
	{ value: 'super', label: '超位', desc: '超位' }
]

const itemTypeOpts = [
	{ value: 'tool', label: '工具', desc: '可使用的道具' },
	{ value: 'melee', label: '近战', desc: '近战武器' },
	{ value: 'ranged', label: '远程', desc: '远程武器' },
	{ value: 'armor', label: '服装', desc: '穿戴装备' }
]

const shapeOpts = [
	{ value: 'sphere', label: '球形', desc: '圆形范围' },
	{ value: 'cube', label: '立方体', desc: '方形范围' },
	{ value: 'cylinder', label: '圆柱', desc: '柱形范围' },
	{ value: 'cone', label: '锥形', desc: '扇形范围' }
]

const spreadOpts = [
	{ value: 'center', label: '从中心', desc: '从体积中心扩散' },
	{ value: 'ground', label: '从地面', desc: '从地面中心扩散' },
	{ value: 'top', label: '从顶部', desc: '从顶部向下扩散' },
	{ value: 'both', label: '顶底同时', desc: '同时从顶和底扩散' },
	{ value: 'inward', label: '向内收拢', desc: '从四周向中心收拢' }
]

const warningOpts = [
	{ value: 'border', label: '边框', desc: '仅边框高亮' },
	{ value: 'surface', label: '表面', desc: '表面+边框高亮' },
	{ value: 'area', label: '区域', desc: '整个区域高亮' }
]

const locomotionOpts = [
	{ value: 'serpent', label: '蛇形', desc: '无腿蠕动' },
	{ value: 'monopod', label: '单足', desc: '跳跃移动' },
	{ value: 'biped', label: '双足', desc: '人形' },
	{ value: 'tripod', label: '三足', desc: '三脚支撑' },
	{ value: 'quadruped', label: '四足', desc: '兽类' },
	{ value: 'hexapod', label: '六足', desc: '昆虫' },
	{ value: 'octopod', label: '八足', desc: '蜘蛛类' },
	{ value: 'multipod', label: '多足', desc: '蜈蚣类' }
]

const locomotionModOpts = [
	{ value: 'none', label: '无', desc: '正常移动' },
	{ value: 'floating', label: '浮动', desc: '悬浮移动' },
	{ value: 'winged', label: '翼', desc: '可以飞行' }
]

const sizeOpts = [
	{ value: 'tiny', label: '迷你', desc: '缩放0.3' },
	{ value: 'small', label: '小型', desc: '缩放0.6' },
	{ value: 'medium', label: '中型', desc: '缩放1.0' },
	{ value: 'large', label: '大型', desc: '缩放1.5' },
	{ value: 'huge', label: '巨大', desc: '缩放2.5' },
	{ value: 'colossal', label: '超巨', desc: '缩放5.0' }
]

const rarityOpts = [
	{ value: 'common', label: '普通', desc: '随处可见' },
	{ value: 'uncommon', label: '罕见', desc: '偶尔出现' },
	{ value: 'rare', label: '稀有', desc: '难以遇见' },
	{ value: 'epic', label: '史诗', desc: '非常稀有' },
	{ value: 'legendary', label: '传说', desc: '极其罕见' }
]

const layoutOpts = [
	{ value: 'horizontal', label: '横向', desc: '横向排列' },
	{ value: 'vertical', label: '纵向', desc: '纵向排列' },
	{ value: 'grid', label: '网格', desc: '网格排列' },
	{ value: 'radial', label: '环形', desc: '环形排列' }
]

const counterDirOpts = [
	{ value: 'deal', label: '造成伤害', desc: '攻击目标时' },
	{ value: 'take', label: '受到伤害', desc: '被目标攻击时' }
]

function addCounter(data: AttributeData) {
	data.counters.push({ target: '', direction: 'deal', modifier: 50, buffs: [] })
}

function delCounter(data: AttributeData, idx: number) {
	data.counters.splice(idx, 1)
}

function toggleFolder(node: FolderNode) {
	node.open = !node.open
}

function selectFolder(node: FolderNode) {
	if (node.isLeaf) {
		selFolder.value = node
		selItem.value = null
	}
}

function selectItem(item: AssetItem, folder: FolderNode) {
	selItem.value = item
	selFolder.value = folder
}

function createAssetData(type: string): AssetData {
	switch (type) {
		case 'wall': return defWall()
		case 'floor': return defFloor()
		case 'furniture': return defFurniture()
		case 'buff': return defBuff()
		case 'skill': return defSkill()
		case 'item': return defItem()
		case 'projectile': return defProjectile()
		case 'rangeEffect': return defRangeEffect()
		case 'creature': return defCreature()
		case 'entityAttr': return defAttribute()
		case 'attribute': return defBasicAttr()
		case 'skillbar': return defSkillbar()
		case 'buildingPreset': return defBuildingPreset()
		default: return defWall()
	}
}

function addAsset(folder: FolderNode) {
	const id = folder.id + '/asset_' + Date.now()
	const data = createAssetData(folder.type)
	const item: AssetItem = { id, name: (data as any).name || '新资产', isFolder: false, type: folder.type, data }
	folder.items.push(item)
	selItem.value = item
	selFolder.value = folder
}

function addFolder(folder: FolderNode) {
	const id = folder.id + '/folder_' + Date.now()
	const item: AssetItem = { id, name: '新文件夹', isFolder: true, type: folder.type, data: {} as AssetData, children: [] }
	folder.items.push(item)
	selItem.value = item
	selFolder.value = folder
}

function delItem(folder: FolderNode, item: AssetItem) {
	const idx = folder.items.indexOf(item)
	if (idx >= 0) {
		folder.items.splice(idx, 1)
		if (selItem.value === item) selItem.value = null
	}
}

function getTagsStr(tags: string[]): string {
	return tags.join(', ')
}

function setTagsFromStr(tags: string[], str: string) {
	tags.length = 0
	str.split(',').map(t => t.trim()).filter(t => t).forEach(t => tags.push(t))
}

const emit = defineEmits<{
	(e: 'openBldEditor', item: AssetItem): void
}>()

function openBldEditor(item: AssetItem) {
	emit('openBldEditor', item)
}
</script>

<template>
	<SplitPanel leftTitle="资产目录" rightTitle="资产详情">
		<template #left>
			<div class="ast-tree">
				<template v-for="node in tree" :key="node.id">
					<div class="ast-node">
						<div class="ast-node-hd" :class="{ open: node.open, leaf: node.isLeaf }" @click="toggleFolder(node)">
							<svg v-if="!node.isLeaf || node.children.length" class="arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="2">
								<polyline points="9 18 15 12 9 6"/>
							</svg>
							<svg v-else class="folder-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
								<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
							</svg>
							<span>{{ node.name }}</span>
						</div>
						<div v-if="node.open" class="ast-node-bd">
							<template v-for="child in node.children" :key="child.id">
								<div class="ast-node sub">
									<div class="ast-node-hd leaf" :class="{ sel: selFolder?.id === child.id }" @click="selectFolder(child); child.open = !child.open">
										<svg v-if="child.items.length" class="arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke-width="2">
											<polyline points="9 18 15 12 9 6"/>
										</svg>
										<svg v-else class="folder-ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
											<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
										</svg>
										<span>{{ child.name }}</span>
									</div>
									<div v-if="child.open && child.isLeaf" class="ast-node-bd">
										<div v-for="item in child.items" :key="item.id" class="ast-item" :class="{ sel: selItem?.id === item.id, folder: item.isFolder }" @click.stop="selectItem(item, child)">
											<svg v-if="item.isFolder" class="item-ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
												<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
											</svg>
											<svg v-else class="item-ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
												<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
												<polyline points="14 2 14 8 20 8"/>
											</svg>
											<span>{{ item.name }}</span>
										</div>
										<div class="ast-actions">
											<button class="ast-add-btn" @click.stop="addAsset(child)">+ 资产</button>
											<button class="ast-add-btn" @click.stop="addFolder(child)">+ 文件夹</button>
										</div>
									</div>
								</div>
							</template>
							<template v-if="node.isLeaf">
								<div v-for="item in node.items" :key="item.id" class="ast-item" :class="{ sel: selItem?.id === item.id, folder: item.isFolder }" @click.stop="selectItem(item, node)">
									<svg v-if="item.isFolder" class="item-ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
										<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
									</svg>
									<svg v-else class="item-ico" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
										<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
										<polyline points="14 2 14 8 20 8"/>
									</svg>
									<span>{{ item.name }}</span>
								</div>
								<div class="ast-actions">
									<button class="ast-add-btn" @click.stop="addAsset(node)">+ 资产</button>
									<button class="ast-add-btn" @click.stop="addFolder(node)">+ 文件夹</button>
								</div>
							</template>
						</div>
					</div>
				</template>
			</div>
		</template>
		<template #right>
			<div v-if="!selItem" class="empty-state">
				<svg viewBox="0 0 24 24">
					<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
				</svg>
				<span>选择资产以查看详情</span>
			</div>
			<template v-else-if="selItem.isFolder">
				<div class="config-section">
					<div class="config-section-title">文件夹详情</div>
					<CfgRow label="名称" info="文件夹的显示名称。">
						<input type="text" v-model="selItem.name">
					</CfgRow>
					<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
				</div>
			</template>
			<template v-else-if="assetType === 'wall'">
				<div class="config-section">
					<div class="config-section-title">墙壁配置</div>
					<CfgRow label="名称" info="墙壁的显示名称。">
						<input type="text" v-model="(selItem.data as WallData).name">
					</CfgRow>
					<CfgRow label="描述" info="墙壁的详细描述。">
						<textarea v-model="(selItem.data as WallData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as WallData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as WallData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
					<CfgRow label="是否为门" info="门可以开关，允许实体通过。">
						<CfgSwt v-model="(selItem.data as WallData).isDoor" />
					</CfgRow>
					<CfgRow label="是否为窗" info="窗户允许实体透过寻路。">
						<CfgSwt v-model="(selItem.data as WallData).isWindow" />
					</CfgRow>
					<CfgRow label="可支撑" info="是否可支撑上方建筑。">
						<CfgSwt v-model="(selItem.data as WallData).canSupport" />
					</CfgRow>
					<CfgRow label="贴图/模型" info="墙壁的贴图路径，门则为模型路径。">
						<input type="text" v-model="(selItem.data as WallData).texture">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">物理属性</div>
					<CfgRow label="密度" unit="kg/m³" info="材质密度。">
						<input type="number" v-model.number="(selItem.data as WallData).physics.mass" min="0.1">
					</CfgRow>
					<CfgRow label="弹性" info="碰撞反弹系数 0-10">
						<CfgSld v-model="(selItem.data as WallData).physics.elasticity" :min="0" :max="10" :step="0.1" />
					</CfgRow>
					<CfgRow label="硬度" info="材质硬度 0-10">
						<CfgSld v-model="(selItem.data as WallData).physics.hardness" :min="0" :max="10" :step="0.1" />
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">碰撞设置</div>
					<CfgRow label="启用碰撞" info="是否启用碰撞检测。">
						<CfgSwt v-model="(selItem.data as WallData).collision.enabled" />
					</CfgRow>
				</div>
				<template v-if="(selItem.data as WallData).collision.enabled">
					<div class="config-section">
						<div class="config-section-title">射弹穿透</div>
						<CfgRow label="适用标签" info="具有这些标签的射弹适用此规则。">
							<input type="text" :value="(selItem.data as WallData).collision.projectile.tags.join(',')" @change="(e: Event) => (selItem.data as WallData).collision.projectile.tags = (e.target as HTMLInputElement).value.split(',').filter(Boolean)">
						</CfgRow>
						<CfgRow label="可穿透" info="射弹是否可以穿透此物体。">
							<CfgSwt v-model="(selItem.data as WallData).collision.projectile.canPenetrate" />
						</CfgRow>
						<template v-if="(selItem.data as WallData).collision.projectile.canPenetrate">
							<CfgRow label="弹道减速" unit="%" info="穿透后速度降低的比例。">
								<CfgSld v-model="(selItem.data as WallData).collision.projectile.slowdown" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="伤害衰减" unit="%" info="穿透后伤害降低的比例。">
								<CfgSld v-model="(selItem.data as WallData).collision.projectile.damageReduction" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="穿透时摧毁" info="穿透后射弹是否被摧毁。">
								<CfgSwt v-model="(selItem.data as WallData).collision.projectile.destroyOnPenetrate" />
							</CfgRow>
							<CfgRow label="需求等级" info="需要的最低穿透等级才能穿透。">
								<input type="number" v-model.number="(selItem.data as WallData).collision.projectile.requiredLevel" min="0" max="10">
							</CfgRow>
							<CfgRow label="穿透后截停" info="穿透后是否阻止继续穿透其他物体。">
								<CfgSwt v-model="(selItem.data as WallData).collision.projectile.stopAfter" />
							</CfgRow>
						</template>
					</div>
					<div class="config-section">
						<div class="config-section-title">近战穿透</div>
						<CfgRow label="适用标签" info="具有这些标签的近战武器适用此规则。">
							<input type="text" :value="(selItem.data as WallData).collision.melee.tags.join(',')" @change="(e: Event) => (selItem.data as WallData).collision.melee.tags = (e.target as HTMLInputElement).value.split(',').filter(Boolean)">
						</CfgRow>
						<CfgRow label="可穿透" info="近战攻击是否可以穿透此物体。">
							<CfgSwt v-model="(selItem.data as WallData).collision.melee.canPenetrate" />
						</CfgRow>
						<template v-if="(selItem.data as WallData).collision.melee.canPenetrate">
							<CfgRow label="伤害衰减" unit="%" info="穿透后伤害降低的比例。">
								<CfgSld v-model="(selItem.data as WallData).collision.melee.damageReduction" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="穿透时摧毁" info="穿透后物体是否被摧毁。">
								<CfgSwt v-model="(selItem.data as WallData).collision.melee.destroyOnPenetrate" />
							</CfgRow>
							<CfgRow label="需求等级" info="需要的最低穿透等级才能穿透。">
								<input type="number" v-model.number="(selItem.data as WallData).collision.melee.requiredLevel" min="0" max="10">
							</CfgRow>
							<CfgRow label="穿透后截停" info="穿透后是否阻止继续穿透其他物体。">
								<CfgSwt v-model="(selItem.data as WallData).collision.melee.stopAfter" />
							</CfgRow>
						</template>
					</div>
					<div class="config-section">
						<div class="config-section-title">爆炸抗性</div>
						<CfgRow label="适用标签" info="具有这些标签的爆炸适用此规则。">
							<input type="text" :value="(selItem.data as WallData).collision.explosion.tags.join(',')" @change="(e: Event) => (selItem.data as WallData).collision.explosion.tags = (e.target as HTMLInputElement).value.split(',').filter(Boolean)">
						</CfgRow>
						<CfgRow label="可穿透" info="爆炸是否可以穿透此物体。">
							<CfgSwt v-model="(selItem.data as WallData).collision.explosion.canPenetrate" />
						</CfgRow>
						<template v-if="(selItem.data as WallData).collision.explosion.canPenetrate">
							<CfgRow label="伤害衰减" unit="%" info="穿透后伤害降低的比例。">
								<CfgSld v-model="(selItem.data as WallData).collision.explosion.damageReduction" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="穿透时摧毁" info="穿透后物体是否被摧毁。">
								<CfgSwt v-model="(selItem.data as WallData).collision.explosion.destroyOnPenetrate" />
							</CfgRow>
							<CfgRow label="需求等级" info="需要的最低穿透等级才能穿透。">
								<input type="number" v-model.number="(selItem.data as WallData).collision.explosion.requiredLevel" min="0" max="10">
							</CfgRow>
							<CfgRow label="穿透后截停" info="穿透后是否阻止继续传播。">
								<CfgSwt v-model="(selItem.data as WallData).collision.explosion.stopAfter" />
							</CfgRow>
						</template>
					</div>
					<div class="config-section">
						<div class="config-section-title">撞击抗性</div>
						<CfgRow label="适用标签" info="具有这些标签的撞击适用此规则。">
							<input type="text" :value="(selItem.data as WallData).collision.impact.tags.join(',')" @change="(e: Event) => (selItem.data as WallData).collision.impact.tags = (e.target as HTMLInputElement).value.split(',').filter(Boolean)">
						</CfgRow>
						<CfgRow label="可穿透" info="撞击是否可以穿透此物体。">
							<CfgSwt v-model="(selItem.data as WallData).collision.impact.canPenetrate" />
						</CfgRow>
						<template v-if="(selItem.data as WallData).collision.impact.canPenetrate">
							<CfgRow label="撞击减速" unit="%" info="穿透后速度降低的比例。">
								<CfgSld v-model="(selItem.data as WallData).collision.impact.slowdown" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="伤害衰减" unit="%" info="穿透后伤害降低的比例。">
								<CfgSld v-model="(selItem.data as WallData).collision.impact.damageReduction" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="穿透时摧毁" info="穿透后物体是否被摧毁。">
								<CfgSwt v-model="(selItem.data as WallData).collision.impact.destroyOnPenetrate" />
							</CfgRow>
							<CfgRow label="需求等级" info="需要的最低穿透等级才能穿透。">
								<input type="number" v-model.number="(selItem.data as WallData).collision.impact.requiredLevel" min="0" max="10">
							</CfgRow>
							<CfgRow label="穿透后截停" info="穿透后是否阻止继续穿透其他物体。">
								<CfgSwt v-model="(selItem.data as WallData).collision.impact.stopAfter" />
							</CfgRow>
						</template>
					</div>
				</template>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'floor'">
				<div class="config-section">
					<div class="config-section-title">地面配置</div>
					<CfgRow label="名称" info="地面的显示名称。">
						<input type="text" v-model="(selItem.data as FloorData).name">
					</CfgRow>
					<CfgRow label="描述" info="地面的详细描述。">
						<textarea v-model="(selItem.data as FloorData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as FloorData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as FloorData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">物理属性</div>
					<CfgRow label="密度" unit="kg/m³" info="材质密度。">
						<input type="number" v-model.number="(selItem.data as FloorData).physics.mass" min="0.1">
					</CfgRow>
					<CfgRow label="光滑度" info="表面光滑程度 0-1">
						<CfgSld v-model="(selItem.data as FloorData).physics.smoothness" :min="0" :max="1" :step="0.1" />
					</CfgRow>
					<CfgRow label="粗糙度" info="表面粗糙程度 0-1">
						<CfgSld v-model="(selItem.data as FloorData).physics.roughness" :min="0" :max="1" :step="0.1" />
					</CfgRow>
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'furniture'">
				<div class="config-section">
					<div class="config-section-title">家具配置</div>
					<CfgRow label="名称" info="家具的显示名称。">
						<input type="text" v-model="(selItem.data as FurnitureData).name">
					</CfgRow>
					<CfgRow label="描述" info="家具的详细描述。">
						<textarea v-model="(selItem.data as FurnitureData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as FurnitureData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as FurnitureData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
					<CfgRow label="模型" info="家具的3D模型路径。">
						<input type="text" v-model="(selItem.data as FurnitureData).model">
					</CfgRow>
					<CfgRow label="透明" info="实体是否可以透过该家具寻路。">
						<CfgSwt v-model="(selItem.data as FurnitureData).transparent" />
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">碰撞箱尺寸</div>
					<CfgRow label="X" unit="m" info="碰撞箱X轴尺寸。">
						<input type="number" v-model.number="(selItem.data as FurnitureData).colliderSize.x" min="0.1" step="0.1">
					</CfgRow>
					<CfgRow label="Y" unit="m" info="碰撞箱Y轴尺寸。">
						<input type="number" v-model.number="(selItem.data as FurnitureData).colliderSize.y" min="0.1" step="0.1">
					</CfgRow>
					<CfgRow label="Z" unit="m" info="碰撞箱Z轴尺寸。">
						<input type="number" v-model.number="(selItem.data as FurnitureData).colliderSize.z" min="0.1" step="0.1">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">碰撞设置</div>
					<CfgRow label="启用碰撞" info="是否启用碰撞检测。">
						<CfgSwt v-model="(selItem.data as FurnitureData).collision.enabled" />
					</CfgRow>
				</div>
				<template v-if="(selItem.data as FurnitureData).collision.enabled">
					<div class="config-section">
						<div class="config-section-title">射弹穿透</div>
						<CfgRow label="适用标签" info="具有这些标签的射弹适用此规则。">
							<input type="text" :value="(selItem.data as FurnitureData).collision.projectile.tags.join(',')" @change="(e: Event) => (selItem.data as FurnitureData).collision.projectile.tags = (e.target as HTMLInputElement).value.split(',').filter(Boolean)">
						</CfgRow>
						<CfgRow label="可穿透" info="射弹是否可以穿透此物体。">
							<CfgSwt v-model="(selItem.data as FurnitureData).collision.projectile.canPenetrate" />
						</CfgRow>
						<template v-if="(selItem.data as FurnitureData).collision.projectile.canPenetrate">
							<CfgRow label="弹道减速" unit="%" info="穿透后速度降低的比例。">
								<CfgSld v-model="(selItem.data as FurnitureData).collision.projectile.slowdown" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="伤害衰减" unit="%" info="穿透后伤害降低的比例。">
								<CfgSld v-model="(selItem.data as FurnitureData).collision.projectile.damageReduction" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="穿透时摧毁" info="穿透后射弹是否被摧毁。">
								<CfgSwt v-model="(selItem.data as FurnitureData).collision.projectile.destroyOnPenetrate" />
							</CfgRow>
							<CfgRow label="需求等级" info="需要的最低穿透等级才能穿透。">
								<input type="number" v-model.number="(selItem.data as FurnitureData).collision.projectile.requiredLevel" min="0" max="10">
							</CfgRow>
							<CfgRow label="穿透后截停" info="穿透后是否阻止继续穿透其他物体。">
								<CfgSwt v-model="(selItem.data as FurnitureData).collision.projectile.stopAfter" />
							</CfgRow>
						</template>
					</div>
					<div class="config-section">
						<div class="config-section-title">近战穿透</div>
						<CfgRow label="适用标签" info="具有这些标签的近战武器适用此规则。">
							<input type="text" :value="(selItem.data as FurnitureData).collision.melee.tags.join(',')" @change="(e: Event) => (selItem.data as FurnitureData).collision.melee.tags = (e.target as HTMLInputElement).value.split(',').filter(Boolean)">
						</CfgRow>
						<CfgRow label="可穿透" info="近战攻击是否可以穿透此物体。">
							<CfgSwt v-model="(selItem.data as FurnitureData).collision.melee.canPenetrate" />
						</CfgRow>
						<template v-if="(selItem.data as FurnitureData).collision.melee.canPenetrate">
							<CfgRow label="伤害衰减" unit="%" info="穿透后伤害降低的比例。">
								<CfgSld v-model="(selItem.data as FurnitureData).collision.melee.damageReduction" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="穿透时摧毁" info="穿透后物体是否被摧毁。">
								<CfgSwt v-model="(selItem.data as FurnitureData).collision.melee.destroyOnPenetrate" />
							</CfgRow>
							<CfgRow label="需求等级" info="需要的最低穿透等级才能穿透。">
								<input type="number" v-model.number="(selItem.data as FurnitureData).collision.melee.requiredLevel" min="0" max="10">
							</CfgRow>
							<CfgRow label="穿透后截停" info="穿透后是否阻止继续穿透其他物体。">
								<CfgSwt v-model="(selItem.data as FurnitureData).collision.melee.stopAfter" />
							</CfgRow>
						</template>
					</div>
					<div class="config-section">
						<div class="config-section-title">爆炸抗性</div>
						<CfgRow label="适用标签" info="具有这些标签的爆炸适用此规则。">
							<input type="text" :value="(selItem.data as FurnitureData).collision.explosion.tags.join(',')" @change="(e: Event) => (selItem.data as FurnitureData).collision.explosion.tags = (e.target as HTMLInputElement).value.split(',').filter(Boolean)">
						</CfgRow>
						<CfgRow label="可穿透" info="爆炸是否可以穿透此物体。">
							<CfgSwt v-model="(selItem.data as FurnitureData).collision.explosion.canPenetrate" />
						</CfgRow>
						<template v-if="(selItem.data as FurnitureData).collision.explosion.canPenetrate">
							<CfgRow label="伤害衰减" unit="%" info="穿透后伤害降低的比例。">
								<CfgSld v-model="(selItem.data as FurnitureData).collision.explosion.damageReduction" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="穿透时摧毁" info="穿透后物体是否被摧毁。">
								<CfgSwt v-model="(selItem.data as FurnitureData).collision.explosion.destroyOnPenetrate" />
							</CfgRow>
							<CfgRow label="需求等级" info="需要的最低穿透等级才能穿透。">
								<input type="number" v-model.number="(selItem.data as FurnitureData).collision.explosion.requiredLevel" min="0" max="10">
							</CfgRow>
							<CfgRow label="穿透后截停" info="穿透后是否阻止继续传播。">
								<CfgSwt v-model="(selItem.data as FurnitureData).collision.explosion.stopAfter" />
							</CfgRow>
						</template>
					</div>
					<div class="config-section">
						<div class="config-section-title">撞击抗性</div>
						<CfgRow label="适用标签" info="具有这些标签的撞击适用此规则。">
							<input type="text" :value="(selItem.data as FurnitureData).collision.impact.tags.join(',')" @change="(e: Event) => (selItem.data as FurnitureData).collision.impact.tags = (e.target as HTMLInputElement).value.split(',').filter(Boolean)">
						</CfgRow>
						<CfgRow label="可穿透" info="撞击是否可以穿透此物体。">
							<CfgSwt v-model="(selItem.data as FurnitureData).collision.impact.canPenetrate" />
						</CfgRow>
						<template v-if="(selItem.data as FurnitureData).collision.impact.canPenetrate">
							<CfgRow label="撞击减速" unit="%" info="穿透后速度降低的比例。">
								<CfgSld v-model="(selItem.data as FurnitureData).collision.impact.slowdown" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="伤害衰减" unit="%" info="穿透后伤害降低的比例。">
								<CfgSld v-model="(selItem.data as FurnitureData).collision.impact.damageReduction" :min="0" :max="100" />
							</CfgRow>
							<CfgRow label="穿透时摧毁" info="穿透后物体是否被摧毁。">
								<CfgSwt v-model="(selItem.data as FurnitureData).collision.impact.destroyOnPenetrate" />
							</CfgRow>
							<CfgRow label="需求等级" info="需要的最低穿透等级才能穿透。">
								<input type="number" v-model.number="(selItem.data as FurnitureData).collision.impact.requiredLevel" min="0" max="10">
							</CfgRow>
							<CfgRow label="穿透后截停" info="穿透后是否阻止继续穿透其他物体。">
								<CfgSwt v-model="(selItem.data as FurnitureData).collision.impact.stopAfter" />
							</CfgRow>
						</template>
					</div>
				</template>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'buff'">
				<div class="config-section">
					<div class="config-section-title">BUFF配置</div>
					<CfgRow label="名称" info="BUFF的显示名称。">
						<input type="text" v-model="(selItem.data as BuffData).name">
					</CfgRow>
					<CfgRow label="描述" info="BUFF的详细描述。">
						<textarea v-model="(selItem.data as BuffData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="图标" info="BUFF的图标路径。">
						<input type="text" v-model="(selItem.data as BuffData).icon">
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as BuffData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as BuffData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
					<CfgRow label="栏可见" info="是否在BUFF栏显示。">
						<CfgSwt v-model="(selItem.data as BuffData).visible" />
					</CfgRow>
					<CfgRow label="特效" info="BUFF的视觉特效路径（可空）。">
						<input type="text" v-model="(selItem.data as BuffData).vfx">
					</CfgRow>
					<CfgRow label="音效" info="BUFF的音效路径（可空）。">
						<input type="text" v-model="(selItem.data as BuffData).sfx">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">效果序列</div>
					<CfgEff v-model="(selItem.data as BuffData).effects" />
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'skill'">
				<div class="config-section">
					<div class="config-section-title">技能配置</div>
					<CfgRow label="名称" info="技能的显示名称。">
						<input type="text" v-model="(selItem.data as SkillData).name">
					</CfgRow>
					<CfgRow label="描述" info="技能的详细描述。">
						<textarea v-model="(selItem.data as SkillData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="图标" info="技能的图标路径。">
						<input type="text" v-model="(selItem.data as SkillData).icon">
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as SkillData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as SkillData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
					<CfgRow label="等级" info="技能等级。">
						<CfgCrd v-model="(selItem.data as SkillData).level" :options="levelOpts" />
					</CfgRow>
					<CfgRow label="快速释放" info="是否可快速释放。">
						<CfgSwt v-model="(selItem.data as SkillData).quickCast" />
					</CfgRow>
					<CfgRow label="召唤序列" info="技能召唤序列（鼠标左右键组合）。">
						<input type="text" v-model="(selItem.data as SkillData).sequence" placeholder="例: LLRLR">
					</CfgRow>
					<CfgRow label="可学习标签" info="可学习该技能的实体标签。">
						<input type="text" :value="getTagsStr((selItem.data as SkillData).learnTags)" @change="(e: Event) => setTagsFromStr((selItem.data as SkillData).learnTags, (e.target as HTMLInputElement).value)">
					</CfgRow>
					<CfgRow label="消耗值" info="技能消耗的数值。">
						<input type="number" v-model.number="(selItem.data as SkillData).costVal" min="0">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">效果序列</div>
					<CfgEff v-model="(selItem.data as SkillData).effects" />
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'item'">
				<div class="config-section">
					<div class="config-section-title">物品配置</div>
					<CfgRow label="名称" info="物品的显示名称。">
						<input type="text" v-model="(selItem.data as ItemData).name">
					</CfgRow>
					<CfgRow label="描述" info="物品的详细描述。">
						<textarea v-model="(selItem.data as ItemData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="模型" info="物品的3D模型路径。">
						<input type="text" v-model="(selItem.data as ItemData).model">
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as ItemData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as ItemData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
					<CfgRow label="等级" info="物品等级。">
						<CfgCrd v-model="(selItem.data as ItemData).level" :options="levelOpts" />
					</CfgRow>
					<CfgRow label="类型" info="物品类型。">
						<CfgCrd v-model="(selItem.data as ItemData).itemType" :options="itemTypeOpts" />
					</CfgRow>
					<CfgRow label="使用速度" info="使用/攻击速度倍率。">
						<input type="number" v-model.number="(selItem.data as ItemData).useSpeed" min="0.1" step="0.1">
					</CfgRow>
					<CfgRow label="作用范围" unit="m" info="使用/攻击的作用范围。">
						<input type="number" v-model.number="(selItem.data as ItemData).useRange" min="0.1" step="0.1">
					</CfgRow>
					<CfgRow v-if="(selItem.data as ItemData).itemType === 'tool'" label="可攻击" info="工具是否可用于攻击。">
						<CfgSwt v-model="(selItem.data as ItemData).canAttack" />
					</CfgRow>
					<CfgRow label="使用音效" info="使用时的音效路径。">
						<input type="text" v-model="(selItem.data as ItemData).useSfx">
					</CfgRow>
					<CfgRow label="动画预设" info="动画预设ID。">
						<input type="text" v-model="(selItem.data as ItemData).animPreset">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">效果序列</div>
					<CfgEff v-model="(selItem.data as ItemData).effects" />
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'projectile'">
				<div class="config-section">
					<div class="config-section-title">射弹配置</div>
					<CfgRow label="名称" info="射弹的显示名称。">
						<input type="text" v-model="(selItem.data as ProjectileData).name">
					</CfgRow>
					<CfgRow label="描述" info="射弹的详细描述。">
						<textarea v-model="(selItem.data as ProjectileData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="贴图" info="射弹的贴图路径。">
						<input type="text" v-model="(selItem.data as ProjectileData).texture">
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as ProjectileData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as ProjectileData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
					<CfgRow label="启用物理" info="是否启用物理模拟。">
						<CfgSwt v-model="(selItem.data as ProjectileData).usePhysics" />
					</CfgRow>
					<CfgRow label="即时命中" info="是否为即时命中（射线检测）。">
						<CfgSwt v-model="(selItem.data as ProjectileData).instant" />
					</CfgRow>
					<CfgRow v-if="!(selItem.data as ProjectileData).instant" label="速度" unit="m/s" info="射弹飞行速度。">
						<input type="number" v-model.number="(selItem.data as ProjectileData).speed" min="0.01" step="1">
					</CfgRow>
					<CfgRow label="音效" info="射弹的音效路径。">
						<input type="text" v-model="(selItem.data as ProjectileData).sfx">
					</CfgRow>
					<CfgRow label="音效范围" unit="m" info="音效可听见的范围。">
						<input type="number" v-model.number="(selItem.data as ProjectileData).sfxRange" min="1">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">效果序列</div>
					<CfgEff v-model="(selItem.data as ProjectileData).effects" />
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'rangeEffect'">
				<div class="config-section">
					<div class="config-section-title">范围效果配置</div>
					<CfgRow label="名称" info="范围效果的显示名称。">
						<input type="text" v-model="(selItem.data as RangeEffectData).name">
					</CfgRow>
					<CfgRow label="描述" info="范围效果的详细描述。">
						<textarea v-model="(selItem.data as RangeEffectData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="动画" info="范围效果的动画路径（可空）。">
						<input type="text" v-model="(selItem.data as RangeEffectData).animation">
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as RangeEffectData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as RangeEffectData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">作用对象</div>
					<CfgRow label="地形" info="是否作用于地形。">
						<CfgSwt v-model="(selItem.data as RangeEffectData).targetTerrain" />
					</CfgRow>
					<CfgRow label="生物" info="是否作用于生物。">
						<CfgSwt v-model="(selItem.data as RangeEffectData).targetCreature" />
					</CfgRow>
					<CfgRow label="射弹" info="是否作用于射弹。">
						<CfgSwt v-model="(selItem.data as RangeEffectData).targetProjectile" />
					</CfgRow>
					<CfgRow label="物品" info="是否作用于物品。">
						<CfgSwt v-model="(selItem.data as RangeEffectData).targetItem" />
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">范围设置</div>
					<CfgRow label="形状" info="范围的形状。">
						<CfgCrd v-model="(selItem.data as RangeEffectData).shape" :options="shapeOpts" />
					</CfgRow>
					<CfgRow v-if="(selItem.data as RangeEffectData).shape === 'sphere'" label="半径" unit="m" info="球形范围的半径。">
						<input type="number" v-model.number="(selItem.data as RangeEffectData).radius" min="0.1" step="0.5">
					</CfgRow>
					<template v-else>
						<CfgRow label="长度X" unit="m" info="X轴尺寸，0表示一个面。">
							<input type="number" v-model.number="(selItem.data as RangeEffectData).sizeX" min="0" step="0.5">
						</CfgRow>
						<CfgRow label="宽度Y" unit="m" info="Y轴尺寸，0表示一个面。">
							<input type="number" v-model.number="(selItem.data as RangeEffectData).sizeY" min="0" step="0.5">
						</CfgRow>
						<CfgRow label="高度Z" unit="m" info="Z轴尺寸，0表示一个面。">
							<input type="number" v-model.number="(selItem.data as RangeEffectData).sizeZ" min="0" step="0.5">
						</CfgRow>
					</template>
					<CfgRow label="持续时间" unit="秒" info="范围效果的持续时间。">
						<input type="number" v-model.number="(selItem.data as RangeEffectData).duration" min="0" step="0.5">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">扩散设置</div>
					<CfgRow label="即时生效" info="是否即时生效，关闭则显示扩散设置。">
						<CfgSwt v-model="(selItem.data as RangeEffectData).instant" />
					</CfgRow>
					<template v-if="!(selItem.data as RangeEffectData).instant">
						<CfgRow label="扩散方式" info="效果的扩散方式。">
							<CfgCrd v-model="(selItem.data as RangeEffectData).spreadType" :options="spreadOpts" />
						</CfgRow>
						<CfgRow label="扩散时间" unit="ms" info="扩散完成所需时间。">
							<input type="number" v-model.number="(selItem.data as RangeEffectData).spreadTime" min="100" step="100">
						</CfgRow>
					</template>
				</div>
				<div class="config-section">
					<div class="config-section-title">范围警示</div>
					<CfgRow label="启用警示" info="是否启用范围警示。">
						<CfgSwt v-model="(selItem.data as RangeEffectData).warningEnabled" />
					</CfgRow>
					<template v-if="(selItem.data as RangeEffectData).warningEnabled">
						<CfgRow label="警示类型" info="警示的显示方式。">
							<CfgCrd v-model="(selItem.data as RangeEffectData).warningType" :options="warningOpts" />
						</CfgRow>
						<CfgRow label="警示颜色" info="警示区域的颜色。">
							<input type="color" v-model="(selItem.data as RangeEffectData).warningColor">
						</CfgRow>
					</template>
				</div>
				<div class="config-section">
					<div class="config-section-title">效果序列</div>
					<CfgEff v-model="(selItem.data as RangeEffectData).effects" />
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'creature'">
				<div class="config-section">
					<div class="config-section-title">生物配置</div>
					<CfgRow label="名称" info="生物的显示名称。">
						<input type="text" v-model="(selItem.data as CreatureData).name">
					</CfgRow>
					<CfgRow label="描述" info="生物的详细描述。">
						<textarea v-model="(selItem.data as CreatureData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as CreatureData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as CreatureData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
					<CfgRow label="模型" info="生物的3D模型路径。">
						<input type="text" v-model="(selItem.data as CreatureData).model">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">移动设置</div>
					<CfgRow label="移动方式" info="生物的移动方式。">
						<CfgCrd v-model="(selItem.data as CreatureData).locomotion" :options="locomotionOpts" />
					</CfgRow>
					<CfgRow label="移动修饰" info="附加的移动能力。">
						<CfgCrd v-model="(selItem.data as CreatureData).locomotionMod" :options="locomotionModOpts" />
					</CfgRow>
					<CfgRow label="尺寸" info="生物的体型大小。">
						<CfgCrd v-model="(selItem.data as CreatureData).size" :options="sizeOpts" />
					</CfgRow>
					<CfgRow label="稀有度" info="生物的稀有程度。">
						<CfgCrd v-model="(selItem.data as CreatureData).rarity" :options="rarityOpts" />
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">物理属性</div>
					<CfgRow label="质量" unit="kg" info="生物的质量。">
						<input type="number" v-model.number="(selItem.data as CreatureData).physics.mass" min="0.1">
					</CfgRow>
					<CfgRow label="弹性" info="碰撞反弹系数 0-10">
						<CfgSld v-model="(selItem.data as CreatureData).physics.elasticity" :min="0" :max="10" :step="0.1" />
					</CfgRow>
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'entityAttr'">
				<div class="config-section">
					<div class="config-section-title">属性配置</div>
					<CfgRow label="名称" info="属性的显示名称。">
						<input type="text" v-model="(selItem.data as AttributeData).name">
					</CfgRow>
					<CfgRow label="描述" info="属性的详细描述。">
						<textarea v-model="(selItem.data as AttributeData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="图标" info="属性的图标路径。">
						<input type="text" v-model="(selItem.data as AttributeData).icon">
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as AttributeData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as AttributeData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">克制关系</div>
					<div class="counter-lst">
						<div v-for="(ctr, idx) in (selItem.data as AttributeData).counters" :key="idx" class="counter-item">
							<div class="counter-row">
								<input type="text" v-model="ctr.target" placeholder="目标属性ID" class="counter-tgt">
								<select v-model="ctr.direction" class="counter-dir">
									<option value="deal">造成伤害</option>
									<option value="take">受到伤害</option>
								</select>
								<button class="counter-del" @click="delCounter(selItem.data as AttributeData, idx)">×</button>
							</div>
							<div class="counter-row">
								<span class="counter-lbl">修正值</span>
								<input type="number" v-model.number="ctr.modifier" min="-100" max="10000" class="counter-mod">
								<span class="counter-unit">%</span>
							</div>
							<div class="counter-row">
								<span class="counter-lbl">额外效果</span>
								<input type="text" :value="ctr.buffs.join(',')" @change="(e: Event) => { ctr.buffs = (e.target as HTMLInputElement).value.split(',').filter(Boolean) }" placeholder="BUFF ID列表" class="counter-buffs">
							</div>
						</div>
					</div>
					<button class="counter-add" @click="addCounter(selItem.data as AttributeData)">+ 添加克制</button>
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'attribute'">
				<div class="config-section">
					<div class="config-section-title">属性值配置</div>
					<CfgRow label="名称" info="属性值的显示名称，如生命值、魔力值。">
						<input type="text" v-model="(selItem.data as BasicAttrData).name">
					</CfgRow>
					<CfgRow label="描述" info="属性值的详细描述。">
						<textarea v-model="(selItem.data as BasicAttrData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="图标" info="属性值的图标路径。">
						<input type="text" v-model="(selItem.data as BasicAttrData).icon">
					</CfgRow>
					<CfgRow label="颜色" info="属性值的显示颜色。">
						<input type="color" v-model="(selItem.data as BasicAttrData).color">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">数值设置</div>
					<CfgRow label="最大值" info="属性值的默认最大值。">
						<input type="number" v-model.number="(selItem.data as BasicAttrData).maxVal" min="1">
					</CfgRow>
					<CfgRow label="回复速率" unit="/秒" info="每秒自动恢复的数值，0表示不自动恢复。">
						<input type="number" v-model.number="(selItem.data as BasicAttrData).regenRate" min="0" step="0.1">
					</CfgRow>
					<CfgRow label="回复延迟" unit="秒" info="受到伤害后暂停回复的时间。">
						<input type="number" v-model.number="(selItem.data as BasicAttrData).regenDelay" min="0" step="0.1">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">显示设置</div>
					<CfgRow label="HUD显示" info="是否在HUD界面中显示此属性值。">
						<CfgSwt v-model="(selItem.data as BasicAttrData).showInHud" />
					</CfgRow>
					<CfgRow label="实体显示" info="是否在实体头顶显示此属性值条。">
						<CfgSwt v-model="(selItem.data as BasicAttrData).showOnEntity" />
					</CfgRow>
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'skillbar'">
				<div class="config-section">
					<div class="config-section-title">技能条配置</div>
					<CfgRow label="名称" info="技能条的显示名称。">
						<input type="text" v-model="(selItem.data as SkillbarData).name">
					</CfgRow>
					<CfgRow label="描述" info="技能条的详细描述。">
						<textarea v-model="(selItem.data as SkillbarData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="栏位数" info="技能条的栏位数量。">
						<CfgSld v-model="(selItem.data as SkillbarData).slots" :min="1" :max="12" :step="1" />
					</CfgRow>
					<CfgRow label="布局方式" info="技能条的排列方式。">
						<CfgCrd v-model="(selItem.data as SkillbarData).layout" :options="layoutOpts" />
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">功能设置</div>
					<CfgRow label="快速释放" info="是否允许通过快捷键直接释放技能。">
						<CfgSwt v-model="(selItem.data as SkillbarData).allowQuickCast" />
					</CfgRow>
					<CfgRow label="显示冷却" info="是否在技能图标上显示冷却时间。">
						<CfgSwt v-model="(selItem.data as SkillbarData).showCooldown" />
					</CfgRow>
					<CfgRow label="显示消耗" info="是否在技能图标上显示消耗值。">
						<CfgSwt v-model="(selItem.data as SkillbarData).showCost" />
					</CfgRow>
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else-if="assetType === 'buildingPreset'">
				<div class="config-section">
					<div class="config-section-title">建筑预设配置</div>
					<CfgRow label="名称" info="建筑预设的显示名称。">
						<input type="text" v-model="(selItem.data as BuildingPresetData).name">
					</CfgRow>
					<CfgRow label="描述" info="建筑预设的详细描述。">
						<textarea v-model="(selItem.data as BuildingPresetData).desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow label="标签" info="用逗号分隔的标签列表。">
						<input type="text" :value="getTagsStr((selItem.data as BuildingPresetData).tags)" @change="(e: Event) => setTagsFromStr((selItem.data as BuildingPresetData).tags, (e.target as HTMLInputElement).value)">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">建筑尺寸</div>
					<CfgRow label="宽度X" unit="格" info="建筑在X轴方向的尺寸。">
						<CfgSld v-model="(selItem.data as BuildingPresetData).sizeX" :min="1" :max="64" :step="1" />
					</CfgRow>
					<CfgRow label="深度Y" unit="格" info="建筑在Y轴方向的尺寸。">
						<CfgSld v-model="(selItem.data as BuildingPresetData).sizeY" :min="1" :max="64" :step="1" />
					</CfgRow>
					<CfgRow label="高度Z" unit="格" info="建筑在Z轴方向的尺寸。">
						<CfgSld v-model="(selItem.data as BuildingPresetData).sizeZ" :min="1" :max="64" :step="1" />
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">体素数据</div>
					<div class="bld-info">
						<span class="bld-info-lbl">方块数量</span>
						<span class="bld-info-val">{{ (selItem.data as BuildingPresetData).blocks.length }}</span>
					</div>
					<button class="bld-edit-btn" @click="openBldEditor(selItem)">打开编辑器</button>
				</div>
				<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
			</template>
			<template v-else>
				<div class="config-section">
					<div class="config-section-title">资产详情</div>
					<CfgRow label="名称" info="资产的显示名称。">
						<input type="text" v-model="selItem.name">
					</CfgRow>
					<button v-if="selFolder" class="ast-del-btn" @click="delItem(selFolder, selItem)">删除</button>
				</div>
			</template>
		</template>
	</SplitPanel>
</template>

<style scoped>
.ast-tree {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.ast-node {
	background: #1a1a1a;
	border: 1px solid #333;
	border-radius: 4px;
	overflow: hidden;
}

.ast-node.sub {
	background: transparent;
	border: none;
	border-radius: 0;
}

.ast-node-hd {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 12px;
	cursor: pointer;
	font-size: 13px;
	transition: background 0.15s;
}

.ast-node-hd:hover {
	background: #252525;
}

.ast-node-hd.sel {
	background: #14291f;
}

.ast-node.sub .ast-node-hd {
	padding: 8px 12px;
	font-size: 12px;
}

.ast-node-hd .arrow {
	stroke: #666;
	transition: transform 0.2s;
	flex-shrink: 0;
}

.ast-node-hd.open .arrow {
	transform: rotate(90deg);
}

.ast-node-hd .folder-ico {
	stroke: #666;
	flex-shrink: 0;
}

.ast-node-bd {
	padding: 4px 8px 8px 20px;
}

.ast-item {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 10px;
	background: #222;
	border-radius: 3px;
	margin-bottom: 4px;
	cursor: pointer;
	font-size: 12px;
	transition: background 0.15s;
}

.ast-item:hover {
	background: #2a2a2a;
}

.ast-item.sel {
	background: #166d3b;
}

.ast-item .item-ico {
	stroke: #888;
	flex-shrink: 0;
}

.ast-item.folder .item-ico {
	stroke: #a90;
}

.ast-actions {
	display: flex;
	gap: 6px;
	margin-top: 6px;
}

.ast-add-btn {
	flex: 1;
	height: 26px;
	background: transparent;
	border: 1px dashed #444;
	border-radius: 3px;
	color: #888;
	font-size: 11px;
	cursor: pointer;
	transition: all 0.15s;
}

.ast-add-btn:hover {
	background: #252525;
	border-color: #166d3b;
	color: #aaa;
}

.ast-del-btn {
	width: 100%;
	height: 32px;
	background: #3a2222;
	border: 1px solid #552222;
	border-radius: 4px;
	color: #c66;
	font-size: 12px;
	cursor: pointer;
	margin-top: 16px;
}

.ast-del-btn:hover {
	background: #4a2828;
	color: #f88;
}

.counter-lst {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.counter-item {
	background: #1a1a1a;
	border: 1px solid #333;
	border-radius: 4px;
	padding: 10px;
}

.counter-row {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 6px;
}

.counter-row:last-child {
	margin-bottom: 0;
}

.counter-tgt {
	flex: 1;
	height: 28px;
	padding: 0 8px;
	background: #222;
	border: 1px solid #444;
	border-radius: 3px;
	color: #ddd;
	font-size: 12px;
}

.counter-dir {
	width: 100px;
	height: 28px;
	padding: 0 6px;
	background: #222;
	border: 1px solid #444;
	border-radius: 3px;
	color: #ddd;
	font-size: 12px;
}

.counter-del {
	width: 24px;
	height: 24px;
	background: #3a2222;
	border: 1px solid #552222;
	border-radius: 3px;
	color: #c66;
	font-size: 14px;
	cursor: pointer;
	flex-shrink: 0;
}

.counter-del:hover {
	background: #4a2828;
	color: #f88;
}

.counter-lbl {
	width: 60px;
	font-size: 11px;
	color: #888;
	flex-shrink: 0;
}

.counter-mod {
	width: 80px;
	height: 26px;
	padding: 0 6px;
	background: #222;
	border: 1px solid #444;
	border-radius: 3px;
	color: #ddd;
	font-size: 12px;
}

.counter-unit {
	font-size: 11px;
	color: #666;
}

.counter-buffs {
	flex: 1;
	height: 26px;
	padding: 0 8px;
	background: #222;
	border: 1px solid #444;
	border-radius: 3px;
	color: #ddd;
	font-size: 12px;
}

.counter-add {
	width: 100%;
	height: 30px;
	background: transparent;
	border: 1px dashed #444;
	border-radius: 4px;
	color: #888;
	font-size: 12px;
	cursor: pointer;
	margin-top: 8px;
}

.counter-add:hover {
	background: #252525;
	border-color: #166d3b;
	color: #aaa;
}

.bld-info {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	background: #1a1a1a;
	border: 1px solid #333;
	border-radius: 4px;
	margin-bottom: 12px;
}

.bld-info-lbl {
	font-size: 12px;
	color: #888;
}

.bld-info-val {
	font-size: 14px;
	color: #6c9;
	font-family: monospace;
}

.bld-edit-btn {
	width: 100%;
	height: 36px;
	background: #1a3a2a;
	border: 1px solid #166d3b;
	border-radius: 4px;
	color: #6c9;
	font-size: 13px;
	cursor: pointer;
	transition: all 0.15s;
}

.bld-edit-btn:hover {
	background: #1f4a35;
	color: #8ef;
}
</style>
