package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
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
