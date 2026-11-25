import { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, CheckCircle2, LogIn, LogOut, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Webcam from 'react-webcam';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default marker icons (Vite/webpack issue)
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface TodayAttendance {
  id?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  workingHours?: number;
  isLate?: boolean;
  lateMinutes?: number;
  checkInLocation?: { latitude: number; longitude: number; address?: string };
  checkOutLocation?: { latitude: number; longitude: number; address?: string };
}

interface PunchWidgetProps {
  compact?: boolean;
}

export function PunchWidget({ compact = false }: PunchWidgetProps) {
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [camKey, setCamKey] = useState(0);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [punchType, setPunchType] = useState<'in' | 'out'>('in');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastFetchDate, setLastFetchDate] = useState(new Date().getDate());
  const { user } = useAuth();
  const webcamRef = useRef<Webcam>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Live clock and midnight reset check
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // If the day has changed (crossed midnight), refresh the attendance state
      if (now.getDate() !== lastFetchDate) {
        setLastFetchDate(now.getDate());
        fetchToday();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lastFetchDate]);

  useEffect(() => {
    fetchToday();
  }, []);

  const fetchToday = async () => {
    try {
      const res = await api.get('/attendance/today');
      setToday(res.data.data);
    } catch (err) {
      console.error('Failed to fetch today attendance:', err);
      setToday(null);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      })
    );

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch (err) {
      console.error('Geocoding failed:', err);
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const openPunchMap = async (type: 'in' | 'out') => {
    setPunchType(type);
    setLocating(true);
    setMapOpen(true);
    setCapturedPhoto(null);

    try {
      const pos = await getLocation();
      const { latitude: lat, longitude: lng } = pos.coords;
      const address = await reverseGeocode(lat, lng);
      setLocation({ lat, lng, address });
    } catch (err: any) {
      toast.warning('Could not get precise location. Continuing without it.');
      setLocation({ lat: 0, lng: 0, address: 'Location Unknown (Access Denied/Unavailable)' });
    } finally {
      setLocating(false);
    }
  };

  const handleCapturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedPhoto(imageSrc);
      }
    }
  };

  // Init Leaflet map when dialog opens and location is ready
  useEffect(() => {
    if (!mapOpen || !location || !mapRef.current) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      // Destroy existing map
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }

      const map = L.map(mapRef.current).setView([location.lat, location.lng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // User marker (blue)
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        className: '',
      });

      markerRef.current = L.marker([location.lat, location.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>Your Location</b><br/>${location.address}`)
        .openPopup();

      // Accuracy circle
      L.circle([location.lat, location.lng], {
        radius: 30,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);

      leafletMap.current = map;
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [mapOpen, location]);

  // Cleanup map on close
  useEffect(() => {
    if (!mapOpen && leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }
  }, [mapOpen]);

  const handlePunch = async () => {
    if (!location) return;
    
    if (user?.requireSelfiePunchIn && !capturedPhoto) {
      setCamError(null);
      setWebcamOpen(true);
      return;
    }

    setPunching(true);
    try {
      const endpoint = punchType === 'in' ? '/attendance/punch-in' : '/attendance/punch-out';
      const res = await api.post(endpoint, {
        latitude: location.lat === 0 ? undefined : location.lat,
        longitude: location.lng === 0 ? undefined : location.lng,
        address: location.address,
        photo: capturedPhoto
      });
      toast.success(res.data.message || (punchType === 'in' ? 'Punched in!' : 'Punched out!'));
      setMapOpen(false);
      setWebcamOpen(false);
      setCapturedPhoto(null);
      fetchToday();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Punch failed';
      toast.error(msg);
      // Fallback: if server demands selfie photo, open camera immediately
      if (msg.toLowerCase().includes('selfie') && !capturedPhoto) {
        setCamError(null);
        setWebcamOpen(true);
      }
    } finally {
      setPunching(false);
    }
  };

  const hasPunchedIn = !!today?.checkIn;
  const hasPunchedOut = !!today?.checkOut;

  const formatTime = (iso?: string) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const workingDuration = () => {
    if (!today?.checkIn) return null;
    const start = new Date(today.checkIn).getTime();
    const end = today.checkOut ? new Date(today.checkOut).getTime() : Date.now();
    const mins = Math.floor((end - start) / 60000);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  if (loading) {
    if (compact) {
      return (
        <div className="flex items-center justify-center w-10 h-10">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {user?.requiresAttendance === false && compact ? (
        <div className="flex items-center h-11 rounded-full bg-white dark:bg-card border border-slate-200/70 dark:border-white/10 px-4">
          <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-muted-foreground whitespace-nowrap">
            <span className="sm:hidden">No punch needed</span>
            <span className="hidden sm:inline">Attendance marking is not required.</span>
          </span>
        </div>
      ) : user?.requiresAttendance === false ? (
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground font-medium">Attendance marking is not required.</p>
          </CardContent>
        </Card>
      ) : user?.allowSystemPunchIn === false ? (
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <LogOut className="w-8 h-8 mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground font-medium">System punch is disabled.</p>
            <p className="text-xs text-muted-foreground">Please use the biometric device.</p>
          </CardContent>
        </Card>
      ) : compact ? (
        <div className="flex items-center gap-3 h-11 rounded-full bg-white dark:bg-card shadow-sm border border-slate-200/70 dark:border-white/10 hover:border-slate-300 transition-colors p-1 sm:pl-1.5 sm:pr-1">
          <div className="hidden sm:flex items-center gap-2.5 pl-0.5">
            <span className="w-8 h-8 rounded-full bg-[#eaf6e6] dark:bg-emerald-500/10 text-[#256c1d] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1 whitespace-nowrap">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <span className="w-px h-6 bg-slate-200 dark:bg-white/10 ml-1" />
          </div>
          {!hasPunchedIn ? (
            <Button
              size="sm"
              onClick={() => openPunchMap('in')}
              className="h-9 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] gap-1.5 focus-visible:ring-2 focus-visible:ring-[#54b947]/50 focus-visible:ring-offset-1 text-xs font-semibold shadow-none"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Punch In</span>
            </Button>
          ) : !hasPunchedOut ? (
            <Button
              size="sm"
              onClick={() => openPunchMap('out')}
              className="h-9 px-5 rounded-full bg-[#0b1d14] hover:bg-[#13301f] text-white gap-1.5 focus-visible:ring-2 focus-visible:ring-[#54b947]/50 focus-visible:ring-offset-1 text-xs font-semibold shadow-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#8ae47e] animate-pulse" />
              <span className="hidden sm:inline">Punch Out</span>
              <LogOut className="w-3.5 h-3.5 sm:hidden" />
              {workingDuration() && <span className="hidden md:inline text-[#8ae47e] font-medium tabular-nums">· {workingDuration()}</span>}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled
              className="h-9 px-5 rounded-full bg-[#eaf6e6] dark:bg-emerald-500/10 text-[#256c1d] dark:text-emerald-400 gap-1.5 text-xs font-semibold shadow-none opacity-100"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Punched Out</span>
            </Button>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden border-none shadow-xl bg-card/60 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-primary" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Live Clock */}
            <div className="text-center mb-4">
              <p className="text-4xl font-bold tracking-tight tabular-nums">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            {/* Status row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Check In</p>
                <p className="text-lg font-bold">{formatTime(today?.checkIn)}</p>
                {today?.isLate && (
                  <Badge className="text-[9px] bg-warning/10 text-warning mt-1">
                    +{today.lateMinutes}m late
                  </Badge>
                )}
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Check Out</p>
                <p className="text-lg font-bold">{formatTime(today?.checkOut)}</p>
                {today?.isEarlyExit && (today.earlyExitMinutes || 0) > 0 ? (
                  <Badge className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20 mt-1">
                    {today.earlyExitMinutes}m early exit
                  </Badge>
                ) : workingDuration() ? (
                  <p className="text-[10px] text-muted-foreground mt-1">{workingDuration()}</p>
                ) : null}
              </div>
            </div>

            {/* Status badge */}
            {today?.status && (
              <div className="flex justify-center mb-4">
                <Badge className={
                  today.status === 'present' ? 'bg-success/10 text-success' :
                  today.status === 'late' ? 'bg-warning/10 text-warning' :
                  'bg-muted text-muted-foreground'
                }>
                  {today.status === 'present' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {today.status.replace('_', ' ')}
                </Badge>
              </div>
            )}

            {/* Punch buttons */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={hasPunchedIn}
                onClick={() => openPunchMap('in')}
                variant={hasPunchedIn ? 'outline' : 'default'}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {hasPunchedIn ? 'Punched In' : 'Punch In'}
              </Button>
              <Button
                className="flex-1"
                disabled={!hasPunchedIn || hasPunchedOut}
                onClick={() => openPunchMap('out')}
                variant={hasPunchedOut ? 'outline' : 'secondary'}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {hasPunchedOut ? 'Punched Out' : 'Punch Out'}
              </Button>
            </div>

            {/* Location of last punch */}
            {today?.checkInLocation && (
              <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {today.checkInLocation.address || `${today.checkInLocation.latitude}, ${today.checkInLocation.longitude}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Map Dialog */}
      <Dialog open={mapOpen} onOpenChange={(o) => { if (!punching) setMapOpen(o); }}>
        <DialogContent className="wizard-form max-w-lg p-0 overflow-y-auto max-h-[95vh] sm:max-h-none rounded-[2rem] border-0 bg-white" data-no-fullscreen="true" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader className="p-6 pb-3 text-left">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {punchType === 'in' ? 'Punch In' : 'Punch Out'} — Confirm Location
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Check that the pin is where you are before you confirm.</p>
          </DialogHeader>

          {locating ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#54b947]" />
              <p className="text-sm text-muted-foreground">Getting your location...</p>
            </div>
          ) : location ? (
            <>
              {/* Leaflet Map */}
              <div className="px-6">
                <div ref={mapRef} className="w-full h-48 sm:h-60 rounded-3xl overflow-hidden border border-slate-100" style={{ zIndex: 0 }} />
              </div>

              <div className="p-6 space-y-4">
                <div className="rounded-2xl bg-[#f4f6f3] px-4 py-3.5">
                  <p className="text-xs font-medium text-slate-500">Your location</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2">{location.address}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    {punchType === 'in' ? 'Check-in' : 'Check-out'} time{' '}
                    <span className="font-semibold text-slate-900">
                      {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </p>
                  {user?.requireSelfiePunchIn && (
                    <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold">Selfie required</span>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => setMapOpen(false)} disabled={punching}>
                    Cancel
                  </Button>
                  <Button className="flex-1 h-12 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handlePunch} disabled={punching}>
                    {punching ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                    ) : user?.requireSelfiePunchIn && !capturedPhoto ? (
                      <>Take selfie to {punchType === 'in' ? 'punch in' : 'punch out'}</>
                    ) : (
                      <>Confirm {punchType === 'in' ? 'punch in' : 'punch out'}</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-4 p-6">
              <p className="text-sm text-center text-muted-foreground">
                Location access denied. Please enable GPS in your browser settings.
              </p>
              <Button variant="outline" className="h-11 px-6 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => setMapOpen(false)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Webcam Dialog */}
      <Dialog open={webcamOpen} onOpenChange={setWebcamOpen}>
        <DialogContent className="wizard-form sm:max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold tracking-tight">Take a selfie to punch {punchType === 'in' ? 'in' : 'out'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {!capturedPhoto ? (
              <>
                <div className="w-full aspect-video rounded-3xl overflow-hidden bg-[#0b1d14] relative">
                  {camError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-white text-sm">
                      <p>{camError}</p>
                      <Button size="sm" className="h-10 px-5 rounded-full bg-white text-[#0b1d14] hover:bg-[#eaf6e6] font-semibold" onClick={() => { setCamError(null); setCamKey(k => k + 1); }}>
                        Try again
                      </Button>
                    </div>
                  ) : (
                  <Webcam
                    key={camKey}
                    onUserMediaError={(err: any) => {
                      const name = err?.name || '';
                      setCamError(
                        !window.isSecureContext
                          ? 'Camera needs a secure (https) connection. Open the site using https://pypeerm.com.'
                          : name === 'NotAllowedError' || name === 'SecurityError'
                          ? 'Camera access is blocked for this site. Click the lock icon in the address bar, set Camera to Allow, then press Try again.'
                          : name === 'NotFoundError' || name === 'OverconstrainedError'
                          ? 'No camera was found on this device.'
                          : name === 'NotReadableError'
                          ? 'The camera is in use by another app. Close it and press Try again.'
                          : 'Could not start the camera. Check your browser permissions and press Try again.'
                      );
                    }}
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user" }}
                    className="w-full h-full object-cover"
                  />
                  )}
                </div>
                <Button className="w-full h-12 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleCapturePhoto} disabled={!!camError}>
                  Capture photo
                </Button>
              </>
            ) : (
              <>
                <div className="w-full aspect-video rounded-3xl overflow-hidden border border-slate-100">
                  <img src={capturedPhoto} alt="Selfie" className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-3 w-full">
                  <Button variant="outline" className="flex-1 h-12 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]" onClick={() => setCapturedPhoto(null)}>
                    Retake
                  </Button>
                  <Button className="flex-1 h-12 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handlePunch} disabled={punching}>
                    {punching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Confirm punch
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
