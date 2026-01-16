<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
	modelValue: number
	min?: number
	max?: number
	step?: number
}>()

const emit = defineEmits<{
	'update:modelValue': [value: number]
}>()

const editing = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const inputVal = ref('')

function startEdit() {
	editing.value = true
	inputVal.value = String(props.modelValue)
	setTimeout(() => inputRef.value?.select(), 0)
}

function finishEdit() {
	editing.value = false
	const num = parseFloat(inputVal.value)
	if (!isNaN(num)) {
		let val = num
		if (props.min !== undefined) val = Math.max(props.min, val)
		if (props.max !== undefined) val = Math.min(props.max, val)
		emit('update:modelValue', val)
	}
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter') {
		finishEdit()
	} else if (e.key === 'Escape') {
		editing.value = false
	}
}
</script>

<template>
	<div class="cfg-sld">
		<input
			type="range"
			class="cfg-sld-trk"
			:value="modelValue"
			:min="min ?? 0"
			:max="max ?? 100"
			:step="step ?? 1"
			@input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
		>
		<span v-if="!editing" class="cfg-sld-val" @dblclick="startEdit">{{ modelValue }}</span>
		<input
			v-else
			ref="inputRef"
			v-model="inputVal"
			type="number"
			class="cfg-sld-ipt"
			:min="min"
			:max="max"
			:step="step"
			@blur="finishEdit"
			@keydown="onKeydown"
		>
	</div>
</template>

<style scoped>
.cfg-sld {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cfg-sld-trk {
	width: 100px;
	flex-shrink: 0;
}

.cfg-sld-val {
	min-width: 36px;
	height: 24px;
	padding: 0 6px;
	background: #1a1a1a;
	border: 1px solid #333;
	border-radius: 3px;
	font-size: 11px;
	color: #aaa;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: text;
}

.cfg-sld-val:hover {
	border-color: #444;
	color: #ccc;
}

.cfg-sld-ipt {
	width: 50px;
	height: 24px;
	padding: 0 6px;
	background: #1a1a1a;
	border: 1px solid #166d3b;
	border-radius: 3px;
	font-size: 11px;
	color: #fff;
	outline: none;
}
</style>
