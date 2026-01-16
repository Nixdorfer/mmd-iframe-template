<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@/stores/useConfig'
import TabLayout from '@/components/layout/TabLayout.vue'
import CfgRow from '@/components/ui/CfgRow.vue'
import CfgSwt from '@/components/ui/CfgSwt.vue'
import CfgSld from '@/components/ui/CfgSld.vue'
import CfgCrd from '@/components/ui/CfgCrd.vue'

const store = useConfigStore()
const curCat = ref('time')

const cats = [
	{ id: 'render', name: '渲染系统' },
	{ id: 'shader', name: '着色器' },
	{ id: 'camera', name: '相机系统' },
	{ id: 'lighting', name: '光照系统' },
	{ id: 'terrain', name: '地形系统' },
	{ id: 'mapGenDetail', name: '地图生成' },
	{ id: 'animation', name: '动画系统' },
	{ id: 'physicsAdvanced', name: '高级物理' },
	{ id: 'time', name: '时间系统' },
	{ id: 'timeEffect', name: '时间特效' },
	{ id: 'input', name: '输入系统' },
	{ id: 'inventory', name: '物品栏系统' },
	{ id: 'combat', name: '战斗系统' },
	{ id: 'buff', name: 'Buff系统' },
	{ id: 'ai', name: 'AI系统' },
	{ id: 'economy', name: '经济系统' },
	{ id: 'faction', name: '阵营系统' },
	{ id: 'quest', name: '任务系统' },
	{ id: 'dialogue', name: '对话系统' },
	{ id: 'particle', name: '粒子系统' },
	{ id: 'weather', name: '天气系统' },
	{ id: 'vehicle', name: '载具系统' },
	{ id: 'ui', name: 'UI系统' },
	{ id: 'save', name: '存档系统' },
	{ id: 'assetStreaming', name: '资源流送' },
	{ id: 'i18n', name: '本地化' },
	{ id: 'performance', name: '性能监控' },
	{ id: 'worldview', name: '世界观系统' },
	{ id: 'llm', name: 'LLM配置' },
	{ id: 'achievement', name: '成就系统' },
	{ id: 'keybind', name: '快捷键' },
	{ id: 'display', name: '显示设置' },
	{ id: 'accessibility', name: '辅助功能' },
	{ id: 'debug', name: '调试设置' },
	{ id: 'shop', name: '商城系统' }
]

const minimapShapeOpts = [
	{ value: 'rect', label: '矩形', desc: '矩形小地图' },
	{ value: 'circle', label: '圆形', desc: '圆形小地图' }
]

const saveBackendOpts = [
	{ value: 'auto', label: '自动', desc: '自动选择最佳存储方式' },
	{ value: 'localStorage', label: '本地存储', desc: '使用浏览器本地存储' },
	{ value: 'indexedDB', label: 'IndexedDB', desc: '使用IndexedDB数据库' }
]

const lockModeOpts = [
	{ value: 'soft', label: '软锁定', desc: '辅助瞄准' },
	{ value: 'hard', label: '硬锁定', desc: '完全锁定目标' },
	{ value: 'none', label: '无锁定', desc: '自由瞄准' }
]

const renderModeOpts = [
	{ value: 'realistic', label: '写实', desc: '真实光影' },
	{ value: 'acrylic', label: '亚克力', desc: '半透明风格' },
	{ value: 'anime', label: '动漫', desc: '二次元卡通' }
]

const aiTemplateOpts = [
	{ value: 'neutral', label: '中立', desc: '不主动攻击' },
	{ value: 'aggressive', label: '敌对', desc: '主动攻击' },
	{ value: 'defensive', label: '防御', desc: '被攻击才反击' }
]

const pathfindAlgoOpts = [
	{ value: 'astar', label: 'A*', desc: '最优路径' },
	{ value: 'dijkstra', label: 'Dijkstra', desc: '全面搜索' }
]

const llmProviderOpts = [
	{ value: 'openai', label: 'OpenAI', desc: 'GPT系列' },
	{ value: 'anthropic', label: 'Anthropic', desc: 'Claude系列' },
	{ value: 'ollama', label: 'Ollama', desc: '本地部署' },
	{ value: 'custom', label: '自定义', desc: '自定义接口' }
]

const weatherOpts = [
	{ value: 'clear', label: '晴天', desc: '无云天气' },
	{ value: 'cloudy', label: '多云', desc: '云层较多' },
	{ value: 'rain', label: '雨天', desc: '降雨天气' },
	{ value: 'storm', label: '暴风雨', desc: '雷暴天气' },
	{ value: 'snow', label: '雪天', desc: '降雪天气' },
	{ value: 'fog', label: '雾天', desc: '能见度低' }
]

const particleSortOpts = [
	{ value: 'none', label: '不排序', desc: '无排序开销' },
	{ value: 'distance', label: '距离', desc: '按距离排序' },
	{ value: 'age', label: '年龄', desc: '按存活时间排序' }
]

const particleCullOpts = [
	{ value: 'none', label: '不剔除', desc: '全部渲染' },
	{ value: 'frustum', label: '视锥剔除', desc: '剔除视野外粒子' },
	{ value: 'distance', label: '距离剔除', desc: '剔除远距离粒子' }
]

const blendModeOpts = [
	{ value: 'additive', label: '叠加', desc: '动画叠加混合' },
	{ value: 'replace', label: '替换', desc: '完全替换动画' },
	{ value: 'override', label: '覆盖', desc: '权重覆盖混合' }
]

const ambientModeOpts = [
	{ value: 'flat', label: '平面', desc: '单色环境光' },
	{ value: 'gradient', label: '渐变', desc: '天地渐变光' },
	{ value: 'skybox', label: '天空盒', desc: '从天空盒采样' }
]

const debugPosOpts = [
	{ value: 'top-left', label: '左上', desc: '左上角' },
	{ value: 'top-right', label: '右上', desc: '右上角' },
	{ value: 'bottom-left', label: '左下', desc: '左下角' },
	{ value: 'bottom-right', label: '右下', desc: '右下角' }
]

const colorblindModeOpts = [
	{ value: 'none', label: '无', desc: '不使用色盲模式' },
	{ value: 'protanopia', label: '红色盲', desc: '红色视觉障碍' },
	{ value: 'deuteranopia', label: '绿色盲', desc: '绿色视觉障碍' },
	{ value: 'tritanopia', label: '蓝色盲', desc: '蓝色视觉障碍' }
]

const logLevelOpts = [
	{ value: 'debug', label: '调试', desc: '显示所有日志' },
	{ value: 'info', label: '信息', desc: '显示信息及以上' },
	{ value: 'warn', label: '警告', desc: '显示警告及以上' },
	{ value: 'error', label: '错误', desc: '仅显示错误' }
]

const wvModules = [
	{ id: 'hacking', name: '黑客', desc: '赛博朋克' },
	{ id: 'magic', name: '魔法', desc: '哈利波特' },
	{ id: 'qi', name: '真气', desc: '修仙' },
	{ id: 'martial', name: '内功', desc: '武侠' },
	{ id: 'ninjutsu', name: '忍术', desc: '火影' },
	{ id: 'haki', name: '霸气', desc: '海贼王' },
	{ id: 'jujutsu', name: '咒术', desc: '咒术回战' },
	{ id: 'force', name: '原力', desc: '星战' },
	{ id: 'breath', name: '呼吸法', desc: '鬼灭' },
	{ id: 'magecraft', name: '魔术', desc: 'FATE' },
	{ id: 'esper', name: '超能力', desc: '魔禁' },
	{ id: 'stand', name: '替身', desc: 'JOJO' },
	{ id: 'companion', name: '伙伴', desc: '宝可梦' },
	{ id: 'nen', name: '念能力', desc: '猎人' },
	{ id: 'alchemy', name: '炼金术', desc: '钢炼' }
]
</script>

<template>
	<TabLayout leftTitle="系统分类" rightTitle="系统设置">
		<template #left>
			<div class="cat-lst">
				<div
					v-for="cat in cats"
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
				<div class="config-section-title">渲染系统</div>
				<CfgRow label="渲染模式" info="选择整体画面风格。写实=真实光影 亚克力=半透明 动漫=卡通渲染">
					<CfgCrd v-model="store.world.render.mode" :options="renderModeOpts" />
				</CfgRow>
				<CfgRow label="阴影强度" info="阴影的深浅程度。0=无阴影 1=最深阴影">
					<CfgSld v-model="store.world.render.shadowIntensity" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="AO强度" info="环境光遮蔽强度。增加角落和缝隙的阴影感">
					<CfgSld v-model="store.world.render.aoStrength" :min="0" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="高光指数" info="高光反射的锐利程度。数值越大高光越集中">
					<input type="number" v-model.number="store.world.render.specularPower" min="1" max="128">
				</CfgRow>
				<CfgRow label="边缘光强度" info="物体边缘的发光效果强度。用于增强轮廓感">
					<CfgSld v-model="store.world.render.rimPower" :min="0.1" :max="10" :step="0.1" />
				</CfgRow>
				<CfgRow label="平滑度" info="材质表面的平滑程度。0=粗糙 1=光滑如镜">
					<CfgSld v-model="store.world.render.smoothness" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="采样步数" info="渲染质量。步数越多质量越高但性能消耗越大">
					<input type="number" v-model.number="store.world.render.steps" min="1" max="8">
				</CfgRow>
				<CfgRow label="描边宽度" info="物体轮廓线的粗细。0=无描边">
					<CfgSld v-model="store.world.render.outlineWidth" :min="0" :max="0.1" :step="0.01" />
				</CfgRow>
				<CfgRow label="描边颜色" info="物体轮廓线的颜色">
					<input type="color" v-model="store.world.render.outlineColor">
				</CfgRow>
				<CfgRow label="实体描边" info="开启后给实体(角色、怪物等)添加轮廓线">
					<CfgSwt v-model="store.world.render.outlineEntity" />
				</CfgRow>
				<CfgRow label="地形描边" info="开启后给地形(建筑、地面等)添加轮廓线">
					<CfgSwt v-model="store.world.render.outlineTerrain" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'shader'" class="config-section">
				<div class="config-section-title">全局光照</div>
				<CfgRow label="启用" info="是否启用全局光照">
					<CfgSwt v-model="store.shader.gi.enabled" />
				</CfgRow>
				<CfgRow label="反弹次数" info="光线反弹的次数">
					<CfgSld v-model="store.shader.gi.bounces" :min="1" :max="4" :step="1" />
				</CfgRow>
				<CfgRow label="采样数" info="每像素的采样数量">
					<CfgSld v-model="store.shader.gi.samples" :min="8" :max="64" :step="8" />
				</CfgRow>
				<CfgRow label="强度" info="全局光照的强度">
					<CfgSld v-model="store.shader.gi.intensity" :min="0" :max="2" :step="0.1" />
				</CfgRow>
				<div class="config-section-title">屏幕空间反射</div>
				<CfgRow label="启用" info="是否启用屏幕空间反射">
					<CfgSwt v-model="store.shader.ssr.enabled" />
				</CfgRow>
				<CfgRow label="最大步数" info="光线追踪的最大步数">
					<CfgSld v-model="store.shader.ssr.maxSteps" :min="16" :max="128" :step="16" />
				</CfgRow>
				<CfgRow label="步长" info="每步的长度">
					<CfgSld v-model="store.shader.ssr.stepSize" :min="0.01" :max="0.5" :step="0.01" />
				</CfgRow>
				<CfgRow label="厚度" info="反射表面的厚度">
					<CfgSld v-model="store.shader.ssr.thickness" :min="0.1" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="淡入开始" info="反射淡入的开始位置">
					<CfgSld v-model="store.shader.ssr.fadeStart" :min="0.5" :max="1" :step="0.05" />
				</CfgRow>
				<CfgRow label="淡入结束" info="反射淡入的结束位置">
					<CfgSld v-model="store.shader.ssr.fadeEnd" :min="0.5" :max="1" :step="0.05" />
				</CfgRow>
				<div class="config-section-title">描边效果</div>
				<CfgRow label="启用" info="是否启用描边效果">
					<CfgSwt v-model="store.shader.outline.enabled" />
				</CfgRow>
				<CfgRow label="宽度" unit="px" info="描边的宽度">
					<CfgSld v-model="store.shader.outline.width" :min="1" :max="5" :step="0.5" />
				</CfgRow>
				<CfgRow label="颜色" info="描边的颜色">
					<input type="color" v-model="store.shader.outline.color">
				</CfgRow>
				<CfgRow label="深度阈值" info="深度边缘检测阈值">
					<CfgSld v-model="store.shader.outline.depthThreshold" :min="0.01" :max="0.5" :step="0.01" />
				</CfgRow>
				<CfgRow label="法线阈值" info="法线边缘检测阈值">
					<CfgSld v-model="store.shader.outline.normalThreshold" :min="0.1" :max="1" :step="0.1" />
				</CfgRow>
				<div class="config-section-title">水面着色器</div>
				<CfgRow label="启用" info="是否启用水面特效">
					<CfgSwt v-model="store.shader.water.enabled" />
				</CfgRow>
				<CfgRow label="波浪速度" info="波浪移动的速度">
					<CfgSld v-model="store.shader.water.waveSpeed" :min="0.1" :max="3" :step="0.1" />
				</CfgRow>
				<CfgRow label="波浪缩放" info="波浪纹理的缩放">
					<CfgSld v-model="store.shader.water.waveScale" :min="0.1" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="泡沫强度" info="水面泡沫的强度">
					<CfgSld v-model="store.shader.water.foamIntensity" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="折射强度" info="水下折射的强度">
					<CfgSld v-model="store.shader.water.refractionStrength" :min="0" :max="0.5" :step="0.05" />
				</CfgRow>
				<CfgRow label="焦散强度" info="水底焦散效果强度">
					<CfgSld v-model="store.shader.water.causticsIntensity" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<div class="config-section-title">体积光</div>
				<CfgRow label="启用" info="是否启用体积光效果">
					<CfgSwt v-model="store.shader.volumetricLight.enabled" />
				</CfgRow>
				<CfgRow label="采样数" info="光线采样数量">
					<CfgSld v-model="store.shader.volumetricLight.samples" :min="8" :max="64" :step="8" />
				</CfgRow>
				<CfgRow label="密度" info="体积光的密度">
					<CfgSld v-model="store.shader.volumetricLight.density" :min="0" :max="0.5" :step="0.01" />
				</CfgRow>
				<CfgRow label="衰减" info="光线的衰减率">
					<CfgSld v-model="store.shader.volumetricLight.decay" :min="0.9" :max="1" :step="0.01" />
				</CfgRow>
				<CfgRow label="曝光" info="体积光的曝光度">
					<CfgSld v-model="store.shader.volumetricLight.exposure" :min="0.1" :max="2" :step="0.1" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'camera'" class="config-section">
				<div class="config-section-title">相机系统</div>
				<CfgRow label="视野角度" unit="rad" info="相机的视野范围(弧度)。0.785≈45° 1.047≈60° 1.571≈90°">
					<CfgSld v-model="store.world.camera.fov" :min="0.3" :max="2" :step="0.05" />
				</CfgRow>
				<CfgRow label="近裁剪面" unit="m" info="相机能看到的最近距离。太小会导致Z-fighting">
					<input type="number" v-model.number="store.world.camera.near" min="0.01" max="10" step="0.1">
				</CfgRow>
				<CfgRow label="远裁剪面" unit="m" info="相机能看到的最远距离。影响可见范围和性能">
					<input type="number" v-model.number="store.world.camera.far" min="100" max="10000" step="100">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'lighting'" class="config-section">
				<div class="config-section-title">光照探针</div>
				<CfgRow label="启用" info="是否启用光照探针系统">
					<CfgSwt v-model="store.lighting.probes.enabled" />
				</CfgRow>
				<CfgRow label="间距" unit="m" info="光照探针的网格间距">
					<CfgSld v-model="store.lighting.probes.spacing" :min="1" :max="16" :step="1" />
				</CfgRow>
				<CfgRow label="分辨率" info="探针贴图分辨率">
					<CfgSld v-model="store.lighting.probes.resolution" :min="8" :max="128" :step="8" />
				</CfgRow>
				<div class="config-section-title">动态光源</div>
				<CfgRow label="最大光源数" info="场景中允许的最大动态光源数量">
					<CfgSld v-model="store.lighting.dynamic.maxLights" :min="4" :max="64" :step="4" />
				</CfgRow>
				<CfgRow label="阴影投射数" info="可投射阴影的光源数量">
					<CfgSld v-model="store.lighting.dynamic.shadowCasters" :min="1" :max="8" :step="1" />
				</CfgRow>
				<CfgRow label="更新率" unit="FPS" info="动态光源的更新频率">
					<CfgSld v-model="store.lighting.dynamic.updateRate" :min="10" :max="60" :step="5" />
				</CfgRow>
				<div class="config-section-title">环境光</div>
				<CfgRow label="模式" info="环境光的计算方式">
					<CfgCrd v-model="store.lighting.ambient.mode" :options="ambientModeOpts" />
				</CfgRow>
				<CfgRow label="强度" info="环境光的整体强度">
					<CfgSld v-model="store.lighting.ambient.intensity" :min="0" :max="1" :step="0.05" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'terrain'" class="config-section">
				<div class="config-section-title">地形生成</div>
				<CfgRow label="分块大小" info="每个地形分块的边长">
					<CfgSld v-model="store.terrain.generation.chunkSize" :min="16" :max="256" :step="16" />
				</CfgRow>
				<CfgRow label="最大分块" info="可加载的最大分块数量">
					<CfgSld v-model="store.terrain.generation.maxChunks" :min="64" :max="1024" :step="64" />
				</CfgRow>
				<CfgRow label="细节缩放" info="地形细节的缩放系数">
					<CfgSld v-model="store.terrain.generation.detailScale" :min="0.5" :max="2" :step="0.1" />
				</CfgRow>
				<div class="config-section-title">植被</div>
				<CfgRow label="启用" info="是否启用植被渲染">
					<CfgSwt v-model="store.terrain.vegetation.enabled" />
				</CfgRow>
				<CfgRow label="密度" info="植被的生成密度">
					<CfgSld v-model="store.terrain.vegetation.density" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="最大实例" info="植被的最大实例数">
					<input type="number" v-model.number="store.terrain.vegetation.maxInstances" min="1000" max="100000" step="1000">
				</CfgRow>
				<CfgRow label="风力" info="植被受风摆动的强度">
					<CfgSld v-model="store.terrain.vegetation.windStrength" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<div class="config-section-title">水体</div>
				<CfgRow label="启用" info="是否启用水体渲染">
					<CfgSwt v-model="store.terrain.water.enabled" />
				</CfgRow>
				<CfgRow label="波浪幅度" info="水面波浪的高度">
					<CfgSld v-model="store.terrain.water.waveAmplitude" :min="0" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="波浪频率" info="水面波浪的速度">
					<CfgSld v-model="store.terrain.water.waveFrequency" :min="0.1" :max="3" :step="0.1" />
				</CfgRow>
				<CfgRow label="反射" info="是否启用水面反射">
					<CfgSwt v-model="store.terrain.water.reflections" />
				</CfgRow>
				<CfgRow label="折射" info="是否启用水下折射">
					<CfgSwt v-model="store.terrain.water.refractions" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'mapGenDetail'" class="config-section">
				<div class="config-section-title">洞穴生成</div>
				<CfgRow label="启用" info="是否生成洞穴">
					<CfgSwt v-model="store.mapGenDetail.cave.enabled" />
				</CfgRow>
				<CfgRow label="密度" info="洞穴的生成密度">
					<CfgSld v-model="store.mapGenDetail.cave.density" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="最小尺寸" info="洞穴的最小大小">
					<CfgSld v-model="store.mapGenDetail.cave.minSize" :min="5" :max="50" :step="5" />
				</CfgRow>
				<CfgRow label="最大尺寸" info="洞穴的最大大小">
					<CfgSld v-model="store.mapGenDetail.cave.maxSize" :min="20" :max="200" :step="10" />
				</CfgRow>
				<CfgRow label="连通度" info="洞穴之间的连通程度">
					<CfgSld v-model="store.mapGenDetail.cave.connectedness" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<div class="config-section-title">河流生成</div>
				<CfgRow label="启用" info="是否生成河流">
					<CfgSwt v-model="store.mapGenDetail.river.enabled" />
				</CfgRow>
				<CfgRow label="数量" info="河流的数量">
					<CfgSld v-model="store.mapGenDetail.river.count" :min="1" :max="20" :step="1" />
				</CfgRow>
				<CfgRow label="宽度" unit="m" info="河流的平均宽度">
					<CfgSld v-model="store.mapGenDetail.river.width" :min="2" :max="30" :step="2" />
				</CfgRow>
				<CfgRow label="深度" unit="m" info="河流的平均深度">
					<CfgSld v-model="store.mapGenDetail.river.depth" :min="1" :max="10" :step="1" />
				</CfgRow>
				<CfgRow label="蜿蜒度" info="河流的弯曲程度">
					<CfgSld v-model="store.mapGenDetail.river.meander" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<div class="config-section-title">城市生成</div>
				<CfgRow label="启用" info="是否生成城市">
					<CfgSwt v-model="store.mapGenDetail.city.enabled" />
				</CfgRow>
				<CfgRow label="密度" info="城市的生成密度">
					<CfgSld v-model="store.mapGenDetail.city.density" :min="0" :max="0.5" :step="0.05" />
				</CfgRow>
				<CfgRow label="最小建筑数" info="城市的最小建筑数量">
					<CfgSld v-model="store.mapGenDetail.city.minBuildings" :min="5" :max="50" :step="5" />
				</CfgRow>
				<CfgRow label="最大建筑数" info="城市的最大建筑数量">
					<CfgSld v-model="store.mapGenDetail.city.maxBuildings" :min="20" :max="500" :step="20" />
				</CfgRow>
				<CfgRow label="街道宽度" unit="m" info="街道的宽度">
					<CfgSld v-model="store.mapGenDetail.city.streetWidth" :min="3" :max="15" :step="1" />
				</CfgRow>
				<CfgRow label="街区大小" unit="m" info="一个街区的边长">
					<CfgSld v-model="store.mapGenDetail.city.blockSize" :min="16" :max="64" :step="8" />
				</CfgRow>
				<div class="config-section-title">结构生成</div>
				<CfgRow label="启用" info="是否生成特殊结构">
					<CfgSwt v-model="store.mapGenDetail.structure.enabled" />
				</CfgRow>
				<CfgRow label="地牢密度" info="地牢的生成密度">
					<CfgSld v-model="store.mapGenDetail.structure.dungeonDensity" :min="0" :max="0.1" :step="0.005" />
				</CfgRow>
				<CfgRow label="遗迹密度" info="遗迹的生成密度">
					<CfgSld v-model="store.mapGenDetail.structure.ruinDensity" :min="0" :max="0.1" :step="0.005" />
				</CfgRow>
				<CfgRow label="塔楼密度" info="塔楼的生成密度">
					<CfgSld v-model="store.mapGenDetail.structure.towerDensity" :min="0" :max="0.05" :step="0.001" />
				</CfgRow>
				<CfgRow label="每区块上限" info="每个区块最多生成的结构数量">
					<CfgSld v-model="store.mapGenDetail.structure.maxPerChunk" :min="1" :max="10" :step="1" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'animation'" class="config-section">
				<div class="config-section-title">骨骼系统</div>
				<CfgRow label="最大骨骼数" info="单个模型允许的最大骨骼数量">
					<CfgSld v-model="store.animation.skeleton.maxBones" :min="16" :max="128" :step="8" />
				</CfgRow>
				<CfgRow label="IK启用" info="是否启用反向动力学">
					<CfgSwt v-model="store.animation.skeleton.ikEnabled" />
				</CfgRow>
				<CfgRow label="IK迭代次数" info="IK求解器的迭代次数">
					<CfgSld v-model="store.animation.skeleton.ikIterations" :min="1" :max="30" :step="1" />
				</CfgRow>
				<div class="config-section-title">动画混合</div>
				<CfgRow label="过渡时间" unit="秒" info="动画切换的过渡时间">
					<CfgSld v-model="store.animation.blend.crossfadeTime" :min="0" :max="1" :step="0.05" />
				</CfgRow>
				<CfgRow label="混合模式" info="动画层的混合方式">
					<CfgCrd v-model="store.animation.blend.blendMode" :options="blendModeOpts" />
				</CfgRow>
				<div class="config-section-title">动画LOD</div>
				<CfgRow label="启用" info="是否启用动画LOD优化">
					<CfgSwt v-model="store.animation.lod.enabled" />
				</CfgRow>
				<CfgRow label="距离阈值" unit="m" info="开始降低动画质量的距离">
					<CfgSld v-model="store.animation.lod.distThreshold" :min="10" :max="100" :step="5" />
				</CfgRow>
				<CfgRow label="简化骨骼" info="是否在远距离减少骨骼计算">
					<CfgSwt v-model="store.animation.lod.reduceBones" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'physicsAdvanced'" class="config-section">
				<div class="config-section-title">布娃娃系统</div>
				<CfgRow label="启用" info="是否启用布娃娃物理">
					<CfgSwt v-model="store.world.physicsAdvanced.ragdoll.enabled" />
				</CfgRow>
				<CfgRow label="阻尼" info="布娃娃的运动阻尼">
					<CfgSld v-model="store.world.physicsAdvanced.ragdoll.damping" :min="0" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="关节刚度" info="关节的刚度系数">
					<CfgSld v-model="store.world.physicsAdvanced.ragdoll.jointStiffness" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="角速度阻尼" info="旋转运动的阻尼">
					<CfgSld v-model="store.world.physicsAdvanced.ragdoll.angularDamping" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="线性阻尼" info="线性运动的阻尼">
					<CfgSld v-model="store.world.physicsAdvanced.ragdoll.linearDamping" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<div class="config-section-title">布料系统</div>
				<CfgRow label="启用" info="是否启用布料模拟">
					<CfgSwt v-model="store.world.physicsAdvanced.cloth.enabled" />
				</CfgRow>
				<CfgRow label="迭代次数" info="约束求解器的迭代次数">
					<CfgSld v-model="store.world.physicsAdvanced.cloth.iterations" :min="1" :max="16" :step="1" />
				</CfgRow>
				<CfgRow label="刚度" info="布料的刚度系数">
					<CfgSld v-model="store.world.physicsAdvanced.cloth.stiffness" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="阻尼" info="布料的阻尼系数">
					<CfgSld v-model="store.world.physicsAdvanced.cloth.damping" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="重力系数" info="布料受重力影响的系数">
					<CfgSld v-model="store.world.physicsAdvanced.cloth.gravity" :min="0" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="风力响应" info="布料对风力的响应强度">
					<CfgSld v-model="store.world.physicsAdvanced.cloth.windResponse" :min="0" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="撕裂阈值" info="布料撕裂的力阈值">
					<CfgSld v-model="store.world.physicsAdvanced.cloth.tearThreshold" :min="10" :max="500" :step="10" />
				</CfgRow>
				<CfgRow label="碰撞边距" info="布料碰撞检测的边距">
					<CfgSld v-model="store.world.physicsAdvanced.cloth.collisionMargin" :min="0.01" :max="0.2" :step="0.01" />
				</CfgRow>
				<div class="config-section-title">流体系统</div>
				<CfgRow label="启用" info="是否启用流体模拟">
					<CfgSwt v-model="store.world.physicsAdvanced.fluid.enabled" />
				</CfgRow>
				<CfgRow label="粘度" info="流体的粘度系数">
					<CfgSld v-model="store.world.physicsAdvanced.fluid.viscosity" :min="0" :max="0.1" :step="0.005" />
				</CfgRow>
				<CfgRow label="密度" info="流体的密度">
					<input type="number" v-model.number="store.world.physicsAdvanced.fluid.density" min="100" max="2000">
				</CfgRow>
				<CfgRow label="粒子半径" info="流体粒子的半径">
					<CfgSld v-model="store.world.physicsAdvanced.fluid.particleRadius" :min="0.05" :max="0.5" :step="0.05" />
				</CfgRow>
				<CfgRow label="刚度" info="流体的不可压缩性">
					<CfgSld v-model="store.world.physicsAdvanced.fluid.stiffness" :min="10" :max="500" :step="10" />
				</CfgRow>
				<CfgRow label="表面张力" info="流体的表面张力">
					<CfgSld v-model="store.world.physicsAdvanced.fluid.surfaceTension" :min="0" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="最大粒子数" info="流体粒子的最大数量">
					<input type="number" v-model.number="store.world.physicsAdvanced.fluid.maxParticles" min="1000" max="50000" step="1000">
				</CfgRow>
				<CfgRow label="边界刚度" info="边界反弹的刚度">
					<CfgSld v-model="store.world.physicsAdvanced.fluid.boundaryStiffness" :min="100" :max="1000" :step="50" />
				</CfgRow>
				<div class="config-section-title">绳索系统</div>
				<CfgRow label="启用" info="是否启用绳索模拟">
					<CfgSwt v-model="store.world.physicsAdvanced.rope.enabled" />
				</CfgRow>
				<CfgRow label="节点数" info="绳索的节点数量">
					<CfgSld v-model="store.world.physicsAdvanced.rope.segments" :min="5" :max="50" :step="5" />
				</CfgRow>
				<CfgRow label="刚度" info="绳索的刚度">
					<CfgSld v-model="store.world.physicsAdvanced.rope.stiffness" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="阻尼" info="绳索的阻尼">
					<CfgSld v-model="store.world.physicsAdvanced.rope.damping" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="重力系数" info="绳索受重力影响的系数">
					<CfgSld v-model="store.world.physicsAdvanced.rope.gravity" :min="0" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="碰撞检测" info="是否启用绳索碰撞">
					<CfgSwt v-model="store.world.physicsAdvanced.rope.collisionEnabled" />
				</CfgRow>
				<CfgRow label="断裂阈值" info="绳索断裂的力阈值">
					<CfgSld v-model="store.world.physicsAdvanced.rope.tearThreshold" :min="10" :max="500" :step="10" />
				</CfgRow>
				<div class="config-section-title">破坏系统</div>
				<CfgRow label="启用" info="是否启用破坏系统">
					<CfgSwt v-model="store.world.physicsAdvanced.destruction.enabled" />
				</CfgRow>
				<CfgRow label="最小碎片" info="破坏时的最小碎片数">
					<CfgSld v-model="store.world.physicsAdvanced.destruction.minFragments" :min="2" :max="10" :step="1" />
				</CfgRow>
				<CfgRow label="最大碎片" info="破坏时的最大碎片数">
					<CfgSld v-model="store.world.physicsAdvanced.destruction.maxFragments" :min="5" :max="30" :step="1" />
				</CfgRow>
				<CfgRow label="噪声缩放" info="碎裂噪声的缩放">
					<CfgSld v-model="store.world.physicsAdvanced.destruction.noiseScale" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="噪声幅度" info="碎裂噪声的幅度">
					<CfgSld v-model="store.world.physicsAdvanced.destruction.noiseAmplitude" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="冲击阈值" info="触发破坏的冲击力阈值">
					<CfgSld v-model="store.world.physicsAdvanced.destruction.impactThreshold" :min="10" :max="200" :step="10" />
				</CfgRow>
				<CfgRow label="碎片质量比" info="碎片相对原物体的质量比">
					<CfgSld v-model="store.world.physicsAdvanced.destruction.fragmentMassRatio" :min="0.05" :max="0.5" :step="0.05" />
				</CfgRow>
				<CfgRow label="碎片寿命" unit="秒" info="碎片存在的时间">
					<CfgSld v-model="store.world.physicsAdvanced.destruction.debrisLifetime" :min="1" :max="30" :step="1" />
				</CfgRow>
				<CfgRow label="最大碎片数" info="场景中同时存在的最大碎片数">
					<CfgSld v-model="store.world.physicsAdvanced.destruction.maxDebris" :min="50" :max="500" :step="50" />
				</CfgRow>
				<div class="config-section-title">约束系统</div>
				<CfgRow label="启用" info="是否启用物理约束">
					<CfgSwt v-model="store.world.physicsAdvanced.constraints.enabled" />
				</CfgRow>
				<CfgRow label="铰链马达力" info="铰链约束马达的最大力">
					<CfgSld v-model="store.world.physicsAdvanced.constraints.hingeMotorForce" :min="10" :max="500" :step="10" />
				</CfgRow>
				<CfgRow label="滑块马达力" info="滑块约束马达的最大力">
					<CfgSld v-model="store.world.physicsAdvanced.constraints.sliderMotorForce" :min="10" :max="500" :step="10" />
				</CfgRow>
				<CfgRow label="弹簧刚度" info="弹簧约束的刚度">
					<CfgSld v-model="store.world.physicsAdvanced.constraints.springStiffness" :min="1" :max="200" :step="5" />
				</CfgRow>
				<CfgRow label="弹簧阻尼" info="弹簧约束的阻尼">
					<CfgSld v-model="store.world.physicsAdvanced.constraints.springDamping" :min="0" :max="20" :step="1" />
				</CfgRow>
				<CfgRow label="断裂力" info="约束断裂的力阈值">
					<CfgSld v-model="store.world.physicsAdvanced.constraints.breakForce" :min="100" :max="5000" :step="100" />
				</CfgRow>
				<div class="config-section-title">软体系统</div>
				<CfgRow label="启用" info="是否启用软体模拟">
					<CfgSwt v-model="store.world.physicsAdvanced.softBody.enabled" />
				</CfgRow>
				<CfgRow label="迭代次数" info="软体求解器的迭代次数">
					<CfgSld v-model="store.world.physicsAdvanced.softBody.iterations" :min="1" :max="16" :step="1" />
				</CfgRow>
				<CfgRow label="体积刚度" info="软体保持体积的刚度">
					<CfgSld v-model="store.world.physicsAdvanced.softBody.volumeStiffness" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="形状刚度" info="软体保持形状的刚度">
					<CfgSld v-model="store.world.physicsAdvanced.softBody.shapeStiffness" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="内部压力" info="软体的内部压力">
					<CfgSld v-model="store.world.physicsAdvanced.softBody.pressure" :min="0" :max="3" :step="0.1" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'time'" class="config-section">
				<div class="config-section-title">时间系统</div>
				<CfgRow label="时间流速" unit="x" info="游戏时间相对于现实时间的倍数。60表示1秒现实时间=1分钟游戏时间。">
					<input type="number" v-model.number="store.systems.time.speed" min="1" max="3600">
				</CfgRow>
				<CfgRow label="初始时间" info="游戏开始时的时间。格式为24小时制。">
					<input type="time" v-model="store.systems.time.initTime">
				</CfgRow>
				<CfgRow label="初始日期" info="游戏开始时的日期。影响季节和某些事件。">
					<input type="date" v-model="store.systems.time.initDate">
				</CfgRow>
				<CfgRow label="可暂停" info="开启后玩家可以暂停游戏时间。关闭则时间持续流逝。">
					<CfgSwt v-model="store.systems.time.canPause" />
				</CfgRow>
				<CfgRow label="可回溯" info="开启后玩家可以回溯时间到之前的状态。适合解谜或战斗重试。">
					<CfgSwt v-model="store.systems.time.canRewind" />
				</CfgRow>
				<CfgRow v-if="store.systems.time.canRewind" label="回溯上限" unit="秒" info="最多可以回溯多少秒的游戏时间。">
					<input type="number" v-model.number="store.systems.time.rewindMax" min="1" max="300">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'timeEffect'" class="config-section">
				<div class="config-section-title">慢动作</div>
				<CfgRow label="启用" info="是否启用子弹时间/慢动作效果">
					<CfgSwt v-model="store.timeEffect.slowMo.enabled" />
				</CfgRow>
				<CfgRow label="最小时间缩放" info="慢动作时的最低时间流速(0.1=10%速度)">
					<CfgSld v-model="store.timeEffect.slowMo.minScale" :min="0.01" :max="0.5" :step="0.01" />
				</CfgRow>
				<CfgRow label="过渡速度" info="进入/退出慢动作的过渡速度">
					<CfgSld v-model="store.timeEffect.slowMo.transitionSpeed" :min="0.5" :max="10" :step="0.5" />
				</CfgRow>
				<div class="config-section-title">时间冻结</div>
				<CfgRow label="启用" info="是否启用时间冻结技能">
					<CfgSwt v-model="store.timeEffect.freeze.enabled" />
				</CfgRow>
				<CfgRow label="最大持续时间" unit="秒" info="时间冻结的最大持续时间">
					<CfgSld v-model="store.timeEffect.freeze.duration" :min="1" :max="30" :step="1" />
				</CfgRow>
				<div class="config-section-title">时间回溯</div>
				<CfgRow label="启用" info="是否启用时间回溯技能">
					<CfgSwt v-model="store.timeEffect.rewind.enabled" />
				</CfgRow>
				<CfgRow label="最大回溯时长" unit="秒" info="可以回溯的最大时间长度">
					<CfgSld v-model="store.timeEffect.rewind.maxDuration" :min="1" :max="60" :step="1" />
				</CfgRow>
				<CfgRow label="记录帧率" unit="FPS" info="时间回溯数据的记录频率">
					<CfgSld v-model="store.timeEffect.rewind.recordRate" :min="10" :max="60" :step="5" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'input'" class="config-section">
				<div class="config-section-title">键盘</div>
				<CfgRow label="启用" info="是否启用键盘输入">
					<CfgSwt v-model="store.input.keyboard.enabled" />
				</CfgRow>
				<CfgRow label="重复延迟" unit="ms" info="按住按键后开始重复的延迟时间">
					<CfgSld v-model="store.input.keyboard.repeatDelay" :min="100" :max="1000" :step="50" />
				</CfgRow>
				<CfgRow label="重复速率" unit="ms" info="按键重复的间隔时间">
					<CfgSld v-model="store.input.keyboard.repeatRate" :min="10" :max="200" :step="10" />
				</CfgRow>
				<div class="config-section-title">鼠标</div>
				<CfgRow label="启用" info="是否启用鼠标输入">
					<CfgSwt v-model="store.input.mouse.enabled" />
				</CfgRow>
				<CfgRow label="灵敏度" info="鼠标移动的灵敏度倍数">
					<CfgSld v-model="store.input.mouse.sensitivity" :min="0.1" :max="5" :step="0.1" />
				</CfgRow>
				<CfgRow label="反转Y轴" info="是否反转鼠标上下移动的方向">
					<CfgSwt v-model="store.input.mouse.invertY" />
				</CfgRow>
				<CfgRow label="原始输入" info="绕过系统加速使用原始鼠标数据">
					<CfgSwt v-model="store.input.mouse.rawInput" />
				</CfgRow>
				<div class="config-section-title">手柄</div>
				<CfgRow label="启用" info="是否启用游戏手柄输入">
					<CfgSwt v-model="store.input.gamepad.enabled" />
				</CfgRow>
				<CfgRow label="死区" info="摇杆输入的最小阈值，防止漂移">
					<CfgSld v-model="store.input.gamepad.deadzone" :min="0.05" :max="0.5" :step="0.05" />
				</CfgRow>
				<CfgRow label="震动" info="是否启用手柄震动反馈">
					<CfgSwt v-model="store.input.gamepad.vibration" />
				</CfgRow>
				<CfgRow label="轴阈值" info="模拟输入转数字输入的阈值">
					<CfgSld v-model="store.input.gamepad.axisThreshold" :min="0.1" :max="1" :step="0.1" />
				</CfgRow>
				<div class="config-section-title">触摸</div>
				<CfgRow label="启用" info="是否启用触摸屏输入">
					<CfgSwt v-model="store.input.touch.enabled" />
				</CfgRow>
				<CfgRow label="多点触控" info="是否支持多点触控">
					<CfgSwt v-model="store.input.touch.multiTouch" />
				</CfgRow>
				<CfgRow label="点击阈值" unit="ms" info="判定为点击的最大触摸时间">
					<CfgSld v-model="store.input.touch.tapThreshold" :min="50" :max="500" :step="50" />
				</CfgRow>
				<div class="config-section-title">手势</div>
				<CfgRow label="启用" info="是否启用手势识别">
					<CfgSwt v-model="store.input.gesture.enabled" />
				</CfgRow>
				<CfgRow label="滑动阈值" unit="px" info="识别为滑动手势的最小距离">
					<CfgSld v-model="store.input.gesture.swipeThreshold" :min="10" :max="200" :step="10" />
				</CfgRow>
				<CfgRow label="缩放阈值" info="识别为缩放手势的最小比例变化">
					<CfgSld v-model="store.input.gesture.pinchThreshold" :min="0.05" :max="0.5" :step="0.05" />
				</CfgRow>
				<CfgRow label="旋转阈值" unit="°" info="识别为旋转手势的最小角度">
					<CfgSld v-model="store.input.gesture.rotateThreshold" :min="5" :max="45" :step="5" />
				</CfgRow>
				<CfgRow label="长按时长" unit="ms" info="识别为长按手势的持续时间">
					<CfgSld v-model="store.input.gesture.holdDuration" :min="200" :max="1500" :step="100" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'economy'" class="config-section">
				<div class="config-section-title">经济系统</div>
				<CfgRow label="货币名称" info="游戏中货币的显示名称。如: 金币、钻石、星币等。">
					<input type="text" v-model="store.systems.economy.currencyName">
				</CfgRow>
				<CfgRow label="货币上限" info="玩家可以持有的最大货币数量。防止数值溢出。">
					<input type="number" v-model.number="store.systems.economy.currencyMax" min="0">
				</CfgRow>
				<CfgRow label="自动拾取" info="开启后掉落的货币会自动进入玩家背包，无需手动拾取。">
					<CfgSwt v-model="store.systems.economy.autoLoot" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'faction'" class="config-section">
				<div class="config-section-title">阵营系统</div>
				<CfgRow label="声望上限" info="与任何阵营的声望值最高可达到的数值。代表极度友好。">
					<input type="number" v-model.number="store.systems.faction.repMax" min="0">
				</CfgRow>
				<CfgRow label="声望下限" info="与任何阵营的声望值最低可达到的数值(负数)。代表极度敌对。">
					<input type="number" v-model.number="store.systems.faction.repMin" max="0">
				</CfgRow>
				<CfgRow label="击杀奖励" info="击杀敌对阵营成员时获得的声望值。">
					<input type="number" v-model.number="store.systems.faction.repKill" min="0">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'quest'" class="config-section">
				<div class="config-section-title">任务系统</div>
				<CfgRow label="同时任务" info="玩家可以同时接受的最大任务数量。">
					<input type="number" v-model.number="store.systems.quest.maxActive" min="1" max="100">
				</CfgRow>
				<CfgRow label="每日任务" info="每天刷新的日常任务数量。0表示无日常任务系统。">
					<input type="number" v-model.number="store.systems.quest.dailyCount" min="0" max="20">
				</CfgRow>
				<CfgRow label="自动追踪" info="开启后新接受的任务会自动显示在屏幕上追踪。">
					<CfgSwt v-model="store.systems.quest.autoTrack" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'dialogue'" class="config-section">
				<div class="config-section-title">对话系统</div>
				<CfgRow label="文字速度" unit="%" info="对话文字显示的速度。100%=瞬间显示 1%=极慢打字效果">
					<CfgSld v-model="store.systems.dialogue.speed" :min="1" :max="100" />
				</CfgRow>
				<CfgRow label="自动播放" info="开启后对话会自动播放下一句，无需玩家点击确认。">
					<CfgSwt v-model="store.systems.dialogue.autoPlay" />
				</CfgRow>
				<CfgRow label="可跳过" info="开启后玩家可以跳过对话。关闭则强制观看所有对话。">
					<CfgSwt v-model="store.systems.dialogue.canSkip" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'particle'" class="config-section">
				<div class="config-section-title">粒子系统</div>
				<CfgRow label="最大粒子数" info="场景中允许的最大粒子数量">
					<input type="number" v-model.number="store.particle.maxParticles" min="1000" max="100000" step="1000">
				</CfgRow>
				<CfgRow label="GPU加速" info="使用GPU计算粒子位置">
					<CfgSwt v-model="store.particle.gpuAcceleration" />
				</CfgRow>
				<CfgRow label="排序模式" info="粒子的渲染排序方式">
					<CfgCrd v-model="store.particle.sortMode" :options="particleSortOpts" />
				</CfgRow>
				<CfgRow label="剔除模式" info="不可见粒子的剔除方式">
					<CfgCrd v-model="store.particle.cullMode" :options="particleCullOpts" />
				</CfgRow>
				<CfgRow label="剔除距离" unit="m" info="超过此距离的粒子将被剔除">
					<CfgSld v-model="store.particle.cullDistance" :min="20" :max="500" :step="20" />
				</CfgRow>
				<CfgRow label="LOD偏移" info="粒子LOD的距离偏移系数">
					<CfgSld v-model="store.particle.lodBias" :min="0.5" :max="2" :step="0.1" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'weather'" class="config-section">
				<div class="config-section-title">天气系统</div>
				<CfgRow label="启用" info="是否启用动态天气系统">
					<CfgSwt v-model="store.weather.enabled" />
				</CfgRow>
				<CfgRow label="当前天气" info="当前的天气类型">
					<CfgCrd v-model="store.weather.current" :options="weatherOpts" />
				</CfgRow>
				<CfgRow label="过渡时间" unit="秒" info="天气变化的过渡时间">
					<CfgSld v-model="store.weather.transitionTime" :min="1" :max="30" :step="1" />
				</CfgRow>
				<CfgRow label="风力强度" info="风力的强度(0=无风 1=强风)">
					<CfgSld v-model="store.weather.windStrength" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="风向" unit="°" info="风的方向(0=北 90=东)">
					<CfgSld v-model="store.weather.windDirection" :min="0" :max="359" :step="15" />
				</CfgRow>
				<CfgRow label="降水量" info="降雨/降雪的强度">
					<CfgSld v-model="store.weather.precipitation" :min="0" :max="1" :step="0.1" />
				</CfgRow>
				<CfgRow label="温度" unit="°C" info="环境温度">
					<CfgSld v-model="store.weather.temperature" :min="-30" :max="50" :step="1" />
				</CfgRow>
				<CfgRow label="湿度" unit="%" info="空气湿度">
					<CfgSld v-model="store.weather.humidity" :min="0" :max="100" :step="5" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'vehicle'" class="config-section">
				<div class="config-section-title">载具系统</div>
				<CfgRow label="启用" info="是否启用载具系统">
					<CfgSwt v-model="store.vehicle.enabled" />
				</CfgRow>
				<div class="config-section-title">物理参数</div>
				<CfgRow label="轮胎摩擦" info="轮胎与地面的摩擦系数">
					<CfgSld v-model="store.vehicle.physics.wheelFriction" :min="0.5" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="悬挂刚度" info="悬挂弹簧的刚度">
					<CfgSld v-model="store.vehicle.physics.suspensionStiffness" :min="10" :max="100" :step="5" />
				</CfgRow>
				<CfgRow label="悬挂阻尼" info="悬挂的阻尼系数">
					<CfgSld v-model="store.vehicle.physics.suspensionDamping" :min="0.5" :max="5" :step="0.1" />
				</CfgRow>
				<CfgRow label="最大转向角" unit="°" info="车轮的最大转向角度">
					<CfgSld v-model="store.vehicle.physics.maxSteerAngle" :min="15" :max="60" :step="5" />
				</CfgRow>
				<CfgRow label="引擎功率" unit="HP" info="发动机最大输出功率">
					<input type="number" v-model.number="store.vehicle.physics.enginePower" min="100" max="5000">
				</CfgRow>
				<CfgRow label="制动力" unit="N" info="刹车制动力">
					<input type="number" v-model.number="store.vehicle.physics.brakePower" min="1000" max="10000">
				</CfgRow>
				<CfgRow label="质量" unit="kg" info="载具整体质量">
					<input type="number" v-model.number="store.vehicle.physics.mass" min="500" max="10000">
				</CfgRow>
				<div class="config-section-title">相机参数</div>
				<CfgRow label="跟随距离" unit="m" info="相机与载具的距离">
					<CfgSld v-model="store.vehicle.camera.followDist" :min="3" :max="20" :step="1" />
				</CfgRow>
				<CfgRow label="跟随高度" unit="m" info="相机相对载具的高度">
					<CfgSld v-model="store.vehicle.camera.followHeight" :min="1" :max="10" :step="0.5" />
				</CfgRow>
				<CfgRow label="前瞻距离" unit="m" info="相机预瞄的前方距离">
					<CfgSld v-model="store.vehicle.camera.lookAhead" :min="0" :max="10" :step="0.5" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'inventory'" class="config-section">
				<div class="config-section-title">背包系统</div>
				<CfgRow label="初始格数" info="玩家开始游戏时的背包格数。">
					<input type="number" v-model.number="store.systems.inventory.initSlots" min="1" max="500">
				</CfgRow>
				<CfgRow label="最大格数" info="通过升级或购买可以扩展到的最大格数。">
					<input type="number" v-model.number="store.systems.inventory.maxSlots" min="1" max="500">
				</CfgRow>
				<CfgRow label="堆叠上限" info="同种物品在一个格子内最多可以堆叠的数量。">
					<input type="number" v-model.number="store.systems.inventory.stackLimit" min="1" max="9999">
				</CfgRow>
				<CfgRow label="重量限制" info="开启后背包有负重限制，超重会影响移动速度。">
					<CfgSwt v-model="store.systems.inventory.weightLimit" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'combat'" class="config-section">
				<div class="config-section-title">战斗系统</div>
				<CfgRow label="锁定模式" info="软锁定=辅助瞄准 硬锁定=完全锁定目标 无锁定=自由瞄准">
					<CfgCrd v-model="store.systems.combat.lockMode" :options="lockModeOpts" />
				</CfgRow>
				<CfgRow label="锁定距离" unit="m" info="可以锁定目标的最大距离。超出距离自动解除锁定。">
					<input type="number" v-model.number="store.systems.combat.lockRange" min="1" max="100">
				</CfgRow>
				<CfgRow label="连击窗口" unit="ms" info="两次攻击输入之间允许的最大间隔时间，在此时间内输入算作连击。">
					<input type="number" v-model.number="store.systems.combat.comboWindow" min="100" max="2000">
				</CfgRow>
				<CfgRow label="无敌帧" unit="ms" info="翻滚/闪避时的无敌时间。在此期间不会受到任何伤害。">
					<input type="number" v-model.number="store.systems.combat.iframeDuration" min="0" max="1000">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'buff'" class="config-section">
				<div class="config-section-title">显示设置</div>
				<CfgRow label="最大可见数" info="同时显示的Buff图标数量上限">
					<CfgSld v-model="store.buff.display.maxVisible" :min="5" :max="30" :step="1" />
				</CfgRow>
				<CfgRow label="图标大小" unit="px" info="Buff图标的像素大小">
					<CfgSld v-model="store.buff.display.iconSize" :min="16" :max="64" :step="4" />
				</CfgRow>
				<CfgRow label="显示持续时间" info="是否在图标上显示剩余时间">
					<CfgSwt v-model="store.buff.display.showDuration" />
				</CfgRow>
				<CfgRow label="显示堆叠数" info="是否在图标上显示堆叠层数">
					<CfgSwt v-model="store.buff.display.showStacks" />
				</CfgRow>
				<div class="config-section-title">数量限制</div>
				<CfgRow label="最大增益数" info="单个实体可拥有的最大Buff数量">
					<CfgSld v-model="store.buff.limits.maxBuffs" :min="5" :max="50" :step="5" />
				</CfgRow>
				<CfgRow label="最大减益数" info="单个实体可拥有的最大Debuff数量">
					<CfgSld v-model="store.buff.limits.maxDebuffs" :min="5" :max="50" :step="5" />
				</CfgRow>
				<CfgRow label="最大堆叠数" info="同一Buff的最大堆叠层数">
					<CfgSld v-model="store.buff.limits.maxStacks" :min="1" :max="999" :step="1" />
				</CfgRow>
				<div class="config-section-title">更新设置</div>
				<CfgRow label="Tick率" unit="FPS" info="Buff效果的更新频率">
					<CfgSld v-model="store.buff.update.tickRate" :min="10" :max="60" :step="5" />
				</CfgRow>
				<CfgRow label="批处理大小" info="每帧处理的Buff数量">
					<CfgSld v-model="store.buff.update.batchSize" :min="1" :max="50" :step="1" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'ai'" class="config-section">
				<div class="config-section-title">AI基础</div>
				<CfgRow label="AI模板" info="AI的默认行为模式">
					<CfgCrd v-model="store.ai.behavior.template" :options="aiTemplateOpts" />
				</CfgRow>
				<CfgRow label="警觉范围" unit="m" info="AI发现玩家的距离">
					<input type="number" v-model.number="store.ai.behavior.alertRadius" min="1" max="100">
				</CfgRow>
				<CfgRow label="追击范围" unit="m" info="AI追击玩家的最大距离">
					<input type="number" v-model.number="store.ai.behavior.chaseRadius" min="1" max="200">
				</CfgRow>
				<CfgRow label="返回范围" unit="m" info="AI放弃追击返回原位的距离">
					<input type="number" v-model.number="store.ai.behavior.returnRadius" min="1" max="500">
				</CfgRow>
				<div class="config-section-title">AI感知</div>
				<CfgRow label="视野范围" unit="m" info="AI能看到的最远距离">
					<input type="number" v-model.number="store.ai.perception.sightRange" min="5" max="200">
				</CfgRow>
				<CfgRow label="视野角度" unit="°" info="AI的视野扇形角度">
					<CfgSld v-model="store.ai.perception.sightAngle" :min="30" :max="360" />
				</CfgRow>
				<CfgRow label="听觉范围" unit="m" info="AI能听到声音的距离">
					<input type="number" v-model.number="store.ai.perception.hearRange" min="5" max="100">
				</CfgRow>
				<div class="config-section-title">AI寻路</div>
				<CfgRow label="寻路算法" info="A*更快但可能不是最优 Dijkstra保证最优但较慢">
					<CfgCrd v-model="store.ai.pathfind.algo" :options="pathfindAlgoOpts" />
				</CfgRow>
				<CfgRow label="更新频率" unit="秒" info="重新计算路径的时间间隔">
					<input type="number" v-model.number="store.ai.pathfind.updateFreq" min="0.1" max="2" step="0.1">
				</CfgRow>
				<CfgRow label="避障半径" unit="m" info="AI避开障碍物的距离">
					<input type="number" v-model.number="store.ai.pathfind.avoidRadius" min="0.1" max="5" step="0.1">
				</CfgRow>
				<div class="config-section-title">AI对话</div>
				<CfgRow label="可对话" info="开启后玩家可以与该AI进行对话">
					<CfgSwt v-model="store.ai.dialogue.canTalk" />
				</CfgRow>
				<CfgRow v-if="store.ai.dialogue.canTalk" label="对话范围" unit="m" info="玩家能发起对话的距离">
					<input type="number" v-model.number="store.ai.dialogue.talkRange" min="1" max="20">
				</CfgRow>
				<CfgRow v-if="store.ai.dialogue.canTalk" label="性格描述" info="用于生成对话的性格提示词">
					<input type="text" v-model="store.ai.dialogue.personality" placeholder="如: 友善、神秘、幽默...">
				</CfgRow>
				<CfgRow v-if="store.ai.dialogue.canTalk" label="开场白" info="NPC主动打招呼时说的话">
					<input type="text" v-model="store.ai.dialogue.greeting" placeholder="如: 欢迎来到我的小店!">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'ui'" class="config-section">
				<div class="config-section-title">血条设置</div>
				<CfgRow label="显示数值" info="是否在血条上显示具体数值">
					<CfgSwt v-model="store.ui.hpBar.showValue" />
				</CfgRow>
				<CfgRow label="显示护盾" info="是否显示护盾条">
					<CfgSwt v-model="store.ui.hpBar.showShield" />
				</CfgRow>
				<CfgRow label="背景色" info="血条背景颜色">
					<input type="color" v-model="store.ui.hpBar.bgColor">
				</CfgRow>
				<CfgRow label="血量色" info="正常血量颜色">
					<input type="color" v-model="store.ui.hpBar.hpColor">
				</CfgRow>
				<CfgRow label="低血色" info="低血量时的颜色">
					<input type="color" v-model="store.ui.hpBar.hpLowColor">
				</CfgRow>
				<CfgRow label="护盾色" info="护盾条颜色">
					<input type="color" v-model="store.ui.hpBar.shieldColor">
				</CfgRow>
				<CfgRow label="低血阈值" info="低于此百分比显示低血色">
					<CfgSld v-model="store.ui.hpBar.lowThreshold" :min="0.1" :max="0.5" :step="0.05" />
				</CfgRow>
				<CfgRow label="动画速度" info="血条变化动画的速度">
					<CfgSld v-model="store.ui.hpBar.animSpeed" :min="1" :max="20" :step="1" />
				</CfgRow>
				<div class="config-section-title">小地图</div>
				<CfgRow label="启用" info="是否显示小地图">
					<CfgSwt v-model="store.ui.minimap.enabled" />
				</CfgRow>
				<CfgRow label="世界宽度" unit="m" info="小地图对应的世界宽度">
					<input type="number" v-model.number="store.ui.minimap.worldW" min="100" max="10000">
				</CfgRow>
				<CfgRow label="世界高度" unit="m" info="小地图对应的世界高度">
					<input type="number" v-model.number="store.ui.minimap.worldH" min="100" max="10000">
				</CfgRow>
				<CfgRow label="背景色" info="小地图背景颜色">
					<input type="color" v-model="store.ui.minimap.bgColor">
				</CfgRow>
				<CfgRow label="边框色" info="小地图边框颜色">
					<input type="color" v-model="store.ui.minimap.borderColor">
				</CfgRow>
				<CfgRow label="玩家标记色" info="玩家在小地图上的颜色">
					<input type="color" v-model="store.ui.minimap.playerColor">
				</CfgRow>
				<CfgRow label="玩家标记大小" info="玩家标记的像素大小">
					<CfgSld v-model="store.ui.minimap.playerSize" :min="2" :max="16" :step="1" />
				</CfgRow>
				<CfgRow label="形状" info="小地图的形状">
					<CfgCrd v-model="store.ui.minimap.maskShape" :options="minimapShapeOpts" />
				</CfgRow>
				<CfgRow label="显示网格" info="是否在小地图上显示网格线">
					<CfgSwt v-model="store.ui.minimap.showGrid" />
				</CfgRow>
				<CfgRow v-if="store.ui.minimap.showGrid" label="网格大小" info="网格单元的大小">
					<CfgSld v-model="store.ui.minimap.gridSize" :min="50" :max="500" :step="50" />
				</CfgRow>
				<CfgRow label="战争迷雾" info="是否启用战争迷雾效果">
					<CfgSwt v-model="store.ui.minimap.fogEnabled" />
				</CfgRow>
				<CfgRow v-if="store.ui.minimap.fogEnabled" label="视野半径" unit="m" info="玩家可见范围半径">
					<CfgSld v-model="store.ui.minimap.viewRadius" :min="10" :max="200" :step="10" />
				</CfgRow>
				<div class="config-section-title">伤害数字</div>
				<CfgRow label="启用" info="是否显示浮动伤害数字">
					<CfgSwt v-model="store.ui.damageNumbers.enabled" />
				</CfgRow>
				<CfgRow label="持续时间" unit="ms" info="伤害数字显示的持续时间">
					<CfgSld v-model="store.ui.damageNumbers.duration" :min="500" :max="3000" :step="100" />
				</CfgRow>
				<CfgRow label="字体大小" info="伤害数字的字体大小">
					<CfgSld v-model="store.ui.damageNumbers.fontSize" :min="10" :max="32" :step="2" />
				</CfgRow>
				<CfgRow label="暴击颜色" info="暴击伤害的数字颜色">
					<input type="color" v-model="store.ui.damageNumbers.critColor">
				</CfgRow>
				<CfgRow label="治疗颜色" info="治疗数字的颜色">
					<input type="color" v-model="store.ui.damageNumbers.healColor">
				</CfgRow>
				<CfgRow label="普通颜色" info="普通伤害的数字颜色">
					<input type="color" v-model="store.ui.damageNumbers.normalColor">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'save'" class="config-section">
				<div class="config-section-title">存档设置</div>
				<CfgRow label="最大存档数" info="玩家可以保存的最大存档数量">
					<CfgSld v-model="store.save.maxSlots" :min="1" :max="50" :step="1" />
				</CfgRow>
				<CfgRow label="存储后端" info="存档数据的存储方式">
					<CfgCrd v-model="store.save.backend" :options="saveBackendOpts" />
				</CfgRow>
				<div class="config-section-title">自动存档</div>
				<CfgRow label="启用" info="是否启用自动存档功能">
					<CfgSwt v-model="store.save.autoSave.enabled" />
				</CfgRow>
				<CfgRow v-if="store.save.autoSave.enabled" label="间隔" unit="ms" info="自动存档的时间间隔">
					<CfgSld v-model="store.save.autoSave.interval" :min="60000" :max="600000" :step="60000" />
				</CfgRow>
				<div class="config-section-title">检查点</div>
				<CfgRow label="启用" info="是否启用检查点系统">
					<CfgSwt v-model="store.save.checkpoint.enabled" />
				</CfgRow>
				<CfgRow v-if="store.save.checkpoint.enabled" label="最大检查点" info="最多保存的检查点数量">
					<CfgSld v-model="store.save.checkpoint.maxCheckpoints" :min="1" :max="20" :step="1" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'assetStreaming'" class="config-section">
				<div class="config-section-title">资源流送</div>
				<CfgRow label="启用" info="是否启用资源流送加载">
					<CfgSwt v-model="store.assetStreaming.enabled" />
				</CfgRow>
				<CfgRow label="最大并发数" info="同时加载的最大资源数量">
					<CfgSld v-model="store.assetStreaming.maxConcurrent" :min="1" :max="16" :step="1" />
				</CfgRow>
				<CfgRow label="加载半径" unit="m" info="触发资源加载的距离">
					<CfgSld v-model="store.assetStreaming.loadRadius" :min="50" :max="500" :step="50" />
				</CfgRow>
				<CfgRow label="卸载半径" unit="m" info="触发资源卸载的距离">
					<CfgSld v-model="store.assetStreaming.unloadRadius" :min="100" :max="800" :step="50" />
				</CfgRow>
				<CfgRow label="优先级加成" info="高优先级资源的加载加成">
					<CfgSld v-model="store.assetStreaming.priorityBoost" :min="1" :max="5" :step="0.5" />
				</CfgRow>
				<CfgRow label="重试次数" info="加载失败后的重试次数">
					<CfgSld v-model="store.assetStreaming.retryAttempts" :min="1" :max="10" :step="1" />
				</CfgRow>
				<CfgRow label="重试延迟" unit="ms" info="重试加载的间隔时间">
					<CfgSld v-model="store.assetStreaming.retryDelay" :min="500" :max="5000" :step="500" />
				</CfgRow>
				<CfgRow label="缓存大小" unit="MB" info="资源缓存的最大大小">
					<CfgSld v-model="store.assetStreaming.cacheSize" :min="64" :max="1024" :step="64" />
				</CfgRow>
				<CfgRow label="预加载半径" unit="m" info="预加载资源的距离">
					<CfgSld v-model="store.assetStreaming.preloadRadius" :min="0" :max="200" :step="25" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'i18n'" class="config-section">
				<div class="config-section-title">本地化设置</div>
				<CfgRow label="默认语言" info="游戏启动时的默认语言">
					<input type="text" v-model="store.i18n.defaultLocale" placeholder="zh-CN">
				</CfgRow>
				<CfgRow label="备用语言" info="当翻译缺失时使用的语言">
					<input type="text" v-model="store.i18n.fallbackLocale" placeholder="en">
				</CfgRow>
				<CfgRow label="日期格式" info="日期显示的格式化字符串">
					<input type="text" v-model="store.i18n.dateFormat" placeholder="YYYY-MM-DD">
				</CfgRow>
				<CfgRow label="数字格式" info="数字显示的格式化字符串">
					<input type="text" v-model="store.i18n.numberFormat" placeholder="0,0.00">
				</CfgRow>
				<CfgRow label="货币代码" info="货币的ISO代码">
					<input type="text" v-model="store.i18n.currencyCode" placeholder="CNY">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'performance'" class="config-section">
				<div class="config-section-title">性能分析</div>
				<CfgRow label="启用" info="是否启用性能分析器">
					<CfgSwt v-model="store.performance.profiling.enabled" />
				</CfgRow>
				<CfgRow label="采样率" unit="FPS" info="性能数据的采样频率">
					<CfgSld v-model="store.performance.profiling.sampleRate" :min="10" :max="120" :step="10" />
				</CfgRow>
				<CfgRow label="最大样本数" info="保留的最大性能样本数量">
					<CfgSld v-model="store.performance.profiling.maxSamples" :min="60" :max="600" :step="60" />
				</CfgRow>
				<div class="config-section-title">调试UI</div>
				<CfgRow label="启用" info="是否显示调试信息面板">
					<CfgSwt v-model="store.performance.debugUI.enabled" />
				</CfgRow>
				<CfgRow label="位置" info="调试面板的显示位置">
					<CfgCrd v-model="store.performance.debugUI.position" :options="debugPosOpts" />
				</CfgRow>
				<CfgRow label="显示FPS" info="是否显示帧率">
					<CfgSwt v-model="store.performance.debugUI.showFPS" />
				</CfgRow>
				<CfgRow label="显示内存" info="是否显示内存使用">
					<CfgSwt v-model="store.performance.debugUI.showMemory" />
				</CfgRow>
				<CfgRow label="显示DrawCall" info="是否显示绘制调用次数">
					<CfgSwt v-model="store.performance.debugUI.showDrawCalls" />
				</CfgRow>
				<div class="config-section-title">性能预算</div>
				<CfgRow label="目标帧率" unit="FPS" info="游戏的目标帧率">
					<CfgSld v-model="store.performance.budget.targetFPS" :min="30" :max="144" :step="10" />
				</CfgRow>
				<CfgRow label="最大DrawCall" info="每帧允许的最大绘制调用数">
					<input type="number" v-model.number="store.performance.budget.maxDrawCalls" min="500" max="10000" step="500">
				</CfgRow>
				<CfgRow label="最大三角形" info="每帧允许渲染的最大三角形数">
					<input type="number" v-model.number="store.performance.budget.maxTriangles" min="100000" max="2000000" step="100000">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'worldview'" class="config-section">
				<div class="config-section-title">世界观系统</div>
				<div class="wv-module-lst">
					<div v-for="mod in wvModules" :key="mod.id" class="wv-module-item">
						<CfgSwt v-model="store.modules.worldview[mod.id]" />
						<div class="wv-module-info">
							<span class="wv-module-name">{{ mod.name }}</span>
							<span class="wv-module-desc">{{ mod.desc }}</span>
						</div>
					</div>
				</div>
			</div>
			<div v-else-if="curCat === 'llm'" class="config-section">
				<div class="config-section-title">LLM配置</div>
				<CfgRow label="服务商" info="选择LLM服务提供商">
					<CfgCrd v-model="store.llm.provider" :options="llmProviderOpts" />
				</CfgRow>
				<CfgRow label="接口地址" info="API端点URL。使用官方服务时可留空使用默认地址。">
					<input type="text" v-model="store.llm.endpoint" placeholder="如: https://api.openai.com/v1">
				</CfgRow>
				<CfgRow label="API密钥" info="服务商提供的API密钥。本地Ollama不需要。">
					<input type="password" v-model="store.llm.apiKey" placeholder="sk-...">
				</CfgRow>
				<CfgRow label="模型名称" info="使用的模型名称。如gpt-4、claude-3-opus、llama3等。">
					<input type="text" v-model="store.llm.model" placeholder="如: gpt-4">
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'achievement'" class="config-section">
				<div class="config-section-title">成就系统</div>
				<CfgRow label="启用" info="是否启用成就系统">
					<CfgSwt v-model="store.achievement.enabled" />
				</CfgRow>
				<CfgRow label="最大追踪数" info="同时追踪的最大成就数量">
					<CfgSld v-model="store.achievement.maxTracking" :min="1" :max="20" :step="1" />
				</CfgRow>
				<CfgRow label="显示弹窗" info="成就完成时是否显示弹窗">
					<CfgSwt v-model="store.achievement.showPopup" />
				</CfgRow>
				<CfgRow label="弹窗时长" unit="s" info="成就弹窗显示的持续时间">
					<CfgSld v-model="store.achievement.popupDuration" :min="1" :max="10" :step="1" />
				</CfgRow>
				<CfgRow label="启用音效" info="成就完成时是否播放音效">
					<CfgSwt v-model="store.achievement.soundEnabled" />
				</CfgRow>
				<CfgRow label="进度条" info="是否显示成就进度条">
					<CfgSwt v-model="store.achievement.progressBar" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'keybind'" class="config-section">
				<div class="config-section-title">快捷键设置</div>
				<CfgRow label="允许重绑定" info="是否允许玩家自定义按键">
					<CfgSwt v-model="store.keybind.allowRebind" />
				</CfgRow>
				<CfgRow label="冲突警告" info="按键冲突时是否显示警告">
					<CfgSwt v-model="store.keybind.conflictWarning" />
				</CfgRow>
				<CfgRow label="可重置" info="是否允许重置为默认按键">
					<CfgSwt v-model="store.keybind.resetToDefault" />
				</CfgRow>
				<div class="config-section-title">可配置分类</div>
				<CfgRow label="移动控制" info="允许自定义移动相关按键">
					<CfgSwt v-model="store.keybind.categories.movement" />
				</CfgRow>
				<CfgRow label="战斗控制" info="允许自定义战斗相关按键">
					<CfgSwt v-model="store.keybind.categories.combat" />
				</CfgRow>
				<CfgRow label="界面控制" info="允许自定义UI相关按键">
					<CfgSwt v-model="store.keybind.categories.ui" />
				</CfgRow>
				<CfgRow label="社交控制" info="允许自定义社交相关按键">
					<CfgSwt v-model="store.keybind.categories.social" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'display'" class="config-section">
				<div class="config-section-title">显示设置</div>
				<CfgRow label="全屏" info="是否默认全屏模式">
					<CfgSwt v-model="store.display.fullscreen" />
				</CfgRow>
				<CfgRow label="垂直同步" info="是否启用垂直同步">
					<CfgSwt v-model="store.display.vsync" />
				</CfgRow>
				<CfgRow label="帧率限制" unit="FPS" info="最大帧率限制(0为不限制)">
					<CfgSld v-model="store.display.fpsLimit" :min="0" :max="240" :step="30" />
				</CfgRow>
				<CfgRow label="渲染缩放" info="渲染分辨率缩放比例">
					<CfgSld v-model="store.display.renderScale" :min="0.5" :max="2" :step="0.25" />
				</CfgRow>
				<CfgRow label="UI缩放" info="用户界面的缩放比例">
					<CfgSld v-model="store.display.uiScale" :min="0.5" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="伽马值" info="画面伽马校正值">
					<CfgSld v-model="store.display.gamma" :min="0.5" :max="2" :step="0.1" />
				</CfgRow>
				<CfgRow label="亮度" info="画面亮度">
					<CfgSld v-model="store.display.brightness" :min="0.5" :max="1.5" :step="0.1" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'accessibility'" class="config-section">
				<div class="config-section-title">辅助功能</div>
				<CfgRow label="色盲模式" info="选择色盲辅助模式">
					<CfgCrd v-model="store.accessibility.colorblindMode" :options="colorblindModeOpts" />
				</CfgRow>
				<CfgRow label="字幕" info="是否显示游戏字幕">
					<CfgSwt v-model="store.accessibility.subtitles" />
				</CfgRow>
				<CfgRow v-if="store.accessibility.subtitles" label="字幕大小" info="字幕字体大小">
					<CfgSld v-model="store.accessibility.subtitleSize" :min="12" :max="32" :step="2" />
				</CfgRow>
				<CfgRow v-if="store.accessibility.subtitles" label="字幕背景" info="是否显示字幕背景">
					<CfgSwt v-model="store.accessibility.subtitleBg" />
				</CfgRow>
				<CfgRow label="屏幕震动" info="是否启用屏幕震动效果">
					<CfgSwt v-model="store.accessibility.screenShake" />
				</CfgRow>
				<CfgRow label="闪光效果" info="是否允许闪光效果">
					<CfgSwt v-model="store.accessibility.flashEffects" />
				</CfgRow>
				<CfgRow label="高对比度" info="是否启用高对比度模式">
					<CfgSwt v-model="store.accessibility.highContrast" />
				</CfgRow>
				<CfgRow label="减少动画" info="减少动画以降低视觉刺激">
					<CfgSwt v-model="store.accessibility.motionReduction" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'debug'" class="config-section">
				<div class="config-section-title">调试设置</div>
				<CfgRow label="启用" info="是否启用调试模式">
					<CfgSwt v-model="store.debug.enabled" />
				</CfgRow>
				<CfgRow label="日志级别" info="显示的最低日志级别">
					<CfgCrd v-model="store.debug.logLevel" :options="logLevelOpts" />
				</CfgRow>
				<CfgRow label="显示控制台" info="是否显示调试控制台">
					<CfgSwt v-model="store.debug.showConsole" />
				</CfgRow>
				<CfgRow label="线框模式" info="是否显示网格线框">
					<CfgSwt v-model="store.debug.wireframe" />
				</CfgRow>
				<CfgRow label="显示碰撞体" info="是否显示物理碰撞体">
					<CfgSwt v-model="store.debug.showColliders" />
				</CfgRow>
				<CfgRow label="显示NavMesh" info="是否显示导航网格">
					<CfgSwt v-model="store.debug.showNavmesh" />
				</CfgRow>
				<CfgRow label="显示统计" info="是否显示详细统计信息">
					<CfgSwt v-model="store.debug.showStats" />
				</CfgRow>
			</div>
			<div v-else-if="curCat === 'shop'" class="config-section">
				<div class="config-section-title">商城系统</div>
				<CfgRow label="启用" info="是否启用游戏内商城">
					<CfgSwt v-model="store.shop.enabled" />
				</CfgRow>
				<CfgRow label="刷新间隔" unit="s" info="商品列表刷新间隔">
					<CfgSld v-model="store.shop.refreshInterval" :min="3600" :max="604800" :step="3600" />
				</CfgRow>
				<CfgRow label="最大商品数" info="商城同时展示的最大商品数">
					<CfgSld v-model="store.shop.maxItems" :min="10" :max="100" :step="10" />
				</CfgRow>
				<CfgRow label="货币种类数" info="支持的货币类型数量">
					<CfgSld v-model="store.shop.currencyTypes" :min="1" :max="10" :step="1" />
				</CfgRow>
				<CfgRow label="最大折扣" unit="%" info="商品最大折扣百分比">
					<CfgSld v-model="store.shop.discountMax" :min="0" :max="90" :step="10" />
				</CfgRow>
				<CfgRow label="限时优惠" info="是否启用限时特价商品">
					<CfgSwt v-model="store.shop.limitedOffers" />
				</CfgRow>
				<CfgRow label="确认购买" info="购买前是否需要确认">
					<CfgSwt v-model="store.shop.confirmPurchase" />
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

.wv-module-lst {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.wv-module-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 0;
	border-bottom: 1px solid #252525;
}

.wv-module-item:last-child {
	border-bottom: none;
}

.wv-module-info {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.wv-module-name {
	font-size: 12px;
	color: #ddd;
}

.wv-module-desc {
	font-size: 10px;
	color: #666;
}
</style>
