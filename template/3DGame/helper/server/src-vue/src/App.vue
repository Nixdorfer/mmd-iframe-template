<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const status = ref({
  models: [],
  stats: { cpuUsage: 0, memoryUsage: 0, gpuUsage: 0, gpuMemory: 0 },
  apiPort: 9527,
  running: false,
  helperDir: ''
})
const loading = ref({})
const logs = ref([])
const notifications = ref([])
const selectedModel = ref('')
let timer = null
let logTimer = null
let notiId = 0

function notify(msg, type = 'info') {
  const id = ++notiId
  notifications.value.push({ id, msg, type })
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }, 3000)
}

async function fetchLogs() {
  try {
    const res = await window.go.main.App.GetLogs(selectedModel.value)
    logs.value = res.map(l => `[${l.time}][${l.model}] ${l.message}`)
  } catch (e) {}
}

async function fetchStatus() {
  try {
    const res = await window.go.main.App.GetStatus()
    status.value = res
  } catch (e) {}
}

async function stopModel(name) {
  loading.value[name] = true
  const label = getModelLabel(name)
  try {
    await window.go.main.App.StopModel(name)
    notify(`${label} 已停止`, 'warn')
    await fetchStatus()
  } catch (e) {
    notify(`操作失败: ${e}`, 'error')
  }
  loading.value[name] = false
}

async function runDeploy() {
  try {
    await window.go.main.App.RunDeploy()
    notify('安装脚本已启动', 'info')
  } catch (e) {
    notify(`启动失败: ${e}`, 'error')
  }
}

async function refresh() {
  await fetchStatus()
  await fetchLogs()
  notify('已刷新', 'info')
}

function selectModel(name) {
  if (selectedModel.value === name) {
    selectedModel.value = ''
  } else {
    selectedModel.value = name
  }
  fetchLogs()
}

function getModelLabel(name) {
  const labels = {
    'comfyui': 'ComfyUI (FLUX)',
    'hunyuan3d': 'Hunyuan3D-2.0',
    'unirig': 'UniRig',
    'hy-motion': 'HY-Motion',
    'stable-audio': 'Stable Audio',
    'chatterbox': 'Chatterbox TTS'
  }
  return labels[name] || name
}

onMounted(() => {
  fetchStatus()
  fetchLogs()
  timer = setInterval(fetchStatus, 5000)
  logTimer = setInterval(fetchLogs, 2000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (logTimer) clearInterval(logTimer)
})
</script>

<template>
  <div class="app">
    <div class="noti-ctn">
      <transition-group name="noti">
        <div v-for="n in notifications" :key="n.id" class="noti" :class="n.type">
          {{ n.msg }}
        </div>
      </transition-group>
    </div>

    <div class="main">
      <div class="le-pn">
        <div class="hdr">
          <div class="hdr-ico"></div>
          <div class="hdr-tx">集成式集群化AI工作流服务器</div>
          <div class="hdr-stb">
            <div class="stb-dot" :class="{ off: !status.running }"></div>
            <span>:{{ status.apiPort }}</span>
          </div>
        </div>

        <div class="cnt">
          <div class="pn">
            <div class="pn-hd">系统资源</div>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-label">CPU</div>
                <div class="stat-val">{{ status.stats.cpuUsage.toFixed(1) }}%</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">内存</div>
                <div class="stat-val">{{ status.stats.memoryUsage.toFixed(1) }}%</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">GPU</div>
                <div class="stat-val">{{ status.stats.gpuUsage.toFixed(1) }}%</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">显存</div>
                <div class="stat-val">{{ status.stats.gpuMemory.toFixed(1) }}%</div>
              </div>
            </div>
          </div>

          <div class="pn">
            <div class="pn-hd">模型列表</div>
            <div class="mdl-lst">
              <div v-for="m in status.models" :key="m.name" class="mdl-item" :class="{ sel: selectedModel === m.name }">
                <div class="mdl-stb" :class="m.status"></div>
                <div class="mdl-inf" @click="selectModel(m.name)">
                  <div class="mdl-name">{{ getModelLabel(m.name) }}</div>
                  <div class="mdl-port" v-if="m.status === 'running' || m.status === 'working'">
                    PID: {{ m.pid }} | :{{ m.port }}
                  </div>
                  <div class="mdl-port" v-else-if="m.status === 'ready'">:{{ m.port }}</div>
                  <div class="mdl-port" v-else-if="m.status === 'installing'">安装中...</div>
                  <div class="mdl-port" v-else-if="m.status === 'failed'">安装失败</div>
                  <div class="mdl-port" v-else>未安装</div>
                </div>
                <button
                  v-if="m.status === 'running' || m.status === 'working'"
                  class="mdl-btn stp"
                  :disabled="loading[m.name]"
                  @click="stopModel(m.name)"
                >
                  {{ loading[m.name] ? '...' : '停止' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="ftr">
          <button class="ftr-btn" @click="runDeploy">安装/更新</button>
          <button class="ftr-btn" @click="refresh">刷新</button>
        </div>
      </div>

      <div class="ri-pn">
        <div class="pn-hd">控制台 {{ selectedModel ? `- ${getModelLabel(selectedModel)}` : '' }}</div>
        <div class="log-ctn" ref="logCtn">
          <div v-for="(log, i) in logs" :key="i" class="log-line">{{ log }}</div>
        </div>
        <div class="log-path">{{ status.helperDir }}</div>
      </div>
    </div>
  </div>
</template>
