<script setup lang="ts">
import { useConfigStore } from '@/stores/useConfig'
import CfgCrd from '../components/ui/CfgCrd.vue'
import CfgRow from '../components/ui/CfgRow.vue'
import CfgSld from '../components/ui/CfgSld.vue'
import CfgSwt from '../components/ui/CfgSwt.vue'

const store = useConfigStore()
</script>

<template>
	<div class="tab-audio">
		<CfgCrd title="主音量">
			<CfgRow label="总音量">
				<CfgSld v-model="store.audio.master.volume" :min="0" :max="1" :step="0.05" />
			</CfgRow>
			<CfgRow label="静音">
				<CfgSwt v-model="store.audio.master.muted" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="分轨音量">
			<CfgRow label="音乐">
				<CfgSld v-model="store.audio.channels.music" :min="0" :max="1" :step="0.05" />
			</CfgRow>
			<CfgRow label="音效">
				<CfgSld v-model="store.audio.channels.sfx" :min="0" :max="1" :step="0.05" />
			</CfgRow>
			<CfgRow label="语音">
				<CfgSld v-model="store.audio.channels.voice" :min="0" :max="1" :step="0.05" />
			</CfgRow>
			<CfgRow label="环境音">
				<CfgSld v-model="store.audio.channels.ambient" :min="0" :max="1" :step="0.05" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="空间音频">
			<CfgRow label="启用">
				<CfgSwt v-model="store.audio.spatial.enabled" />
			</CfgRow>
			<CfgRow label="参考距离">
				<CfgSld v-model="store.audio.spatial.refDist" :min="0.5" :max="10" :step="0.5" />
			</CfgRow>
			<CfgRow label="最大距离">
				<CfgSld v-model="store.audio.spatial.maxDist" :min="10" :max="200" :step="10" />
			</CfgRow>
			<CfgRow label="衰减因子">
				<CfgSld v-model="store.audio.spatial.rolloff" :min="0.1" :max="3" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="音频遮挡">
			<CfgRow label="启用">
				<CfgSwt v-model="store.audio.occlusion.enabled" />
			</CfgRow>
			<CfgRow label="最大衰减">
				<CfgSld v-model="store.audio.occlusion.maxAttenuation" :min="0" :max="1" :step="0.05" />
			</CfgRow>
			<CfgRow label="低通频率">
				<CfgSld v-model="store.audio.occlusion.lowpassFreq" :min="200" :max="2000" :step="100" />
			</CfgRow>
			<CfgRow label="高通频率">
				<CfgSld v-model="store.audio.occlusion.highpassFreq" :min="50" :max="500" :step="50" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="多普勒效应">
			<CfgRow label="启用">
				<CfgSwt v-model="store.audio.doppler.enabled" />
			</CfgRow>
			<CfgRow label="声速">
				<CfgSld v-model="store.audio.doppler.speedOfSound" :min="100" :max="1000" :step="10" />
			</CfgRow>
			<CfgRow label="最大偏移">
				<CfgSld v-model="store.audio.doppler.maxShift" :min="1" :max="5" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="压缩器">
			<CfgRow label="启用">
				<CfgSwt v-model="store.audio.compressor.enabled" />
			</CfgRow>
			<CfgRow label="阈值(dB)">
				<CfgSld v-model="store.audio.compressor.threshold" :min="-60" :max="0" :step="1" />
			</CfgRow>
			<CfgRow label="比率">
				<CfgSld v-model="store.audio.compressor.ratio" :min="1" :max="20" :step="1" />
			</CfgRow>
			<CfgRow label="起音(ms)">
				<CfgSld v-model="store.audio.compressor.attack" :min="0.001" :max="0.1" :step="0.001" />
			</CfgRow>
			<CfgRow label="释放(ms)">
				<CfgSld v-model="store.audio.compressor.release" :min="0.01" :max="1" :step="0.01" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="动态音乐">
			<CfgRow label="启用">
				<CfgSwt v-model="store.audio.dynamicMusic.enabled" />
			</CfgRow>
			<CfgRow label="淡入淡出">
				<CfgSld v-model="store.audio.dynamicMusic.fadeTime" :min="0.5" :max="5" :step="0.5" />
			</CfgRow>
			<CfgRow label="图层同步">
				<CfgSwt v-model="store.audio.dynamicMusic.syncLayers" />
			</CfgRow>
		</CfgCrd>
	</div>
</template>

<style scoped>
.tab-audio {
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	overflow-y: auto;
	height: 100%;
}
</style>
