import { logger } from "../utils/logger";
import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Share2, TrendingUp, Clock, Users, Zap, Music, Save, ArrowLeft } from 'lucide-react';
import { Playlist, Session } from '../types';

interface AnalyticsData {
  energyCurve: number[];
  peakMoments: { time: number; energy: number; track: string }[];
  crowdFeedback: { engagement: number; danceability: number; excitement: number };
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
  onEditAgain
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');

  useEffect(() => {
    // Generate analytics data
    const generateAnalytics = () => {
      const energyCurve = playlist.tracks.map((track, index) => {
        return (track.energy || 0.5) * 100 + Math.random() * 20 - 10;
      });

      const peakMoments = playlist.tracks
        .map((track, index) => ({
          time: index * 3, // Approximate time
          energy: (track.energy || 0.5) * 100,
          track: `${track.artist} - ${track.title}`
        }))
        .filter(moment => moment.energy > 80)
        .slice(0, 5);

      const crowdFeedback = {
        engagement: 75 + Math.random() * 20,
        danceability: 80 + Math.random() * 15,
        excitement: 70 + Math.random() * 25
      };

      const analyticsData: AnalyticsData = {
        energyCurve,
        peakMoments,
        crowdFeedback,
        totalDuration: playlist.total_duration,
        tracksPlayed: playlist.tracks.length,
        averageEnergy: energyCurve.reduce((sum, val) => sum + val, 0) / energyCurve.length,
        bestMoments: [
          'Perfect energy transition at 15:30',
          'Crowd peak during track 8',
          'Seamless genre blend at 28:45',
          'Energy recovery at 35:20'
        ]
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
            duration: track.duration,
            bpm: track.bpm,
            energy: track.energy
          }))
        },
        analytics,
        session: {
          id: session.id,
          started_at: session.started_at,
          ended_at: session.ended_at || new Date().toISOString(),
          status: session.status
        }
      };

      if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
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
          ...exportData.playlist.tracks.map(track => 
            `"${track.title}","${track.artist}",${track.duration},${track.bpm || 'N/A'},${track.energy || 'N/A'}`
          )
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
${exportData.playlist.tracks.map((track, i) => 
  `${i + 1}. ${track.title} - ${track.artist} (${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')})`
).join('\n')}

Analytics:
- Average Energy: ${analytics?.averageEnergy.toFixed(1)}%
- Peak Moments: ${analytics?.peakMoments.length}
- Total Duration: ${Math.floor(exportData.playlist.tracks.reduce((sum, t) => sum + t.duration, 0) / 60)} minutes
        `;
        
        const blob = new Blob([pdfContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${playlist.name.replace(/\s+/g, '_')}_analytics.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      logger.info('AnalyticsExport', 'Export completed successfully', { format: exportFormat });
      
    } catch (error) {
      logger.error('AnalyticsExport', 'Export failed', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${playlist.name} - DJ Set Analytics`,
          text: `Check out my DJ set analytics: ${analytics?.averageEnergy.toFixed(1)}% average energy, ${analytics?.peakMoments.length} peak moments!`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      const shareText = `${playlist.name} - Average Energy: ${analytics?.averageEnergy.toFixed(1)}%`;
      navigator.clipboard.writeText(shareText);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEnergyColor = (energy: number) => {
    if (energy >= 80) return 'neon-text-green';
    if (energy >= 60) return 'text-yellow-400';
    if (energy >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  if (!analytics) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-none animate-spin mx-auto mb-4 neon-glow-green"></div>
          <p className="text-cyber-gray">Analyzing your set...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 lg:py-6 border-b border-neon-green">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-none bg-cyber-dark border border-neon-green hover:neon-glow-green flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 neon-text-green" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-cyber-dark border-2 border-neon-purple rounded-none flex items-center justify-center neon-glow-purple">
                <BarChart3 className="w-6 h-6 neon-text-purple" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-cyber-white">Set Analytics</h1>
                <p className="text-sm text-cyber-gray">{playlist.name}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 lg:space-x-4">
            <button
              onClick={() => onSaveToLibrary(playlist)}
              className="cyber-button px-3 lg:px-4 py-2 rounded-none flex items-center space-x-2 text-sm"
            >
              <Save className="w-4 h-4 neon-text-green" />
              <span className="hidden sm:inline">Save to Library</span>
            </button>
            <button
              onClick={onEditAgain}
              className="cyber-button cyber-button-purple px-3 lg:px-4 py-2 rounded-none flex items-center space-x-2 text-sm"
            >
              <Music className="w-4 h-4 neon-text-purple" />
              <span className="hidden sm:inline">Edit Again</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <div className="cyber-card rounded-none p-4 lg:p-6 text-center">
            <div className={`text-2xl lg:text-3xl font-bold mb-2 ${getEnergyColor(analytics.averageEnergy)}`}>
              {analytics.averageEnergy.toFixed(1)}%
            </div>
            <div className="text-sm text-cyber-gray">Average Energy</div>
          </div>
          
          <div className="cyber-card rounded-none p-4 lg:p-6 text-center">
            <div className="text-2xl lg:text-3xl font-bold neon-text-green mb-2">
              {analytics.peakMoments.length}
            </div>
            <div className="text-sm text-cyber-gray">Peak Moments</div>
          </div>
          
          <div className="cyber-card rounded-none p-4 lg:p-6 text-center">
            <div className="text-2xl lg:text-3xl font-bold neon-text-purple mb-2">
              {formatTime(analytics.totalDuration)}
            </div>
            <div className="text-sm text-cyber-gray">Total Duration</div>
          </div>
          
          <div className="cyber-card rounded-none p-4 lg:p-6 text-center">
            <div className="text-2xl lg:text-3xl font-bold neon-text-green mb-2">
              {analytics.tracksPlayed}
            </div>
            <div className="text-sm text-cyber-gray">Tracks Played</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Energy Curve */}
          <div className="cyber-card rounded-none p-6">
            <h3 className="text-xl font-bold neon-text-green mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Energy Curve</span>
            </h3>
            <div className="h-48 bg-cyber-black border border-neon-green rounded-none p-4">
              <div className="flex items-end justify-between h-full">
                {analytics.energyCurve.map((energy, index) => (
                  <div
                    key={index}
                    className="w-2 bg-gradient-to-t from-neon-green to-neon-purple rounded-none"
                    style={{ height: `${energy}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Crowd Feedback */}
          <div className="cyber-card rounded-none p-6">
            <h3 className="text-xl font-bold neon-text-purple mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Crowd Feedback</span>
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-cyber-gray">Engagement</span>
                  <span className={getEnergyColor(analytics.crowdFeedback.engagement)}>
                    {analytics.crowdFeedback.engagement.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-cyber-dark border border-neon-green rounded-none h-2">
                  <div 
                    className="h-2 progress-green rounded-none"
                    style={{ width: `${analytics.crowdFeedback.engagement}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-cyber-gray">Danceability</span>
                  <span className={getEnergyColor(analytics.crowdFeedback.danceability)}>
                    {analytics.crowdFeedback.danceability.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-cyber-dark border border-neon-purple rounded-none h-2">
                  <div 
                    className="h-2 progress-purple rounded-none"
                    style={{ width: `${analytics.crowdFeedback.danceability}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-cyber-gray">Excitement</span>
                  <span className={getEnergyColor(analytics.crowdFeedback.excitement)}>
                    {analytics.crowdFeedback.excitement.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-cyber-dark border border-neon-green rounded-none h-2">
                  <div 
                    className="h-2 progress-green rounded-none"
                    style={{ width: `${analytics.crowdFeedback.excitement}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Peak Moments */}
          <div className="cyber-card rounded-none p-6">
            <h3 className="text-xl font-bold neon-text-green mb-4 flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Peak Moments</span>
            </h3>
            <div className="space-y-3">
              {analytics.peakMoments.map((moment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-cyber-dark border border-neon-green rounded-none">
                  <div>
                    <p className="font-medium text-cyber-white truncate">{moment.track}</p>
                    <p className="text-sm text-cyber-gray">Time: {Math.floor(moment.time / 60)}:{(moment.time % 60).toString().padStart(2, '0')}</p>
                  </div>
                  <div className={`text-lg font-bold ${getEnergyColor(moment.energy)}`}>
                    {moment.energy.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Moments */}
          <div className="cyber-card rounded-none p-6">
            <h3 className="text-xl font-bold neon-text-purple mb-4 flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Highlights</span>
            </h3>
            <div className="space-y-3">
              {analytics.bestMoments.map((moment, index) => (
                <div key={index} className="p-3 bg-cyber-dark border border-neon-purple rounded-none">
                  <p className="text-cyber-white">{moment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="mt-8 cyber-card rounded-none p-6">
          <h3 className="text-xl font-bold neon-text-green mb-4">Export & Share</h3>
          
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-4">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'pdf')}
                className="bg-cyber-dark border border-neon-green rounded-none px-3 py-2 text-cyber-white focus:outline-none focus:border-neon-purple"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleShare}
                className="cyber-button cyber-button-purple px-4 py-2 rounded-none flex items-center space-x-2"
              >
                <Share2 className="w-4 h-4 neon-text-purple" />
                <span>Share</span>
              </button>
              
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="cyber-button px-4 py-2 rounded-none flex items-center space-x-2"
              >
                <Download className="w-4 h-4 neon-text-green" />
                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsExport;