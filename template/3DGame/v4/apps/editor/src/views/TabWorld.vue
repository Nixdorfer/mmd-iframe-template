<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore } from '@/stores/useConfig'
import TabLayout from '@/components/layout/TabLayout.vue'
import CfgRow from '@/components/ui/CfgRow.vue'
import CfgSwt from '@/components/ui/CfgSwt.vue'
import CfgSld from '@/components/ui/CfgSld.vue'
import CfgCrd from '@/components/ui/CfgCrd.vue'

const store = useConfigStore()

const allCategories = [
	{ id: 'render', name: '渲染设置', pro: false },
	{ id: 'physics', name: '物理设置', pro: true }
]

const categories = computed(() => {
	if (store.proMode) return allCategories
	return allCategories.filter(c => !c.pro)
})

const curCat = ref('render')

const renderModeOpts = [
	{ value: 'realistic', label: '逼真', desc: '写实风格' },
	{ value: 'acrylic', label: '亚克力', desc: '半透明塑料质感' },
	{ value: 'anime', label: '动漫', desc: '卡通渲染风格' }
]
</script>

<template>
	<TabLayout leftTitle="世界配置" rightTitle="参数设置">
		<template #left>
			<div class="cat-lst">
				<div
					v-for="cat in categories"
					:key="cat.id"
					class="cat-item"
					:class="{ sel: curCat === cat.id }"
					@click="curCat = cat.id"
				>
					{{ cat.name }}
				</div>
			</div>
		</template>
		<template #right>
			<div v-if="curCat === 'render'" class="config-section">
				<div class="config-section-title">渲染设置</div>
				<CfgRow label="风格化着色" info="逼真=写实风格 亚克力=半透明塑料质感 动漫=卡通渲染风格">
					<CfgCrd v-model="store.world.render.mode" :options="renderModeOpts" />
				</CfgRow>
				<CfgRow label="阴影强度" info="阴影的深浅程度。0=无阴影 0.5=中等 1=全黑阴影">
					<CfgSld v-model="store.world.render.shadowIntensity" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="环境光遮蔽" info="物体缝隙和角落的自然阴影效果强度。增加画面层次感。">
					<CfgSld v-model="store.world.render.aoStrength" :min="0" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow v-if="store.proMode" label="高光强度" info="物体表面的镜面反射强度。数值越高高光越亮越集中。">
					<input type="number" v-model.number="store.world.render.specularPower" min="1" max="128">
				</CfgRow>
				<CfgRow v-if="store.proMode" label="轮廓线宽度" info="物体边缘轮廓线的粗细。0=无轮廓线。动漫风格常用0.02-0.05。">
					<input type="number" v-model.number="store.world.render.outlineWidth" min="0" max="0.1" step="0.01">
				</CfgRow>
				<CfgRow v-if="store.proMode" label="轮廓线颜色" info="轮廓线的颜色。通常使用黑色或深色。">
					<input type="color" v-model="store.world.render.outlineColor">
				</CfgRow>
				<CfgRow v-if="store.proMode" label="实体轮廓" info="是否为实体(角色、物品等)绘制轮廓线。">
					<CfgSwt v-model="store.world.render.outlineEntity" />
				</CfgRow>
				<CfgRow v-if="store.proMode" label="地形轮廓" info="是否为地形绘制轮廓线。开启可能影响性能。">
					<CfgSwt v-model="store.world.render.outlineTerrain" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'physics'" class="config-section">
				<div class="config-section-title">物理引擎</div>
				<CfgRow label="重力 X" info="X轴方向的重力分量。正值向右，负值向左。通常为0。">
					<input type="number" v-model.number="store.world.physics.gravityX" step="0.1">
				</CfgRow>
				<CfgRow label="重力 Y" info="Y轴方向的重力分量。负值向下(地球标准-9.8)，正值向上。">
					<input type="number" v-model.number="store.world.physics.gravityY" step="0.1">
				</CfgRow>
				<CfgRow label="重力 Z" info="Z轴方向的重力分量。正值向前，负值向后。通常为0。">
					<input type="number" v-model.number="store.world.physics.gravityZ" step="0.1">
				</CfgRow>
				<CfgRow label="物理子步数" info="每帧内物理模拟的细分次数。数值越高物理越精确但越耗性能。推荐2-8。">
					<input type="number" v-model.number="store.world.physics.maxSubSteps" min="1" max="16">
				</CfgRow>
				<CfgRow label="TPS" info="物理模拟每秒的更新次数。60=每秒60次。越高越精确但越耗性能。">
					<input type="number" v-model.number="store.world.physics.tps" min="1" max="120">
				</CfgRow>
				<CfgRow label="睡眠优化" info="静止物体自动进入睡眠状态以节省性能。关闭后所有物体每帧都计算物理。">
					<CfgSwt v-model="store.world.physics.sleepEnabled" />
				</CfgRow>
				<CfgRow label="默认反弹系数" info="物体碰撞时的弹性。0=完全不反弹 0.5=中等弹性 1=完全弹性碰撞">
					<CfgSld v-model="store.world.physics.defaultRestitution" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="默认摩擦系数" info="物体表面的摩擦力。0=完全光滑 0.5=中等摩擦 1=非常粗糙">
					<CfgSld v-model="store.world.physics.defaultFriction" :min="0" :max="1" :step="0.1" />
				</CfgRow>
			</div>
		</template>
	</TabLayout>
</template>

<style scoped>
.cat-lst {
	padding: 8px;
}

.cat-item {
	padding: 10px 12px;
	border-radius: 4px;
	cursor: pointer;
	color: #aaa;
	font-size: 13px;
	transition: all 0.15s;
}

.cat-item:hover {
	background: #2a2a2a;
}

.cat-item.sel {
	background: #166d3b;
	color: #fff;
}
</style>
