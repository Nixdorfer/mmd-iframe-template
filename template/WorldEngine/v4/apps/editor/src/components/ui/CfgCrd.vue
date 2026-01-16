<script setup lang="ts">
interface Option {
	value: string
	label: string
	desc?: string
}

const props = defineProps<{
	title?: string
	modelValue?: string | string[]
	options?: Option[]
	multi?: boolean
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string | string[]]
}>()

function isSelected(val: string): boolean {
	if (props.multi && Array.isArray(props.modelValue)) {
		return props.modelValue.includes(val)
	}
	return props.modelValue === val
}

function toggle(val: string) {
	if (props.multi && Array.isArray(props.modelValue)) {
		const arr = [...props.modelValue]
		const idx = arr.indexOf(val)
		if (idx >= 0) {
			arr.splice(idx, 1)
		} else {
			arr.push(val)
		}
		emit('update:modelValue', arr)
	} else {
		emit('update:modelValue', val)
	}
}
</script>

<template>
	<div v-if="title" class="cfg-crd">
		<div class="cfg-crd-hd">{{ title }}</div>
		<div class="cfg-crd-bd">
			<slot />
		</div>
	</div>
	<div v-else class="cfg-crd-lst">
		<div
			v-for="opt in options"
			:key="opt.value"
			class="cfg-crd-item"
			:class="{ sel: isSelected(opt.value) }"
			@click="toggle(opt.value)"
		>
			<div class="cfg-crd-lbl">{{ opt.label }}</div>
			<div v-if="opt.desc" class="cfg-crd-desc">{{ opt.desc }}</div>
		</div>
	</div>
</template>

<style scoped>
.cfg-crd {
	background: #1a1a1a;
	border: 1px solid #333;
	border-radius: 6px;
	overflow: hidden;
}

.cfg-crd-hd {
	padding: 10px 14px;
	font-size: 13px;
	font-weight: 500;
	color: #ddd;
	background: #222;
	border-bottom: 1px solid #333;
}

.cfg-crd-bd {
	padding: 12px 14px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cfg-crd-lst {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cfg-crd-item {
	min-width: 80px;
	padding: 8px 12px;
	background: #1a1a1a;
	border: 1px solid #333;
	border-radius: 4px;
	cursor: pointer;
	transition: all 0.15s;
}

.cfg-crd-item:hover {
	background: #252525;
	border-color: #444;
}

.cfg-crd-item.sel {
	background: #14291f;
	border-color: #166d3b;
}

.cfg-crd-lbl {
	font-size: 12px;
	color: #ddd;
	margin-bottom: 2px;
}

.cfg-crd-item.sel .cfg-crd-lbl {
	color: #fff;
}

.cfg-crd-desc {
	font-size: 10px;
	color: #666;
	line-height: 1.3;
}

.cfg-crd-item.sel .cfg-crd-desc {
	color: #888;
}
</style>
