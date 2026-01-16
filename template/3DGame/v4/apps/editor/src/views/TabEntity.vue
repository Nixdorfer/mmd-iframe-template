<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@/stores/useConfig'
import TabLayout from '@/components/layout/TabLayout.vue'
import CfgRow from '@/components/ui/CfgRow.vue'
import CfgSld from '@/components/ui/CfgSld.vue'
import CfgCrd from '@/components/ui/CfgCrd.vue'

const store = useConfigStore()
const curIdx = ref(0)

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

const colliderOpts = [
	{ value: 'capsule', label: '胶囊', desc: '适合人形' },
	{ value: 'box', label: '盒形', desc: '方形物体' },
	{ value: 'sphere', label: '球形', desc: '圆形生物' }
]

const sizeOpts = [
	{ value: 'tiny', label: '迷你', desc: '缩放0.3 HP×0.3' },
	{ value: 'small', label: '小型', desc: '缩放0.6 HP×0.6' },
	{ value: 'medium', label: '中型', desc: '缩放1.0 标准' },
	{ value: 'large', label: '大型', desc: '缩放1.5 HP×1.8' },
	{ value: 'huge', label: '巨大', desc: '缩放2.5 HP×3.0' },
	{ value: 'colossal', label: '超巨', desc: '缩放5.0 HP×6.0' }
]

const rarityOpts = [
	{ value: 'common', label: '普通', desc: '随处可见' },
	{ value: 'uncommon', label: '罕见', desc: '偶尔出现' },
	{ value: 'rare', label: '稀有', desc: '难以遇见' },
	{ value: 'epic', label: '史诗', desc: '非常稀有' },
	{ value: 'legendary', label: '传说', desc: '极其罕见' }
]

function addEntity() {
	const id = 'entity_' + Date.now()
	store.entities.push({
		id,
		name: '新实体',
		desc: '',
		tags: [],
		hp: 100,
		atk: 10,
		def: 5,
		spd: 5,
		locomotion: 'biped',
		locomotionMod: 'none',
		size: 'medium',
		rarity: 'common',
		collider: 'capsule',
		mass: 70,
		drag: 0.1,
		angDrag: 0.05,
		gravityScale: 1,
		bounce: 0,
		friction: 0.5
	})
	curIdx.value = store.entities.length - 1
}

function delEntity() {
	if (store.entities.length <= 1) return
	store.entities.splice(curIdx.value, 1)
	if (curIdx.value >= store.entities.length) {
		curIdx.value = store.entities.length - 1
	}
}
</script>

<template>
	<TabLayout leftTitle="实体列表" rightTitle="实体配置">
		<template #left>
			<div class="entity-lst">
				<div
					v-for="(ent, i) in store.entities"
					:key="ent.id"
					class="entity-item"
					:class="{ sel: curIdx === i }"
					@click="curIdx = i"
				>
					{{ ent.name }}
				</div>
			</div>
			<button class="entity-add-btn" @click="addEntity">+ 添加实体</button>
		</template>
		<template #right>
			<template v-if="store.entities[curIdx]">
				<div class="config-section">
					<div class="config-section-title">基础属性</div>
					<CfgRow v-if="store.proMode" label="实体ID" info="实体的唯一标识符，用于代码引用和存档。">
						<input type="text" :value="store.entities[curIdx].id" readonly>
					</CfgRow>
					<CfgRow label="名称" info="实体的显示名称，会显示在游戏中的血条上方。">
						<input type="text" v-model="store.entities[curIdx].name">
					</CfgRow>
					<CfgRow label="描述" info="实体的详细描述，用于游戏内的信息展示。">
						<textarea v-model="store.entities[curIdx].desc" rows="2"></textarea>
					</CfgRow>
					<CfgRow v-if="store.proMode" label="标签" info="实体的分类标签，用逗号分隔。用于技能和规则的豁免判定。">
						<input type="text" :value="store.entities[curIdx].tags.join(', ')" @change="(e: Event) => store.entities[curIdx].tags = (e.target as HTMLInputElement).value.split(',').map(t => t.trim()).filter(t => t)">
					</CfgRow>
					<CfgRow label="生命值" info="实体的最大生命值。生命归零时实体死亡。">
						<input type="number" v-model.number="store.entities[curIdx].hp" min="1">
					</CfgRow>
					<CfgRow label="攻击力" info="实体的基础攻击力。用于计算伤害输出。">
						<input type="number" v-model.number="store.entities[curIdx].atk" min="0">
					</CfgRow>
					<CfgRow label="防御力" info="实体的基础防御力。用于计算伤害减免。">
						<input type="number" v-model.number="store.entities[curIdx].def" min="0">
					</CfgRow>
					<CfgRow label="速度" info="实体的移动速度基础值。影响行走和奔跑速度。">
						<input type="number" v-model.number="store.entities[curIdx].spd" min="0">
					</CfgRow>
				</div>
				<div class="config-section">
					<div class="config-section-title">运动设置</div>
					<CfgRow v-if="store.proMode" label="运动类型" info="决定实体的骨骼结构和动画系统。">
						<CfgCrd v-model="store.entities[curIdx].locomotion" :options="locomotionOpts" />
					</CfgRow>
					<CfgRow v-if="store.proMode" label="运动修饰" info="附加的运动能力。">
						<CfgCrd v-model="store.entities[curIdx].locomotionMod" :options="locomotionModOpts" />
					</CfgRow>
					<CfgRow label="尺寸" info="实体的大小等级。影响模型缩放和属性倍率。">
						<CfgCrd v-model="store.entities[curIdx].size" :options="sizeOpts" />
					</CfgRow>
					<CfgRow label="稀有度" info="实体的稀有程度。影响生成概率和奖励。">
						<CfgCrd v-model="store.entities[curIdx].rarity" :options="rarityOpts" />
					</CfgRow>
					<CfgRow v-if="store.proMode" label="碰撞器" info="物理碰撞检测的形状。">
						<CfgCrd v-model="store.entities[curIdx].collider" :options="colliderOpts" />
					</CfgRow>
				</div>
				<div v-if="store.proMode" class="config-section">
					<div class="config-section-title">物理属性</div>
					<CfgRow label="质量" unit="kg" info="实体的物理质量。影响推动力和碰撞效果。质量越大越难被推动。">
						<input type="number" v-model.number="store.entities[curIdx].mass" min="0.1" step="1">
					</CfgRow>
					<CfgRow label="线性阻力" info="移动时的空气阻力。数值越大减速越快。0=无阻力。">
						<input type="number" v-model.number="store.entities[curIdx].drag" min="0" max="10" step="0.1">
					</CfgRow>
					<CfgRow label="角阻力" info="旋转时的阻力。数值越大旋转减速越快。">
						<input type="number" v-model.number="store.entities[curIdx].angDrag" min="0" max="10" step="0.01">
					</CfgRow>
					<CfgRow label="重力缩放" info="相对于世界重力的倍数。0=不受重力 1=正常 2=双倍重力">
						<input type="number" v-model.number="store.entities[curIdx].gravityScale" min="0" max="5" step="0.1">
					</CfgRow>
					<CfgRow label="反弹系数" info="碰撞时的弹性。0=不反弹 1=完全弹性碰撞">
						<CfgSld v-model="store.entities[curIdx].bounce" :min="0" :max="1" :step="0.1" />
					</CfgRow>
					<CfgRow label="摩擦系数" info="表面摩擦力。0=完全光滑 1=非常粗糙">
						<CfgSld v-model="store.entities[curIdx].friction" :min="0" :max="1" :step="0.1" />
					</CfgRow>
				</div>
				<div class="config-section">
					<button class="entity-del-btn" @click="delEntity">删除此实体</button>
				</div>
			</template>
		</template>
	</TabLayout>
</template>

<style scoped>
.entity-lst {
	padding: 8px;
}

.entity-item {
	padding: 10px 12px;
	border-radius: 4px;
	cursor: pointer;
	color: #aaa;
	font-size: 13px;
	transition: all 0.15s;
}

.entity-item:hover {
	background: #2a2a2a;
}

.entity-item.sel {
	background: #166d3b;
	color: #fff;
}

.entity-add-btn {
	width: calc(100% - 16px);
	margin: 8px;
	height: 32px;
	background: #1a3a2a;
	border: 1px solid #166d3b;
	border-radius: 4px;
	color: #6c9;
	font-size: 12px;
	cursor: pointer;
}

.entity-add-btn:hover {
	background: #1f4a32;
}

.entity-del-btn {
	width: 100%;
	height: 32px;
	background: #3a2222;
	border: 1px solid #552222;
	border-radius: 4px;
	color: #c66;
	font-size: 12px;
	cursor: pointer;
}

.entity-del-btn:hover {
	background: #4a2828;
	color: #f88;
}
</style>
