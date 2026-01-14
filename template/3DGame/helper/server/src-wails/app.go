package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
)

type ModelStatus struct {
	Name   string `json:"name"`
	Status string `json:"status"`
	Port   int    `json:"port"`
	Pid    int    `json:"pid"`
}

type SystemStats struct {
	CpuUsage    float64 `json:"cpuUsage"`
	MemoryUsage float64 `json:"memoryUsage"`
	GpuUsage    float64 `json:"gpuUsage"`
	GpuMemory   float64 `json:"gpuMemory"`
}

type ServerStatus struct {
	Models    []ModelStatus `json:"models"`
	Stats     SystemStats   `json:"stats"`
	ApiPort   int           `json:"apiPort"`
	Running   bool          `json:"running"`
	HelperDir string        `json:"helperDir"`
}

type LogEntry struct {
	Model   string `json:"model"`
	Time    string `json:"time"`
	Message string `json:"message"`
}

type App struct {
	ctx        context.Context
	helperDir  string
	processes  map[string]*exec.Cmd
	installing map[string]bool
	logs       []LogEntry
	mu         sync.Mutex
	logFile    *os.File
}

func NewApp() *App {
	exe, _ := os.Executable()
	helperDir, _ := filepath.Abs(filepath.Dir(exe))
	cwd, _ := os.Getwd()
	for i := 0; i < 5; i++ {
		checkPath := cwd
		for j := 0; j < i; j++ {
			checkPath = filepath.Join(checkPath, "..")
		}
		if _, err := os.Stat(filepath.Join(checkPath, "server")); err == nil {
			helperDir, _ = filepath.Abs(checkPath)
			break
		}
	}
	logPath := filepath.Join(helperDir, "console.log")
	logFile, _ := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	return &App{
		helperDir:  helperDir,
		processes:  make(map[string]*exec.Cmd),
		installing: make(map[string]bool),
		logs:       make([]LogEntry, 0),
		logFile:    logFile,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.addLog("system", "服务器已启动")
	go a.startHttpServer()
}

func (a *App) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) startHttpServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(a.GetStatus())
	})
	mux.HandleFunc("/api/logs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		model := r.URL.Query().Get("model")
		json.NewEncoder(w).Encode(a.GetLogs(model))
	})
	mux.HandleFunc("/api/deploy", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		a.RunDeploy()
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})
	mux.HandleFunc("/api/stop", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		name := r.URL.Query().Get("name")
		err := a.StopModel(name)
		if err != nil {
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		} else {
			json.NewEncoder(w).Encode(map[string]bool{"ok": true})
		}
	})
	mux.HandleFunc("/api/checkpoints", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		checkpoints := a.listCheckpoints()
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "models": checkpoints})
	})
	mux.HandleFunc("/api/flux/generate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var req struct {
			Prompt string `json:"prompt"`
			Output string `json:"output"`
			Model  string `json:"model"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "无效请求"})
			return
		}
		a.addLog("comfyui", fmt.Sprintf("生成图片: %s (模型: %s)", req.Prompt, req.Model))
		result, err := a.generateFlux(req.Prompt, req.Output, req.Model)
		if err != nil {
			a.addLog("comfyui", fmt.Sprintf("生成失败: %v", err))
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		a.addLog("comfyui", fmt.Sprintf("生成完成: %s", result))
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "output": result})
	})
	mux.HandleFunc("/api/hunyuan3d/generate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var req struct {
			Image  string `json:"image"`
			Output string `json:"output"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "无效请求"})
			return
		}
		a.addLog("hunyuan3d", fmt.Sprintf("生成3D模型: %s", req.Image))
		result, err := a.generateHunyuan3D(req.Image, req.Output)
		if err != nil {
			a.addLog("hunyuan3d", fmt.Sprintf("生成失败: %v", err))
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		a.addLog("hunyuan3d", fmt.Sprintf("生成完成: %s", result))
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "output": result})
	})
	mux.HandleFunc("/api/unirig/rig", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var req struct {
			Input  string `json:"input"`
			Output string `json:"output"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "无效请求"})
			return
		}
		a.addLog("unirig", fmt.Sprintf("骨骼绑定: %s", req.Input))
		result, err := a.rigUniRig(req.Input, req.Output)
		if err != nil {
			a.addLog("unirig", fmt.Sprintf("绑定失败: %v", err))
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		a.addLog("unirig", fmt.Sprintf("绑定完成: %s", result))
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "output": result})
	})
	mux.HandleFunc("/api/motion/generate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var req struct {
			Model   string   `json:"model"`
			Motions []string `json:"motions"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "无效请求"})
			return
		}
		a.addLog("hy-motion", fmt.Sprintf("生成动作: %s", req.Model))
		result, err := a.generateMotion(req.Model, req.Motions)
		if err != nil {
			a.addLog("hy-motion", fmt.Sprintf("生成失败: %v", err))
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		a.addLog("hy-motion", fmt.Sprintf("生成完成: %s", result))
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "output": result})
	})
	mux.HandleFunc("/api/voice/generate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var req struct {
			Text   string `json:"text"`
			Output string `json:"output"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "无效请求"})
			return
		}
		a.addLog("chatterbox", fmt.Sprintf("生成语音: %s", req.Text))
		result, err := a.generateVoice(req.Text, req.Output)
		if err != nil {
			a.addLog("chatterbox", fmt.Sprintf("生成失败: %v", err))
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		a.addLog("chatterbox", fmt.Sprintf("生成完成: %s", result))
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "output": result})
	})
	mux.HandleFunc("/api/audio/generate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var req struct {
			Prompt string `json:"prompt"`
			Output string `json:"output"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": "无效请求"})
			return
		}
		a.addLog("stable-audio", fmt.Sprintf("生成音频: %s", req.Prompt))
		result, err := a.generateAudio(req.Prompt, req.Output)
		if err != nil {
			a.addLog("stable-audio", fmt.Sprintf("生成失败: %v", err))
			json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		a.addLog("stable-audio", fmt.Sprintf("生成完成: %s", result))
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "output": result})
	})
	a.addLog("system", "HTTP API 服务器启动于 :9527")
	http.ListenAndServe(":9527", a.corsMiddleware(mux))
}

func (a *App) shutdown(ctx context.Context) {
	a.StopAllModels()
	if a.logFile != nil {
		a.logFile.Close()
	}
}

func (a *App) addLog(model, msg string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	t := time.Now().Format("15:04:05")
	entry := LogEntry{Model: model, Time: t, Message: msg}
	a.logs = append(a.logs, entry)
	if len(a.logs) > 500 {
		a.logs = a.logs[1:]
	}
	if a.logFile != nil {
		fmt.Fprintf(a.logFile, "[%s][%s] %s\n", t, model, msg)
	}
}

func (a *App) GetLogs(model string) []LogEntry {
	a.mu.Lock()
	defer a.mu.Unlock()
	if model == "" {
		result := make([]LogEntry, len(a.logs))
		copy(result, a.logs)
		return result
	}
	var filtered []LogEntry
	for _, l := range a.logs {
		if l.Model == model || l.Model == "system" {
			filtered = append(filtered, l)
		}
	}
	return filtered
}

func (a *App) GetStatus() ServerStatus {
	models := []ModelStatus{
		{Name: "comfyui", Port: 8188},
		{Name: "hunyuan3d", Port: 7860},
		{Name: "unirig", Port: 7861},
		{Name: "hy-motion", Port: 7862},
		{Name: "stable-audio", Port: 7863},
		{Name: "chatterbox", Port: 7864},
	}
	for i := range models {
		models[i].Status, models[i].Pid = a.checkModelStatus(models[i].Name)
	}
	return ServerStatus{
		Models:    models,
		Stats:     a.getSystemStats(),
		ApiPort:   9527,
		Running:   true,
		HelperDir: a.helperDir,
	}
}

func (a *App) checkModelStatus(name string) (string, int) {
	a.mu.Lock()
	cmd, running := a.processes[name]
	isInstalling := a.installing[name]
	var pid int
	if running && cmd.Process != nil {
		pid = cmd.Process.Pid
	}
	a.mu.Unlock()
	if running {
		return "running", pid
	}
	if isInstalling {
		return "installing", 0
	}
	modelDir := filepath.Join(a.helperDir, name)
	venvPath := filepath.Join(modelDir, "venv")
	if _, err := os.Stat(venvPath); err == nil {
		return "ready", 0
	}
	if _, err := os.Stat(modelDir); err == nil {
		return "failed", 0
	}
	return "idle", 0
}

func (a *App) getSystemStats() SystemStats {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return SystemStats{
		CpuUsage:    0,
		MemoryUsage: float64(m.Alloc) / float64(m.Sys) * 100,
		GpuUsage:    0,
		GpuMemory:   0,
	}
}

func (a *App) StartModel(name string) error {
	a.mu.Lock()
	if _, ok := a.processes[name]; ok {
		a.mu.Unlock()
		return fmt.Errorf("模型 %s 已在运行", name)
	}
	a.mu.Unlock()
	modelDir := filepath.Join(a.helperDir, name)
	if _, err := os.Stat(modelDir); os.IsNotExist(err) {
		return fmt.Errorf("模型 %s 未安装", name)
	}
	var cmd *exec.Cmd
	pythonExe := filepath.Join(modelDir, "venv", "Scripts", "python.exe")
	switch name {
	case "comfyui":
		cmd = exec.Command(pythonExe, "main.py", "--listen", "0.0.0.0", "--port", "8188")
	case "hunyuan3d":
		cmd = exec.Command(pythonExe, "app.py")
	default:
		cmd = exec.Command(pythonExe, "-m", "gradio", "app.py")
	}
	cmd.Dir = modelDir
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()
	if err := cmd.Start(); err != nil {
		return err
	}
	a.mu.Lock()
	a.processes[name] = cmd
	a.mu.Unlock()
	a.addLog(name, "进程已启动")
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			a.addLog(name, scanner.Text())
		}
	}()
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			a.addLog(name, scanner.Text())
		}
	}()
	go func() {
		cmd.Wait()
		a.addLog(name, "进程已退出")
		a.mu.Lock()
		delete(a.processes, name)
		a.mu.Unlock()
	}()
	return nil
}

func (a *App) StopModel(name string) error {
	a.mu.Lock()
	cmd, ok := a.processes[name]
	a.mu.Unlock()
	if !ok {
		return fmt.Errorf("模型 %s 未运行", name)
	}
	if cmd.Process != nil {
		cmd.Process.Kill()
	}
	a.addLog(name, "已发送停止信号")
	time.Sleep(100 * time.Millisecond)
	a.mu.Lock()
	delete(a.processes, name)
	a.mu.Unlock()
	return nil
}

func (a *App) StopAllModels() {
	a.mu.Lock()
	defer a.mu.Unlock()
	for name, cmd := range a.processes {
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		delete(a.processes, name)
	}
}

func (a *App) RunDeploy() error {
	a.addLog("system", "========================================")
	a.addLog("system", "  开始部署 AI 工作流环境")
	a.addLog("system", "========================================")
	go a.runFullInstall()
	return nil
}

func (a *App) GetOutputDir() string {
	return filepath.Join(a.helperDir, "output")
}

func (a *App) runCmd(name string, dir string, cmdName string, args ...string) error {
	cmd := exec.Command(cmdName, args...)
	cmd.Dir = dir
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()
	if err := cmd.Start(); err != nil {
		a.addLog(name, fmt.Sprintf("命令启动失败: %v", err))
		return err
	}
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			a.addLog(name, scanner.Text())
		}
	}()
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			a.addLog(name, scanner.Text())
		}
	}()
	return cmd.Wait()
}

func (a *App) findPython311() string {
	paths := []string{
		"C:\\Python311\\python.exe",
		"C:\\Program Files\\Python311\\python.exe",
		"C:\\Program Files (x86)\\Python311\\python.exe",
		"C:\\tools\\python311\\python.exe",
		filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs\\Python\\Python311\\python.exe"),
	}
	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

func (a *App) checkCommand(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

func (a *App) runFullInstall() {
	a.addLog("system", "[1/7] 检查依赖...")
	missing := []string{}
	if !a.checkCommand("git") {
		missing = append(missing, "git")
	}
	py311 := a.findPython311()
	if py311 == "" {
		missing = append(missing, "python311")
	}
	if len(missing) > 0 {
		a.addLog("system", fmt.Sprintf("缺少依赖: %v", missing))
		a.addLog("system", "请先安装以下软件:")
		for _, m := range missing {
			a.addLog("system", fmt.Sprintf("  - %s", m))
		}
		a.addLog("system", "可运行 deploy.ps1 自动安装依赖")
		return
	}
	a.addLog("system", fmt.Sprintf("[OK] Python 3.11: %s", py311))
	a.addLog("system", "[OK] Git 已安装")
	models := []struct {
		name    string
		repo    string
		reqs    []string
		extra   []string
		pytorch bool
	}{
		{"comfyui", "https://github.com/comfyanonymous/ComfyUI.git", []string{"requirements.txt"}, nil, true},
		{"hunyuan3d", "https://github.com/Tencent/Hunyuan3D-2.git", []string{"requirements.txt"}, []string{"gradio"}, true},
		{"unirig", "https://github.com/VAST-AI-Research/UniRig.git", []string{"requirements.txt"}, []string{"trimesh", "numpy", "scipy"}, true},
		{"hy-motion", "https://github.com/Tencent-Hunyuan/HY-Motion-1.0.git", []string{"requirements.txt"}, []string{"PyYAML", "Cython", "huggingface-hub>=0.30.0,<1.0", "gradio"}, true},
		{"stable-audio", "https://github.com/Stability-AI/stable-audio-tools.git", nil, []string{"-e .", "gradio"}, true},
		{"chatterbox", "https://github.com/resemble-ai/chatterbox.git", nil, []string{"chatterbox-tts", "gradio"}, true},
	}
	for i, m := range models {
		a.addLog("system", fmt.Sprintf("[%d/7] 安装 %s...", i+2, m.name))
		a.installModel(m.name, m.repo, py311, m.reqs, m.extra, m.pytorch)
	}
	outputDir := filepath.Join(a.helperDir, "output")
	for _, d := range []string{"images", "models", "audio", "voice"} {
		os.MkdirAll(filepath.Join(outputDir, d), 0755)
	}
	a.addLog("system", "========================================")
	a.addLog("system", "  部署完成!")
	a.addLog("system", "========================================")
}

func (a *App) installModel(name, repo, py311 string, reqs, extra []string, pytorch bool) {
	a.mu.Lock()
	a.installing[name] = true
	a.mu.Unlock()
	defer func() {
		a.mu.Lock()
		delete(a.installing, name)
		a.mu.Unlock()
	}()
	modelDir := filepath.Join(a.helperDir, name)
	if _, err := os.Stat(modelDir); os.IsNotExist(err) {
		a.addLog(name, "克隆仓库...")
		if err := a.runCmd(name, a.helperDir, "git", "clone", repo, name); err != nil {
			a.addLog(name, fmt.Sprintf("克隆失败: %v", err))
			return
		}
	}
	venvPath := filepath.Join(modelDir, "venv")
	if _, err := os.Stat(venvPath); os.IsNotExist(err) {
		a.addLog(name, "创建虚拟环境...")
		if err := a.runCmd(name, modelDir, py311, "-m", "venv", "venv"); err != nil {
			a.addLog(name, fmt.Sprintf("创建venv失败: %v", err))
			return
		}
	}
	pipExe := filepath.Join(venvPath, "Scripts", "pip.exe")
	pythonExe := filepath.Join(venvPath, "Scripts", "python.exe")
	a.addLog(name, "升级pip...")
	a.runCmd(name, modelDir, pythonExe, "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel", "-q")
	if pytorch {
		a.addLog(name, "安装PyTorch...")
		a.runCmd(name, modelDir, pipExe, "install", "torch", "torchvision", "torchaudio", "--index-url", "https://download.pytorch.org/whl/cu124", "-q")
	}
	for _, req := range reqs {
		reqPath := filepath.Join(modelDir, req)
		if _, err := os.Stat(reqPath); err == nil {
			a.addLog(name, fmt.Sprintf("安装 %s...", req))
			a.runCmd(name, modelDir, pipExe, "install", "-r", req, "-q")
		}
	}
	for _, pkg := range extra {
		a.addLog(name, fmt.Sprintf("安装 %s...", pkg))
		a.runCmd(name, modelDir, pipExe, "install", pkg, "-q")
	}
	a.addLog(name, "安装完成")
}

func (a *App) ensureModelRunning(name string, port int) error {
	resp, err := http.Get(fmt.Sprintf("http://localhost:%d", port))
	if err == nil {
		resp.Body.Close()
		a.addLog(name, fmt.Sprintf("端口 %d 已在响应，跳过启动", port))
		return nil
	}
	status, _ := a.checkModelStatus(name)
	if status == "running" || status == "working" {
		for i := 0; i < 60; i++ {
			time.Sleep(2 * time.Second)
			resp, err := http.Get(fmt.Sprintf("http://localhost:%d", port))
			if err == nil {
				resp.Body.Close()
				return nil
			}
		}
		return fmt.Errorf("模型 %s 启动超时", name)
	}
	if status != "ready" {
		return fmt.Errorf("模型 %s 未安装", name)
	}
	if err := a.StartModel(name); err != nil {
		return err
	}
	for i := 0; i < 60; i++ {
		time.Sleep(2 * time.Second)
		resp, err := http.Get(fmt.Sprintf("http://localhost:%d", port))
		if err == nil {
			resp.Body.Close()
			return nil
		}
	}
	return fmt.Errorf("模型 %s 启动超时", name)
}

func (a *App) getComfyModels() (map[string][]string, error) {
	resp, err := http.Get("http://localhost:8188/object_info")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var info map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&info)
	models := make(map[string][]string)
	if ckpt, ok := info["CheckpointLoaderSimple"].(map[string]interface{}); ok {
		if input, ok := ckpt["input"].(map[string]interface{}); ok {
			if req, ok := input["required"].(map[string]interface{}); ok {
				if ckptName, ok := req["ckpt_name"].([]interface{}); ok && len(ckptName) > 0 {
					if names, ok := ckptName[0].([]interface{}); ok {
						for _, n := range names {
							if s, ok := n.(string); ok {
								models["checkpoint"] = append(models["checkpoint"], s)
							}
						}
					}
				}
			}
		}
	}
	if vae, ok := info["VAELoader"].(map[string]interface{}); ok {
		if input, ok := vae["input"].(map[string]interface{}); ok {
			if req, ok := input["required"].(map[string]interface{}); ok {
				if vaeName, ok := req["vae_name"].([]interface{}); ok && len(vaeName) > 0 {
					if names, ok := vaeName[0].([]interface{}); ok {
						for _, n := range names {
							if s, ok := n.(string); ok {
								models["vae"] = append(models["vae"], s)
							}
						}
					}
				}
			}
		}
	}
	return models, nil
}

func (a *App) generateFlux(prompt, output, model string) (string, error) {
	if err := a.ensureModelRunning("comfyui", 8188); err != nil {
		return "", err
	}
	ckptName := model
	if ckptName == "" {
		models, err := a.getComfyModels()
		if err != nil {
			return "", fmt.Errorf("获取模型列表失败: %v", err)
		}
		if len(models["checkpoint"]) == 0 {
			return "", fmt.Errorf("未找到可用的checkpoint模型，请先下载FLUX或SD模型到ComfyUI/models/checkpoints目录")
		}
		ckptName = models["checkpoint"][0]
		for _, n := range models["checkpoint"] {
			lower := strings.ToLower(n)
			if strings.Contains(lower, "flux") {
				ckptName = n
				break
			}
		}
	}
	a.addLog("comfyui", fmt.Sprintf("使用模型: %s", ckptName))
	workflow := map[string]interface{}{
		"3": map[string]interface{}{
			"inputs": map[string]interface{}{
				"seed":         time.Now().UnixNano() % 1000000000,
				"steps":        20,
				"cfg":          7,
				"sampler_name": "euler",
				"scheduler":    "normal",
				"denoise":      1,
				"model":        []interface{}{"4", 0},
				"positive":     []interface{}{"6", 0},
				"negative":     []interface{}{"7", 0},
				"latent_image": []interface{}{"5", 0},
			},
			"class_type": "KSampler",
		},
		"4": map[string]interface{}{
			"inputs": map[string]interface{}{
				"ckpt_name": ckptName,
			},
			"class_type": "CheckpointLoaderSimple",
		},
		"5": map[string]interface{}{
			"inputs": map[string]interface{}{
				"width":      1024,
				"height":     1024,
				"batch_size": 1,
			},
			"class_type": "EmptyLatentImage",
		},
		"6": map[string]interface{}{
			"inputs": map[string]interface{}{
				"text": prompt,
				"clip": []interface{}{"4", 1},
			},
			"class_type": "CLIPTextEncode",
		},
		"7": map[string]interface{}{
			"inputs": map[string]interface{}{
				"text": "",
				"clip": []interface{}{"4", 1},
			},
			"class_type": "CLIPTextEncode",
		},
		"8": map[string]interface{}{
			"inputs": map[string]interface{}{
				"samples": []interface{}{"3", 0},
				"vae":     []interface{}{"4", 2},
			},
			"class_type": "VAEDecode",
		},
		"9": map[string]interface{}{
			"inputs": map[string]interface{}{
				"filename_prefix": "flux_output",
				"images":          []interface{}{"8", 0},
			},
			"class_type": "SaveImage",
		},
	}
	promptData := map[string]interface{}{
		"prompt":    workflow,
		"client_id": fmt.Sprintf("server_%d", time.Now().UnixNano()),
	}
	body, _ := json.Marshal(promptData)
	resp, err := http.Post("http://localhost:8188/prompt", "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	if errMsg, ok := result["error"].(map[string]interface{}); ok {
		if msg, ok := errMsg["message"].(string); ok {
			return "", fmt.Errorf("ComfyUI错误: %s", msg)
		}
	}
	promptId, ok := result["prompt_id"].(string)
	if !ok {
		return "", fmt.Errorf("无效响应: %v", result)
	}
	a.addLog("comfyui", fmt.Sprintf("任务已提交: %s", promptId))
	var outputFile string
	for i := 0; i < 180; i++ {
		time.Sleep(time.Second)
		histResp, err := http.Get(fmt.Sprintf("http://localhost:8188/history/%s", promptId))
		if err != nil {
			continue
		}
		var hist map[string]interface{}
		json.NewDecoder(histResp.Body).Decode(&hist)
		histResp.Body.Close()
		if data, ok := hist[promptId].(map[string]interface{}); ok {
			if outputs, ok := data["outputs"].(map[string]interface{}); ok {
				if node9, ok := outputs["9"].(map[string]interface{}); ok {
					if images, ok := node9["images"].([]interface{}); ok && len(images) > 0 {
						if img, ok := images[0].(map[string]interface{}); ok {
							outputFile = img["filename"].(string)
							break
						}
					}
				}
			}
		}
	}
	if outputFile == "" {
		return "", fmt.Errorf("生成超时")
	}
	comfyOutput := filepath.Join(a.helperDir, "comfyui", "output", outputFile)
	if output != "" {
		outputPath := a.resolveOutputPath(output)
		os.MkdirAll(filepath.Dir(outputPath), 0755)
		if data, err := os.ReadFile(comfyOutput); err == nil {
			os.WriteFile(outputPath, data, 0644)
			return outputPath, nil
		}
	}
	return comfyOutput, nil
}

func (a *App) generateHunyuan3D(imagePath, output string) (string, error) {
	if err := a.ensureModelRunning("hunyuan3d", 7860); err != nil {
		return "", err
	}
	imgPath := a.resolveOutputPath(imagePath)
	imgData, err := os.ReadFile(imgPath)
	if err != nil {
		return "", fmt.Errorf("读取图片失败: %v", err)
	}
	imgBase64 := base64.StdEncoding.EncodeToString(imgData)
	reqBody := map[string]interface{}{
		"data": []interface{}{
			fmt.Sprintf("data:image/png;base64,%s", imgBase64),
			"",
			42,
			50,
		},
		"fn_index": 0,
	}
	body, _ := json.Marshal(reqBody)
	resp, err := http.Post("http://localhost:7860/api/predict", "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	data, ok := result["data"].([]interface{})
	if !ok || len(data) == 0 {
		return "", fmt.Errorf("生成失败")
	}
	glbInfo, ok := data[0].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("无效响应")
	}
	glbPath, ok := glbInfo["name"].(string)
	if !ok {
		return "", fmt.Errorf("无GLB文件")
	}
	if output != "" {
		outputPath := a.resolveOutputPath(output)
		os.MkdirAll(filepath.Dir(outputPath), 0755)
		if data, err := os.ReadFile(glbPath); err == nil {
			os.WriteFile(outputPath, data, 0644)
			return outputPath, nil
		}
	}
	return glbPath, nil
}

func (a *App) rigUniRig(inputPath, output string) (string, error) {
	if err := a.ensureModelRunning("unirig", 7861); err != nil {
		return "", err
	}
	glbPath := a.resolveOutputPath(inputPath)
	glbData, err := os.ReadFile(glbPath)
	if err != nil {
		return "", fmt.Errorf("读取模型失败: %v", err)
	}
	glbBase64 := base64.StdEncoding.EncodeToString(glbData)
	reqBody := map[string]interface{}{
		"data": []interface{}{
			fmt.Sprintf("data:model/gltf-binary;base64,%s", glbBase64),
		},
		"fn_index": 0,
	}
	body, _ := json.Marshal(reqBody)
	resp, err := http.Post("http://localhost:7861/api/predict", "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	data, ok := result["data"].([]interface{})
	if !ok || len(data) == 0 {
		return "", fmt.Errorf("绑定失败")
	}
	riggedInfo, ok := data[0].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("无效响应")
	}
	riggedPath, ok := riggedInfo["name"].(string)
	if !ok {
		return "", fmt.Errorf("无输出文件")
	}
	if output != "" {
		outputPath := a.resolveOutputPath(output)
		os.MkdirAll(filepath.Dir(outputPath), 0755)
		if data, err := os.ReadFile(riggedPath); err == nil {
			os.WriteFile(outputPath, data, 0644)
			return outputPath, nil
		}
	}
	return riggedPath, nil
}

func (a *App) generateMotion(modelPath string, motions []string) (string, error) {
	if err := a.ensureModelRunning("hy-motion", 7862); err != nil {
		return "", err
	}
	glbPath := a.resolveOutputPath(modelPath)
	glbData, err := os.ReadFile(glbPath)
	if err != nil {
		return "", fmt.Errorf("读取模型失败: %v", err)
	}
	glbBase64 := base64.StdEncoding.EncodeToString(glbData)
	motionText := strings.Join(motions, ", ")
	if motionText == "" {
		motionText = "idle"
	}
	reqBody := map[string]interface{}{
		"data": []interface{}{
			fmt.Sprintf("data:model/gltf-binary;base64,%s", glbBase64),
			motionText,
			30,
		},
		"fn_index": 0,
	}
	body, _ := json.Marshal(reqBody)
	resp, err := http.Post("http://localhost:7862/api/predict", "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	data, ok := result["data"].([]interface{})
	if !ok || len(data) == 0 {
		return "", fmt.Errorf("生成失败")
	}
	animInfo, ok := data[0].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("无效响应")
	}
	animPath, ok := animInfo["name"].(string)
	if !ok {
		return "", fmt.Errorf("无输出文件")
	}
	outputPath := a.resolveOutputPath(modelPath)
	os.MkdirAll(filepath.Dir(outputPath), 0755)
	if data, err := os.ReadFile(animPath); err == nil {
		os.WriteFile(outputPath, data, 0644)
		return outputPath, nil
	}
	return animPath, nil
}

func (a *App) generateVoice(text, output string) (string, error) {
	if err := a.ensureModelRunning("chatterbox", 7864); err != nil {
		return "", err
	}
	reqBody := map[string]interface{}{
		"data": []interface{}{
			text,
			0.5,
			0.5,
		},
		"fn_index": 0,
	}
	body, _ := json.Marshal(reqBody)
	resp, err := http.Post("http://localhost:7864/api/predict", "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	data, ok := result["data"].([]interface{})
	if !ok || len(data) == 0 {
		return "", fmt.Errorf("生成失败")
	}
	audioInfo, ok := data[0].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("无效响应")
	}
	audioPath, ok := audioInfo["name"].(string)
	if !ok {
		return "", fmt.Errorf("无输出文件")
	}
	if output != "" {
		outputPath := a.resolveOutputPath(output)
		os.MkdirAll(filepath.Dir(outputPath), 0755)
		if data, err := os.ReadFile(audioPath); err == nil {
			os.WriteFile(outputPath, data, 0644)
			return outputPath, nil
		}
	}
	return audioPath, nil
}

func (a *App) generateAudio(prompt, output string) (string, error) {
	if err := a.ensureModelRunning("stable-audio", 7863); err != nil {
		return "", err
	}
	reqBody := map[string]interface{}{
		"data": []interface{}{
			prompt,
			"",
			30.0,
			100,
			3.0,
			42,
		},
		"fn_index": 0,
	}
	body, _ := json.Marshal(reqBody)
	resp, err := http.Post("http://localhost:7863/api/predict", "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	data, ok := result["data"].([]interface{})
	if !ok || len(data) == 0 {
		return "", fmt.Errorf("生成失败")
	}
	audioInfo, ok := data[0].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("无效响应")
	}
	audioPath, ok := audioInfo["name"].(string)
	if !ok {
		return "", fmt.Errorf("无输出文件")
	}
	if output != "" {
		outputPath := a.resolveOutputPath(output)
		os.MkdirAll(filepath.Dir(outputPath), 0755)
		if data, err := os.ReadFile(audioPath); err == nil {
			os.WriteFile(outputPath, data, 0644)
			return outputPath, nil
		}
	}
	return audioPath, nil
}

func (a *App) resolveOutputPath(path string) string {
	if filepath.IsAbs(path) {
		return path
	}
	return filepath.Join(a.helperDir, "output", path)
}

func (a *App) listCheckpoints() []string {
	var checkpoints []string
	checkpointDir := filepath.Join(a.helperDir, "comfyui", "models", "checkpoints")
	entries, err := os.ReadDir(checkpointDir)
	if err != nil {
		return checkpoints
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		ext := strings.ToLower(filepath.Ext(name))
		if ext == ".safetensors" || ext == ".ckpt" || ext == ".pt" {
			checkpoints = append(checkpoints, name)
		}
	}
	return checkpoints
}
