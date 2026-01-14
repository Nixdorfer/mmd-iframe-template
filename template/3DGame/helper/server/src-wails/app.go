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
	ctx       context.Context
	helperDir string
	processes map[string]*exec.Cmd
	logs      []LogEntry
	mu        sync.Mutex
	logFile   *os.File
}

func NewApp() *App {
	exe, _ := os.Executable()
	helperDir := filepath.Dir(exe)
	for i := 0; i < 6; i++ {
		checkPath := helperDir
		for j := 0; j < i; j++ {
			checkPath = filepath.Join(checkPath, "..")
		}
		if _, err := os.Stat(filepath.Join(checkPath, "deploy.ps1")); err == nil {
			helperDir = checkPath
			break
		}
	}
	helperDir, _ = filepath.Abs(helperDir)
	logPath := filepath.Join(helperDir, "console.log")
	logFile, _ := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	return &App{
		helperDir: helperDir,
		processes: make(map[string]*exec.Cmd),
		logs:      make([]LogEntry, 0),
		logFile:   logFile,
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
	var pid int
	if running && cmd.Process != nil {
		pid = cmd.Process.Pid
	}
	a.mu.Unlock()
	if running {
		return "running", pid
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
	deployScript := filepath.Join(a.helperDir, "deploy.ps1")
	cmd := exec.Command("powershell", "-ExecutionPolicy", "Bypass", "-File", deployScript)
	cmd.Dir = a.helperDir
	a.addLog("system", "安装脚本已启动")
	return cmd.Start()
}

func (a *App) GetOutputDir() string {
	return filepath.Join(a.helperDir, "output")
}
