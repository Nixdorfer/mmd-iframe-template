<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore } from '@/stores/useConfig'
import TabLayout from '@/components/layout/TabLayout.vue'
import CfgRow from '@/components/ui/CfgRow.vue'
import CfgSwt from '@/components/ui/CfgSwt.vue'
import CfgSld from '@/components/ui/CfgSld.vue'
import CfgCrd from '@/components/ui/CfgCrd.vue'

const store = useConfigStore()

const allCategories = [
	{ id: 'combat', name: '战斗规则', pro: false },
	{ id: 'death', name: '死亡规则', pro: false },
	{ id: 'progression', name: '进度规则', pro: false },
	{ id: 'economy', name: '经济规则', pro: true },
	{ id: 'social', name: '社交规则', pro: true }
]

const categories = computed(() => {
	if (store.proMode) return allCategories
	return allCategories.filter(c => !c.pro)
})

const curCat = ref('combat')

const levelCapEnabled = ref(store.rules.progression.levelCap > 0)

const expCurveOpts = [
	{ value: 'linear', label: '线性', desc: '等差增长' },
	{ value: 'exponential', label: '指数', desc: '指数增长' },
	{ value: 'logarithmic', label: '对数', desc: '对数增长' }
]

const respawnLocOpts = [
	{ value: 'checkpoint', label: '存档点', desc: '最近存档点' },
	{ value: 'home', label: '主城', desc: '固定重生点' },
	{ value: 'death', label: '死亡点', desc: '原地复活' }
]

function toggleLevelCap() {
	levelCapEnabled.value = !levelCapEnabled.value
	if (!levelCapEnabled.value) {
		store.rules.progression.levelCap = 0
	} else {
		store.rules.progression.levelCap = 100
	}
}
</script>

<template>
	<TabLayout leftTitle="规则配置" rightTitle="参数设置">
		<template #left>
			<div class="cat-lst">
				<div
					v-for="cat in categories"
					:key="cat.id"
					class="cat-item"
					:class="{ sel: curCat === cat.id }"
					@click="curCat = cat.id"
				>
					{{ cat.name }}
				</div>
			</div>
		</template>
		<template #right>
			<div v-if="curCat === 'combat'" class="config-section">
				<div class="config-section-title">战斗规则</div>
				<CfgRow label="友军伤害" info="开启后队友之间的攻击会造成伤害。">
					<CfgSwt v-model="store.rules.combat.friendlyFire" />
				</CfgRow>
				<CfgRow label="PVP" info="开启后玩家之间可以互相攻击。">
					<CfgSwt v-model="store.rules.combat.pvp" />
				</CfgRow>
				<CfgRow label="等级缩放" info="开启后高等级玩家对低等级玩家的伤害会被削弱。">
					<CfgSwt v-model="store.rules.combat.levelScaling" />
				</CfgRow>
				<CfgRow label="抗性上限" unit="%" info="角色抗性的最大值。0%=无上限 75%=最多减免75%伤害">
					<CfgSld v-model="store.rules.combat.resistanceCap" :min="0" :max="1" :step="0.05" />
				</CfgRow>
				<CfgRow label="闪避上限" unit="%" info="角色闪避率的最大值。0%=无法闪避 50%=最多50%闪避率">
					<CfgSld v-model="store.rules.combat.dodgeCap" :min="0" :max="1" :step="0.05" />
				</CfgRow>
				<CfgRow label="暴击倍率" info="暴击时造成的伤害倍率。1.5=150%伤害 2.0=200%伤害">
					<CfgSld v-model="store.rules.combat.critMul" :min="1" :max="5" :step="0.1" />
				</CfgRow>
				<CfgRow v-if="store.proMode" label="伤害公式" info="自定义伤害计算公式。留空使用默认公式。">
					<input type="text" v-model="store.rules.combat.damageFormula" placeholder="atk * (1 - def / (def + 100))">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'death'" class="config-section">
				<div class="config-section-title">死亡规则</div>
				<CfgRow label="永久死亡" info="开启后角色死亡将无法复活，需要重新创建。">
					<CfgSwt v-model="store.rules.death.permaDeath" />
				</CfgRow>
				<template v-if="!store.rules.death.permaDeath">
					<CfgRow label="经验损失" unit="%" info="死亡时损失的经验值比例。0%=不损失 100%=全部损失">
						<CfgSld v-model="store.rules.death.expLoss" :min="0" :max="1" :step="0.05" />
					</CfgRow>
					<CfgRow label="物品掉落" info="开启后死亡时会掉落背包中的物品。">
						<CfgSwt v-model="store.rules.death.itemDrop" />
					</CfgRow>
					<CfgRow label="复活延迟" unit="秒" info="死亡后需要等待的复活时间。">
						<input type="number" v-model.number="store.rules.death.respawnDelay" min="1" max="60">
					</CfgRow>
					<CfgRow label="复活位置" info="角色复活后出现的位置。">
						<CfgCrd v-model="store.rules.death.respawnLoc" :options="respawnLocOpts" />
					</CfgRow>
					<CfgRow label="灵魂回收" info="开启后可以在死亡地点回收损失的经验/物品。">
						<CfgSwt v-model="store.rules.death.soulRecovery" />
					</CfgRow>
				</template>
			</div>
			<div v-else-if="curCat === 'progression'" class="config-section">
				<div class="config-section-title">进度规则</div>
				<CfgRow label="等级上限" info="角色可达到的最高等级。关闭则无上限。">
					<div class="level-cap-row">
						<CfgSwt :modelValue="levelCapEnabled" @update:modelValue="toggleLevelCap" />
						<input v-if="levelCapEnabled" type="number" v-model.number="store.rules.progression.levelCap" min="1" max="999">
					</div>
				</CfgRow>
				<CfgRow label="经验曲线" info="升级所需经验的增长方式。">
					<CfgCrd v-model="store.rules.progression.expCurve" :options="expCurveOpts" />
				</CfgRow>
				<CfgRow label="每级技能点" info="每次升级获得的技能点数。">
					<input type="number" v-model.number="store.rules.progression.skillPerLevel" min="1" max="10">
				</CfgRow>
				<CfgRow label="每级属性点" info="每次升级获得的属性点数。">
					<input type="number" v-model.number="store.rules.progression.attrPerLevel" min="1" max="20">
				</CfgRow>
				<CfgRow label="允许洗点" info="是否允许玩家重置已分配的技能点和属性点。">
					<CfgSwt v-model="store.rules.progression.canRespec" />
				</CfgRow>
				<CfgRow v-if="store.rules.progression.canRespec" label="洗点费用" info="每次洗点需要的货币数量。">
					<input type="number" v-model.number="store.rules.progression.respecCost" min="0" max="100000">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'economy'" class="config-section">
				<div class="config-section-title">经济规则</div>
				<CfgRow label="交易税" unit="%" info="玩家间交易时收取的税率。">
					<CfgSld v-model="store.rules.economy.tradeTax" :min="0" :max="1" :step="0.01" />
				</CfgRow>
				<CfgRow label="通货膨胀" unit="%" info="每日物价上涨的比例。0%=物价稳定">
					<CfgSld v-model="store.rules.economy.inflation" :min="0" :max="1" :step="0.01" />
				</CfgRow>
				<CfgRow label="最大库存" unit="格" info="玩家背包的最大格子数。">
					<input type="number" v-model.number="store.rules.economy.maxInventory" min="10" max="1000">
				</CfgRow>
				<CfgRow label="银行利息" unit="%" info="存放在银行的货币每日获得的利息。">
					<CfgSld v-model="store.rules.economy.bankInterest" :min="0" :max="0.1" :step="0.001" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'social'" class="config-section">
				<div class="config-section-title">社交规则</div>
				<CfgRow label="队伍上限" unit="人" info="一个队伍最多可以容纳的玩家数量。">
					<input type="number" v-model.number="store.rules.social.maxParty" min="1" max="100">
				</CfgRow>
				<CfgRow label="公会上限" unit="人" info="一个公会最多可以容纳的成员数量。">
					<input type="number" v-model.number="store.rules.social.maxGuild" min="1" max="10000">
				</CfgRow>
				<CfgRow label="婚姻系统" info="开启后玩家可以结婚，获得特殊buff和功能。">
					<CfgSwt v-model="store.rules.social.marriage" />
				</CfgRow>
			</div>
		</template>
	</TabLayout>
</template>

<style scoped>
.cat-lst {
	padding: 8px;
}

.cat-item {
	padding: 10px 12px;
	border-radius: 4px;
	cursor: pointer;
	color: #aaa;
	font-size: 13px;
	transition: all 0.15s;
}

.cat-item:hover {
	background: #2a2a2a;
}

.cat-item.sel {
	background: #166d3b;
	color: #fff;
}

.level-cap-row {
	display: flex;
	align-items: center;
	gap: 12px;
}

.level-cap-row input {
	width: 80px;
}
</style>
