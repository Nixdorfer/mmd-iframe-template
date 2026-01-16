<script setup lang="ts">
import { ref } from 'vue'
import CfgCrd from '../components/ui/CfgCrd.vue'
import CfgRow from '../components/ui/CfgRow.vue'
import CfgSld from '../components/ui/CfgSld.vue'
import CfgSwt from '../components/ui/CfgSwt.vue'

const masterVolume = ref(1.0)
const musicVolume = ref(0.8)
const sfxVolume = ref(1.0)
const voiceVolume = ref(1.0)
const ambientVolume = ref(0.6)

const spatialEnabled = ref(true)
const spatialMaxDist = ref(50)
const spatialRolloff = ref(1.0)

const occlusionEnabled = ref(true)
const occlusionMaxAttenuation = ref(0.9)
const occlusionLowpassFreq = ref(800)

const dopplerEnabled = ref(true)
const dopplerSpeed = ref(343)
const dopplerMaxShift = ref(2.0)

const compressorEnabled = ref(true)
const compressorThreshold = ref(-24)
const compressorRatio = ref(4)

const dynamicMusicEnabled = ref(true)
const dynamicMusicFadeTime = ref(2.0)
</script>

<template>
	<div class="tab-audio">
		<CfgCrd title="音量控制">
			<CfgRow label="主音量">
				<CfgSld v-model="masterVolume" :min="0" :max="1" :step="0.1" />
			</CfgRow>
			<CfgRow label="音乐">
				<CfgSld v-model="musicVolume" :min="0" :max="1" :step="0.1" />
			</CfgRow>
			<CfgRow label="音效">
				<CfgSld v-model="sfxVolume" :min="0" :max="1" :step="0.1" />
			</CfgRow>
			<CfgRow label="语音">
				<CfgSld v-model="voiceVolume" :min="0" :max="1" :step="0.1" />
			</CfgRow>
			<CfgRow label="环境音">
				<CfgSld v-model="ambientVolume" :min="0" :max="1" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="空间音频">
			<CfgRow label="启用">
				<CfgSwt v-model="spatialEnabled" />
			</CfgRow>
			<CfgRow label="最大距离">
				<CfgSld v-model="spatialMaxDist" :min="10" :max="200" :step="10" />
			</CfgRow>
			<CfgRow label="衰减因子">
				<CfgSld v-model="spatialRolloff" :min="0.1" :max="3" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="音频遮挡">
			<CfgRow label="启用">
				<CfgSwt v-model="occlusionEnabled" />
			</CfgRow>
			<CfgRow label="最大衰减">
				<CfgSld v-model="occlusionMaxAttenuation" :min="0" :max="1" :step="0.1" />
			</CfgRow>
			<CfgRow label="低通频率">
				<CfgSld v-model="occlusionLowpassFreq" :min="200" :max="2000" :step="100" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="多普勒效应">
			<CfgRow label="启用">
				<CfgSwt v-model="dopplerEnabled" />
			</CfgRow>
			<CfgRow label="声速">
				<CfgSld v-model="dopplerSpeed" :min="100" :max="1000" :step="10" />
			</CfgRow>
			<CfgRow label="最大偏移">
				<CfgSld v-model="dopplerMaxShift" :min="1" :max="5" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="压缩器">
			<CfgRow label="启用">
				<CfgSwt v-model="compressorEnabled" />
			</CfgRow>
			<CfgRow label="阈值(dB)">
				<CfgSld v-model="compressorThreshold" :min="-60" :max="0" :step="1" />
			</CfgRow>
			<CfgRow label="比率">
				<CfgSld v-model="compressorRatio" :min="1" :max="20" :step="1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="动态音乐">
			<CfgRow label="启用">
				<CfgSwt v-model="dynamicMusicEnabled" />
			</CfgRow>
			<CfgRow label="淡入淡出">
				<CfgSld v-model="dynamicMusicFadeTime" :min="0.5" :max="5" :step="0.5" />
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
