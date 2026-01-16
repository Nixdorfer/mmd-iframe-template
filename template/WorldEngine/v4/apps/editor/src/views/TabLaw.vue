<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore } from '@/stores/useConfig'
import TabLayout from '@/components/layout/TabLayout.vue'
import CfgRow from '@/components/ui/CfgRow.vue'
import CfgSwt from '@/components/ui/CfgSwt.vue'
import CfgSld from '@/components/ui/CfgSld.vue'
import CfgCrd from '@/components/ui/CfgCrd.vue'

const store = useConfigStore()

const lawList = [
	{ id: 'causality', name: '因果律' },
	{ id: 'equivalent_exchange', name: '等价交换' },
	{ id: 'conservation', name: '守恒律' },
	{ id: 'contract', name: '契约律' },
	{ id: 'mortality', name: '必死律' },
	{ id: 'identity', name: '同一律' }
]

const lawInfo: Record<string, string> = {
	causality: '任何行动都会产生相应的结果。\n打破因果链需要付出代价。\n当试图无因而果或有因无果时触发惩罚。',
	equivalent_exchange: '获得任何东西都需要付出等价的代价。\n试图无偿获得或不等价交换时触发惩罚。\n代价可以是物质、能量或抽象概念。',
	conservation: '能量和物质不能凭空产生或消失。\n试图创造或湮灭物质/能量时触发惩罚。\n只能进行转换而非凭空生成。',
	contract: '签订的契约必须遵守。\n违反契约条款时触发惩罚。\n契约一旦成立即具有约束力。',
	mortality: '所有生命终将死亡。\n试图避免死亡或复活时触发惩罚。\n任何形式的永生都需要付出代价。',
	identity: '每个存在都有唯一的身份。\n身份复制、替换或伪造时触发惩罚。\n灵魂和意识的唯一性受此法则保护。'
}

const curLaw = ref('causality')

const curLawInfo = computed(() => lawInfo[curLaw.value] || '')

const costTypeOpts = [
	{ value: 'health', label: '生命值', desc: '扣除当前HP' },
	{ value: 'lifespan', label: '寿命', desc: '缩短剩余寿命' },
	{ value: 'soul', label: '灵魂', desc: '消耗灵魂能量' },
	{ value: 'karma', label: '因果', desc: '积累负面因果' },
	{ value: 'resource', label: '资源', desc: '消耗物质资源' },
	{ value: 'permanent', label: '永久', desc: '不可恢复的损失' }
]
</script>

<template>
	<TabLayout leftTitle="世界法则" rightTitle="法则配置">
		<template #left>
			<div class="cat-lst">
				<div
					v-for="law in lawList"
					:key="law.id"
					class="cat-item"
					:class="{ sel: curLaw === law.id }"
					@click="curLaw = law.id"
				>
					{{ law.name }}
				</div>
			</div>
		</template>
		<template #right>
			<div class="config-section">
				<div class="config-section-title">法则说明</div>
				<div class="law-desc">{{ curLawInfo }}</div>
			</div>
			<div class="config-section">
				<div class="config-section-title">基础设置</div>
				<CfgRow label="启用" info="开启后此法则在世界中生效，违反者将受到惩罚">
					<CfgSwt v-model="store.laws[curLaw].enabled" />
				</CfgRow>
				<CfgRow v-if="store.proMode" label="违反代价类型" info="违反此法则时需要支付的代价种类">
					<CfgCrd v-model="store.laws[curLaw].costType" :options="costTypeOpts" />
				</CfgRow>
				<CfgRow v-if="store.proMode" label="代价数值" info="违反法则时需要支付的代价基础数值。实际代价 = 基础数值 × (1 - 减免率)">
					<input type="number" v-model.number="store.laws[curLaw].costAmount" min="0">
				</CfgRow>
				<CfgRow v-if="store.proMode" label="代价减免" unit="%" info="减少违反法则的代价。100%表示完全免除代价。">
					<CfgSld v-model="store.laws[curLaw].costReduction" :min="0" :max="100" />
				</CfgRow>
				<CfgRow v-if="store.proMode" label="豁免标签" info="拥有这些标签的实体可以豁免此法则。多个标签用逗号分隔。">
					<input type="text" :value="store.laws[curLaw].exemptTags.join(',')" @change="e => store.laws[curLaw].exemptTags = (e.target as HTMLInputElement).value.split(',').filter(Boolean)">
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

.law-desc {
	background: #1a1a1a;
	border: 1px solid #333;
	border-radius: 4px;
	padding: 12px;
	font-size: 12px;
	color: #aaa;
	line-height: 1.6;
	white-space: pre-wrap;
	margin-bottom: 16px;
}
</style>
