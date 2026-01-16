<script setup lang="ts">
import { ref } from 'vue'
import CfgCrd from '../components/ui/CfgCrd.vue'
import CfgRow from '../components/ui/CfgRow.vue'
import CfgSld from '../components/ui/CfgSld.vue'
import CfgSwt from '../components/ui/CfgSwt.vue'

const pathfindingEnabled = ref(true)
const pathfindingGridSize = ref(1.0)
const pathfindingMaxNodes = ref(1000)

const perceptionEnabled = ref(true)
const perceptionViewAngle = ref(120)
const perceptionViewDist = ref(50)
const perceptionHearDist = ref(20)

const goapEnabled = ref(true)
const goapMaxActions = ref(10)
const goapReplanInterval = ref(1.0)

const tacticalEnabled = ref(true)
const tacticalCoverWeight = ref(1.0)
const tacticalFlankWeight = ref(0.8)

const flockingEnabled = ref(true)
const flockSeparation = ref(1.5)
const flockAlignment = ref(1.0)
const flockCohesion = ref(1.0)

const dialogueEnabled = ref(true)
</script>

<template>
	<div class="tab-ai">
		<CfgCrd title="寻路">
			<CfgRow label="启用">
				<CfgSwt v-model="pathfindingEnabled" />
			</CfgRow>
			<CfgRow label="网格大小">
				<CfgSld v-model="pathfindingGridSize" :min="0.5" :max="5" :step="0.5" />
			</CfgRow>
			<CfgRow label="最大节点">
				<CfgSld v-model="pathfindingMaxNodes" :min="100" :max="5000" :step="100" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="感知">
			<CfgRow label="启用">
				<CfgSwt v-model="perceptionEnabled" />
			</CfgRow>
			<CfgRow label="视野角度">
				<CfgSld v-model="perceptionViewAngle" :min="30" :max="360" :step="10" />
			</CfgRow>
			<CfgRow label="视野距离">
				<CfgSld v-model="perceptionViewDist" :min="10" :max="200" :step="10" />
			</CfgRow>
			<CfgRow label="听觉距离">
				<CfgSld v-model="perceptionHearDist" :min="5" :max="100" :step="5" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="GOAP规划">
			<CfgRow label="启用">
				<CfgSwt v-model="goapEnabled" />
			</CfgRow>
			<CfgRow label="最大行动">
				<CfgSld v-model="goapMaxActions" :min="3" :max="20" :step="1" />
			</CfgRow>
			<CfgRow label="重规划间隔">
				<CfgSld v-model="goapReplanInterval" :min="0.1" :max="5" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="战术AI">
			<CfgRow label="启用">
				<CfgSwt v-model="tacticalEnabled" />
			</CfgRow>
			<CfgRow label="掩体权重">
				<CfgSld v-model="tacticalCoverWeight" :min="0" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="侧翼权重">
				<CfgSld v-model="tacticalFlankWeight" :min="0" :max="2" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="群体行为">
			<CfgRow label="启用">
				<CfgSwt v-model="flockingEnabled" />
			</CfgRow>
			<CfgRow label="分离力">
				<CfgSld v-model="flockSeparation" :min="0" :max="3" :step="0.1" />
			</CfgRow>
			<CfgRow label="对齐力">
				<CfgSld v-model="flockAlignment" :min="0" :max="3" :step="0.1" />
			</CfgRow>
			<CfgRow label="凝聚力">
				<CfgSld v-model="flockCohesion" :min="0" :max="3" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="对话系统">
			<CfgRow label="启用">
				<CfgSwt v-model="dialogueEnabled" />
			</CfgRow>
		</CfgCrd>
	</div>
</template>

<style scoped>
.tab-ai {
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	overflow-y: auto;
	height: 100%;
}
</style>
