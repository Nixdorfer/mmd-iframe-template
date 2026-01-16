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
	{ id: 'map', name: '地图设置', pro: false },
	{ id: 'mapgen', name: '地图生成', pro: true },
	{ id: 'weather', name: '天气设置', pro: false },
	{ id: 'light', name: '光照配置', pro: true },
	{ id: 'pocket', name: '小世界', pro: true }
]

const categories = computed(() => {
	if (store.proMode) return allCategories
	return allCategories.filter(c => !c.pro)
})

const curCat = ref('map')
</script>

<template>
	<TabLayout leftTitle="地图配置" rightTitle="参数设置">
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
			<div v-if="curCat === 'map'" class="config-section">
				<div class="config-section-title">地图设置</div>
				<CfgRow v-if="store.proMode" label="废墟化" info="开启后地图呈现废弃/战后状态，建筑破损、植被枯萎。">
					<CfgSwt v-model="store.space.ruined" />
				</CfgRow>
				<CfgRow label="温度" unit="°C" info="环境基准温度(摄氏度)。影响角色体温调节和某些生物的出现。">
					<input type="number" v-model.number="store.space.temp">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'mapgen'" class="config-section">
				<div class="config-section-title">地图生成</div>
				<CfgRow label="随机种子" info="地图生成的随机数种子。相同种子生成相同地图，方便分享或重现。">
					<input type="number" v-model.number="store.space.mapGen.seed">
				</CfgRow>
				<CfgRow label="海平面" unit="格" info="海平面的高度。低于此高度的区域会被水填充。支持负数表示地下深度。">
					<input type="number" v-model.number="store.space.mapGen.seaLevel">
				</CfgRow>
				<CfgRow label="山脉高度" unit="格" info="山脉相对于海平面的最大高度。数值越大山越高。无上限。">
					<input type="number" v-model.number="store.space.mapGen.mountainHeight" min="0">
				</CfgRow>
				<CfgRow label="大陆尺度" info="控制大陆的大小。数值越小大陆越大，越大则大陆越碎片化。">
					<input type="number" v-model.number="store.space.mapGen.continentScale" min="0.0001" max="0.01" step="0.0001">
				</CfgRow>
				<CfgRow label="细节尺度" info="控制地形细节的频率。数值越大细节越多但地形越嘈杂。">
					<input type="number" v-model.number="store.space.mapGen.detailScale" min="0.001" max="0.1" step="0.001">
				</CfgRow>
				<CfgRow label="温度尺度" info="控制温度变化的平滑程度。影响生物群系的分布。">
					<input type="number" v-model.number="store.space.mapGen.tempScale" min="0.00001" max="0.0001" step="0.00001">
				</CfgRow>
				<CfgRow label="湿度尺度" info="控制湿度变化的平滑程度。影响森林、沙漠等群系的分布。">
					<input type="number" v-model.number="store.space.mapGen.humidScale" min="0.00001" max="0.0001" step="0.00001">
				</CfgRow>
				<CfgRow label="群系最小尺寸" info="生物群系的最小面积(平方格)。防止群系过于碎片化。">
					<input type="number" v-model.number="store.space.mapGen.biomeMinSize" min="1000" max="100000" step="1000">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'weather'" class="config-section">
				<div class="config-section-title">天气设置</div>
				<CfgRow label="日照强度" unit="%" info="太阳光照的强度百分比。0=完全黑暗 100=正常日光 200=炎热烈日">
					<CfgSld v-model="store.space.daylight" :min="0" :max="200" />
				</CfgRow>
				<CfgRow label="阳光颜色" info="阳光的颜色色调。影响整体环境氛围。暖色调用于黄昏，冷色调用于清晨。">
					<input type="color" v-model="store.space.sunColor">
				</CfgRow>
				<CfgRow v-if="store.proMode" label="阳光强度" unit="%" info="阳光的亮度强度。影响光照和阴影效果。">
					<CfgSld v-model="store.space.sunIntensity" :min="0" :max="200" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'light'" class="config-section">
				<div class="config-section-title">环境光</div>
				<CfgRow label="环境光R" info="环境光红色分量 0-1">
					<CfgSld v-model="store.space.light.ambientR" :min="0" :max="1" :step="0.05" />
				</CfgRow>
				<CfgRow label="环境光G" info="环境光绿色分量 0-1">
					<CfgSld v-model="store.space.light.ambientG" :min="0" :max="1" :step="0.05" />
				</CfgRow>
				<CfgRow label="环境光B" info="环境光蓝色分量 0-1">
					<CfgSld v-model="store.space.light.ambientB" :min="0" :max="1" :step="0.05" />
				</CfgRow>
				<div class="config-section-title">太阳光方向</div>
				<CfgRow label="方向X" info="太阳光X方向分量">
					<CfgSld v-model="store.space.light.sunDirX" :min="-1" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="方向Y" info="太阳光Y方向分量(上下)">
					<CfgSld v-model="store.space.light.sunDirY" :min="-1" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="方向Z" info="太阳光Z方向分量">
					<CfgSld v-model="store.space.light.sunDirZ" :min="-1" :max="1" :step="0.1" />
				</CfgRow>
				<div class="config-section-title">太阳光颜色</div>
				<CfgRow label="颜色R" info="太阳光红色分量 0-1">
					<CfgSld v-model="store.space.light.sunColorR" :min="0" :max="1" :step="0.05" />
				</CfgRow>
				<CfgRow label="颜色G" info="太阳光绿色分量 0-1">
					<CfgSld v-model="store.space.light.sunColorG" :min="0" :max="1" :step="0.05" />
				</CfgRow>
				<CfgRow label="颜色B" info="太阳光蓝色分量 0-1">
					<CfgSld v-model="store.space.light.sunColorB" :min="0" :max="1" :step="0.05" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'pocket'" class="config-section">
				<div class="config-section-title">小世界配置</div>
				<CfgRow label="尺寸X" unit="m" info="小世界在X轴(东西方向)的长度。超出边界将被隐形墙阻挡。">
					<input type="number" v-model.number="store.space.pocket.sizeX" min="1">
				</CfgRow>
				<CfgRow label="尺寸Y" unit="m" info="小世界在Y轴(上下方向)的高度。限制最大飞行/建造高度。">
					<input type="number" v-model.number="store.space.pocket.sizeY" min="1">
				</CfgRow>
				<CfgRow label="尺寸Z" unit="m" info="小世界在Z轴(南北方向)的长度。超出边界将被隐形墙阻挡。">
					<input type="number" v-model.number="store.space.pocket.sizeZ" min="1">
				</CfgRow>
				<CfgRow label="时间流速" info="小世界内时间相对于主世界的流速。0.5=慢一半 2=快一倍。">
					<input type="number" v-model.number="store.space.pocket.timeFlow" min="0" step="0.1">
				</CfgRow>
				<CfgRow label="允许PVP" info="开启后玩家在小世界内可以互相攻击。关闭则为和平区域。">
					<CfgSwt v-model="store.space.pocket.pvp" />
				</CfgRow>
				<CfgRow label="上帝模式" info="开启后小世界创建者拥有完全控制权，可以修改任何物体和规则。">
					<CfgSwt v-model="store.space.pocket.godMode" />
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
