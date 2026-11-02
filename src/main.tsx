import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArtifactScene } from './ArtifactScene';
import type { Artifact, Channel, Element, Me, Snapshot } from './shared';
import './aurora.css';
import { Dashboard, AuroraLogo } from './Dashboard';
import { request } from './network';
import { latestSnapshot } from './snapshot-sync';

const EMPTY: Snapshot = { revision: 0, channels: [], artifacts: [], transfers: [] };
const emptyMe: Me = { channelIds: [], mode: null, csrf: '', twitchConfigured: false, connections: {} };
const elements: Element[] = ['light', 'fire', 'storm', 'crystal'];
const glyph: Record<Element, string> = { light: '✧', fire: '♨', storm: 'ϟ', crystal: '◇' };
function useConnection() {
  const [snapshot, setSnapshot] = useState(EMPTY); const [online, setOnline] = useState(false); const [me, setMe] = useState(emptyMe); const [networkError, setNetworkError] = useState('');
  const refreshMe = async () => { const m = await request<Me>('/api/me'); setMe(m); return m; };
  useEffect(() => {
    let closed = false; let socket: WebSocket; let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    let snapshotPending = false;
    const acceptSnapshot = (incoming: Snapshot) => { if (!closed) setSnapshot(current => latestSnapshot(current, incoming)); };
    const refreshSnapshot = async () => {
      if (snapshotPending || closed) return;
      snapshotPending = true;
      try { acceptSnapshot(await request<Snapshot>('/api/snapshot')); }
      finally { snapshotPending = false; }
    };
    const connect = () => {
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/socket`);
      socket.onopen = () => { attempts = 0; setOnline(true); setNetworkError(''); };
      socket.onmessage = e => { try { const msg = JSON.parse(e.data); if (msg.type === 'snapshot') acceptSnapshot(msg.data); } catch { setNetworkError('State update could not be read. Reconnecting…'); socket.close(); } };
      socket.onclose = () => { setOnline(false); if (!closed) timer = setTimeout(connect, Math.min(15000, 1000 * 2 ** attempts++)); };
      socket.onerror = () => socket.close();
    };
    refreshSnapshot().catch(() => setNetworkError('Cannot reach RAIDVERSE. Check the local server.'));
    refreshMe().catch(() => {}); connect();
    // Reconcile authoritative state even if a socket remains open but an update is missed.
    const poll = setInterval(() => { void refreshMe().catch(() => {}); void refreshSnapshot().catch(() => {}); }, 10000);
    return () => { closed = true; clearTimeout(timer); clearInterval(poll); socket?.close(); };
  }, []);
  return { snapshot, online, me, refreshMe, networkError };
}
function Logo() { return <AuroraLogo/>; }
function Badge({ mode }: { mode: string }) { return <span className={`badge ${mode === 'LIVE' ? 'live' : 'rehearsal'}`}><i/>{mode === 'LIVE' ? 'TWITCH HISTORY' : 'REHEARSAL · SYNTHETIC'}</span>; }
function portalTime(a?: Artifact) { return a?.history.findLast(h => h.kind === 'ARRIVAL')?.at ?? 0; }
function Timeline({ artifact, channels, compact = false }: { artifact?: Artifact; channels: Channel[]; compact?: boolean }) {
  const [limit, setLimit] = useState(100);
  useEffect(() => setLimit(100), [artifact?.id]);
  const history = artifact?.history.slice().reverse().filter(h => !['RAID_DETECTED', 'PENDING_APPROVAL', 'ACCEPTED', 'TRANSFERRED'].includes(h.kind)) ?? [];
  return <div className={`timeline ${compact ? 'compact' : ''}`}>{history.slice(0, compact ? 6 : limit).map(h => <div className="timeline-item" key={h.id}>
    <span className={`event-orb ${h.element ?? ''}`}>{h.element ? glyph[h.element] : h.kind === 'ARRIVAL' ? '↗' : '·'}</span>
    <div><p>{h.label}</p><small>{channels.find(c => c.id === h.channelId)?.name ?? h.channelId} <span>·</span> {h.evidence === 'SYNTHETIC' ? 'Synthetic event' : h.evidence === 'TWITCH' ? 'Twitch verified' : 'Streamer control'}</small></div><time>{new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
  </div>)}{!compact && history.length > limit && <button className="button secondary" onClick={() => setLimit(n => n + 100)}>Show earlier records ({history.length - limit})</button>}{!history.length && <p className="quiet empty-feed">Every creation starts with a community.<br/>Your story will appear here.</p>}</div>;
}
function Legacy({ snapshot, id }: { snapshot: Snapshot; id: string }) {
  const a = snapshot.artifacts.find(a => a.id === id);
  if (!a) return <main className="not-found"><Logo/><h1>Memory not found.</h1><p>The artifact may belong to another RAIDVERSE server.</p><a href="/">Return home →</a></main>;
  return <div className="legacy-page"><header><Logo/><Badge mode={a.mode}/></header><main>
    <div className="legacy-hero"><div><p className="eyebrow">A CREATION THAT CONNECTS US</p><h1>{a.name}</h1><p className="lede">Different communities.<br/>One continuous story.</p><div className="legacy-numbers"><div><b>{Object.values(a.energy).reduce((x, y) => x + y, 0)}</b><small>CONTRIBUTIONS</small></div><div><b>{a.communities.length}</b><small>COMMUNITIES</small></div><div><b>{snapshot.transfers.filter(t => t.artifactId === a.id && t.status === 'TRANSFERRED').length}</b><small>CONFIRMED TRANSFERS</small></div></div></div><div className="legacy-art"><ArtifactScene artifact={a} portalAt={portalTime(a)}/><span className="artifact-signature">IDENTITY {a.id.slice(0, 8).toUpperCase()} · PRESERVED</span></div></div>
    <div className="journey-strip">{a.communities.map((id, i) => <React.Fragment key={id}>{i > 0 && <span className="journey-link">⟶</span>}<div><span className="avatar">{snapshot.channels.find(c => c.id === id)?.name[0]}</span><strong>{snapshot.channels.find(c => c.id === id)?.name}</strong><small>{i === 0 ? 'ORIGIN COMMUNITY' : 'PART OF THE LEGACY'}</small></div></React.Fragment>)}</div>
    <section className="legacy-history"><div><p className="eyebrow">A SHARED MEMORY</p><h2>Every chapter, preserved.</h2><p className="quiet">Every accepted contribution and confirmed handoff.<br/>Raid viewer counts never become individual contribution credits.</p><div className="element-list">{elements.map(e => <div key={e} className={e}><span>{glyph[e]} {e}</span><b>{a.energy[e]}</b></div>)}</div></div><Timeline artifact={a} channels={snapshot.channels}/></section>
  </main><footer>RAIDVERSE <span>Made together. Carried forward.</span></footer></div>;
}
function Overlay({ snapshot, id }: { snapshot: Snapshot; id: string }) {
  const key = new URLSearchParams(location.hash.slice(1)).get('key') ?? ''; const [visibility, setVisibility] = useState<{ hidden: boolean; artifactId: string | null; channel: string } | null>(null);
  const lastSuccess = useRef(0);
  useEffect(() => {
    document.documentElement.classList.add('overlay-document');
    let closed = false; const update = async () => { try { const result = await request<{ hidden: boolean; artifactId: string | null; channel: string }>(`/api/overlay/${id}?key=${encodeURIComponent(key)}`); if (!closed) { lastSuccess.current = Date.now(); setVisibility(result); } } catch { if (!closed) setVisibility(null); } };
    void update(); const poll = setInterval(() => { if (Date.now() - lastSuccess.current > 3000) setVisibility(null); void update(); }, 1000);
    return () => { closed = true; clearInterval(poll); document.documentElement.classList.remove('overlay-document'); };
  }, [id, key]);
  const a = snapshot.artifacts.find(a => a.id === visibility?.artifactId);
  if (!visibility || visibility.hidden || !a) return null;
  const arrival = a.history.findLast(h => h.kind === 'ARRIVAL'); const arriving = arrival && Date.now() - arrival.at < 8000;
  return <main className="obs-overlay"><ArtifactScene artifact={a} transparent portalAt={portalTime(a)}/><div className={`overlay-caption ${arriving ? 'arriving' : ''}`}><p>{arriving ? arrival.label : 'CREATED TOGETHER'}</p><h1>{a.name}</h1><span>{a.communities.length} COMMUNITIES · {Object.values(a.energy).reduce((x, y) => x + y, 0)} CONTRIBUTIONS</span>{a.mode === 'REHEARSAL' && <strong className="synthetic-watermark">REHEARSAL · SYNTHETIC EVENTS</strong>}</div></main>;
}
function App() {
  const state = useConnection();
  const legacy = /^\/legacy\/([^/]+)$/.exec(location.pathname);
  if (legacy) return <Legacy snapshot={state.snapshot} id={legacy[1]}/>;
  const overlay = /^\/overlay\/([^/]+)$/.exec(location.pathname);
  if (overlay) return <Overlay snapshot={state.snapshot} id={overlay[1]}/>;
  return <Dashboard {...state}/>;
}
// Retain the root if Vite re-evaluates this entry module during development.
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<React.StrictMode><App/></React.StrictMode>);

