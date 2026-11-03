import { useEffect } from 'react';

/** Release channel for a public download URL (matches the server's app_release_<key>). */
export function apkPlatformForPath(pathname: string, search: string): string | null {
  const path = pathname.replace(/\/+$/, '');
  const fromQuery = new URLSearchParams(search).get('platform');
  const known = (v: string | null) => (v === 'psc' || v === 'eca' ? v : 'mobile');

  if (path === '/download/psc') return 'psc';
  if (path === '/download/eca') return 'eca';
  if (path === '/download/erm' || path === '/download/mobile') return 'mobile';
  if (['/download', '/apk', '/app-download', '/download/apk'].includes(path)) return known(fromQuery);
  return null;
}

/**
 * Public download links (/download, /download/psc, /download/eca, ...) have no
 * page of their own: they send the browser straight to the APK, which the
 * phone then downloads.
 */
export function ApkDownloadRedirect({ platform }: { platform: string }) {
  const url = `/api/v1/app-releases/download/${platform}`;
  useEffect(() => {
    window.location.replace(url);
  }, [url]);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }}>
      Starting your download… <a href={url}>Tap here if it does not start</a>
    </div>
  );
}
