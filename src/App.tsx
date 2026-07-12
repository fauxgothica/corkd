import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Check, Circle, Trash2, ChevronRight, Plus,
  StickyNote, Image, Film, RotateCw, Undo2, Redo2, Upload, Maximize2,
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface StickyItem { id: string; type: 'bullet'|'checklist'; text: string; checked: boolean }

interface NoteData {
  id: string; left: number; top: number; rotation: number; scale: number;
  color: string; note: string;
  hasPin: boolean; hasTape: boolean; pinColor: string; tapeColor: string;
  tapeImage: string;
  items: StickyItem[];
}

type FrameKind = 'polaroid1' | 'polaroid2' | 'photostrip' | 'film';

interface PhotoFrameData {
  id: string; kind: FrameKind; left: number; top: number; rotation: number; scale: number;
  photos: string[]; caption: string;
  hasPin: boolean; hasTape: boolean; pinColor: string; tapeColor: string;
  tapeImage: string;
  slotCount: number;
  showCan: boolean;
}

type BoardState = { notes: NoteData[]; frames: PhotoFrameData[] };

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_COLORS  = ['#fef08a','#fbcfe8','#bfdbfe','#bbf7d0','#fed7aa','#e9d5ff'];
const PIN_COLORS   = ['#d8c35a','#ef4444','#3b82f6','#22c55e','#f59e0b','#ec4899'];
const TAPE_COLORS  = ['#fef08a','#fed7aa','#bbf7d0','#bfdbfe','#fbcfe8','#e9d5ff'];
const PIN_DEFAULT  = '#d8c35a';

// Polaroid1: 321×379.5 – photo: x=22.67,y=22.42,w=275.66,h=262.81
const P1_SLOT    = { x: 7.06, y: 5.91, w: 85.87, h: 69.25 };
const P1_CAPTION = { x: 5, y: 75.5, w: 90, h: 19 };
const P1_DIMS    = { w: 180, h: 213 };

// Film strip: viewBox 565 × (251+494*N) – same geometry as photostrip but with film aesthetic
// Film canister: 120×230 base dimensions
const FILM_CAN_DIMS = { w: 80, h: 153 };

function getFilmConfig(n: number) {
  const sprocketW = 16, photoW = 128, photoH = 128, gap = 6, padTop = 16, padBot = 8, capH = 36;
  const W = sprocketW * 2 + photoW; // 160
  const H = padTop + n * photoH + (n - 1) * gap + padBot + capH;
  const slots = Array.from({ length: n }, (_, i) => {
    const y = padTop + i * (photoH + gap);
    return { x: sprocketW / W * 100, y: y / H * 100, w: photoW / W * 100, h: photoH / H * 100 };
  });
  const capY = (padTop + n * photoH + (n - 1) * gap + padBot) / H * 100;
  return {
    dims: { w: W, h: H },
    slots,
    caption: { x: sprocketW / W * 100, y: capY, w: photoW / W * 100, h: capH / H * 100 },
  };
}

function FilmCanisterSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 230" style={{ width:'100%', height:'100%', display:'block' }}>
      {/* Top cap */}
      <rect x="-5" y="0" width="130" height="10" fill="url(#canCapGrad)" rx="1"/>
      {/* Can body */}
      <rect x="0" y="10" width="120" height="210" fill="url(#canBodyGrad)" rx="2"/>
      {/* Bottom cap */}
      <rect x="-5" y="220" width="130" height="10" fill="url(#canCapGrad)" rx="1"/>
      {/* Text (rotated) */}
      <g transform="rotate(90 60 115) translate(-40 10)">
        <text x="60" y="30" textAnchor="middle" fill="#000" fontFamily="Helvetica,sans-serif" fontWeight="bold" fontSize="42" style={{fontFamily:'Helvetica,sans-serif'}}>GOLD</text>
        <text x="60" y="65" textAnchor="middle" fill="#000" fontFamily="Helvetica,sans-serif" fontWeight="bold" fontStyle="italic" fontSize="28">400</text>
        <text x="60" y="85" textAnchor="middle" fill="#000" fontFamily="serif" fontSize="11">35mm film for color prints</text>
      </g>
      <defs>
        <linearGradient id="canCapGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3f3f3f"/><stop offset="17%" stopColor="#000"/><stop offset="39%" stopColor="#565656"/><stop offset="89%" stopColor="#0e0e0e"/><stop offset="100%" stopColor="#474747"/>
        </linearGradient>
        <linearGradient id="canBodyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a46108"/><stop offset="38%" stopColor="#f2d843"/><stop offset="80%" stopColor="#df9623"/><stop offset="100%" stopColor="#a46108"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// Polaroid2: 479×321 – landscape, photo top 68%, bottom caption 17%
const P2_SLOT    = { x: 4.60, y: 6.85, w: 90.81, h: 68.85 };
const P2_CAPTION = { x: 5, y: 76, w: 90, h: 17 };
const P2_DIMS    = { w: 240, h: 161 };

// Photostrip slot geometry: viewBox 565 × (251+494*N), slotX=28,w=502,h=440, gaps=54, topMargin=41, botMargin=264
function getStripConfig(n: number) {
  const W = 565, sX = 28, sW = 502, sH = 440, top = 41, gap = 54, bot = 264;
  const H = top + n * sH + (n - 1) * gap + bot;
  const slots = Array.from({ length: n }, (_, i) => {
    const y = top + i * (sH + gap);
    return { x: sX/W*100, y: y/H*100, w: sW/W*100, h: sH/H*100 };
  });
  const capY = (top + n*sH + (n-1)*gap) / H * 100;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#FDFDFD"/>
    ${Array.from({length:n},(_,i)=>`<rect x="${sX}" y="${top+i*(sH+gap)}" width="${sW}" height="${sH}" fill="#B78080"/>`).join('')}
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    dims: { w: 160, h: Math.round(160*H/W) },
    slots,
    caption: { x: 5, y: capY + 2, w: 90, h: bot/H*100 - 4 },
  };
}

function darken(h: string, a = 0.25) {
  const n = parseInt(h.replace('#',''), 16);
  const r = Math.max(0,Math.round(((n>>16)&0xff)*(1-a)));
  const g = Math.max(0,Math.round(((n>>8)&0xff)*(1-a)));
  const b = Math.max(0,Math.round((n&0xff)*(1-a)));
  return `#${[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('')}`;
}

function rand(lo: number, hi: number) { return lo + Math.ceil(Math.random() * (hi - lo)); }

// ─── Supabase sync helpers ────────────────────────────────────────────────────

async function syncNote(n: NoteData) {
  await supabase.from('sticky_notes').upsert({
    id: n.id, x: n.left, y: n.top, rotation: n.rotation,
    color: n.color, content: n.note,
    has_pin: n.hasPin, has_tape: n.hasTape,
    pin_color: n.pinColor, tape_color: n.tapeColor, tape_image: n.tapeImage, items: n.items,
    scale: n.scale,
  });
}

async function syncFrame(f: PhotoFrameData) {
  await supabase.from('board_photos').upsert({
    id: f.id, kind: f.kind, x: f.left, y: f.top, rotation: f.rotation,
    photo_urls: f.photos, caption: f.caption,
    has_pin: f.hasPin, has_tape: f.hasTape,
    pin_color: f.pinColor, tape_color: f.tapeColor, tape_image: f.tapeImage, slot_count: f.slotCount,
    scale: f.scale, show_can: f.showCan,
  });
}

// ─── PinSvg ──────────────────────────────────────────────────────────────────

function PinSvg({ color = PIN_DEFAULT }: { color?: string }) {
  const tinted = color.toLowerCase() !== PIN_DEFAULT;
  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <img src="/pushpin.svg" alt="pin" draggable={false}
        style={{ width:'100%', height:'100%', display:'block', objectFit:'contain' }} />
      {tinted && (
        <svg viewBox="0 0 49.5 54" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
          <ellipse cx="24.75" cy="20" rx="16" ry="15" fill={color} opacity="0.78" />
        </svg>
      )}
    </div>
  );
}

// ─── TapeSvg ─────────────────────────────────────────────────────────────────

// Full tape paths from the original tape.svg (zigzag fill + black outline detail)
const TAPE_FILL = 'M 3.949219 2.492188 L 13.21875 11.4375 L 22.484375 20.382812 L 13.21875 29.324219 L 3.949219 38.269531 L 13.21875 47.214844 L 22.484375 56.160156 L 13.21875 65.105469 L 3.949219 74.046875 L 13.21875 82.992188 L 22.484375 91.9375 L 13.21875 100.882812 L 3.949219 109.824219 L 13.21875 118.769531 L 22.484375 127.714844 L 13.21875 136.660156 L 3.949219 145.601562 L 13.21875 154.546875 L 22.484375 163.492188 L 13.21875 172.4375 L 3.949219 181.378906 L 710.203125 181.378906 L 700.9375 172.4375 L 691.671875 163.492188 L 710.203125 145.601562 L 700.9375 136.660156 L 691.671875 127.714844 L 700.9375 118.769531 L 710.207031 109.824219 L 700.9375 100.882812 L 691.671875 91.9375 L 700.9375 82.992188 L 710.207031 74.046875 L 700.9375 65.105469 L 691.671875 56.160156 L 700.9375 47.214844 L 710.207031 38.269531 L 700.9375 29.324219 L 691.671875 20.382812 L 700.9375 11.4375 L 710.207031 2.492188 Z';
const TAPE_OUTLINE = 'M 710.203125 183.875 L 3.949219 183.875 C 2.933594 183.875 2.019531 183.261719 1.636719 182.316406 C 1.257812 181.375 1.488281 180.292969 2.21875 179.589844 L 18.898438 163.492188 L 2.21875 147.398438 C 1.730469 146.925781 1.457031 146.28125 1.457031 145.601562 C 1.457031 144.925781 1.730469 144.28125 2.21875 143.808594 L 18.898438 127.714844 L 2.21875 111.621094 C 1.730469 111.152344 1.457031 110.503906 1.457031 109.828125 C 1.457031 109.152344 1.730469 108.503906 2.21875 108.03125 L 18.898438 91.9375 L 2.21875 75.84375 C 1.730469 75.371094 1.457031 74.726562 1.457031 74.046875 C 1.457031 73.371094 1.730469 72.722656 2.21875 72.253906 L 18.898438 56.160156 L 2.21875 40.0625 C 1.730469 39.59375 1.457031 38.949219 1.457031 38.269531 C 1.457031 37.59375 1.730469 36.945312 2.21875 36.476562 L 18.898438 20.382812 L 2.21875 4.289062 C 1.488281 3.582031 1.257812 2.5 1.636719 1.558594 C 2.019531 0.617188 2.933594 0 3.949219 0 L 710.203125 0 C 711.21875 0 712.132812 0.617188 712.515625 1.558594 C 712.898438 2.5 712.671875 3.578125 711.9375 4.285156 L 695.265625 20.382812 L 711.9375 36.476562 C 712.421875 36.945312 712.699219 37.59375 712.699219 38.269531 C 712.699219 38.945312 712.425781 39.59375 711.9375 40.0625 L 695.265625 56.160156 L 711.9375 72.253906 C 712.421875 72.722656 712.699219 73.371094 712.699219 74.046875 C 712.699219 74.726562 712.425781 75.371094 711.9375 75.84375 L 695.261719 91.9375 L 711.9375 108.03125 C 712.421875 108.5 712.699219 109.148438 712.699219 109.828125 C 712.699219 110.507812 712.425781 111.152344 711.9375 111.621094 L 695.265625 127.71875 L 711.9375 143.8125 C 712.421875 144.28125 712.699219 144.925781 712.699219 145.605469 C 712.699219 146.285156 712.425781 146.929688 711.9375 147.402344 L 695.261719 163.496094 L 711.9375 179.589844 C 712.671875 180.296875 712.898438 181.375 712.515625 182.320312 C 712.136719 183.261719 711.21875 183.875 710.203125 183.875 Z M 10.121094 178.890625 L 704.03125 178.890625 L 689.941406 165.285156 C 689.453125 164.816406 689.175781 164.171875 689.175781 163.492188 C 689.175781 162.8125 689.453125 162.167969 689.941406 161.695312 L 706.613281 145.601562 L 689.941406 129.507812 C 689.453125 129.039062 689.175781 128.390625 689.175781 127.714844 C 689.175781 127.035156 689.453125 126.390625 689.941406 125.917969 L 706.613281 109.824219 L 689.941406 93.730469 C 689.453125 93.261719 689.175781 92.613281 689.175781 91.933594 C 689.175781 91.257812 689.453125 90.609375 689.941406 90.140625 L 706.613281 74.046875 L 689.941406 57.953125 C 689.453125 57.484375 689.175781 56.835938 689.175781 56.15625 C 689.175781 55.480469 689.453125 54.832031 689.941406 54.363281 L 706.613281 38.265625 L 689.941406 22.171875 C 689.453125 21.703125 689.175781 21.054688 689.175781 20.375 C 689.175781 19.699219 689.453125 19.054688 689.941406 18.582031 L 704.035156 4.984375 L 10.121094 4.984375 L 24.214844 18.589844 C 24.703125 19.058594 24.980469 19.707031 24.980469 20.382812 C 24.980469 21.0625 24.703125 21.707031 24.214844 22.179688 L 7.539062 38.273438 L 24.214844 54.371094 C 24.703125 54.839844 24.980469 55.484375 24.980469 56.164062 C 24.980469 56.84375 24.703125 57.488281 24.214844 57.960938 L 7.539062 74.054688 L 24.214844 90.148438 C 24.703125 90.617188 24.980469 91.265625 24.980469 91.941406 C 24.980469 92.621094 24.703125 93.265625 24.214844 93.738281 L 7.539062 109.832031 L 24.214844 125.925781 C 24.703125 126.394531 24.980469 127.042969 24.980469 127.722656 C 24.980469 128.398438 24.703125 129.046875 24.214844 129.515625 L 7.539062 145.609375 L 24.214844 161.703125 C 24.703125 162.171875 24.980469 162.820312 24.980469 163.5 C 24.980469 164.175781 24.703125 164.824219 24.214844 165.292969 Z';

function TapeSvg({ color = '#f7bfd9', image }: { color?: string; image?: string }) {
  const pid = useRef('tp-' + Math.random().toString(36).slice(2, 8)).current;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 714.75 196.5"
      style={{ width:'100%', height:'100%', display:'block' }}>
      <defs>
        {image && (
          <pattern id={pid} patternUnits="userSpaceOnUse" width="714.75" height="196.5">
            <image href={image} x="0" y="0" width="714.75" height="196.5" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
      </defs>
      <path fill={image ? `url(#${pid})` : color} fillOpacity="1" fillRule="nonzero" d={TAPE_FILL} />
      <path fill="#231f20" fillOpacity="1" fillRule="nonzero" d={TAPE_OUTLINE} />
    </svg>
  );
}

// ─── Selection overlay (rotation handle) ─────────────────────────────────────

interface SelOverlayProps {
  elemId: string;
  rotation: number;
  scale: number;
  onRotate: (r: number) => void;
  onResize: (s: number) => void;
}

function SelectionOverlay({ elemId, rotation, scale, onRotate, onResize }: SelOverlayProps) {
  const handleRotDown = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = document.getElementById(elemId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startA = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    const startR = rotation;
    const move = (mv: MouseEvent) => {
      const a = Math.atan2(mv.clientY - cy, mv.clientX - cx) * 180 / Math.PI;
      el.style.transform = `rotate(${startR + a - startA}deg) scale(${scale})`;
    };
    const up = (uv: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      const a = Math.atan2(uv.clientY - cy, uv.clientX - cx) * 180 / Math.PI;
      onRotate(startR + a - startA);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const handleResizeDown = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = document.getElementById(elemId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startW = rect.width / scale; // unscaled width
    const startScale = scale;
    const move = (mv: MouseEvent) => {
      const delta = (mv.clientX - startX) / startW;
      const ns = Math.max(0.3, Math.min(3, startScale + delta));
      el.style.transform = `rotate(${rotation}deg) scale(${ns})`;
    };
    const up = (uv: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      const delta = (uv.clientX - startX) / startW;
      onResize(Math.max(0.3, Math.min(3, startScale + delta)));
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <>
      <div className="sel-border" />
      <div className="sel-rot-handle" onMouseDown={handleRotDown} title="Drag to rotate">
        <RotateCw size={13} color="#4a4a4a" />
      </div>
      <div className="sel-resize-handle" onMouseDown={handleResizeDown} title="Drag to resize">
        <Maximize2 size={11} color="#4a4a4a" />
      </div>
    </>
  );
}

// ─── CtxRow (shared) ─────────────────────────────────────────────────────────

interface CtxRowProps {
  label: string; checked?: boolean; danger?: boolean;
  toggle?: boolean; submenu?: React.ReactNode; children?: React.ReactNode;
  onClick?: () => void; onToggleOn?: () => void; onToggleOff?: () => void;
}

function CtxRow({ label, checked, danger, toggle, submenu, children, onClick, onToggleOn, onToggleOff }: CtxRowProps) {
  const [hov, setHov] = useState(false);
  const showSub = toggle ? checked && hov : hov;
  const click = () => { if (toggle) { checked ? onToggleOff?.() : onToggleOn?.(); } else onClick?.(); };
  return (
    <div className={`ctx-row${hov?' ctx-row--hov':''}${danger?' ctx-row--danger':''}`}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={click}>
      <span className="ctx-row__check">
        {checked && <svg viewBox="0 0 12 12" width="12" height="12"><polyline points="2,6 5,10 10,3" fill="none" stroke={danger?'#ef4444':'#3d7a3d'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </span>
      <span className="ctx-row__label">{label}</span>
      {children /* inline controls like count stepper */}
      {toggle ? (checked && <ChevronRight size={13} className="ctx-row__chevron"/>) : (submenu && <ChevronRight size={13} className="ctx-row__chevron"/>)}
      {showSub && submenu && <div className="ctx-submenu-wrap" onClick={e=>e.stopPropagation()}>{submenu}</div>}
    </div>
  );
}

// ─── Frame context menu ───────────────────────────────────────────────────────

interface FrameCtxProps {
  frame: PhotoFrameData; x: number; y: number;
  onPatch: (id: string, p: Partial<PhotoFrameData>) => void;
  onRemove: (id: string) => void;
  onEditCaption: (id: string) => void;
  onDuplicate: (frame: PhotoFrameData) => void;
}

function FrameContextMenu({ frame, x, y, onPatch, onRemove, onEditCaption, onDuplicate }: FrameCtxProps) {
  const left = Math.min(x, window.innerWidth  - 210);
  const top  = Math.min(y, window.innerHeight - 320);
  const isStrip = frame.kind === 'photostrip' || frame.kind === 'film';

  const colorSub = (field: 'pinColor'|'tapeColor', colors: string[], active: boolean) => (
    <div className="ctx-submenu">
      {colors.map(c => (
        <button key={c} className="ctx-color-dot"
          style={{ background:c, outline: active&&frame[field]===c?`2px solid ${darken(c,0.5)}`:'none' }}
          onClick={() => onPatch(frame.id, { [field]: c, [field==='pinColor'?'hasPin':'hasTape']: true, ...(field==='tapeColor'?{tapeImage:''}:{}) } as Partial<PhotoFrameData>)} />
      ))}
      {field === 'tapeColor' && (
        <label className="ctx-upload-row" title="upload tape design">
          <Upload size={13} />
          <span>upload</span>
          <input type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>onPatch(frame.id,{tapeImage:r.result as string, hasTape:true}); r.readAsDataURL(f); e.target.value=''; }} />
        </label>
      )}
    </div>
  );

  const isStripType = frame.kind === 'photostrip' || frame.kind === 'film';

  return (
    <div className="ctx-menu" style={{ left, top }} onClick={e=>e.stopPropagation()}>
      <CtxRow label="add text" onClick={() => { onEditCaption(frame.id); }} />

      <CtxRow label="washi tape" toggle checked={frame.hasTape}
        onToggleOn={()  => onPatch(frame.id,{hasTape:true})}
        onToggleOff={() => onPatch(frame.id,{hasTape:false})}
        submenu={colorSub('tapeColor', TAPE_COLORS, frame.hasTape)} />

      <CtxRow label="push pin" toggle checked={frame.hasPin}
        onToggleOn={()  => onPatch(frame.id,{hasPin:true})}
        onToggleOff={() => onPatch(frame.id,{hasPin:false})}
        submenu={colorSub('pinColor', PIN_COLORS, frame.hasPin)} />

      {isStripType ? (
        <>
          <CtxRow label="count">
            <div className="ctx-count" onClick={e=>e.stopPropagation()}>
              <button onClick={()=> frame.slotCount>1 && onPatch(frame.id,{slotCount:frame.slotCount-1,photos:frame.photos.slice(0,frame.slotCount-1)})}>−</button>
              <span>{frame.slotCount}</span>
              <button onClick={()=> frame.slotCount<8 && onPatch(frame.id,{slotCount:frame.slotCount+1,photos:[...frame.photos,'']})}>+</button>
            </div>
          </CtxRow>
          {frame.kind === 'film' && (
            <CtxRow label="film can" toggle checked={frame.showCan}
              onToggleOn={()  => onPatch(frame.id,{showCan:true})}
              onToggleOff={() => onPatch(frame.id,{showCan:false})} />
          )}
        </>
      ) : (
        <CtxRow label="change orientation"
          onClick={() => onPatch(frame.id, { kind: frame.kind==='polaroid1'?'polaroid2':'polaroid1' })} />
      )}

      <CtxRow label="duplicate" onClick={() => onDuplicate(frame)} />
      <CtxRow label="delete" danger onClick={() => onRemove(frame.id)} />
    </div>
  );
}

// ─── PhotoFrame ───────────────────────────────────────────────────────────────

interface PhotoFrameProps {
  data: PhotoFrameData;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onPhotoChange: (id: string, slot: number, url: string) => void;
  onRemove: (id: string) => void;
  onDragEnd: (id: string, l: number, t: number) => void;
  onRotateEnd: (id: string, r: number) => void;
  onResizeEnd: (id: string, s: number) => void;
  editingCaption: boolean;
  onCaptionSave: (id: string, text: string) => void;
}

function PhotoFrame({ data, isSelected, onSelect, onContextMenu, onPhotoChange, onRemove, onDragEnd, onRotateEnd, onResizeEnd, editingCaption, onCaptionSave }: PhotoFrameProps) {
  const dragRef = useRef({ sX:0,sY:0,oL:0,oT:0 });
  const captionRef = useRef<HTMLInputElement>(null);
  const [draftCap, setDraftCap] = useState(data.caption);

  useEffect(() => { setDraftCap(data.caption); }, [data.caption]);
  useEffect(() => { if (editingCaption) captionRef.current?.focus(); }, [editingCaption]);

  let svgSrc: string;
  let dims: { w: number; h: number };
  let slots: { x: number; y: number; w: number; h: number }[];
  let capSlot: { x: number; y: number; w: number; h: number };

  if (data.kind === 'photostrip') {
    const cfg = getStripConfig(data.slotCount);
    svgSrc = cfg.url;
    dims = cfg.dims;
    slots = cfg.slots;
    capSlot = cfg.caption;
  } else {
    svgSrc = data.kind === 'polaroid1' ? '/polaroid1.svg' : '/polaroid2.svg';
    dims   = data.kind === 'polaroid1' ? P1_DIMS : P2_DIMS;
    slots  = [data.kind === 'polaroid1' ? P1_SLOT : P2_SLOT];
    capSlot = data.kind === 'polaroid1' ? P1_CAPTION : P2_CAPTION;
  }

  const handleMD = (e: React.MouseEvent<HTMLDivElement>) => {
    onSelect();
    if ((e.target as HTMLElement).closest('button,input,label,.sel-rot-handle,.sel-resize-handle')) return;
    e.preventDefault();
    dragRef.current = { sX:e.clientX, sY:e.clientY, oL:data.left, oT:data.top };
    const el = document.getElementById('frame-'+data.id)!;
    const move = (mv: MouseEvent) => {
      el.style.left = dragRef.current.oL + (mv.clientX-dragRef.current.sX) + 'px';
      el.style.top  = dragRef.current.oT + (mv.clientY-dragRef.current.sY) + 'px';
    };
    const up = (uv: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      onDragEnd(data.id, dragRef.current.oL+(uv.clientX-dragRef.current.sX), dragRef.current.oT+(uv.clientY-dragRef.current.sY));
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div id={'frame-'+data.id}
      style={{ position:'absolute', left:data.left, top:data.top, width:dims.w, height:dims.h,
        cursor:'grab', userSelect:'none', transform:`rotate(${data.rotation}deg) scale(${data.scale})`,
        transformOrigin:'center center',
        filter:'drop-shadow(3px 6px 12px rgba(0,0,0,0.35))',
        overflow:'visible', zIndex: isSelected ? 50 : 'auto' }}
      onMouseDown={handleMD} onContextMenu={onContextMenu}>

      {isSelected && <SelectionOverlay elemId={'frame-'+data.id} rotation={data.rotation} scale={data.scale} onRotate={r => onRotateEnd(data.id, r)} onResize={s => onResizeEnd(data.id, s)} />}

      {/* Background: film strip body or polaroid SVG */}
      {data.kind === 'film'
        ? <div style={{ position:'absolute', inset:0, background:'#1a1a1a', borderRadius:2 }}>
            <div className="film-sprockets" style={{ position:'absolute', left:0, top:0, bottom:0, width:'10%' }}>
              {Array.from({length: Math.floor(dims.h / 22)}, (_, i) => <div key={i} className="film-sprocket-hole" />)}
            </div>
            <div className="film-sprockets" style={{ position:'absolute', right:0, top:0, bottom:0, width:'10%' }}>
              {Array.from({length: Math.floor(dims.h / 22)}, (_, i) => <div key={i} className="film-sprocket-hole" />)}
            </div>
          </div>
        : <img src={svgSrc} alt={data.kind} draggable={false}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'fill' }} />}

      {/* Washi tape */}
      {data.hasTape && (
        <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', width:90, height:26, pointerEvents:'none', zIndex:5, opacity:.92 }}>
          <TapeSvg color={data.tapeColor} image={data.tapeImage||undefined} />
        </div>
      )}

      {/* Push pin — 1/3 outside the top edge */}
      {data.hasPin && (
        <div style={{ position:'absolute', top:'-18px', left:'50%', transform:'translateX(-50%)', width:32, height:56, pointerEvents:'none', zIndex:6, filter:'drop-shadow(1px 3px 4px rgba(0,0,0,0.45))' }}>
          <PinSvg color={data.pinColor} />
        </div>
      )}

      {/* Photo slots */}
      {slots.map((slot, i) => {
        const hasPhoto = !!data.photos[i];
        return (
          <label key={i} style={{ position:'absolute', left:`${slot.x}%`, top:`${slot.y}%`, width:`${slot.w}%`, height:`${slot.h}%`, display:'block', cursor:'pointer', overflow:'hidden' }}>
            {hasPhoto
              ? <img src={data.photos[i]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
                  background: data.kind==='film' ? '#000' : (data.kind==='photostrip'?'rgba(255,255,255,0.06)':'rgba(180,180,180,0.15)'),
                  border: data.kind==='film' ? '1px solid #333' : '2px dashed rgba(120,120,120,0.38)', boxSizing:'border-box' }}>
                  <span style={{ fontSize:28, color: data.kind==='film' ? 'rgba(255,255,255,0.3)' : (data.kind==='photostrip'?'rgba(255,255,255,0.45)':'rgba(80,80,80,0.5)'), fontWeight:300, pointerEvents:'none' }}>+</span>
                </div>}
            <input type="file" accept="image/*" style={{ display:'none' }}
              onMouseDown={e=>e.stopPropagation()}
              onChange={e => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>onPhotoChange(data.id,i,r.result as string); r.readAsDataURL(f); e.target.value=''; }} />
          </label>
        );
      })}

      {/* Caption */}
      <div style={{ position:'absolute', left:`${capSlot.x}%`, top:`${capSlot.y}%`, width:`${capSlot.w}%`, height:`${capSlot.h}%`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', zIndex:3 }}
        onMouseDown={e => e.stopPropagation()}>
        {editingCaption
          ? <input ref={captionRef} value={draftCap} onChange={e=>setDraftCap(e.target.value)}
              onBlur={() => onCaptionSave(data.id, draftCap)}
              onKeyDown={e => { if (e.key==='Enter') onCaptionSave(data.id, draftCap); }}
              style={{ width:'100%', background:'transparent', border:'none', outline:'none', textAlign:'center', fontFamily:"'Shadows Into Light',Arial", fontSize:20, color:'#444', padding:'0 4px' }} />
          : data.caption
            ? <span style={{ fontFamily:"'Shadows Into Light',Arial", fontSize:20, color:'#444', textAlign:'center', padding:'0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', display:'block' }}>{data.caption}</span>
            : null}
      </div>

      {/* Film canister */}
      {data.kind === 'film' && data.showCan && (
        <div style={{ position:'absolute', left:-(FILM_CAN_DIMS.w + 8), top:'50%', transform:'translateY(-50%)', width:FILM_CAN_DIMS.w, height:FILM_CAN_DIMS.h, pointerEvents:'none', zIndex:4, filter:'drop-shadow(4px 4px 8px rgba(0,0,0,0.4))' }}>
          <FilmCanisterSvg />
        </div>
      )}

      {/* Remove button (hover only) */}
      <button className="frame-remove-btn" onMouseDown={e=>e.stopPropagation()} onClick={()=>onRemove(data.id)} title="Remove">×</button>
    </div>
  );
}

// ─── Note ─────────────────────────────────────────────────────────────────────

interface NoteProps {
  data: NoteData;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (id: string, text: string, items: StickyItem[]) => void;
  onRemove: (id: string) => void;
  onDragEnd: (id: string, l: number, t: number) => void;
  onRotateEnd: (id: string, r: number) => void;
  onResizeEnd: (id: string, s: number) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function Note({ data, isSelected, onSelect, onChange, onRemove, onDragEnd, onRotateEnd, onResizeEnd, onContextMenu }: NoteProps) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(data.note);
  const [draftItems, setDraftItems] = useState<StickyItem[]>(data.items);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef({ sX:0, sY:0, oL:0, oT:0 });

  useEffect(() => { if (!editing) { setDraftText(data.note); setDraftItems(data.items); } }, [data.note, data.items, editing]);
  useEffect(() => { if (editing && taRef.current) { taRef.current.focus(); autoGrow(taRef.current); } }, [editing]);

  const autoGrow = (el: HTMLTextAreaElement) => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };

  const handleMD = (e: React.MouseEvent<HTMLDivElement>) => {
    onSelect();
    if (editing || (e.target as HTMLElement).closest('button,textarea,input,.sel-rot-handle,.sel-resize-handle')) return;
    e.preventDefault();
    dragRef.current = { sX:e.clientX, sY:e.clientY, oL:data.left, oT:data.top };
    const el = document.getElementById('note-'+data.id)!;
    const move = (mv: MouseEvent) => {
      el.style.left = dragRef.current.oL + (mv.clientX-dragRef.current.sX) + 'px';
      el.style.top  = dragRef.current.oT + (mv.clientY-dragRef.current.sY) + 'px';
    };
    const up = (uv: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      onDragEnd(data.id, dragRef.current.oL+(uv.clientX-dragRef.current.sX), dragRef.current.oT+(uv.clientY-dragRef.current.sY));
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const addItem = (type: 'bullet'|'checklist') =>
    setDraftItems(p => [...p, { id: crypto.randomUUID(), type, text:'', checked:false }]);
  const patchItem = (id: string, patch: Partial<StickyItem>) =>
    setDraftItems(p => p.map(it => it.id===id ? {...it,...patch} : it));
  const removeItem = (id: string) => setDraftItems(p => p.filter(it => it.id!==id));

  const save   = () => { onChange(data.id, draftText, draftItems); setEditing(false); };
  const cancel = () => { setDraftText(data.note); setDraftItems(data.items); setEditing(false); };

  const cc = darken(data.color, 0.45);

  return (
    <div id={'note-'+data.id} className="note"
      style={{ left:data.left, top:data.top, backgroundColor:data.color, cursor:editing?'default':undefined,
        overflow:'visible', transform:`rotate(${data.rotation}deg) scale(${data.scale})`, transformOrigin:'center center', zIndex: isSelected?50:'auto' }}
      onMouseDown={handleMD} onContextMenu={onContextMenu}>

      {isSelected && <SelectionOverlay elemId={'note-'+data.id} rotation={data.rotation} scale={data.scale} onRotate={r => onRotateEnd(data.id,r)} onResize={s => onResizeEnd(data.id,s)} />}

      {data.hasTape && (
        <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', width:90, height:26, pointerEvents:'none', zIndex:5, opacity:.92 }}>
          <TapeSvg color={data.tapeColor} image={data.tapeImage||undefined} />
        </div>
      )}
      {data.hasPin && (
        <div style={{ position:'absolute', top:'-18px', left:'50%', transform:'translateX(-50%)', width:32, height:56, pointerEvents:'none', zIndex:6, filter:'drop-shadow(1px 3px 4px rgba(0,0,0,0.45))' }}>
          <PinSvg color={data.pinColor} />
        </div>
      )}

      {editing ? (
        <>
          <textarea ref={taRef} value={draftText}
            onChange={e => { setDraftText(e.target.value); autoGrow(e.target); }}
            placeholder="Write a note..."
            rows={3}
            style={{ resize:'none', overflow:'hidden', width:'100%', fontFamily:"'Shadows Into Light',Arial", fontSize:18, lineHeight:1.2, border:'none', background:'transparent', outline:'none', color:cc, padding:'8px 8px 4px' }} />
          {draftItems.length > 0 && (
            <div style={{ maxHeight:90, overflowY:'auto', padding:'0 2px' }}>
              {draftItems.map(it => (
                <div key={it.id} style={{ display:'flex', alignItems:'center', gap:3, marginBottom:2 }}>
                  {it.type==='bullet'
                    ? <Circle style={{ width:10,height:10,flexShrink:0,fill:cc,color:cc }} />
                    : <button style={{ width:14,height:14,borderRadius:3,border:`2px solid ${cc}`,backgroundColor:it.checked?cc:'transparent',flexShrink:0,padding:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}
                        onMouseDown={e=>e.stopPropagation()} onClick={()=>patchItem(it.id,{checked:!it.checked})}>
                        {it.checked && <Check style={{ width:9,height:9,color:'white' }} />}
                      </button>}
                  <input type="text" value={it.text} onChange={e=>patchItem(it.id,{text:e.target.value})} placeholder="item..."
                    style={{ flex:1,border:'none',background:'transparent',outline:'none',fontFamily:"'Shadows Into Light',Arial",fontSize:18,color:cc,textDecoration:it.checked?'line-through':'none' }} />
                  <button style={{ padding:0,cursor:'pointer',lineHeight:1,background:'none',border:'none' }}
                    onMouseDown={e=>e.stopPropagation()} onClick={()=>removeItem(it.id)}>
                    <Trash2 style={{ width:10,height:10,color:cc,opacity:.6 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'flex', gap:2, padding:'2px 0' }}>
            <button className="note-action-btn" style={{ color:cc,borderColor:cc }} onMouseDown={e=>e.stopPropagation()} onClick={()=>addItem('bullet')}>+ bullet</button>
            <button className="note-action-btn" style={{ color:cc,borderColor:cc }} onMouseDown={e=>e.stopPropagation()} onClick={()=>addItem('checklist')}>+ check</button>
          </div>
          <div style={{ display:'flex', gap:4, padding:'2px 0 4px' }}>
            <button className="note-save-btn" style={{ background:cc,color:data.color }} onMouseDown={e=>e.stopPropagation()} onClick={save}>save</button>
            <button className="note-cancel-btn" style={{ color:cc,borderColor:cc }} onMouseDown={e=>e.stopPropagation()} onClick={cancel}>cancel</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ color:cc, whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0 }}>
            {data.note || <span style={{ color:darken(data.color,.25),fontSize:13,fontFamily:'Arial',fontStyle:'italic' }}>right-click to customise</span>}
          </p>
          {data.items.length > 0 && (
            <div style={{ padding:'0 8px' }}>
              {data.items.map(it => (
                <div key={it.id} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                  {it.type==='bullet'
                    ? <Circle style={{ width:9,height:9,flexShrink:0,fill:cc,color:cc }} />
                    : <div style={{ width:12,height:12,borderRadius:2,border:`2px solid ${cc}`,backgroundColor:it.checked?cc:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
                        {it.checked && <Check style={{ width:8,height:8,color:data.color }} />}
                      </div>}
                  <span style={{ fontFamily:"'Shadows Into Light',Arial",fontSize:20,lineHeight:'1.2',color:cc,textDecoration:it.checked?'line-through':'none',opacity:it.checked?.5:1 }}>{it.text}</span>
                </div>
              ))}
            </div>
          )}
          <span className="note-controls">
            <button className="note-ctrl-btn" style={{ color:cc,borderColor:cc }} onMouseDown={e=>e.stopPropagation()} onClick={()=>setEditing(true)}>edit</button>
            <button className="note-ctrl-btn note-ctrl-delete" style={{ color:cc,borderColor:cc }} onMouseDown={e=>e.stopPropagation()} onClick={()=>onRemove(data.id)}>×</button>
          </span>
        </>
      )}
    </div>
  );
}

// ─── Note context menu ────────────────────────────────────────────────────────

interface NoteCtxProps {
  note: NoteData; x: number; y: number;
  onPatch: (id: string, p: Partial<NoteData>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (note: NoteData) => void;
}

function NoteContextMenu({ note, x, y, onPatch, onRemove, onDuplicate }: NoteCtxProps) {
  const left = Math.min(x, window.innerWidth  - 210);
  const top  = Math.min(y, window.innerHeight - 260);
  const colorSub = (field: 'pinColor'|'tapeColor', colors: string[], active: boolean) => (
    <div className="ctx-submenu">
      {colors.map(c => <button key={c} className="ctx-color-dot"
        style={{ background:c, outline: active&&note[field]===c?`2px solid ${darken(c,.5)}`:'none' }}
        onClick={() => onPatch(note.id, { [field]:c, [field==='pinColor'?'hasPin':'hasTape']:true, ...(field==='tapeColor'?{tapeImage:''}:{}) } as Partial<NoteData>)} />)}
      {field === 'tapeColor' && (
        <label className="ctx-upload-row" title="upload tape design">
          <Upload size={13} />
          <span>upload</span>
          <input type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>onPatch(note.id,{tapeImage:r.result as string, hasTape:true}); r.readAsDataURL(f); e.target.value=''; }} />
        </label>
      )}
    </div>
  );
  return (
    <div className="ctx-menu" style={{ left, top }} onClick={e=>e.stopPropagation()}>
      <CtxRow label="change color" submenu={
        <div className="ctx-submenu">
          {NOTE_COLORS.map(c => <button key={c} className="ctx-color-dot"
            style={{ background:c, outline: note.color===c?`2px solid ${darken(c,.5)}`:'none' }}
            onClick={() => onPatch(note.id,{color:c})} />)}
        </div>} />
      <CtxRow label="washi tape" toggle checked={note.hasTape}
        onToggleOn={()=>onPatch(note.id,{hasTape:true})}
        onToggleOff={()=>onPatch(note.id,{hasTape:false})}
        submenu={colorSub('tapeColor',TAPE_COLORS,note.hasTape)} />
      <CtxRow label="push pin" toggle checked={note.hasPin}
        onToggleOn={()=>onPatch(note.id,{hasPin:true})}
        onToggleOff={()=>onPatch(note.id,{hasPin:false})}
        submenu={colorSub('pinColor',PIN_COLORS,note.hasPin)} />
      <CtxRow label="duplicate" onClick={() => onDuplicate(note)} />
      <CtxRow label="delete" danger onClick={() => onRemove(note.id)} />
    </div>
  );
}

// ─── Add menu ─────────────────────────────────────────────────────────────────

function AddMenu({ onAdd }: { onAdd: (t:'note'|'polaroid1'|'polaroid2'|'photostrip'|'film')=>void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const c = () => setOpen(false);
    window.addEventListener('click', c);
    return () => window.removeEventListener('click', c);
  }, [open]);
  return (
    <div style={{ position:'fixed', top:10, right:10, zIndex:200 }}>
      <button className="add-btn" onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} title="Add item">
        <Plus size={22} />
      </button>
      {open && (
        <div className="add-menu" onClick={e=>e.stopPropagation()}>
          {([['note','sticky note',<StickyNote size={16}/>],['polaroid1','polaroid',<Image size={16}/>],['polaroid2','polaroid wide',<Image size={16}/>],['photostrip','photo strip',<Film size={16}/>],['film','photo film',<Film size={16}/>]] as const).map(([t,label,icon])=>(
            <button key={t} className="add-menu-item" onClick={()=>{onAdd(t);setOpen(false);}}>
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

export default function Board() {
  const [notes,  setNotes]  = useState<NoteData[]>([]);
  const [frames, setFrames] = useState<PhotoFrameData[]>([]);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [noteCtx,  setNoteCtx]  = useState<{v:boolean,x:number,y:number,id:string|null}>({v:false,x:0,y:0,id:null});
  const [frameCtx, setFrameCtx] = useState<{v:boolean,x:number,y:number,id:string|null}>({v:false,x:0,y:0,id:null});
  const [editCapId, setEditCapId] = useState<string|null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // History refs (not state, to avoid stale closures)
  const hist   = useRef<BoardState[]>([]);
  const histPtr = useRef(-1);

  function pushHistory(n: NoteData[], f: PhotoFrameData[]) {
    const stack = hist.current.slice(0, histPtr.current + 1);
    stack.push({ notes: n, frames: f });
    if (stack.length > 50) stack.shift();
    hist.current = stack;
    histPtr.current = stack.length - 1;
    setCanUndo(histPtr.current > 0);
    setCanRedo(false);
  }

  const undo = () => {
    if (histPtr.current <= 0) return;
    histPtr.current--;
    const s = hist.current[histPtr.current];
    setNotes(s.notes); setFrames(s.frames);
    setCanUndo(histPtr.current > 0); setCanRedo(true);
  };

  const redo = () => {
    if (histPtr.current >= hist.current.length - 1) return;
    histPtr.current++;
    const s = hist.current[histPtr.current];
    setNotes(s.notes); setFrames(s.frames);
    setCanUndo(true); setCanRedo(histPtr.current < hist.current.length - 1);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey||e.ctrlKey) && e.key==='z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey||e.ctrlKey) && (e.key==='y' || (e.key==='z'&&e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // Load from Supabase
  useEffect(() => {
    supabase.from('sticky_notes').select('*').order('created_at').then(({ data }) => {
      if (!data) return;
      const loaded = data.map(n => ({
        id:n.id, left:n.x, top:n.y, rotation:n.rotation??0, scale:n.scale??1,
        color:n.color, note:n.content,
        hasPin:n.has_pin, hasTape:n.has_tape??false,
        pinColor:n.pin_color??PIN_DEFAULT, tapeColor:n.tape_color??'#fef08a',
        tapeImage:n.tape_image??'',
        items:n.items||[],
      }));
      setNotes(loaded);
      hist.current = [{ notes: loaded, frames: [] }];
      histPtr.current = 0;
    });
    supabase.from('board_photos').select('*').order('created_at').then(({ data }) => {
      if (!data) return;
      const loaded = data.map(f => ({
        id:f.id, kind:f.kind as FrameKind, left:f.x, top:f.y, rotation:f.rotation??0, scale:f.scale??1,
        photos:f.photo_urls??[], caption:f.caption??'',
        hasPin:f.has_pin??false, hasTape:f.has_tape??false,
        pinColor:f.pin_color??PIN_DEFAULT, tapeColor:f.tape_color??'#fef08a',
        tapeImage:f.tape_image??'',
        slotCount:f.slot_count??3, showCan:f.show_can??false,
      }));
      setFrames(loaded);
      setNotes(prev => { hist.current = [{ notes:prev, frames:loaded }]; histPtr.current=0; return prev; });
    });
  }, []);

  // Dismiss menus on outside click
  useEffect(() => {
    const d = () => { setNoteCtx(m=>({...m,v:false})); setFrameCtx(m=>({...m,v:false})); };
    window.addEventListener('click', d);
    return () => window.removeEventListener('click', d);
  }, []);

  // ── Add ──

  const handleAdd = async (type: 'note'|'polaroid1'|'polaroid2'|'photostrip'|'film') => {
    if (type === 'note') {
      const n: NoteData = {
        id:crypto.randomUUID(), left:rand(20,window.innerWidth-200), top:rand(60,window.innerHeight-220),
        rotation:rand(-3,3), scale:1, color:NOTE_COLORS[0], note:'new note',
        hasPin:false, hasTape:false, pinColor:PIN_DEFAULT, tapeColor:'#fef08a', tapeImage:'', items:[],
      };
      const newNotes = [...notes, n];
      pushHistory(newNotes, frames); setNotes(newNotes); syncNote(n);
    } else {
      const isStrip = type==='photostrip' || type==='film';
      const dims = isStrip ? getStripConfig(3).dims : type==='polaroid1' ? P1_DIMS : P2_DIMS;
      const f: PhotoFrameData = {
        id:crypto.randomUUID(), kind:type,
        left:rand(20,window.innerWidth-dims.w-20), top:rand(60,window.innerHeight-dims.h-20),
        rotation:rand(-4,4), scale:1, photos:Array(isStrip?3:1).fill(''),
        caption:'', hasPin:false, hasTape:false,
        pinColor:PIN_DEFAULT, tapeColor:'#fef08a', tapeImage:'', slotCount:3, showCan:false,
      };
      const newFrames = [...frames, f];
      pushHistory(notes, newFrames); setFrames(newFrames); syncFrame(f);
    }
  };

  // ── Notes ──

  const updateNote = async (id: string, text: string, items: StickyItem[]) => {
    const updated = notes.map(n => n.id===id ? {...n,note:text,items} : n);
    pushHistory(updated, frames); setNotes(updated);
    const n = updated.find(n=>n.id===id); if (n) syncNote(n);
  };

  const removeNote = async (id: string) => {
    const updated = notes.filter(n=>n.id!==id);
    pushHistory(updated, frames); setNotes(updated);
    await supabase.from('sticky_notes').delete().eq('id', id);
    setNoteCtx(m=>({...m,v:false}));
  };

  const noteDragEnd = async (id: string, l: number, t: number) => {
    const updated = notes.map(n => n.id===id ? {...n,left:l,top:t} : n);
    pushHistory(updated, frames); setNotes(updated);
    const n = updated.find(n=>n.id===id); if (n) syncNote(n);
  };

  const noteRotateEnd = async (id: string, r: number) => {
    const updated = notes.map(n => n.id===id ? {...n,rotation:r} : n);
    pushHistory(updated, frames); setNotes(updated);
    const n = updated.find(n=>n.id===id); if (n) syncNote(n);
  };

  const noteResizeEnd = async (id: string, s: number) => {
    const updated = notes.map(n => n.id===id ? {...n,scale:s} : n);
    pushHistory(updated, frames); setNotes(updated);
    const n = updated.find(n=>n.id===id); if (n) syncNote(n);
  };

  const patchNote = async (id: string, patch: Partial<NoteData>) => {
    const updated = notes.map(n => n.id===id ? {...n,...patch} : n);
    pushHistory(updated, frames); setNotes(updated);
    const n = updated.find(n=>n.id===id); if (n) syncNote(n);
    setNoteCtx(m=>({...m,v:false}));
  };

  const duplicateNote = async (src: NoteData) => {
    const dup = { ...src, id:crypto.randomUUID(), left:src.left+20, top:src.top+20 };
    const updated = [...notes, dup];
    pushHistory(updated, frames); setNotes(updated); syncNote(dup);
    setNoteCtx(m=>({...m,v:false}));
  };

  // ── Frames ──

  const patchFrame = async (id: string, patch: Partial<PhotoFrameData>) => {
    const updated = frames.map(f => f.id===id ? {...f,...patch} : f);
    pushHistory(notes, updated); setFrames(updated);
    const f = updated.find(f=>f.id===id); if (f) syncFrame(f);
    setFrameCtx(m=>({...m,v:false}));
  };

  const removeFrame = async (id: string) => {
    const updated = frames.filter(f=>f.id!==id);
    pushHistory(notes, updated); setFrames(updated);
    await supabase.from('board_photos').delete().eq('id', id);
    setFrameCtx(m=>({...m,v:false}));
  };

  const frameDragEnd = async (id: string, l: number, t: number) => {
    const updated = frames.map(f => f.id===id ? {...f,left:l,top:t} : f);
    pushHistory(notes, updated); setFrames(updated);
    const f = updated.find(f=>f.id===id); if (f) syncFrame(f);
  };

  const frameRotateEnd = async (id: string, r: number) => {
    const updated = frames.map(f => f.id===id ? {...f,rotation:r} : f);
    pushHistory(notes, updated); setFrames(updated);
    const f = updated.find(f=>f.id===id); if (f) syncFrame(f);
  };

  const frameResizeEnd = async (id: string, s: number) => {
    const updated = frames.map(f => f.id===id ? {...f,scale:s} : f);
    pushHistory(notes, updated); setFrames(updated);
    const f = updated.find(f=>f.id===id); if (f) syncFrame(f);
  };

  const handlePhotoChange = async (id: string, slot: number, url: string) => {
    const updated = frames.map(f => {
      if (f.id!==id) return f;
      const photos = [...f.photos]; photos[slot]=url;
      return {...f,photos};
    });
    pushHistory(notes, updated); setFrames(updated);
    const f = updated.find(f=>f.id===id); if (f) syncFrame(f);
  };

  const duplicateFrame = async (src: PhotoFrameData) => {
    const dup: PhotoFrameData = { ...src, id:crypto.randomUUID(), left:src.left+20, top:src.top+20 };
    const updated = [...frames, dup];
    pushHistory(notes, updated); setFrames(updated); syncFrame(dup);
    setFrameCtx(m=>({...m,v:false}));
  };

  const saveCaptionEdit = async (id: string, text: string) => {
    setEditCapId(null);
    patchFrame(id, { caption: text });
  };

  const activeNote  = noteCtx.id  ? notes.find(n=>n.id===noteCtx.id)  : null;
  const activeFrame = frameCtx.id ? frames.find(f=>f.id===frameCtx.id) : null;

  return (
    <div className="board"
      style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden',
        background:"url('/cork.jpeg') no-repeat center center fixed", backgroundSize:'cover' }}
      onClick={() => setSelectedId(null)}>

      {notes.map(n => (
        <Note key={n.id} data={n}
          isSelected={selectedId===n.id}
          onSelect={() => setSelectedId(n.id)}
          onChange={updateNote} onRemove={removeNote}
          onDragEnd={noteDragEnd} onRotateEnd={noteRotateEnd} onResizeEnd={noteResizeEnd}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelectedId(n.id); setNoteCtx({v:true,x:e.clientX,y:e.clientY,id:n.id}); }} />
      ))}

      {frames.map(f => (
        <PhotoFrame key={f.id} data={f}
          isSelected={selectedId===f.id}
          onSelect={() => setSelectedId(f.id)}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelectedId(f.id); setFrameCtx({v:true,x:e.clientX,y:e.clientY,id:f.id}); }}
          onPhotoChange={handlePhotoChange} onRemove={removeFrame}
          onDragEnd={frameDragEnd} onRotateEnd={frameRotateEnd} onResizeEnd={frameResizeEnd}
          editingCaption={editCapId===f.id}
          onCaptionSave={saveCaptionEdit} />
      ))}

      {/* Toolbar */}
      <div style={{ position:'fixed', top:10, left:10, zIndex:200, display:'flex', gap:6 }}>
        <button className="toolbar-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Undo2 size={16}/></button>
        <button className="toolbar-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"><Redo2 size={16}/></button>
      </div>

      <AddMenu onAdd={handleAdd} />

      {noteCtx.v && activeNote && (
        <NoteContextMenu note={activeNote} x={noteCtx.x} y={noteCtx.y}
          onPatch={patchNote} onRemove={removeNote} onDuplicate={duplicateNote} />
      )}
      {frameCtx.v && activeFrame && (
        <FrameContextMenu frame={activeFrame} x={frameCtx.x} y={frameCtx.y}
          onPatch={patchFrame} onRemove={removeFrame}
          onEditCaption={id => { setEditCapId(id); setFrameCtx(m=>({...m,v:false})); }}
          onDuplicate={duplicateFrame} />
      )}
    </div>
  );
}
