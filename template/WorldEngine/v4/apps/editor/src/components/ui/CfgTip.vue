<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
	text: string
}>()

const show = ref(false)
</script>

<template>
	<div class="cfg-tip" @mouseenter="show = true" @mouseleave="show = false">
		<svg viewBox="0 0 16 16" class="cfg-tip-ico">
			<circle cx="8" cy="8" r="7" />
			<path d="M8 4v1M8 7v5" />
		</svg>
		<div v-if="show" class="cfg-tip-pop">
			<div class="cfg-tip-arr"></div>
			<div class="cfg-tip-txt">{{ text }}</div>
		</div>
	</div>
</template>
