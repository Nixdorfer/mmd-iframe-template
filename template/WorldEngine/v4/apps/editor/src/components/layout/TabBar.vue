<script setup lang="ts">
interface Tab {
	id: string
	label: string
}

defineProps<{
	tabs: Tab[]
	modelValue: string
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

function select(id: string) {
	emit('update:modelValue', id)
}
</script>

<template>
	<div class="section-tabs">
		<button
			v-for="tab in tabs"
			:key="tab.id"
			class="section-tab"
			:class="{ active: modelValue === tab.id }"
			@click="select(tab.id)"
		>
			{{ tab.label }}
		</button>
	</div>
</template>
