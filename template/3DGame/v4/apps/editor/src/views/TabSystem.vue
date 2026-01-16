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
	{ id: 'camera', name: '相机系统' },
	{ id: 'time', name: '时间系统' },
	{ id: 'inventory', name: '物品栏系统' },
	{ id: 'combat', name: '战斗系统' },
	{ id: 'ai', name: 'AI系统' },
	{ id: 'economy', name: '经济系统' },
	{ id: 'faction', name: '阵营系统' },
	{ id: 'quest', name: '任务系统' },
	{ id: 'dialogue', name: '对话系统' },
	{ id: 'worldview', name: '世界观系统' },
	{ id: 'llm', name: 'LLM配置' }
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
