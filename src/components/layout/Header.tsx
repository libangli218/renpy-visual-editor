import React, { useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { ModeSwitcher } from './ModeSwitcher'
import { ComplexitySwitcher } from './ComplexitySwitcher'
import { projectManager, electronFileSystem } from '../../project/ProjectManager'
import { useSettingsStore } from '../../settings/settingsStore'
import {
  launchGame,
  stopGame,
  isGameRunning,
  getSdkPath,
  selectSdkPath,
  registerGameListeners,
  removeGameListeners,
  GameStatus,
} from '../../project/GameLauncher'

/**
 * Header component - Top bar with title and mode/complexity switchers
 * Implements Requirements 2.1, 3.1, 1.4 (unsaved marker display)
 */
export const Header: React.FC = () => {
  const { modified, projectPath } = useEditorStore()
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  
  // Settings store for saving settings before launch
  const { saveSettings, gui, project } = useSettingsStore()
  
  // Create file system adapter for settings
  const settingsFileSystem = {
    readFile: (path: string) => electronFileSystem.readFile(path),
    writeFile: (path: string, content: string) => electronFileSystem.writeFile(path, content),
    exists: (path: string) => electronFileSystem.exists(path),
  }
  
  // Extract project name from path
  const projectName = projectPath 
    ? projectPath.split(/[/\\]/).pop() 
    : 'Untitled Project'

  // Check if SDK is configured
  const hasSdk = !!getSdkPath()

  // Handle launch game
  const handleLaunchGame = useCallback(async () => {
    if (!projectPath) {
      setStatusMessage('请先打开项目')
      setTimeout(() => setStatusMessage(''), 2000)
      return
    }

    // Check if SDK is configured
    let sdkPath = getSdkPath()
    if (!sdkPath) {
      // Prompt user to select SDK
      sdkPath = await selectSdkPath()
      if (!sdkPath) {
        setStatusMessage('请选择有效的 Ren\'Py SDK 目录')
        setTimeout(() => setStatusMessage(''), 3000)
        return
      }
    }

    // Save before launching (scripts and settings)
    const modifiedCount = projectManager.getModifiedScripts().length
    const hasModifiedSettings = gui.modified || project.modified
    
    if (modifiedCount > 0 || hasModifiedSettings) {
      setStatusMessage('正在保存...')
      
      // Save scripts
      if (modifiedCount > 0) {
        const saveResult = await projectManager.saveProject()
        if (!saveResult.success) {
          setStatusMessage(`保存失败: ${saveResult.error}`)
          setTimeout(() => setStatusMessage(''), 3000)
          return
        }
      }
      
      // Save settings (Requirement 8.2)
      if (hasModifiedSettings) {
        const settingsResult = await saveSettings(projectPath, settingsFileSystem)
        if (!settingsResult) {
          setStatusMessage('保存设置失败')
          setTimeout(() => setStatusMessage(''), 3000)
          return
        }
      }
    }

    // Launch game
    setGameStatus('launching')
    setStatusMessage('正在启动游戏...')

    const result = await launchGame(projectPath, sdkPath)
    
    if (result.success) {
      setGameStatus('running')
      setStatusMessage('游戏运行中')
      setTimeout(() => setStatusMessage(''), 2000)
    } else {
      setGameStatus('error')
      setStatusMessage(result.error || '启动失败')
      setTimeout(() => {
        setGameStatus('idle')
        setStatusMessage('')
      }, 3000)
    }
  }, [projectPath])

  // Handle stop game
  const handleStopGame = useCallback(async () => {
    setStatusMessage('正在停止游戏...')
    const result = await stopGame()
    
    if (result.success) {
      setGameStatus('idle')
      setStatusMessage('游戏已停止')
      setTimeout(() => setStatusMessage(''), 2000)
    } else {
      setStatusMessage(result.error || '停止失败')
      setTimeout(() => setStatusMessage(''), 2000)
    }
  }, [])

  // Handle configure SDK
  const handleConfigureSdk = useCallback(async () => {
    const path = await selectSdkPath()
    if (path) {
      setStatusMessage(`SDK 已配置: ${path.split(/[/\\]/).pop()}`)
      setTimeout(() => setStatusMessage(''), 2000)
    }
  }, [])

  // Register game event listeners
  useEffect(() => {
    registerGameListeners(
      (error) => {
        setGameStatus('error')
        setStatusMessage(error)
        setTimeout(() => {
          setGameStatus('idle')
          setStatusMessage('')
        }, 3000)
      },
      (code) => {
        setGameStatus('idle')
        if (code !== 0 && code !== null) {
          setStatusMessage(`游戏退出，代码: ${code}`)
          setTimeout(() => setStatusMessage(''), 3000)
        }
      }
    )

    return () => {
      removeGameListeners()
    }
  }, [])

  // Check game status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const running = await isGameRunning()
      if (running) {
        setGameStatus('running')
      }
    }
    checkStatus()
  }, [])

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleLaunchEvent = () => {
      if (gameStatus !== 'running') {
        handleLaunchGame()
      }
    }
    
    const handleStopEvent = () => {
      if (gameStatus === 'running') {
        handleStopGame()
      }
    }
    
    window.addEventListener('editor:launch-game', handleLaunchEvent)
    window.addEventListener('editor:stop-game', handleStopEvent)
    
    return () => {
      window.removeEventListener('editor:launch-game', handleLaunchEvent)
      window.removeEventListener('editor:stop-game', handleStopEvent)
    }
  }, [gameStatus, handleLaunchGame, handleStopGame])

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">
          <span style={{ color: 'var(--accent-primary)' }}>◆</span>
          {' '}Ren'Py Editor
          {projectPath && (
            <span className="project-name">
              {projectName}{modified ? ' •' : ''}
            </span>
          )}
        </h1>
      </div>
      
      <div className="header-center">
        <ModeSwitcher />
        
        {/* Separator */}
        <div style={{ width: 1, height: 20, backgroundColor: 'var(--border-color)', margin: '0 8px' }} />
        
        {/* Game Launch Controls */}
        <div className="game-controls">
          {gameStatus === 'running' ? (
            <button
              className="btn-stop-game"
              onClick={handleStopGame}
              title="停止游戏 (Shift+F5)"
            >
              ■ 停止
            </button>
          ) : (
            <button
              className="btn-launch-game"
              onClick={handleLaunchGame}
              disabled={!projectPath || gameStatus === 'launching'}
              title={!hasSdk ? '点击配置 Ren\'Py SDK 后启动' : '运行游戏 (F5)'}
            >
              {gameStatus === 'launching' ? '● 启动中' : '▶ 运行'}
            </button>
          )}
          <button
            className="btn-configure-sdk"
            onClick={handleConfigureSdk}
            title="配置 Ren'Py SDK"
          >
            ⚙
          </button>
        </div>
        
        {statusMessage && (
          <span className={`game-status game-status-${gameStatus}`}>
            {statusMessage}
          </span>
        )}
      </div>
      
      <div className="header-right">
        <ComplexitySwitcher />
      </div>
    </header>
  )
}
