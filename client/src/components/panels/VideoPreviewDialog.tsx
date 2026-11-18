import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

/** An embeddable address for a video link: YouTube or Vimeo become an iframe, anything else plays as a file */
export function toEmbed(raw: string): { kind: 'iframe' | 'file' | 'none'; src: string } {
  if (!raw) return { kind: 'none', src: '' };
  let url = raw.trim();
  const iframeSrc = /src="([^"]+)"/.exec(url);
  if (url.includes('<iframe') && iframeSrc) url = iframeSrc[1];

  const yt =
    /youtu\.be\/([\w-]{6,})/.exec(url) ||
    /[?&]v=([\w-]{6,})/.exec(url) ||
    /youtube\.com\/(?:embed|shorts|live|v)\/([\w-]{6,})/.exec(url);
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1` };
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (vimeo) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes('amazonaws.com') || url.startsWith('/uploads/')) {
    return { kind: 'file', src: api.getFileUrl(url) };
  }
  return { kind: 'none', src: url };
}

/** A pop-up player for a saved video link, so the person who added it can check it plays */
export function VideoPreviewDialog({ video, onClose }: { video: { title: string; videoUrl: string } | null; onClose: () => void }) {
  const embed = video ? toEmbed(video.videoUrl) : null;
  return (
    <Dialog open={!!video} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle className="truncate">{video?.title}</DialogTitle></DialogHeader>
        {embed?.kind === 'iframe' && (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe src={embed.src} title={video?.title} className="w-full h-full" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        )}
        {embed?.kind === 'file' && <video src={embed.src} controls className="w-full rounded-lg bg-black aspect-video" />}
        {embed?.kind === 'none' && (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">This link can't be played inside the page.</p>
            <Button asChild variant="outline"><a href={embed.src} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Open the video link</a></Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
