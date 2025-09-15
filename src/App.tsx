import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import StudioView from './components/StudioView';
import PlayerView from './components/PlayerView';
import { Playlist } from './types';

type ViewType = 'landing' | 'studio' | 'player';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);

  const handleStartMixing = () => {
    setCurrentView('studio');
  };

  const handlePlaylistGenerated = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    setCurrentView('player');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    setCurrentPlaylist(null);
  };

  const handleBackToStudio = () => {
    setCurrentView('studio');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {currentView === 'landing' && (
        <LandingPage onStartMixing={handleStartMixing} />
      )}
      
      {currentView === 'studio' && (
        <StudioView 
          onPlaylistGenerated={handlePlaylistGenerated}
          onBack={handleBackToLanding}
        />
      )}
      
      {currentView === 'player' && currentPlaylist && (
        <PlayerView 
          playlist={currentPlaylist}
          onBack={handleBackToStudio}
        />
      )}
    </div>
  );
}

export default App;