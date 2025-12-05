import { useEffect, useState } from 'react'

interface UpdateNotificationProps {
  show: boolean
  currentVersion: string
  latestVersion: string
  releaseNotes?: string
  onClose: () => void
  onUpdate: () => void
  manualDownload?: boolean
  releaseUrl?: string
}

interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  total: number
  transferred: number
}

export default function UpdateNotification({
  show,
  currentVersion,
  latestVersion,
  releaseNotes,
  onClose,
  onUpdate,
  manualDownload,
  releaseUrl
}: UpdateNotificationProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!show || !window.electronAPI) return

    // 监听下载进度
    const unsubProgress = window.electronAPI.onUpdateDownloadProgress?.((progress) => {
      setDownloadProgress(progress)
    })

    // 监听下载完成
    const unsubDownloaded = window.electronAPI.onUpdateDownloaded?.(() => {
      setIsDownloading(false)
      setIsDownloaded(true)
      setDownloadProgress(null)
    })

    // 监听错误
    const unsubError = window.electronAPI.onUpdateError?.((err) => {
      setError(err)
      setIsDownloading(false)
    })

    return () => {
      unsubProgress?.()
      unsubDownloaded?.()
      unsubError?.()
    }
  }, [show])

  if (!show) return null

  const handleDownload = async () => {
    if (manualDownload && releaseUrl) {
      // 手动下载模式，打开浏览器
      window.open(releaseUrl, '_blank')
      return
    }

    setIsDownloading(true)
    setError('')
    
    try {
      const result = await window.electronAPI.downloadUpdate()
      if (!result.success) {
        setError(result.error || '下载失败')
        setIsDownloading(false)
      }
    } catch (err: any) {
      setError(err.message || '下载失败')
      setIsDownloading(false)
    }
  }

  const handleInstall = async () => {
    try {
      await window.electronAPI.installUpdate()
    } catch (err: any) {
      setError(err.message || '安装失败')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <h3 className="text-lg font-bold">发现新版本</h3>
            </div>
            {!isDownloading && !isDownloaded && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-4">
          {/* 版本信息 */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">当前版本</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{currentVersion}</p>
            </div>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">最新版本</p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{latestVersion}</p>
            </div>
          </div>

          {/* 更新说明 */}
          {releaseNotes && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">更新说明：</p>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {releaseNotes}
              </div>
            </div>
          )}

          {/* 下载进度 */}
          {isDownloading && downloadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>下载中...</span>
                <span>{downloadProgress.percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-300"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}</span>
                <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-2">
            {!isDownloaded && !isDownloading && (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  稍后提醒
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  {manualDownload ? '前往下载' : '立即更新'}
                </button>
              </>
            )}
            
            {isDownloading && (
              <button
                disabled
                className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed"
              >
                下载中...
              </button>
            )}

            {isDownloaded && (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  稍后安装
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                >
                  立即安装
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
