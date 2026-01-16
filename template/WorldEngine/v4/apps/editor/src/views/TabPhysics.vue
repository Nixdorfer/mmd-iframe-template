<script setup lang="ts">
import { useConfigStore } from '@/stores/useConfig'
import CfgCrd from '../components/ui/CfgCrd.vue'
import CfgRow from '../components/ui/CfgRow.vue'
import CfgSld from '../components/ui/CfgSld.vue'
import CfgSwt from '../components/ui/CfgSwt.vue'

const store = useConfigStore()
</script>

<template>
	<div class="tab-physics">
		<CfgCrd title="世界设置">
			<CfgRow label="重力X">
				<CfgSld v-model="store.world.physics.gravityX" :min="-20" :max="20" :step="0.1" />
			</CfgRow>
			<CfgRow label="重力Y">
				<CfgSld v-model="store.world.physics.gravityY" :min="-20" :max="0" :step="0.1" />
			</CfgRow>
			<CfgRow label="重力Z">
				<CfgSld v-model="store.world.physics.gravityZ" :min="-20" :max="20" :step="0.1" />
			</CfgRow>
			<CfgRow label="TPS">
				<CfgSld v-model="store.world.physics.tps" :min="30" :max="120" :step="10" />
			</CfgRow>
			<CfgRow label="子步数">
				<CfgSld v-model="store.world.physics.maxSubSteps" :min="1" :max="10" :step="1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="求解器">
			<CfgRow label="迭代次数">
				<CfgSld v-model="store.world.physics.solverIterations" :min="1" :max="30" :step="1" />
			</CfgRow>
			<CfgRow label="宽相边距">
				<CfgSld v-model="store.world.physics.broadphaseMargin" :min="0.01" :max="0.2" :step="0.01" />
			</CfgRow>
			<CfgRow label="启用CCD">
				<CfgSwt v-model="store.world.physics.ccdEnabled" />
			</CfgRow>
			<CfgRow label="CCD速度阈值">
				<CfgSld v-model="store.world.physics.ccdVelThreshold" :min="0.1" :max="10" :step="0.1" />
			</CfgRow>
			<CfgRow label="休眠">
				<CfgSwt v-model="store.world.physics.sleepEnabled" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="默认材质">
			<CfgRow label="弹性">
				<CfgSld v-model="store.world.physics.defaultRestitution" :min="0" :max="1" :step="0.05" />
			</CfgRow>
			<CfgRow label="摩擦力">
				<CfgSld v-model="store.world.physics.defaultFriction" :min="0" :max="1" :step="0.05" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="布娃娃">
			<CfgRow label="启用">
				<CfgSwt v-model="store.world.physicsAdvanced.ragdoll.enabled" />
			</CfgRow>
			<CfgRow label="阻尼">
				<CfgSld v-model="store.world.physicsAdvanced.ragdoll.damping" :min="0" :max="1" :step="0.05" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="布料">
			<CfgRow label="启用">
				<CfgSwt v-model="store.world.physicsAdvanced.cloth.enabled" />
			</CfgRow>
			<CfgRow label="迭代次数">
				<CfgSld v-model="store.world.physicsAdvanced.cloth.iterations" :min="1" :max="16" :step="1" />
			</CfgRow>
			<CfgRow label="刚度">
				<CfgSld v-model="store.world.physicsAdvanced.cloth.stiffness" :min="0" :max="1" :step="0.05" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="流体">
			<CfgRow label="启用">
				<CfgSwt v-model="store.world.physicsAdvanced.fluid.enabled" />
			</CfgRow>
			<CfgRow label="粘度">
				<CfgSld v-model="store.world.physicsAdvanced.fluid.viscosity" :min="0" :max="0.1" :step="0.001" />
			</CfgRow>
			<CfgRow label="密度">
				<CfgSld v-model="store.world.physicsAdvanced.fluid.density" :min="100" :max="2000" :step="100" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="绳索">
			<CfgRow label="启用">
				<CfgSwt v-model="store.world.physicsAdvanced.rope.enabled" />
			</CfgRow>
			<CfgRow label="分段数">
				<CfgSld v-model="store.world.physicsAdvanced.rope.segments" :min="5" :max="50" :step="5" />
			</CfgRow>
			<CfgRow label="刚度">
				<CfgSld v-model="store.world.physicsAdvanced.rope.stiffness" :min="0" :max="1" :step="0.05" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="破坏系统">
			<CfgRow label="启用">
				<CfgSwt v-model="store.world.physicsAdvanced.destruction.enabled" />
			</CfgRow>
			<CfgRow label="碎片数量">
				<CfgSld v-model="store.world.physicsAdvanced.destruction.fragments" :min="3" :max="20" :step="1" />
			</CfgRow>
			<CfgRow label="碎片生命">
				<CfgSld v-model="store.world.physicsAdvanced.destruction.debrisLife" :min="1" :max="30" :step="1" />
			</CfgRow>
		</CfgCrd>
	</div>
</template>

<style scoped>
.tab-physics {
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	overflow-y: auto;
	height: 100%;
}
</style>
