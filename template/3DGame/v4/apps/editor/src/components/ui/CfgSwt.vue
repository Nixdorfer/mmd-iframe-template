<script setup lang="ts">
const props = defineProps<{
	modelValue: boolean
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
}>()

function toggle() {
	emit('update:modelValue', !props.modelValue)
}
</script>

<template>
	<label class="swt">
		<input type="checkbox" :checked="modelValue" @change="toggle">
		<span class="swt-trk"></span>
	</label>
</template>
