import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { OrgNode } from './OrgHierarchyPanel';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Move,
  Building2,
  RefreshCw,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function BranchHierarchyPanel() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const isExecutive =
    user?.role === 'general_manager' ||
    user?.role === 'ceo' ||
    user?.role === 'org_admin' ||
    user?.role === 'superadmin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/org/designations');
      if (res.data.success) {
        setNodes(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch designations', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const ids = new Set(nodes.map(n => n.id));
  const branchRoots = nodes.filter(n => {
    const pId =
      typeof n.parentDesignationId === 'object'
        ? (n.parentDesignationId as any)?.id
        : n.parentDesignationId;
    return !pId || !ids.has(pId);
  });

  const centerView = useCallback((smooth = true) => {
    if (!containerRef.current) return;
    const { scrollWidth, clientWidth } = containerRef.current;
    containerRef.current.scrollTo({
      left: Math.max(0, (scrollWidth - clientWidth) / 2),
      top: 0,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Auto-center the chart on root node after data loads
  useEffect(() => {
    if (!loading && branchRoots.length > 0) {
      const timer = setTimeout(() => {
        centerView(false);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [loading, branchRoots.length, centerView]);

  // Click and drag canvas panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, links, inputs, or interactive controls
    if (target.closest('button, a, input, select, textarea, [role="button"]')) {
      return;
    }

    if (!containerRef.current) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      containerRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
      containerRef.current.scrollTop = dragStart.current.scrollTop - dy;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Touch device pan support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="button"]')) {
      return;
    }
    if (!containerRef.current) return;
    const touch = e.touches[0];
    dragStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1 || !containerRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.x;
    const dy = touch.clientY - dragStart.current.y;
    containerRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
    containerRef.current.scrollTop = dragStart.current.scrollTop - dy;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(z => Math.min(1.5, Number((z + 0.1).toFixed(1))));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(1))));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setTimeout(() => centerView(true), 60);
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin text-primary/60" />
        <p className="text-sm font-medium">Loading Organization Hierarchy...</p>
      </div>
    );
  }

  const title = isExecutive ? 'Organization Hierarchy' : 'Branch Hierarchy';
  const subtitle = isExecutive
    ? 'Complete institutional hierarchy, reporting tree, and designation structure.'
    : 'Your position and the reporting team beneath you.';

  return (
    <div className="space-y-4">
      {/* Header with Title and Control Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
              {isExecutive ? 'Full Organization' : 'Branch Scope'}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur border rounded-xl p-1.5 shadow-sm self-start md:self-auto">
          <div className="flex items-center text-xs text-muted-foreground px-2 gap-1.5 hidden sm:flex">
            <Move className="w-3.5 h-3.5 text-primary" />
            <span>Drag to pan</span>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={handleZoomOut}
            disabled={zoom <= 0.4}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>

          <span className="text-xs font-mono font-medium px-1.5 min-w-[42px] text-center select-none">
            {Math.round(zoom * 100)}%
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={handleZoomIn}
            disabled={zoom >= 1.5}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={handleResetZoom}
            title="Reset Zoom to 100%"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-lg text-xs gap-1.5 border-dashed"
            onClick={() => centerView(true)}
            title="Center Tree in Viewport"
          >
            <Maximize2 className="w-3.5 h-3.5 text-primary" />
            <span>Center</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={fetchData}
            title="Refresh Hierarchy"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Interactive Draggable Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative border rounded-2xl bg-gradient-to-b from-slate-50/80 via-slate-50/40 to-slate-100/60 dark:from-slate-950/40 dark:to-slate-900/40 overflow-auto min-h-[560px] max-h-[82vh] shadow-inner select-none transition-colors",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Subtle grid pattern background for intuitive canvas feeling */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-15"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {branchRoots.length > 0 ? (
          /* Safe wrapper without flex justify-center on the scroll container so content never clips to negative coordinates */
          <div
            className="inline-flex min-w-full justify-center p-8 sm:p-14 transition-transform duration-150 ease-out"
            style={{
              zoom: zoom,
              transform:
                typeof CSS !== 'undefined' && CSS.supports && !CSS.supports('zoom', '1')
                  ? `scale(${zoom})`
                  : undefined,
              transformOrigin: 'top center',
            } as React.CSSProperties}
          >
            <div className="flex gap-12 justify-center pt-2">
              {branchRoots.map(root => (
                <OrgNode
                  key={root.id}
                  node={root}
                  allNodes={nodes}
                  allUsers={[]}
                  allDepts={[]}
                  isReadOnly={true}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-24 flex flex-col items-center justify-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="font-semibold text-foreground">No hierarchy found for your position.</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Please contact your HR administrator to place your designation in the organization chart.
            </p>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Showing {nodes.length} positions in structure</span>
        <span>Click and hold to pan in any direction • Use controls above to zoom</span>
      </div>
    </div>
  );
}
