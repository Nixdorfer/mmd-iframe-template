<script setup lang="ts">
import { useConfigStore } from '@/stores/useConfig'
import CfgCrd from '../components/ui/CfgCrd.vue'
import CfgRow from '../components/ui/CfgRow.vue'
import CfgSld from '../components/ui/CfgSld.vue'
import CfgSwt from '../components/ui/CfgSwt.vue'

const store = useConfigStore()
</script>

<template>
	<div class="tab-input">
		<CfgCrd title="键盘">
			<CfgRow label="启用">
				<CfgSwt v-model="store.input.keyboard.enabled" />
			</CfgRow>
			<CfgRow label="重复延迟(ms)">
				<CfgSld v-model="store.input.keyboard.repeatDelay" :min="100" :max="1000" :step="50" />
			</CfgRow>
			<CfgRow label="重复速率(ms)">
				<CfgSld v-model="store.input.keyboard.repeatRate" :min="10" :max="200" :step="10" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="鼠标">
			<CfgRow label="启用">
				<CfgSwt v-model="store.input.mouse.enabled" />
			</CfgRow>
			<CfgRow label="灵敏度">
				<CfgSld v-model="store.input.mouse.sensitivity" :min="0.1" :max="5" :step="0.1" />
			</CfgRow>
			<CfgRow label="反转Y轴">
				<CfgSwt v-model="store.input.mouse.invertY" />
			</CfgRow>
			<CfgRow label="原始输入">
				<CfgSwt v-model="store.input.mouse.rawInput" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="手柄">
			<CfgRow label="启用">
				<CfgSwt v-model="store.input.gamepad.enabled" />
			</CfgRow>
			<CfgRow label="死区">
				<CfgSld v-model="store.input.gamepad.deadzone" :min="0.05" :max="0.5" :step="0.05" />
			</CfgRow>
			<CfgRow label="震动">
				<CfgSwt v-model="store.input.gamepad.vibration" />
			</CfgRow>
			<CfgRow label="轴阈值">
				<CfgSld v-model="store.input.gamepad.axisThreshold" :min="0.1" :max="1" :step="0.1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="触摸">
			<CfgRow label="启用">
				<CfgSwt v-model="store.input.touch.enabled" />
			</CfgRow>
			<CfgRow label="多点触控">
				<CfgSwt v-model="store.input.touch.multiTouch" />
			</CfgRow>
			<CfgRow label="点击阈值(ms)">
				<CfgSld v-model="store.input.touch.tapThreshold" :min="50" :max="500" :step="50" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="手势">
			<CfgRow label="启用">
				<CfgSwt v-model="store.input.gesture.enabled" />
			</CfgRow>
			<CfgRow label="滑动阈值(px)">
				<CfgSld v-model="store.input.gesture.swipeThreshold" :min="10" :max="200" :step="10" />
			</CfgRow>
			<CfgRow label="缩放阈值">
				<CfgSld v-model="store.input.gesture.pinchThreshold" :min="0.05" :max="0.5" :step="0.05" />
			</CfgRow>
			<CfgRow label="旋转阈值(deg)">
				<CfgSld v-model="store.input.gesture.rotateThreshold" :min="5" :max="45" :step="5" />
			</CfgRow>
			<CfgRow label="长按时长(ms)">
				<CfgSld v-model="store.input.gesture.holdDuration" :min="200" :max="1500" :step="100" />
			</CfgRow>
		</CfgCrd>
	</div>
</template>

<style scoped>
.tab-input {
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	overflow-y: auto;
	height: 100%;
}
</style>
