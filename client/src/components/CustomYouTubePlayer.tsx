import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

interface CustomYouTubePlayerProps {
  videoUrl: string;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

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

export const CustomYouTubePlayer: React.FC<CustomYouTubePlayerProps> = ({ videoUrl }) => {
  const videoId = extractVideoId(videoUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

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

  const initializePlayer = () => {
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player(`youtube-player-${videoId}`, {
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
        },
        onStateChange: (event: any) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          if (event.data === window.YT.PlayerState.PLAYING) {
            setHasStarted(true);
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

  const handlePlayPause = () => {
    if (!playerRef.current) return;
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* The IFrame Layer with scale hack */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <div 
          style={{ transform: 'scale(1.33)', transformOrigin: 'center', width: '100%', height: '100%' }}
        >
          <div id={`youtube-player-${videoId}`} className="w-full h-full" />
        </div>
      </div>

      {/* Poster Layer (Only show if not started to hide initial YT UI) */}
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

      {/* Interceptor Overlay */}
      <div
        onClick={handlePlayPause}
        className="absolute inset-0 cursor-pointer z-20"
      />

      {/* Top/Bottom edge blur to hide stray white lines from iframe scale */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black to-transparent opacity-80 z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black to-transparent opacity-80 z-20 pointer-events-none" />

      {/* Custom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-30 transition-opacity duration-300 ${
          isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'
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

          <button 
            onClick={toggleFullscreen}
            className="text-white hover:text-gray-300 transition-colors p-1"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};
