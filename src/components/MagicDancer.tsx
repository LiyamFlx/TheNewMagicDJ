import { useState, useEffect, useRef } from 'react';
import { Users, Activity, TrendingUp, Volume2, Zap, Eye, Heart, Music } from 'lucide-react';

interface CrowdMetrics {
  energy: number;
  engagement: number;
  danceability: number;
  excitement: number;
  timestamp: number;
}

interface MagicDancerProps {
  isActive: boolean;
  currentTrack?: {
    title: string;
    artist: string;
    bpm: number;
    energy: number;
  };
  onEnergyChange?: (energy: number) => void;
}

const MagicDancer: React.FC<MagicDancerProps> = ({ 
  isActive, 
  currentTrack, 
  onEnergyChange 
}) => {
  const [crowdMetrics, setCrowdMetrics] = useState<CrowdMetrics>({
    energy: 75,
    engagement: 68,
    danceability: 82,
    excitement: 71,
    timestamp: Date.now()
  });
  
  const [historicalData, setHistoricalData] = useState<CrowdMetrics[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Simulate real-time crowd analysis
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const newMetrics: CrowdMetrics = {
        energy: Math.max(0, Math.min(100, crowdMetrics.energy + (Math.random() - 0.5) * 10)),
        engagement: Math.max(0, Math.min(100, crowdMetrics.engagement + (Math.random() - 0.5) * 8)),
        danceability: Math.max(0, Math.min(100, crowdMetrics.danceability + (Math.random() - 0.5) * 6)),
        excitement: Math.max(0, Math.min(100, crowdMetrics.excitement + (Math.random() - 0.5) * 12)),
        timestamp: Date.now()
      };

      setCrowdMetrics(newMetrics);
      setHistoricalData(prev => [...prev.slice(-50), newMetrics]);
      
      if (onEnergyChange) {
        onEnergyChange(newMetrics.energy);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, crowdMetrics, onEnergyChange]);

  // Animate energy visualization
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      // Draw energy waves
      const time = Date.now() * 0.001;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Multiple energy rings
      for (let i = 0; i < 5; i++) {
        const radius = (crowdMetrics.energy / 100) * 80 + Math.sin(time + i) * 20;
        const alpha = 0.3 - (i * 0.05);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + i * 15, 0, Math.PI * 2);
        ctx.strokeStyle = i % 2 === 0 ? `rgba(57, 255, 19, ${alpha})` : `rgba(138, 0, 255, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Draw crowd energy particles
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 + time;
        const distance = 40 + Math.sin(time + i) * 20;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        ctx.beginPath();
        ctx.arc(x, y, 2 + Math.sin(time * 2 + i) * 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(57, 255, 19, ${0.6 + Math.sin(time + i) * 0.4})`;
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, crowdMetrics.energy]);

  const getEnergyColor = (value: number) => {
    if (value >= 80) return 'neon-text-green';
    if (value >= 60) return 'text-yellow-400';
    if (value >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getEnergyLevel = (value: number) => {
    if (value >= 80) return 'PEAK';
    if (value >= 60) return 'HIGH';
    if (value >= 40) return 'MEDIUM';
    return 'LOW';
  };

  if (!isActive) {
    return (
      <div className="cyber-card rounded-none p-6 text-center">
        <Users className="w-12 h-12 text-cyber-dim mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-cyber-gray mb-2">Magic Dancer</h3>
        <p className="text-cyber-dim">Start playing to analyze crowd energy</p>
      </div>
    );
  }

  return (
    <div className="cyber-card rounded-none p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-cyber-dark border-2 border-neon-green rounded-none flex items-center justify-center neon-glow-green">
            <Activity className="w-6 h-6 neon-text-green animate-neon-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold neon-text-green">Magic Dancer</h3>
            <p className="text-sm text-cyber-gray">Real-time Crowd Analysis</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1 bg-cyber-dark border border-neon-green rounded-none">
          <div className="w-2 h-2 bg-neon-green rounded-full animate-neon-pulse"></div>
          <span className="text-xs font-medium">LIVE</span>
        </div>
      </div>

      {/* Energy Visualization */}
      <div className="mb-6">
        <canvas
          ref={canvasRef}
          width={300}
          height={200}
          className="w-full h-32 bg-cyber-black border border-neon-green rounded-none"
        />
      </div>

      {/* Current Track Info */}
      {currentTrack && (
        <div className="mb-6 p-4 bg-cyber-dark border border-neon-purple rounded-none">
          <div className="flex items-center space-x-2 mb-2">
            <Music className="w-4 h-4 neon-text-purple" />
            <span className="text-sm font-medium">Now Playing</span>
          </div>
          <h4 className="font-semibold truncate">{currentTrack.title}</h4>
          <p className="text-sm text-cyber-gray truncate">{currentTrack.artist}</p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-cyber-dim">
            <span>{currentTrack.bpm} BPM</span>
            <span>Energy: {Math.round(currentTrack.energy * 100)}%</span>
          </div>
        </div>
      )}

      {/* Crowd Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className={`text-2xl font-bold mb-1 ${getEnergyColor(crowdMetrics.energy)}`}>
            {Math.round(crowdMetrics.energy)}%
          </div>
          <div className="text-xs text-cyber-gray mb-1">ENERGY</div>
          <div className={`text-xs font-bold ${getEnergyColor(crowdMetrics.energy)}`}>
            {getEnergyLevel(crowdMetrics.energy)}
          </div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold mb-1 ${getEnergyColor(crowdMetrics.engagement)}`}>
            {Math.round(crowdMetrics.engagement)}%
          </div>
          <div className="text-xs text-cyber-gray mb-1">ENGAGEMENT</div>
          <div className={`text-xs font-bold ${getEnergyColor(crowdMetrics.engagement)}`}>
            {getEnergyLevel(crowdMetrics.engagement)}
          </div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold mb-1 ${getEnergyColor(crowdMetrics.danceability)}`}>
            {Math.round(crowdMetrics.danceability)}%
          </div>
          <div className="text-xs text-cyber-gray mb-1">DANCE</div>
          <div className={`text-xs font-bold ${getEnergyColor(crowdMetrics.danceability)}`}>
            {getEnergyLevel(crowdMetrics.danceability)}
          </div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold mb-1 ${getEnergyColor(crowdMetrics.excitement)}`}>
            {Math.round(crowdMetrics.excitement)}%
          </div>
          <div className="text-xs text-cyber-gray mb-1">EXCITEMENT</div>
          <div className={`text-xs font-bold ${getEnergyColor(crowdMetrics.excitement)}`}>
            {getEnergyLevel(crowdMetrics.excitement)}
          </div>
        </div>
      </div>

      {/* Energy Trend */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Energy Trend</span>
          <TrendingUp className="w-4 h-4 neon-text-green" />
        </div>
        <div className="h-16 bg-cyber-black border border-neon-green rounded-none p-2">
          <div className="flex items-end justify-between h-full">
            {historicalData.slice(-20).map((data, index) => (
              <div
                key={index}
                className="w-1 bg-gradient-to-t from-neon-green to-neon-purple rounded-none"
                style={{ height: `${data.energy}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 mb-3">
          <Zap className="w-4 h-4 neon-text-purple" />
          <span className="text-sm font-medium">AI Recommendations</span>
        </div>
        
        {crowdMetrics.energy > 80 && (
          <div className="p-3 bg-green-900/20 border border-green-500/50 rounded-none">
            <div className="flex items-center space-x-2">
              <Heart className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">Crowd is loving it! Keep the energy high!</span>
            </div>
          </div>
        )}
        
        {crowdMetrics.energy < 40 && (
          <div className="p-3 bg-orange-900/20 border border-orange-500/50 rounded-none">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-orange-300">Consider switching to higher energy tracks</span>
            </div>
          </div>
        )}
        
        {crowdMetrics.danceability > 85 && (
          <div className="p-3 bg-purple-900/20 border border-purple-500/50 rounded-none">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Perfect danceability! Crowd is moving!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MagicDancer;