import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Wifi,
  HardDrive,
  TrendingUp,
  Settings,
  RefreshCw
} from 'lucide-react';
import { audioPerformanceMonitor, PerformanceMetrics, AudioTroubleshootingInfo } from '../services/audioPerformanceMonitor';
import { logger } from '../utils/logger';

interface AudioTroubleshooterProps {
  isActive?: boolean;
  onToggle?: (active: boolean) => void;
  className?: string;
}

const AudioTroubleshooter: React.FC<AudioTroubleshooterProps> = ({
  isActive = false,
  onToggle,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [troubleshootingInfo, setTroubleshootingInfo] = useState<AudioTroubleshootingInfo | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const metricsInterval = useRef<NodeJS.Timeout>();

  // Initialize monitoring on mount
  useEffect(() => {
    const initializeMonitoring = async () => {
      try {
        await audioPerformanceMonitor.initializeMonitoring();
        setIsInitialized(true);
        logger.info('AudioTroubleshooter', 'Performance monitoring initialized');
      } catch (error) {
        setError('Failed to initialize audio monitoring. Microphone access may be required.');
        logger.error('AudioTroubleshooter', 'Failed to initialize monitoring', error);
      }
    };

    initializeMonitoring();

    return () => {
      if (metricsInterval.current) {
        clearInterval(metricsInterval.current);
      }
      if (audioPerformanceMonitor.isActive()) {
        audioPerformanceMonitor.stopMonitoring();
      }
    };
  }, []);

  // Update metrics when monitoring is active
  useEffect(() => {
    if (isMonitoring && isInitialized) {
      // Update metrics every 500ms for real-time display
      metricsInterval.current = setInterval(() => {
        const currentMetrics = audioPerformanceMonitor.getCurrentMetrics();
        const troubleshooting = audioPerformanceMonitor.generateTroubleshootingInfo();

        setMetrics(currentMetrics);
        setTroubleshootingInfo(troubleshooting);
      }, 500);

      return () => {
        if (metricsInterval.current) {
          clearInterval(metricsInterval.current);
        }
      };
    }
  }, [isMonitoring, isInitialized]);

  const handleToggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        audioPerformanceMonitor.stopMonitoring();
        setIsMonitoring(false);
        setMetrics(null);
        setTroubleshootingInfo(null);
      } else {
        if (!isInitialized) {
          await audioPerformanceMonitor.initializeMonitoring();
          setIsInitialized(true);
        }
        audioPerformanceMonitor.startMonitoring();
        setIsMonitoring(true);
      }
      onToggle?.(isMonitoring);
    } catch (error) {
      setError('Failed to toggle monitoring. Check microphone permissions.');
      logger.error('AudioTroubleshooter', 'Failed to toggle monitoring', error);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'good': return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case 'fair': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'poor': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'critical': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-yellow-400';
      case 'medium': return 'text-orange-400';
      case 'high': return 'text-red-400';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`glass-card p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-glass pb-4">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-bold text-white font-orbitron">
            AUDIO TROUBLESHOOTER
          </h3>
        </div>

        <button
          onClick={handleToggleMonitoring}
          disabled={!isInitialized}
          className={`btn-${isMonitoring ? 'secondary' : 'primary'} px-4 py-2 text-sm font-bold flex items-center space-x-2`}
        >
          {isMonitoring ? (
            <>
              <XCircle className="w-4 h-4" />
              <span>STOP</span>
            </>
          ) : (
            <>
              <Activity className="w-4 h-4" />
              <span>START</span>
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start space-x-2 p-3 bg-red-900/20 border border-red-400 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Real-time Metrics */}
      {isMonitoring && metrics && (
        <div className="space-y-4">
          {/* Overall Performance */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-white font-orbitron">
                PERFORMANCE OVERVIEW
              </h4>
              <div className="flex items-center space-x-2">
                {getGradeIcon(metrics.overallGrade)}
                <span className={`font-bold text-sm ${getGradeColor(metrics.overallGrade)} uppercase`}>
                  {metrics.overallGrade}
                </span>
              </div>
            </div>

            {/* Performance Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Latency */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-slate-400">Latency</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {metrics.latency.toFixed(1)}ms
                </div>
                <div className="text-xs text-slate-500">
                  Avg: {metrics.avgLatency.toFixed(1)}ms
                </div>
              </div>

              {/* Jitter */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-sm text-slate-400">Jitter</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {metrics.jitter.toFixed(1)}ms
                </div>
                <div className="text-xs text-slate-500">
                  Avg: {metrics.avgJitter.toFixed(1)}ms
                </div>
              </div>

              {/* Buffer Health */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-slate-400">Buffer</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {metrics.bufferHealth.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500">
                  Underruns: {metrics.bufferUnderruns}
                </div>
              </div>

              {/* Connection */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-400">Connection</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {metrics.connectionStability.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500">
                  Dropouts: {metrics.dropouts}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Bars */}
          <div className="glass-card p-4">
            <h4 className="text-lg font-semibold text-white font-orbitron mb-4">
              REAL-TIME MONITORING
            </h4>

            <div className="space-y-3">
              {/* Latency Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-cyan-400">Latency</span>
                  <span className="text-white">{metrics.latency.toFixed(1)}ms</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      metrics.latency < 50 ? 'bg-green-400' :
                      metrics.latency < 100 ? 'bg-blue-400' :
                      metrics.latency < 200 ? 'bg-yellow-400' :
                      metrics.latency < 500 ? 'bg-orange-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(100, (metrics.latency / 500) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Jitter Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-fuchsia-400">Jitter</span>
                  <span className="text-white">{metrics.jitter.toFixed(1)}ms</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      metrics.jitter < 5 ? 'bg-green-400' :
                      metrics.jitter < 10 ? 'bg-blue-400' :
                      metrics.jitter < 20 ? 'bg-yellow-400' :
                      metrics.jitter < 50 ? 'bg-orange-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(100, (metrics.jitter / 50) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Buffer Health Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-yellow-400">Buffer Health</span>
                  <span className="text-white">{metrics.bufferHealth.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      metrics.bufferHealth > 90 ? 'bg-green-400' :
                      metrics.bufferHealth > 70 ? 'bg-blue-400' :
                      metrics.bufferHealth > 50 ? 'bg-yellow-400' :
                      metrics.bufferHealth > 30 ? 'bg-orange-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${metrics.bufferHealth}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Troubleshooting Info */}
      {troubleshootingInfo && (troubleshootingInfo.issues.length > 0 || troubleshootingInfo.recommendations.length > 0) && (
        <div className="space-y-4">
          {/* Issues */}
          {troubleshootingInfo.issues.length > 0 && (
            <div className="glass-card p-4">
              <h4 className="text-lg font-semibold text-red-400 font-orbitron mb-3">
                DETECTED ISSUES
              </h4>
              <div className="space-y-3">
                {troubleshootingInfo.issues.map((issue, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-red-900/20 border border-red-400/30 rounded-lg">
                    <AlertTriangle className={`w-4 h-4 ${getSeverityColor(issue.severity)} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-sm font-bold ${getSeverityColor(issue.severity)} uppercase`}>
                          {issue.severity}
                        </span>
                        <span className="text-xs text-slate-400 uppercase">
                          {issue.type}
                        </span>
                      </div>
                      <p className="text-sm text-white mb-2">{issue.message}</p>
                      <p className="text-xs text-slate-400">{issue.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {troubleshootingInfo.recommendations.length > 0 && (
            <div className="glass-card p-4">
              <h4 className="text-lg font-semibold text-blue-400 font-orbitron mb-3">
                RECOMMENDATIONS
              </h4>
              <div className="space-y-2">
                {troubleshootingInfo.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Settings className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Diagnostics */}
          <div className="glass-card p-4">
            <h4 className="text-lg font-semibold text-purple-400 font-orbitron mb-3">
              SYSTEM DIAGNOSTICS
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Audio Context:</span>
                <span className="text-white">{troubleshootingInfo.systemDiagnostics.audioContextState}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sample Rate:</span>
                <span className="text-white">{troubleshootingInfo.systemDiagnostics.sampleRate} Hz</span>
              </div>
              {troubleshootingInfo.systemDiagnostics.outputLatency !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Output Latency:</span>
                  <span className="text-white">{(troubleshootingInfo.systemDiagnostics.outputLatency * 1000).toFixed(1)}ms</span>
                </div>
              )}
              {troubleshootingInfo.systemDiagnostics.baseLatency !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Base Latency:</span>
                  <span className="text-white">{(troubleshootingInfo.systemDiagnostics.baseLatency * 1000).toFixed(1)}ms</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status when not monitoring */}
      {!isMonitoring && isInitialized && !error && (
        <div className="text-center py-8">
          <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-slate-400 mb-2">
            Performance monitoring is stopped
          </h4>
          <p className="text-sm text-slate-500 mb-4">
            Click START to begin real-time audio performance analysis
          </p>
        </div>
      )}
    </div>
  );
};

export default AudioTroubleshooter;