<script setup lang="ts">
import CfgTip from './CfgTip.vue'

defineProps<{
	label: string
	unit?: string
	info?: string
}>()
</script>

<template>
	<div class="config-row">
		<label>
			{{ label }}
			<CfgTip v-if="info" :text="info" />
		</label>
		<slot />
		<span v-if="unit" class="unit">{{ unit }}</span>
	</div>
</template>
