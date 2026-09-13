import React, { useEffect, useState } from 'react';

type Connection = { parent: string; child: string; path: string };
type Trunk = { parent: string; path: string; highlighted: boolean };

export function ChapterConnections({ containerRef, revision, excludedId, depthOverrides }: { excludedId?: string | null; depthOverrides?: Map<string, number>; containerRef: React.RefObject<HTMLDivElement | null>; revision: string }) {
  const [drawing, setDrawing] = useState<{ connections: Connection[]; trunks: Trunk[] }>({ connections: [], trunks: [] });
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const nodes = [...container.querySelectorAll<HTMLElement>('[data-chapter-node]')];
    const measure = () => {
      const origin = container.getBoundingClientRect();
      const ancestors: { id: string; x: number; bottom: number }[] = [];
      const connections: Connection[] = [];
      const parents = new Map<string, { x: number; top: number; bottom: number; highlighted: boolean }>();
      const textAreas = [...container.querySelectorAll<HTMLElement>('[data-chapter-connection-obstacle]')]
        .filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect());
      const n = (value: number) => Math.round(value * 10) / 10;
      for (const node of nodes) {
        if (!node.getClientRects().length || node.dataset.chapterNode === excludedId) continue;
        const bounds = node.getBoundingClientRect();
        const depth = Math.min((depthOverrides?.get(node.dataset.chapterNode!) ?? Number(node.dataset.chapterDepth)) || 0, ancestors.length);
        ancestors.length = depth;
        const parent = ancestors[depth - 1];
        const anchorElement = node.querySelector<HTMLElement>('[data-chapter-anchor]');
        const anchor = anchorElement?.getBoundingClientRect() ?? bounds;
        const x = anchor.left - origin.left + (anchorElement ? anchor.width / 2 : Math.min(22, anchor.width / 2));
        const y = anchor.top - origin.top + (anchorElement ? anchor.height / 2 : Math.min(22, anchor.height / 2));
        const id = node.dataset.chapterNode!;
        if (parent) {
          const endX = Math.max(parent.x, x - 12);
          const radius = Math.max(0, Math.min(endX - parent.x, y - parent.bottom));
          // Siblings share their parent's rail; each has just one soft turn.
          connections.push({ parent: parent.id, child: id, path: `M ${n(parent.x)} ${n(y - radius)} Q ${n(parent.x)} ${n(y)} ${n(endX)} ${n(y)}` });
          const rail = parents.get(parent.id);
          parents.set(parent.id, { x: parent.x, top: parent.bottom, bottom: Math.max(rail?.bottom ?? parent.bottom, y - radius), highlighted: Boolean(rail?.highlighted || id === 'chapter-drop-preview') });
        }
        ancestors.push({ id, x, bottom: anchor.bottom - origin.top });
      }
      const trunks = [...parents].map(([parent, rail]) => {
        let path = `M ${n(rail.x)} ${n(rail.top)}`;
        let cursor = rail.top;
        // Leave text-obscured portions unpainted instead of routing a rail backwards.
        for (const area of textAreas) {
          if (rail.x < area.left - origin.left - 4 || rail.x > area.right - origin.left + 4) continue;
          const top = Math.max(cursor, area.top - origin.top - 2);
          const bottom = Math.min(rail.bottom, area.bottom - origin.top + 2);
          if (bottom <= top) continue;
          path += ` V ${n(top)} M ${n(rail.x)} ${n(bottom)}`;
          cursor = bottom;
        }
        return { parent, path: `${path} V ${n(rail.bottom)}`, highlighted: rail.highlighted };
      });
      const next = { connections, trunks };
      setDrawing(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(container);
    nodes.forEach(node => observer?.observe(node));
    container.querySelectorAll('[data-row-content]').forEach(row => observer?.observe(row));
    const mutations = new MutationObserver(measure);
    mutations.observe(container, { subtree: true, attributes: true, attributeFilter: ['data-chapter-depth'] });
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); mutations.disconnect(); window.removeEventListener('resize', measure); };
  }, [containerRef, revision, excludedId, depthOverrides]);
  return <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" fill="none" stroke="var(--border-main)" strokeWidth="1.25" strokeLinecap="round">
    {drawing.trunks.map(trunk => <path key={trunk.parent} data-chapter-trunk={trunk.parent} stroke={trunk.highlighted ? 'var(--accent)' : undefined} d={trunk.path} />)}
    {drawing.connections.map(connection => <path key={connection.child} data-chapter-connection={connection.child} data-chapter-parent={connection.parent} stroke={connection.child === 'chapter-drop-preview' ? 'var(--accent)' : undefined} d={connection.path} />)}
  </svg>;
}
