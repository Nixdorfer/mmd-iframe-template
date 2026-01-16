<script setup lang="ts">
import { ref } from 'vue'
import CfgCrd from '../components/ui/CfgCrd.vue'
import CfgRow from '../components/ui/CfgRow.vue'
import CfgSld from '../components/ui/CfgSld.vue'
import CfgSwt from '../components/ui/CfgSwt.vue'

const serverUrl = ref('ws://localhost:8080')
const reconnectEnabled = ref(true)
const reconnectDelay = ref(1000)
const reconnectMaxAttempts = ref(5)

const tickRate = ref(60)
const sendRate = ref(20)
const interpDelay = ref(100)

const predictionEnabled = ref(true)
const reconciliationThreshold = ref(0.1)
const maxPredictedInputs = ref(64)

const compressionEnabled = ref(true)
const snapshotBufferSize = ref(32)

const lobbyMaxRooms = ref(100)
const lobbyMaxPlayers = ref(16)
const lobbyTimeout = ref(300)
</script>

<template>
	<div class="tab-network">
		<CfgCrd title="连接设置">
			<CfgRow label="服务器地址">
				<input v-model="serverUrl" type="text" class="cfg-ipt" />
			</CfgRow>
			<CfgRow label="自动重连">
				<CfgSwt v-model="reconnectEnabled" />
			</CfgRow>
			<CfgRow label="重连延迟(ms)">
				<CfgSld v-model="reconnectDelay" :min="500" :max="5000" :step="500" />
			</CfgRow>
			<CfgRow label="最大重试">
				<CfgSld v-model="reconnectMaxAttempts" :min="1" :max="10" :step="1" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="同步设置">
			<CfgRow label="Tick率">
				<CfgSld v-model="tickRate" :min="20" :max="128" :step="10" />
			</CfgRow>
			<CfgRow label="发送率">
				<CfgSld v-model="sendRate" :min="10" :max="60" :step="5" />
			</CfgRow>
			<CfgRow label="插值延迟(ms)">
				<CfgSld v-model="interpDelay" :min="50" :max="200" :step="10" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="客户端预测">
			<CfgRow label="启用预测">
				<CfgSwt v-model="predictionEnabled" />
			</CfgRow>
			<CfgRow label="调和阈值">
				<CfgSld v-model="reconciliationThreshold" :min="0.01" :max="0.5" :step="0.01" />
			</CfgRow>
			<CfgRow label="最大预测输入">
				<CfgSld v-model="maxPredictedInputs" :min="16" :max="128" :step="16" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="数据压缩">
			<CfgRow label="启用压缩">
				<CfgSwt v-model="compressionEnabled" />
			</CfgRow>
			<CfgRow label="快照缓冲">
				<CfgSld v-model="snapshotBufferSize" :min="8" :max="64" :step="8" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="大厅设置">
			<CfgRow label="最大房间数">
				<CfgSld v-model="lobbyMaxRooms" :min="10" :max="500" :step="10" />
			</CfgRow>
			<CfgRow label="房间人数上限">
				<CfgSld v-model="lobbyMaxPlayers" :min="2" :max="64" :step="2" />
			</CfgRow>
			<CfgRow label="超时(秒)">
				<CfgSld v-model="lobbyTimeout" :min="60" :max="600" :step="60" />
			</CfgRow>
		</CfgCrd>
	</div>
</template>

<style scoped>
.tab-network {
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	overflow-y: auto;
	height: 100%;
}

.cfg-ipt {
	background: #333;
	border: 1px solid #444;
	color: #fff;
	padding: 4px 8px;
	border-radius: 4px;
	width: 100%;
}
</style>
