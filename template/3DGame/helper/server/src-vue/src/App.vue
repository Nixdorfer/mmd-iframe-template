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
const ready = ref(false)
const ctxMenu = ref({ show: false, x: 0, y: 0 })
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
  if (!window.go?.main?.App) return
  try {
    const res = await window.go.main.App.GetLogs(selectedModel.value)
    if (res) logs.value = res.map(l => ({
      time: l.time,
      model: l.model,
      msg: l.message,
      level: getLogLevel(l.message)
    }))
  } catch (e) {}
}

function getLogLevel(msg) {
  const lower = msg.toLowerCase()
  if (lower.includes('error') || lower.includes('fail') || lower.includes('exception') || lower.includes('失败')) return 'error'
  if (lower.includes('warn') || lower.includes('warning') || lower.includes('警告')) return 'warn'
  if (lower.includes('debug') || lower.includes('[dbg]')) return 'debug'
  return 'info'
}

function showCtxMenu(e) {
  e.preventDefault()
  ctxMenu.value = { show: true, x: e.clientX, y: e.clientY }
}

function hideCtxMenu() {
  ctxMenu.value.show = false
}

function copyAllLogs() {
  const text = logs.value.map(l => `[${l.time}][${l.model}] ${l.msg}`).join('\n')
  navigator.clipboard.writeText(text)
  notify('已复制全部日志', 'info')
  hideCtxMenu()
}

function copyErrorLogs() {
  const errLogs = logs.value.filter(l => l.level === 'error')
  const text = errLogs.map(l => `[${l.time}][${l.model}] ${l.msg}`).join('\n')
  navigator.clipboard.writeText(text)
  notify(`已复制 ${errLogs.length} 条错误日志`, 'info')
  hideCtxMenu()
}

async function fetchStatus() {
  if (!window.go?.main?.App) return
  try {
    const res = await window.go.main.App.GetStatus()
    if (res) {
      status.value = res
      ready.value = true
    }
  } catch (e) {}
}

async function stopModel(name) {
  if (!window.go?.main?.App) return
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
  if (!window.go?.main?.App) return
  try {
    await window.go.main.App.RunDeploy()
    notify('开始部署', 'info')
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

onMounted(async () => {
  for (let i = 0; i < 10; i++) {
    if (window.go?.main?.App) break
    await new Promise(r => setTimeout(r, 200))
  }
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
        <div class="log-ctn" ref="logCtn" @contextmenu="showCtxMenu" @click="hideCtxMenu">
          <div v-for="(log, i) in logs" :key="i" class="log-line" :class="log.level">
            [{{ log.time }}][{{ log.model }}] {{ log.msg }}
          </div>
        </div>
        <div class="log-path">{{ status.helperDir }}</div>
      </div>
    </div>
    <div v-if="ctxMenu.show" class="ctx-menu" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }" @click.stop>
      <div class="ctx-item" @click="copyAllLogs">复制全部</div>
      <div class="ctx-item" @click="copyErrorLogs">复制全部错误</div>
    </div>
    <div v-if="ctxMenu.show" class="ctx-msk" @click="hideCtxMenu"></div>
  </div>
</template>
