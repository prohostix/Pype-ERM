import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Check } from 'lucide-react';

interface CustomYouTubePlayerProps {
  videoUrl: string;
  onPlay?: () => void;
  onEnded?: () => void;
  onHeartbeat?: (duration: number) => void;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const QUALITY_LABELS: Record<string, string> = {
  highres: 'Original (4K)',
  hd2160: '2160p (4K)',
  hd1440: '1440p (2K)',
  hd1080: '1080p (HD)',
  hd720: '720p (HD)',
  large: '480p',
  medium: '360p',
  small: '240p',
  tiny: '144p',
  auto: 'Auto',
};

const DEFAULT_QUALITIES = ['auto', 'hd1080', 'hd720', 'large', 'medium', 'small'];

const QUALITIES = [
  { id: 'auto', label: 'Auto (HD)' },
  { id: 'hd1080', label: '1080p (Full HD)' },
  { id: 'hd720', label: '720p (HD)' },
  { id: 'large', label: '480p (Standard)' },
  { id: 'medium', label: '360p (Medium)' },
  { id: 'small', label: '240p (Data Saver)' },
];

const extractVideoId = (url: string) => {
  if (!url) return '';
  let cleanUrl = url;
  if (cleanUrl.includes('<iframe')) {
    const match = cleanUrl.match(/src="([^"]+)"/);
    if (match) cleanUrl = match[1];
  }
  let videoId = '';
  if (cleanUrl.includes('youtu.be/')) {
    videoId = cleanUrl.split('youtu.be/')[1].split('?')[0].split('&')[0];
  } else if (cleanUrl.includes('watch?v=')) {
    videoId = cleanUrl.split('watch?v=')[1].split('&')[0].split('#')[0];
  } else if (cleanUrl.includes('embed/')) {
    videoId = cleanUrl.split('embed/')[1].split('?')[0].split('"')[0];
  } else if (cleanUrl.includes('shorts/')) {
    videoId = cleanUrl.split('shorts/')[1].split('?')[0].split('&')[0];
  } else if (cleanUrl.includes('live/')) {
    videoId = cleanUrl.split('live/')[1].split('?')[0].split('&')[0];
  } else if (cleanUrl.includes('v/')) {
    videoId = cleanUrl.split('v/')[1].split('?')[0].split('&')[0];
  }
  return videoId;
};

export const CustomYouTubePlayer: React.FC<CustomYouTubePlayerProps> = ({ videoUrl, onPlay, onEnded, onHeartbeat }) => {
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onHeartbeatRef = useRef(onHeartbeat);
  onHeartbeatRef.current = onHeartbeat;

  const videoId = extractVideoId(videoUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const qualityMenuRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>(DEFAULT_QUALITIES);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  useEffect(() => {
    // Load YouTube API script if it doesn't exist
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  const updateQualityLevels = (player: any) => {
    try {
      if (player && typeof player.getAvailableQualityLevels === 'function') {
        const levels: string[] = player.getAvailableQualityLevels();
        if (Array.isArray(levels) && levels.length > 0) {
          const unique = Array.from(new Set(['auto', ...levels]));
          setAvailableQualities(unique);
        }
      }
      if (player && typeof player.getPlaybackQuality === 'function') {
        const current = player.getPlaybackQuality();
        if (current && current !== 'unknown') {
          setCurrentQuality(current);
        }
      }
    } catch {}
  };

  const initializePlayer = () => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player(`youtube-player-${videoId}`, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        fs: 0,
        playsinline: 1,
      },
      events: {
        onReady: (event: any) => {
          setDuration(event.target.getDuration());
          updateQualityLevels(event.target);
        },
        onStateChange: (event: any) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          if (event.data === window.YT.PlayerState.PLAYING) {
            setHasStarted(true);
            setIsEnded(false);
            updateQualityLevels(event.target);
            onPlayRef.current?.();
          }
          if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            setIsEnded(true);
            onEndedRef.current?.();
          }
        },
        onPlaybackQualityChange: (event: any) => {
          if (event.data && event.data !== 'unknown') {
            setCurrentQuality(event.data);
          }
        },
      },
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && playerRef.current) {
      interval = setInterval(() => {
        setCurrentTime(playerRef.current.getCurrentTime());
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout;
    if (isPlaying) {
      heartbeatInterval = setInterval(() => {
        onHeartbeatRef.current?.(10);
      }, 10000);
    }
    return () => clearInterval(heartbeatInterval);
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (isEnded) {
      setIsEnded(false);
      playerRef.current.seekTo(0, true);
      playerRef.current.playVideo();
      return;
    }
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
    }
  };

  const handleVolumeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
      if (volume === 0) setVolume(100);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (playerRef.current) {
      playerRef.current.setVolume(vol);
      if (vol === 0) {
        setIsMuted(true);
        playerRef.current.mute();
      } else if (isMuted) {
        setIsMuted(false);
        playerRef.current.unMute();
      }
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    setShowQualityMenu(false);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(rate);
    }
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    setShowQualityMenu(false);
    if (playerRef.current) {
      const curTime = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
      const targetQ = quality === 'auto' ? 'default' : quality;
      if (typeof playerRef.current.setPlaybackQuality === 'function') {
        playerRef.current.setPlaybackQuality(targetQ);
      }
      if (typeof playerRef.current.setPlaybackQualityRange === 'function') {
        playerRef.current.setPlaybackQualityRange(targetQ, targetQ);
      }
      if (typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById({
          videoId,
          startSeconds: curTime,
          suggestedQuality: targetQ,
        });
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target as Node)) {
        setShowQualityMenu(false);
      }
    };
    if (showQualityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQualityMenu]);

  const getDisplayQualityLabel = () => {
    let qText = 'Auto';
    if (selectedQuality === 'hd1080') qText = '1080p';
    else if (selectedQuality === 'hd720') qText = '720p';
    else if (selectedQuality === 'large') qText = '480p';
    else if (selectedQuality === 'medium') qText = '360p';
    else if (selectedQuality === 'small') qText = '240p';
    else if (selectedQuality === 'highres') qText = '4K';
    else if (QUALITY_LABELS[selectedQuality]) qText = QUALITY_LABELS[selectedQuality].split(' ')[0];

    return playbackRate === 1 ? qText : `${qText} • ${playbackRate}x`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full h-full aspect-video bg-black select-none ${isFullscreen ? 'rounded-none' : 'rounded-xl'} overflow-hidden group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* The IFrame Layer with vertical letterbox masking: Hides YouTube header & watermark with 0% video crop */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <div 
          style={{ 
            position: 'absolute', 
            top: '-18%', 
            left: '0', 
            width: '100%', 
            height: '136%' 
          }}
          className="[&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0"
        >
          <div id={`youtube-player-${videoId}`} className="w-full h-full" />
        </div>
      </div>

      {/* Poster Layer (Only show before start to hide initial YT UI) */}
      {!hasStarted && (
        <div 
          className="absolute inset-0 z-10 bg-gray-900 flex items-center justify-center cursor-pointer"
          onClick={handlePlayPause}
        >
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Interceptor Overlay (Blocks right-click and any link navigation to YouTube) */}
      <div
        onClick={() => {
          if (showQualityMenu) {
            setShowQualityMenu(false);
          } else {
            handlePlayPause();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 cursor-pointer z-20"
      />

      {/* End-screen shield (prevents YouTube recommended related videos) */}
      {isEnded && (
        <div className="absolute inset-0 z-30 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center mb-4 text-red-500">
            <Check size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Lesson Completed</h3>
          <p className="text-sm text-zinc-400 max-w-sm mb-6">You have completed this video lecture.</p>
          <button
            type="button"
            onClick={() => {
              setIsEnded(false);
              if (playerRef.current) {
                playerRef.current.seekTo(0, true);
                playerRef.current.playVideo();
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-all shadow-lg hover:scale-105"
          >
            <Play size={16} className="fill-white" />
            Watch Again
          </button>
        </div>
      )}

      {/* Custom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-30 transition-opacity duration-300 ${
          isHovered || !isPlaying || showQualityMenu ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Timeline */}
        <div className="flex items-center gap-3 mb-2" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-white/90 font-medium w-10 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-2 transition-all"
          />
          <span className="text-xs text-white/90 font-medium w-10">{formatTime(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
              className="text-white hover:text-red-500 transition-colors p-1"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            
            <div className="flex items-center gap-2 group/vol" onClick={e => e.stopPropagation()}>
              <button 
                onClick={handleVolumeToggle}
                className="text-white hover:text-gray-300 transition-colors p-1"
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white transition-all duration-300 ease-out"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Settings & Quality Menu */}
            <div className="relative" ref={qualityMenuRef} onClick={e => e.stopPropagation()}>
              <button 
                type="button"
                onClick={() => setShowQualityMenu(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all border border-white/10 shadow-sm"
                title="Playback Settings"
              >
                <Settings size={15} className={showQualityMenu ? 'rotate-90 transition-transform duration-200 text-red-500' : 'transition-transform duration-200'} />
                <span className="text-[11px] font-semibold tracking-wide">
                  {getDisplayQualityLabel()}
                </span>
              </button>

              {/* Settings Dropdown Popover */}
              {showQualityMenu && (
                <div 
                  className="absolute bottom-full right-0 mb-2 w-56 bg-zinc-950/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-2.5 z-40 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Video Quality Options */}
                  <div className="mb-3">
                    <div className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-zinc-400 border-b border-white/10 mb-1 flex items-center justify-between">
                      <span>Video Quality</span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {selectedQuality === 'auto' ? 'Auto' : selectedQuality}
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                      {QUALITIES.map((q) => {
                        const isSelected = selectedQuality === q.id;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => handleQualityChange(q.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left ${
                              isSelected 
                                ? 'bg-red-600/25 text-red-400 font-semibold border border-red-500/20' 
                                : 'text-zinc-200 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span>{q.label}</span>
                            {isSelected && <Check size={14} className="text-red-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Playback Speed */}
                  <div>
                    <div className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-zinc-400 border-b border-white/10 mb-1 flex items-center justify-between">
                      <span>Playback Speed</span>
                      <span className="text-[9px] text-zinc-400">{playbackRate}x</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 pt-0.5">
                      {[0.75, 1, 1.25, 1.5, 2].map(rate => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => handleSpeedChange(rate)}
                          className={`py-1 text-center text-xs rounded-md font-medium transition-colors ${
                            playbackRate === rate
                              ? 'bg-red-600 text-white font-bold'
                              : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {rate === 1 ? '1x' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button 
              type="button"
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors p-1.5 rounded-lg hover:bg-white/10"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
