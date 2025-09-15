import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import StudioView from './components/StudioView';
import PlayerView from './components/PlayerView';
import PlaylistEditor from './components/PlaylistEditor';
import AnalyticsExport from './components/AnalyticsExport';
import LibraryProfile from './components/LibraryProfile';
import { Playlist } from './types';
import { ArrowLeft, Play } from 'lucide-react';

type ViewType = 'landing' | 'studio' | 'player';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'studio' | 'editor' | 'player' | 'analytics' | 'library'>('landing');
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
    
    // Load recent sessions (mock data)
    setRecentSessions([
      { id: '1', name: 'Electronic Night', tracks: 15, created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: '2', name: 'House Party Mix', tracks: 20, created_at: new Date(Date.now() - 172800000).toISOString() }
    ]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const handleStartMixing = () => {
    setCurrentView('studio');
  };

  const handlePlaylistGenerated = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    setCurrentView('editor');
  };

  const handlePlaylistEdited = (playlist: Playlist) => {
    console.log('App', 'Playlist edited, switching to player', {
      playlistId: playlist.id,
      trackCount: playlist.tracks.length
    });
    
    setCurrentPlaylist(playlist);
    setCurrentView('player');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    setCurrentPlaylist(null);
  };

  const handleSessionEnd = () => {
    console.log('App', 'Session ended, showing analytics');
    if (currentSession) {
      setCurrentView('analytics');
    }
  };

  const handleBackToEditor = () => {
    console.log('App', 'Returning to editor');
    setCurrentView('editor');
  };

  const handleLibraryAccess = () => {
    console.log('App', 'Accessing library');
    setCurrentView('library');
  };

  const handlePlaylistSelect = (playlist: Playlist) => {
    console.log('App', 'Playlist selected from library');
    setCurrentPlaylist(playlist);
    setCurrentView('editor');
  };

  const handleEditAgain = () => {
    console.log('App', 'Edit again requested');
    setCurrentView('editor');
  };

  const handleBackToLandingFromAnalytics = () => {
    console.log('App', 'Returning to landing page');
    setCurrentView('landing');
  };

  const handleSaveToLibrary = (playlist: Playlist) => {
    setSavedPlaylists(prev => [...prev, playlist]);
  };

  const handleTrackReorder = (fromIndex: number, toIndex: number) => {
    if (!currentPlaylist) return;
    
    const newTracks = [...currentPlaylist.tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    
    const updatedPlaylist = { ...currentPlaylist, tracks: newTracks };
    setCurrentPlaylist(updatedPlaylist);
  };

  const handleTrackRemove = (index: number) => {
    if (!currentPlaylist) return;
    
    const newTracks = currentPlaylist.tracks.filter((_, i) => i !== index);
    const updatedPlaylist = { ...currentPlaylist, tracks: newTracks };
    setCurrentPlaylist(updatedPlaylist);
  };

  const handlePlaylistUpdate = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
  };

  const handleBackToStudio = () => {
    setCurrentView('studio');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {currentView === 'landing' && (
        <LandingPage 
          onStartMixing={handleStartMixing}
          onLibraryAccess={handleLibraryAccess}
          recentSessions={recentSessions}
        />
      )}
      
      {currentView === 'studio' && (
        <StudioView 
          onPlaylistGenerated={handlePlaylistGenerated}
          onBack={handleBackToLanding}
        />
      )}
      
      {currentView === 'editor' && currentPlaylist && (
        <div className="min-h-screen bg-cyber-black">
          <div className="px-4 lg:px-6 py-4 lg:py-6 border-b border-neon-green">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToStudio}
                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-none bg-cyber-dark border border-neon-green hover:neon-glow-green flex items-center justify-center transition-all"
                >
                  <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 neon-text-green" />
                </button>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-cyber-white">Playlist Editor</h1>
                  <p className="text-sm text-cyber-gray">Fine-tune your AI-generated set</p>
                </div>
              </div>
              <button
                onClick={() => handlePlaylistEdited(currentPlaylist)}
                className="cyber-button px-4 py-2 rounded-none flex items-center space-x-2"
              >
                <Play className="w-4 h-4 neon-text-green" />
                <span>Send to Player</span>
              </button>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
            <PlaylistEditor
              playlist={currentPlaylist}
              currentTrackIndex={0}
              isPlaying={false}
              onTrackSelect={() => {}}
              onTrackRemove={handleTrackRemove}
              onTrackReorder={handleTrackReorder}
              onPlaylistUpdate={handlePlaylistUpdate}
            />
          </div>
        </div>
      )}
      
      {currentView === 'player' && currentPlaylist && (
        <PlayerView 
          playlist={currentPlaylist}
          onBack={handleBackToStudio}
        />
      )}
        
      {currentView === 'analytics' && currentPlaylist && currentSession && (
        <AnalyticsExport
          playlist={currentPlaylist}
          session={currentSession}
          onBack={handleBackToStudio}
          onSaveToLibrary={handleSaveToLibrary}
          onEditAgain={handleEditAgain}
        />
      )}
        
      {currentView === 'library' && (
        <LibraryProfile
          user={user}
          onBack={handleBackToStudio}
          onPlaylistSelect={handlePlaylistSelect}
          onCreateNew={handleBackToStudio}
        />
      )}
    </div>
  );
}

export default App;