<script setup lang="ts">
defineProps<{
	leftTitle?: string
	rightTitle?: string
	showMdl?: boolean
}>()
</script>

<template>
	<div class="tab-layout">
		<div class="le-pn">
			<div v-if="leftTitle" class="pn-hd">{{ leftTitle }}</div>
			<div class="pn-bd">
				<slot name="left" />
			</div>
		</div>
		<div v-if="showMdl" class="mdl-edt">
			<slot name="mdl" />
		</div>
		<div class="ri-pn">
			<div v-if="rightTitle" class="pn-hd">{{ rightTitle }}</div>
			<div class="pn-bd">
				<slot name="right" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.tab-layout {
	flex: 1;
	display: flex;
	min-height: 0;
}

.le-pn {
	width: 260px;
	min-width: 180px;
	max-width: 360px;
	background: #111111;
	border-right: 1px solid #333;
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
}

.ri-pn {
	width: 320px;
	min-width: 240px;
	max-width: 480px;
	background: #111111;
	border-left: 1px solid #333;
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
}

.mdl-edt {
	flex: 1;
	background: #0a0a0a;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	position: relative;
}

.pn-hd {
	padding: 12px;
	font-size: 13px;
	font-weight: 600;
	color: #888;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	border-bottom: 1px solid #333;
	flex-shrink: 0;
}

.pn-bd {
	flex: 1;
	overflow-y: auto;
	padding: 8px;
}
</style>
