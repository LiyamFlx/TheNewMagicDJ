import { logger } from '../utils/logger';
import { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Share2,
  TrendingUp,
  Clock,
  Users,
  Zap,
  Music,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { formatTimeClock } from '../utils/format';
import { getEnergyColor as energyColorUtil } from '../utils/energy';
import { Playlist, Session } from '../types';

interface AnalyticsData {
  energyCurve: number[];
  peakMoments: { time: number; energy: number; track: string }[];
  crowdFeedback: {
    engagement: number;
    danceability: number;
    excitement: number;
  };
  totalDuration: number;
  tracksPlayed: number;
  averageEnergy: number;
  bestMoments: string[];
}

interface AnalyticsExportProps {
  playlist: Playlist;
  session: Session;
  onBack: () => void;
  onSaveToLibrary: (playlist: Playlist) => void;
  onEditAgain: () => void;
}

const AnalyticsExport: React.FC<AnalyticsExportProps> = ({
  playlist,
  session,
  onBack,
  onSaveToLibrary,
  onEditAgain,
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>(
    'json'
  );
  const [showFlyerPreview, setShowFlyerPreview] = useState(false);
  const [flyerCanvas, setFlyerCanvas] = useState<HTMLCanvasElement | null>(
    null
  );

  useEffect(() => {
    // Generate analytics data
    const generateAnalytics = () => {
      const energyCurve = playlist.tracks.map(track => {
        return (track.energy || 0.5) * 100 + Math.random() * 20 - 10;
      });

      const peakMoments = playlist.tracks
        .map((track, index) => ({
          time: index * 3, // Approximate time
          energy: (track.energy || 0.5) * 100,
          track: `${track.artist} - ${track.title}`,
        }))
        .filter(moment => moment.energy > 80)
        .slice(0, 5);

      const crowdFeedback = {
        engagement: 75 + Math.random() * 20,
        danceability: 80 + Math.random() * 15,
        excitement: 70 + Math.random() * 25,
      };

      const analyticsData: AnalyticsData = {
        energyCurve,
        peakMoments,
        crowdFeedback,
        totalDuration: playlist.total_duration ?? 0,
        tracksPlayed: playlist.tracks.length,
        averageEnergy:
          energyCurve.reduce((sum, val) => sum + val, 0) / energyCurve.length,
        bestMoments: [
          'Perfect energy transition at 15:30',
          'Crowd peak during track 8',
          'Seamless genre blend at 28:45',
          'Energy recovery at 35:20',
        ],
      };

      setAnalytics(analyticsData);
    };

    generateAnalytics();
  }, [playlist]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const exportData = {
        playlist: {
          name: playlist.name,
          tracks: playlist.tracks.map(track => ({
            title: track.title,
            artist: track.artist,
            duration: track.duration ?? 0,
            bpm: track.bpm,
            energy: track.energy,
          })),
        },
        analytics,
        session: {
          id: session.id,
          started_at: session.started_at,
          ended_at: session.ended_at || new Date().toISOString(),
          status: session.status,
        },
      };

      if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${playlist.name.replace(/\s+/g, '_')}_analytics.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'csv') {
        // Generate CSV format
        const csvContent = [
          'Track,Artist,Duration,BPM,Energy',
          ...exportData.playlist.tracks.map(
            track =>
              `"${track.title}","${track.artist}",${track.duration ?? 0},${track.bpm || 'N/A'},${track.energy || 'N/A'}`
          ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${playlist.name.replace(/\s+/g, '_')}_analytics.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'pdf') {
        // For PDF, we'll create a simple text-based export
        const pdfContent = `
DJ Set Analytics Report
=======================

Playlist: ${exportData.playlist.name}
Session ID: ${exportData.session.id}
Date: ${new Date(exportData.session.started_at).toLocaleDateString()}

Tracks:
${exportData.playlist.tracks
  .map(
    (track, i) =>
      `${i + 1}. ${track.title} - ${track.artist} (${Math.floor((track.duration ?? 0) / 60)}:${((track.duration ?? 0) % 60).toString().padStart(2, '0')})`
  )
  .join('\n')}

Analytics:
- Average Energy: ${analytics?.averageEnergy.toFixed(1)}%
- Peak Moments: ${analytics?.peakMoments.length}
- Total Duration: ${Math.floor(exportData.playlist.tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0) / 60)} minutes
        `;

        const blob = new Blob([pdfContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${playlist.name.replace(/\s+/g, '_')}_analytics.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }

      logger.info('AnalyticsExport', 'Export completed successfully', {
        format: exportFormat,
      });
    } catch (error) {
      logger._error('AnalyticsExport', 'Export failed', error);
    } finally {
      setIsExporting(false);
    }
  };

  const generateFlyer = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add neon border
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Title
    ctx.fillStyle = '#00ff41';
    ctx.font = 'bold 80px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MAGIC DJ', canvas.width / 2, 150);

    // Playlist name
    ctx.fillStyle = '#9d00ff';
    ctx.font = 'bold 60px monospace';
    ctx.fillText(playlist.name.toUpperCase(), canvas.width / 2, 250);

    // Stats
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px monospace';
    ctx.fillText(`${analytics?.tracksPlayed} TRACKS`, canvas.width / 2, 400);
    ctx.fillText(
      `${analytics?.averageEnergy.toFixed(1)}% AVG ENERGY`,
      canvas.width / 2,
      470
    );
    ctx.fillText(
      `${analytics?.peakMoments.length} PEAK MOMENTS`,
      canvas.width / 2,
      540
    );

    // Energy visualization
    const barWidth = 40;
    const barSpacing = 50;
    const startX =
      (canvas.width - (analytics?.energyCurve.length || 0) * barSpacing) / 2;

    analytics?.energyCurve.forEach((energy, index) => {
      const barHeight = (energy / 100) * 300;
      const x = startX + index * barSpacing;
      const y = 850 - barHeight;

      ctx.fillStyle =
        energy > 80 ? '#00ff41' : energy > 60 ? '#ffff00' : '#9d00ff';
      ctx.fillRect(x, y, barWidth, barHeight);
    });

    // Footer
    ctx.fillStyle = '#00ff41';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('AI-POWERED DJ PLATFORM', canvas.width / 2, 950);

    return canvas;
  };

  const handleShare = async () => {
    // Generate flyer image
    const canvas = generateFlyer();
    if (!canvas) return;

    canvas.toBlob(async blob => {
      if (!blob) return;

      const file = new File(
        [blob],
        `${playlist.name.replace(/\s+/g, '_')}_flyer.png`,
        { type: 'image/png' }
      );

      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `${playlist.name} - DJ Set Analytics`,
            text: `Check out my DJ set analytics: ${analytics?.averageEnergy.toFixed(1)}% average energy, ${analytics?.peakMoments.length} peak moments!`,
            files: [file],
          });
        } catch (error) {
          console.error('Share failed:', error);
          downloadFlyer(canvas);
        }
      } else {
        downloadFlyer(canvas);
      }
    }, 'image/png');
  };

  const downloadFlyer = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `${playlist.name.replace(/\s+/g, '_')}_flyer.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handlePreviewFlyer = () => {
    const canvas = generateFlyer();
    if (canvas) {
      setFlyerCanvas(canvas);
      setShowFlyerPreview(true);
    }
  };

  const formatTime = (seconds: number) => formatTimeClock(seconds);

  const getEnergyColor = (energy: number) => energyColorUtil(energy, 'neon');

  if (!analytics) {
    return (
      <div className="min-h-screen gradient-bg-primary flex-center">
        <div className="text-center">
          <div className="w-16 h-16 glass-card flex-center animate-pulse-glow shadow-neon-cyan mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gradient-primary" />
          </div>
          <p className="text-xl text-gray-300 font-orbitron">
            Analyzing your set...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-primary relative overflow-hidden">
      {/* Header */}
      <div className="relative z-10 px-4 lg:px-6 py-4 lg:py-6 nav-sticky">
        <div className="max-w-7xl mx-auto flex-between">
          <div className="flex-start space-md">
            <button
              onClick={onBack}
              className="btn-icon-square btn-ghost ease-smooth"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-fuchsia-400" />
            </button>
            <div className="flex-start space-md">
              <div className="w-12 h-12 glass-card flex-center animate-pulse-glow shadow-neon-pink">
                <BarChart3 className="w-7 h-7 text-gradient-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gradient-primary font-orbitron tracking-wide">
                  SET ANALYTICS
                </h1>
                <p className="text-sm text-gradient-accent font-mono">
                  {playlist.name}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-center space-md">
            <button
              onClick={() => onSaveToLibrary(playlist)}
              className="btn-accent btn-lg flex-center space-sm ease-bounce shadow-neon-medium"
              aria-label="Save to library"
              title="Save to library"
            >
              <Save className="w-5 h-5" />
              <span className="hidden sm:inline">SAVE</span>
            </button>
            <button
              onClick={onEditAgain}
              className="btn-secondary btn-lg flex-center space-sm ease-elastic shadow-neon-hard"
              aria-label="Edit again"
              title="Edit again"
            >
              <Music className="w-5 h-5" />
              <span className="hidden sm:inline">EDIT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        {/* Overview Stats */}
        <div className="grid-4 mb-8">
          <div className="glass-card p-lg text-center hover-lift ease-smooth group">
            <div
              className={`text-3xl font-bold text-gradient-accent mb-3 font-orbitron group-hover:scale-110 ease-bounce animate-count-up ${getEnergyColor(analytics.averageEnergy)}`}
            >
              {analytics.averageEnergy.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400 font-inter tracking-wide">
              AVERAGE ENERGY
            </div>
            <div className="progress-bar h-2 max-w-16 mx-auto mt-3">
              <div
                className="progress-fill gradient-bg-accent"
                style={{ width: `${analytics.averageEnergy}%` }}
              ></div>
            </div>
          </div>

          <div className="glass-card p-lg text-center hover-lift ease-smooth group">
            <div className="text-3xl font-bold text-gradient-primary mb-3 font-orbitron group-hover:scale-110 ease-bounce animate-count-up">
              {analytics.peakMoments.length}
            </div>
            <div className="text-sm text-gray-400 font-inter tracking-wide">
              PEAK MOMENTS
            </div>
            <div className="progress-bar h-2 max-w-16 mx-auto mt-3">
              <div className="progress-fill gradient-bg-secondary"></div>
            </div>
          </div>

          <div className="glass-card p-lg text-center hover-lift ease-smooth group">
            <div className="text-3xl font-bold text-gradient-accent mb-3 font-orbitron group-hover:scale-110 ease-bounce animate-count-up">
              {formatTime(analytics.totalDuration)}
            </div>
            <div className="text-sm text-gray-400 font-inter tracking-wide">
              TOTAL DURATION
            </div>
            <div className="progress-bar h-2 max-w-16 mx-auto mt-3">
              <div className="progress-fill gradient-bg-accent"></div>
            </div>
          </div>

          <div className="glass-card p-lg text-center hover-lift ease-smooth group">
            <div className="text-3xl font-bold text-gradient-primary mb-3 font-orbitron group-hover:scale-110 ease-bounce animate-count-up">
              {analytics.tracksPlayed}
            </div>
            <div className="text-sm text-gray-400 font-inter tracking-wide">
              TRACKS PLAYED
            </div>
            <div className="progress-bar h-2 max-w-16 mx-auto mt-3">
              <div className="progress-fill gradient-bg-secondary"></div>
            </div>
          </div>
        </div>

        <div className="grid-2 gap-8">
          {/* Energy Curve */}
          <div className="glass-card p-lg shadow-neon-cyan hover-lift ease-smooth">
            <h3 className="text-xl font-bold text-gradient-primary mb-6 flex-center space-sm font-orbitron">
              <TrendingUp className="w-6 h-6" />
              <span>ENERGY CURVE</span>
            </h3>
            <div className="h-48 glass-card p-md mb-4">
              <div className="flex items-end justify-between h-full space-x-1">
                {analytics.energyCurve.map((energy, index) => (
                  <div
                    key={index}
                    className="w-2 gradient-bg-accent rounded-sm hover-lift ease-smooth"
                    style={{ height: `${energy}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="text-center text-sm text-gray-400 font-inter">
              Track progression over time
            </div>
          </div>

          {/* Crowd Feedback */}
          <div className="glass-card p-lg shadow-neon-pink hover-lift ease-smooth">
            <h3 className="text-xl font-bold text-gradient-accent mb-6 flex-center space-sm font-orbitron">
              <Users className="w-6 h-6" />
              <span>CROWD FEEDBACK</span>
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex-between mb-3">
                  <span className="text-gray-400 font-inter font-bold">
                    ENGAGEMENT
                  </span>
                  <span
                    className={`font-bold font-mono ${getEnergyColor(analytics.crowdFeedback.engagement)}`}
                  >
                    {analytics.crowdFeedback.engagement.toFixed(1)}%
                  </span>
                </div>
                <div className="progress-bar h-3">
                  <div
                    className="progress-fill gradient-bg-primary ease-smooth"
                    style={{ width: `${analytics.crowdFeedback.engagement}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex-between mb-3">
                  <span className="text-gray-400 font-inter font-bold">
                    DANCEABILITY
                  </span>
                  <span
                    className={`font-bold font-mono ${getEnergyColor(analytics.crowdFeedback.danceability)}`}
                  >
                    {analytics.crowdFeedback.danceability.toFixed(1)}%
                  </span>
                </div>
                <div className="progress-bar h-3">
                  <div
                    className="progress-fill gradient-bg-accent ease-smooth"
                    style={{
                      width: `${analytics.crowdFeedback.danceability}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex-between mb-3">
                  <span className="text-gray-400 font-inter font-bold">
                    EXCITEMENT
                  </span>
                  <span
                    className={`font-bold font-mono ${getEnergyColor(analytics.crowdFeedback.excitement)}`}
                  >
                    {analytics.crowdFeedback.excitement.toFixed(1)}%
                  </span>
                </div>
                <div className="progress-bar h-3">
                  <div
                    className="progress-fill gradient-bg-secondary ease-smooth"
                    style={{ width: `${analytics.crowdFeedback.excitement}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Peak Moments */}
          <div className="glass-card p-lg shadow-neon-cyan hover-lift ease-smooth">
            <h3 className="text-xl font-bold text-gradient-primary mb-6 flex-center space-sm font-orbitron">
              <Zap className="w-6 h-6" />
              <span>PEAK MOMENTS</span>
            </h3>
            <div className="space-y-4">
              {analytics.peakMoments.map((moment, index) => (
                <div
                  key={index}
                  className="glass-card p-md flex-between group hover-lift ease-smooth"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gradient-accent truncate font-inter group-hover:text-gradient-primary ease-smooth">
                      {moment.track}
                    </p>
                    <p className="text-sm text-gray-400 font-mono">
                      TIME: {Math.floor(moment.time / 60)}:
                      {(moment.time % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  <div
                    className={`text-xl font-bold font-mono ${getEnergyColor(moment.energy)} group-hover:scale-110 ease-bounce`}
                  >
                    {moment.energy.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Moments */}
          <div className="glass-card p-lg shadow-neon-pink hover-lift ease-smooth">
            <h3 className="text-xl font-bold text-gradient-accent mb-6 flex-center space-sm font-orbitron">
              <Clock className="w-6 h-6" />
              <span>HIGHLIGHTS</span>
            </h3>
            <div className="space-y-4">
              {analytics.bestMoments.map((moment, index) => (
                <div
                  key={index}
                  className="glass-card p-md hover-lift ease-smooth group"
                >
                  <p className="text-gradient-primary font-inter group-hover:text-gradient-accent ease-smooth">
                    {moment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Export Section */}
        <div className="mt-8 glass-card p-xl shadow-neon-hard">
          <h3 className="text-2xl font-bold text-gradient-primary mb-8 flex-center space-sm font-orbitron">
            <Download className="w-7 h-7" />
            <span>EXPORT & SHARE</span>
          </h3>

          {/* Flyer Section */}
          <div className="mb-8 glass-card p-lg shadow-neon-pink hover-lift ease-smooth">
            <h4 className="text-xl font-bold text-gradient-accent mb-6 font-orbitron tracking-wider">
              SOCIAL MEDIA FLYER
            </h4>
            <div className="flex-center space-md flex-wrap">
              <button
                onClick={handlePreviewFlyer}
                className="btn-secondary btn-xl flex-center space-sm ease-bounce shadow-neon-medium"
              >
                <div className="w-6 h-6 glass-card rounded-sm"></div>
                <span>PREVIEW FLYER</span>
              </button>
              <button
                onClick={handleShare}
                className="btn-primary btn-xl flex-center space-sm ease-elastic shadow-neon-hard"
              >
                <Share2 className="w-6 h-6" />
                <span>SHARE FLYER</span>
              </button>
            </div>
          </div>

          {/* Data Export Section */}
          <div className="glass-card p-lg shadow-neon-cyan hover-lift ease-smooth">
            <h4 className="text-xl font-bold text-gradient-primary mb-6 font-orbitron tracking-wider">
              DATA EXPORT
            </h4>
            <div className="flex-between space-md flex-wrap">
              <div className="flex-center space-md">
                <select
                  value={exportFormat}
                  onChange={e =>
                    setExportFormat(e.target.value as 'json' | 'csv' | 'pdf')
                  }
                  className="select-neon text-gradient-accent font-mono text-base"
                  aria-label="Export format"
                  title="Choose export format"
                >
                  <option value="json">JSON FORMAT</option>
                  <option value="csv">CSV FORMAT</option>
                  <option value="pdf">PDF REPORT</option>
                </select>
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className={`btn-accent btn-xl flex-center space-sm ${isExporting ? 'opacity-50 cursor-not-allowed' : 'ease-bounce shadow-neon-hard'}`}
                aria-label="Export data"
                title="Export analytics data"
              >
                <Download className="w-6 h-6" />
                <span>{isExporting ? 'EXPORTING...' : 'EXPORT DATA'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Flyer Preview Modal */}
        {showFlyerPreview && flyerCanvas && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex-center z-50"
            onClick={() => setShowFlyerPreview(false)}
          >
            <div
              className="glass-card p-xl max-w-lg mx-4 shadow-neon-hard animate-scale-in"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex-between mb-6">
                <h3 className="text-2xl font-bold text-gradient-primary font-orbitron tracking-wider">
                  FLYER PREVIEW
                </h3>
                <button
                  onClick={() => setShowFlyerPreview(false)}
                  className="btn-icon btn-danger ease-bounce"
                  aria-label="Close preview"
                  title="Close preview"
                >
                  <span className="text-xl font-bold">×</span>
                </button>
              </div>

              <div className="mb-6">
                <img
                  src={flyerCanvas.toDataURL()}
                  alt="DJ Set Flyer"
                  className="w-full glass-card shadow-neon-medium hover-lift ease-smooth"
                />
              </div>

              <div className="flex-center space-md">
                <button
                  onClick={() => downloadFlyer(flyerCanvas)}
                  className="btn-primary btn-lg flex-1 flex-center space-sm ease-bounce shadow-neon-medium"
                  aria-label="Download flyer"
                  title="Download flyer"
                >
                  <Download className="w-5 h-5" />
                  <span>DOWNLOAD</span>
                </button>
                <button
                  onClick={handleShare}
                  className="btn-secondary btn-lg flex-1 flex-center space-sm ease-elastic shadow-neon-hard"
                  aria-label="Share flyer"
                  title="Share flyer"
                >
                  <Share2 className="w-5 h-5" />
                  <span>SHARE</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsExport;
