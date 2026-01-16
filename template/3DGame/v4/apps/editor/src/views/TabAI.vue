<script setup lang="ts">
import { useConfigStore } from '@/stores/useConfig'
import CfgCrd from '../components/ui/CfgCrd.vue'
import CfgRow from '../components/ui/CfgRow.vue'
import CfgSld from '../components/ui/CfgSld.vue'
import CfgSwt from '../components/ui/CfgSwt.vue'
import CfgSel from '../components/ui/CfgSel.vue'

const store = useConfigStore()

const algoOpts = [
	{ val: 'astar', lab: 'A*' },
	{ val: 'dijkstra', lab: 'Dijkstra' },
	{ val: 'jps', lab: 'JPS' }
]
</script>

<template>
	<div class="tab-ai">
		<CfgCrd title="寻路">
			<CfgRow label="启用">
				<CfgSwt v-model="store.aiAdvanced.pathfind.enabled" />
			</CfgRow>
			<CfgRow label="算法">
				<CfgSel v-model="store.aiAdvanced.pathfind.algo" :opts="algoOpts" />
			</CfgRow>
			<CfgRow label="网格大小">
				<CfgSld v-model="store.aiAdvanced.pathfind.gridSize" :min="0.5" :max="5" :step="0.5" />
			</CfgRow>
			<CfgRow label="最大节点">
				<CfgSld v-model="store.aiAdvanced.pathfind.maxNodes" :min="100" :max="5000" :step="100" />
			</CfgRow>
			<CfgRow label="更新频率">
				<CfgSld v-model="store.aiAdvanced.pathfind.updateFreq" :min="0.1" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="避让半径">
				<CfgSld v-model="store.aiAdvanced.pathfind.avoidRadius" :min="0.1" :max="2" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="感知">
			<CfgRow label="启用">
				<CfgSwt v-model="store.aiAdvanced.perception.enabled" />
			</CfgRow>
			<CfgRow label="视野角度">
				<CfgSld v-model="store.aiAdvanced.perception.viewAngle" :min="30" :max="360" :step="10" />
			</CfgRow>
			<CfgRow label="视野距离">
				<CfgSld v-model="store.aiAdvanced.perception.viewDist" :min="10" :max="200" :step="10" />
			</CfgRow>
			<CfgRow label="听觉距离">
				<CfgSld v-model="store.aiAdvanced.perception.hearDist" :min="5" :max="100" :step="5" />
			</CfgRow>
			<CfgRow label="记忆时长(s)">
				<CfgSld v-model="store.aiAdvanced.perception.memoryDuration" :min="1" :max="60" :step="1" />
			</CfgRow>
			<CfgRow label="更新率">
				<CfgSld v-model="store.aiAdvanced.perception.updateRate" :min="0.05" :max="1" :step="0.05" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="GOAP规划">
			<CfgRow label="启用">
				<CfgSwt v-model="store.aiAdvanced.goap.enabled" />
			</CfgRow>
			<CfgRow label="最大行动">
				<CfgSld v-model="store.aiAdvanced.goap.maxActions" :min="3" :max="20" :step="1" />
			</CfgRow>
			<CfgRow label="重规划间隔">
				<CfgSld v-model="store.aiAdvanced.goap.replanInterval" :min="0.1" :max="5" :step="0.1" />
			</CfgRow>
			<CfgRow label="代价阈值">
				<CfgSld v-model="store.aiAdvanced.goap.costThreshold" :min="10" :max="500" :step="10" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="战术AI">
			<CfgRow label="启用">
				<CfgSwt v-model="store.aiAdvanced.tactical.enabled" />
			</CfgRow>
			<CfgRow label="掩体权重">
				<CfgSld v-model="store.aiAdvanced.tactical.coverWeight" :min="0" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="侧翼权重">
				<CfgSld v-model="store.aiAdvanced.tactical.flankWeight" :min="0" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="高度权重">
				<CfgSld v-model="store.aiAdvanced.tactical.heightWeight" :min="0" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="距离权重">
				<CfgSld v-model="store.aiAdvanced.tactical.distanceWeight" :min="0" :max="2" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="群体行为">
			<CfgRow label="启用">
				<CfgSwt v-model="store.aiAdvanced.flock.enabled" />
			</CfgRow>
			<CfgRow label="分离力">
				<CfgSld v-model="store.aiAdvanced.flock.separation" :min="0" :max="3" :step="0.1" />
			</CfgRow>
			<CfgRow label="对齐力">
				<CfgSld v-model="store.aiAdvanced.flock.alignment" :min="0" :max="3" :step="0.1" />
			</CfgRow>
			<CfgRow label="凝聚力">
				<CfgSld v-model="store.aiAdvanced.flock.cohesion" :min="0" :max="3" :step="0.1" />
			</CfgRow>
			<CfgRow label="最大速度">
				<CfgSld v-model="store.aiAdvanced.flock.maxSpeed" :min="1" :max="20" :step="1" />
			</CfgRow>
			<CfgRow label="邻居距离">
				<CfgSld v-model="store.aiAdvanced.flock.neighborDist" :min="2" :max="30" :step="2" />
			</CfgRow>
			<CfgRow label="避让距离">
				<CfgSld v-model="store.aiAdvanced.flock.avoidDist" :min="0.5" :max="5" :step="0.5" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="仇恨系统">
			<CfgRow label="启用">
				<CfgSwt v-model="store.aiAdvanced.aggro.enabled" />
			</CfgRow>
			<CfgRow label="衰减率">
				<CfgSld v-model="store.aiAdvanced.aggro.decayRate" :min="0" :max="20" :step="1" />
			</CfgRow>
			<CfgRow label="最大目标数">
				<CfgSld v-model="store.aiAdvanced.aggro.maxTargets" :min="1" :max="20" :step="1" />
			</CfgRow>
			<CfgRow label="威胁系数">
				<CfgSld v-model="store.aiAdvanced.aggro.threatMul" :min="0.1" :max="3" :step="0.1" />
			</CfgRow>
			<CfgRow label="治疗威胁系数">
				<CfgSld v-model="store.aiAdvanced.aggro.healThreatMul" :min="0" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="近距离加成">
				<CfgSld v-model="store.aiAdvanced.aggro.proximityBonus" :min="0" :max="50" :step="5" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="NavMesh">
			<CfgRow label="启用">
				<CfgSwt v-model="store.aiAdvanced.navmesh.enabled" />
			</CfgRow>
			<CfgRow label="Cell大小">
				<CfgSld v-model="store.aiAdvanced.navmesh.cellSize" :min="0.1" :max="1" :step="0.1" />
			</CfgRow>
			<CfgRow label="Cell高度">
				<CfgSld v-model="store.aiAdvanced.navmesh.cellHeight" :min="0.1" :max="0.5" :step="0.05" />
			</CfgRow>
			<CfgRow label="Agent高度">
				<CfgSld v-model="store.aiAdvanced.navmesh.agentHeight" :min="1" :max="4" :step="0.1" />
			</CfgRow>
			<CfgRow label="Agent半径">
				<CfgSld v-model="store.aiAdvanced.navmesh.agentRadius" :min="0.2" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="最大坡度">
				<CfgSld v-model="store.aiAdvanced.navmesh.maxSlope" :min="15" :max="60" :step="5" />
			</CfgRow>
			<CfgRow label="最大台阶">
				<CfgSld v-model="store.aiAdvanced.navmesh.maxStepHeight" :min="0.1" :max="1" :step="0.1" />
			</CfgRow>
			<CfgRow label="最小区域">
				<CfgSld v-model="store.aiAdvanced.navmesh.minRegionArea" :min="1" :max="50" :step="1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="对话系统">
			<CfgRow label="启用">
				<CfgSwt v-model="store.ai.dialogue.canTalk" />
			</CfgRow>
			<CfgRow label="交互距离">
				<CfgSld v-model="store.ai.dialogue.talkRange" :min="1" :max="20" :step="1" />
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
