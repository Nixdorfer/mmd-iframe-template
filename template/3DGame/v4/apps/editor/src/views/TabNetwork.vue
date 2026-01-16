<script setup lang="ts">
import { useConfigStore } from '@/stores/useConfig'
import CfgCrd from '../components/ui/CfgCrd.vue'
import CfgRow from '../components/ui/CfgRow.vue'
import CfgSld from '../components/ui/CfgSld.vue'
import CfgSwt from '../components/ui/CfgSwt.vue'

const store = useConfigStore()
</script>

<template>
	<div class="tab-network">
		<CfgCrd title="连接设置">
			<CfgRow label="服务器地址">
				<input v-model="store.network.transport.url" type="text" class="cfg-ipt" />
			</CfgRow>
			<CfgRow label="自动重连">
				<CfgSwt v-model="store.network.transport.reconnect" />
			</CfgRow>
			<CfgRow label="重连延迟(ms)">
				<CfgSld v-model="store.network.transport.reconnectDelay" :min="500" :max="5000" :step="500" />
			</CfgRow>
			<CfgRow label="最大重试">
				<CfgSld v-model="store.network.transport.reconnectMaxAttempts" :min="1" :max="10" :step="1" />
			</CfgRow>
			<CfgRow label="心跳间隔(ms)">
				<CfgSld v-model="store.network.transport.heartbeatInterval" :min="5000" :max="60000" :step="5000" />
			</CfgRow>
			<CfgRow label="超时(ms)">
				<CfgSld v-model="store.network.transport.timeout" :min="5000" :max="30000" :step="1000" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="同步设置">
			<CfgRow label="Tick率">
				<CfgSld v-model="store.network.sync.tickRate" :min="20" :max="128" :step="10" />
			</CfgRow>
			<CfgRow label="发送率">
				<CfgSld v-model="store.network.sync.sendRate" :min="10" :max="60" :step="5" />
			</CfgRow>
			<CfgRow label="插值延迟(ms)">
				<CfgSld v-model="store.network.sync.interpDelay" :min="50" :max="200" :step="10" />
			</CfgRow>
			<CfgRow label="快照缓冲">
				<CfgSld v-model="store.network.sync.snapshotBufferSize" :min="8" :max="64" :step="8" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="客户端预测">
			<CfgRow label="启用预测">
				<CfgSwt v-model="store.network.prediction.enabled" />
			</CfgRow>
			<CfgRow label="调和阈值">
				<CfgSld v-model="store.network.sync.reconciliationThreshold" :min="0.01" :max="0.5" :step="0.01" />
			</CfgRow>
			<CfgRow label="最大预测输入">
				<CfgSld v-model="store.network.sync.maxPredictedInputs" :min="16" :max="128" :step="16" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="数据压缩">
			<CfgRow label="启用压缩">
				<CfgSwt v-model="store.network.compression.enabled" />
			</CfgRow>
		</CfgCrd>

		<CfgCrd title="大厅设置">
			<CfgRow label="最大房间数">
				<CfgSld v-model="store.network.lobby.maxRooms" :min="10" :max="500" :step="10" />
			</CfgRow>
			<CfgRow label="房间人数上限">
				<CfgSld v-model="store.network.lobby.maxPlayersPerRoom" :min="2" :max="64" :step="2" />
			</CfgRow>
			<CfgRow label="房间超时(ms)">
				<CfgSld v-model="store.network.lobby.roomTimeout" :min="60000" :max="600000" :step="60000" />
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
