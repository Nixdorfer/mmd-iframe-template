<script setup lang="ts">
import { useConfigStore } from '@/stores/useConfig'
import CfgCrd from '../components/ui/CfgCrd.vue'
import CfgRow from '../components/ui/CfgRow.vue'
import CfgSld from '../components/ui/CfgSld.vue'
import CfgSwt from '../components/ui/CfgSwt.vue'

const store = useConfigStore()
</script>

<template>
	<div class="tab-render">
		<CfgCrd title="阴影">
			<CfgRow label="启用阴影">
				<CfgSwt v-model="store.world.postProcess.shadow.enabled" />
			</CfgRow>
			<CfgRow label="分辨率">
				<select v-model="store.world.postProcess.shadow.resolution" class="cfg-sel">
					<option :value="512">512</option>
					<option :value="1024">1024</option>
					<option :value="2048">2048</option>
					<option :value="4096">4096</option>
				</select>
			</CfgRow>
			<CfgRow label="偏移">
				<CfgSld v-model="store.world.postProcess.shadow.bias" :min="0" :max="0.05" :step="0.001" />
			</CfgRow>
			<CfgRow label="强度">
				<CfgSld v-model="store.world.postProcess.shadow.intensity" :min="0" :max="1" :step="0.05" />
			</CfgRow>
			<CfgRow label="级联数">
				<CfgSld v-model="store.world.postProcess.shadow.cascades" :min="1" :max="4" :step="1" />
			</CfgRow>
			<CfgRow label="最远距离">
				<CfgSld v-model="store.world.postProcess.shadow.distance" :min="10" :max="500" :step="10" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="SSAO">
			<CfgRow label="启用SSAO">
				<CfgSwt v-model="store.world.postProcess.ssao.enabled" />
			</CfgRow>
			<CfgRow label="半径">
				<CfgSld v-model="store.world.postProcess.ssao.radius" :min="0.1" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="强度">
				<CfgSld v-model="store.world.postProcess.ssao.intensity" :min="0" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="采样数">
				<CfgSld v-model="store.world.postProcess.ssao.samples" :min="8" :max="64" :step="8" />
			</CfgRow>
			<CfgRow label="偏移">
				<CfgSld v-model="store.world.postProcess.ssao.bias" :min="0" :max="0.1" :step="0.005" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="Bloom">
			<CfgRow label="启用Bloom">
				<CfgSwt v-model="store.world.postProcess.bloom.enabled" />
			</CfgRow>
			<CfgRow label="阈值">
				<CfgSld v-model="store.world.postProcess.bloom.threshold" :min="0" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="强度">
				<CfgSld v-model="store.world.postProcess.bloom.intensity" :min="0" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="半径">
				<CfgSld v-model="store.world.postProcess.bloom.radius" :min="0" :max="1" :step="0.05" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="全局光照">
			<CfgRow label="启用GI">
				<CfgSwt v-model="store.world.postProcess.gi.enabled" />
			</CfgRow>
			<CfgRow label="强度">
				<CfgSld v-model="store.world.postProcess.gi.intensity" :min="0" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="探针间距">
				<CfgSld v-model="store.world.postProcess.gi.probeSpacing" :min="1" :max="10" :step="0.5" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="体积雾">
			<CfgRow label="启用">
				<CfgSwt v-model="store.world.postProcess.fog.enabled" />
			</CfgRow>
			<CfgRow label="类型">
				<select v-model="store.world.postProcess.fog.type" class="cfg-sel">
					<option :value="0">线性</option>
					<option :value="1">指数</option>
					<option :value="2">指数平方</option>
					<option :value="3">高度</option>
				</select>
			</CfgRow>
			<CfgRow label="密度">
				<CfgSld v-model="store.world.postProcess.fog.density" :min="0" :max="0.1" :step="0.001" />
			</CfgRow>
			<CfgRow label="起始距离">
				<CfgSld v-model="store.world.postProcess.fog.start" :min="0" :max="100" :step="1" />
			</CfgRow>
			<CfgRow label="结束距离">
				<CfgSld v-model="store.world.postProcess.fog.end" :min="10" :max="500" :step="10" />
			</CfgRow>
			<CfgRow label="颜色">
				<input type="color" v-model="store.world.postProcess.fog.color" class="cfg-clr">
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="体积光">
			<CfgRow label="启用">
				<CfgSwt v-model="store.world.postProcess.volumetric.enabled" />
			</CfgRow>
			<CfgRow label="强度">
				<CfgSld v-model="store.world.postProcess.volumetric.intensity" :min="0" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="采样数">
				<CfgSld v-model="store.world.postProcess.volumetric.samples" :min="8" :max="64" :step="8" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="色调映射">
			<CfgRow label="启用">
				<CfgSwt v-model="store.world.postProcess.tonemap.enabled" />
			</CfgRow>
			<CfgRow label="曝光">
				<CfgSld v-model="store.world.postProcess.tonemap.exposure" :min="0.1" :max="3" :step="0.1" />
			</CfgRow>
			<CfgRow label="Gamma">
				<CfgSld v-model="store.world.postProcess.tonemap.gamma" :min="1" :max="3" :step="0.1" />
			</CfgRow>
			<CfgRow label="对比度">
				<CfgSld v-model="store.world.postProcess.tonemap.contrast" :min="0.5" :max="2" :step="0.1" />
			</CfgRow>
			<CfgRow label="饱和度">
				<CfgSld v-model="store.world.postProcess.tonemap.saturation" :min="0" :max="2" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="屏幕空间反射">
			<CfgRow label="启用SSR">
				<CfgSwt v-model="store.world.postProcess.ssr.enabled" />
			</CfgRow>
			<CfgRow label="最大步数">
				<CfgSld v-model="store.world.postProcess.ssr.maxSteps" :min="16" :max="128" :step="16" />
			</CfgRow>
			<CfgRow label="厚度">
				<CfgSld v-model="store.world.postProcess.ssr.thickness" :min="0.1" :max="2" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="景深">
			<CfgRow label="启用">
				<CfgSwt v-model="store.world.postProcess.dof.enabled" />
			</CfgRow>
			<CfgRow label="焦距">
				<CfgSld v-model="store.world.postProcess.dof.focusDist" :min="0.5" :max="100" :step="0.5" />
			</CfgRow>
			<CfgRow label="光圈">
				<CfgSld v-model="store.world.postProcess.dof.aperture" :min="0.01" :max="0.5" :step="0.01" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="LOD优化">
			<CfgRow label="启用LOD">
				<CfgSwt v-model="store.world.lod.enabled" />
			</CfgRow>
			<CfgRow label="质量等级">
				<select v-model="store.world.lod.tier" class="cfg-sel">
					<option :value="0">低</option>
					<option :value="1">中</option>
					<option :value="2">高</option>
					<option :value="3">超高</option>
				</select>
			</CfgRow>
			<CfgRow label="距离倍率">
				<CfgSld v-model="store.world.lod.distMul" :min="0.5" :max="3" :step="0.1" />
			</CfgRow>
			<CfgRow label="最大实例">
				<CfgSld v-model="store.world.lod.maxInstances" :min="100" :max="5000" :step="100" />
			</CfgRow>
			<CfgRow label="剔除距离">
				<CfgSld v-model="store.world.lod.cullDist" :min="100" :max="2000" :step="50" />
			</CfgRow>
		</CfgCrd>
	</div>
</template>

<style scoped>
.tab-render {
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	overflow-y: auto;
	height: 100%;
}

.cfg-sel {
	background: #333;
	border: 1px solid #444;
	color: #fff;
	padding: 4px 8px;
	border-radius: 4px;
	width: 100%;
}

.cfg-clr {
	width: 60px;
	height: 28px;
	padding: 2px;
	background: #333;
	border: 1px solid #444;
	border-radius: 4px;
	cursor: pointer;
}
</style>
