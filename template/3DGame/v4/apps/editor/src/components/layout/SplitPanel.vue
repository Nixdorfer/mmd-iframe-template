<script setup lang="ts">
defineProps<{
	leftTitle?: string
	rightTitle?: string
}>()
</script>

<template>
	<div class="section-split">
		<div class="sec-le-pn">
			<div v-if="leftTitle" class="pn-hd">{{ leftTitle }}</div>
			<div class="pn-bd">
				<slot name="left" />
			</div>
		</div>
		<div class="sec-ri-pn">
			<div v-if="rightTitle" class="pn-hd">{{ rightTitle }}</div>
			<div class="pn-bd">
				<slot name="right" />
			</div>
		</div>
	</div>
</template>
