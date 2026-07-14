import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Check, Circle, Trash2, ChevronRight, Plus,
  StickyNote, Image, Film, RotateCw, Undo2, Redo2, Upload, Maximize2,
  Receipt, FileText, X, Link, ImageIcon,
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

interface StickyItem { id: string; type: 'bullet'|'checklist'; text: string; checked: boolean }

interface NoteData {
  id: string; left: number; top: number; rotation: number; scale: number;
  color: string; note: string;
  hasPin: boolean; hasTape: boolean; pinColor: string; tapeColor: string;
  tapeImage: string;
  items: StickyItem[];
  z: number;
}

type FrameKind = 'polaroid1' | 'polaroid2' | 'photostrip' | 'film';

interface PhotoFrameData {
  id: string; kind: FrameKind; left: number; top: number; rotation: number; scale: number;
  photos: string[]; caption: string;
  hasPin: boolean; hasTape: boolean; pinColor: string; tapeColor: string;
  tapeImage: string;
  slotCount: number;
  showCan: boolean;
  z: number;
}

interface ImageData {
  id: string; left: number; top: number; rotation: number; scale: number;
  imageUrl: string; width: number; height: number;
  z: number;
  hasBorder: boolean; borderColor: string;
  hasFrame: boolean; frameStyle: string;
  hasFilter: boolean; filterStyle: string;
  hasTexture: boolean; textureStyle: string;
}

interface ReceiptLineItem { id: string; name: string; qty: number; price: number }

interface ReceiptData {
  id: string; left: number; top: number; rotation: number; scale: number;
  storeName: string; logo: string; date: string;
  items: ReceiptLineItem[];
  tax: number;
  hasPin: boolean; hasTape: boolean; pinColor: string; tapeColor: string; tapeImage: string;
  z: number;
}

type PaperLineType = 'text' | 'checkbox' | 'checkbox-sub' | 'important' | 'squiggly' | 'curved';
interface PaperLine { id: string; type: PaperLineType; text: string; checked: boolean; indent: number }

type PaperStyle = 'lined' | 'dotted' | 'grid' | 'plain' | 'ancient';
type PaperColor = 'cream' | 'yellow' | 'blue' | 'pink' | 'green' | 'white';
type PaperType = 'notepad' | 'legal' | 'ring' | 'plain';

interface PaperData {
  id: string; left: number; top: number; rotation: number; scale: number;
  title: string; lines: PaperLine[]; width: number; height: number;
  paperStyle: PaperStyle; paperColor: PaperColor; paperType: PaperType;
  hasPin: boolean; hasTape: boolean; pinColor: string; tapeColor: string; tapeImage: string;
  z: number;
}

type BoardState = { notes: NoteData[]; frames: PhotoFrameData[]; receipts: ReceiptData[]; papers: PaperData[] };

interface KeyringData {
  id: string; left: number; top: number; color: string; locked: boolean;
}

interface KeychainData {
  id: string; left: number; top: number; imageUrl: string; attachedRingId: string | null;
  imgOffsetX: number; imgOffsetY: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_COLORS  = ['#fef08a','#fbcfe8','#bfdbfe','#bbf7d0','#fed7aa','#e9d5ff'];
const PIN_COLORS   = ['#d8c35a','#ef4444','#3b82f6','#22c55e','#f59e0b','#ec4899'];
const TAPE_COLORS  = ['#fef08a','#fed7aa','#bbf7d0','#bfdbfe','#fbcfe8','#e9d5ff'];
const PIN_DEFAULT  = '#d8c35a';

// Polaroid1: 321×379.5 – photo: x=22.67,y=22.42,w=275.66,h=262.81
const P1_SLOT    = { x: 7.06, y: 5.91, w: 85.87, h: 69.25 };
const P1_CAPTION = { x: 5, y: 75.5, w: 90, h: 19 };
const P1_DIMS    = { w: 180, h: 213 };

const FILM_CAN_DIMS = { w: 80, h: 153 };
const FILM_RENDER_W = 200;

// Film strip SVG: transparent sprocket cutouts using SVG mask
function getFilmConfig(n: number) {
  const FW = 650;
  const photoX = 76, photoW = 502;
  const padTop = 25, photoH = 480, gap = 22;
  const capH = 48, padBot = 18;
  const FH = padTop + n * photoH + (n - 1) * gap + padBot + capH;
  const scale = FILM_RENDER_W / FW;

  const slots = Array.from({ length: n }, (_, i) => {
    const y = padTop + i * (photoH + gap);
    return { x: photoX / FW * 100, y: y / FH * 100, w: photoW / FW * 100, h: photoH / FH * 100 };
  });
  const capY = (padTop + n * photoH + (n - 1) * gap + padBot) / FH * 100;

  // Sprocket holes: rectangular, punched through via mask (fill="black" = transparent)
  const holeW = 40, holeH = 34, holeRx = 6;
  const leftX = 17, rightX = 598;
  const holeSpacing = (photoH + gap) / 8;
  const totalHoles = n * 8;

  // Mask: white = show, black = cut through
  const maskHoles: string[] = [];
  for (let i = 0; i < totalHoles; i++) {
    const hy = padTop + i * holeSpacing + (holeSpacing - holeH) / 2;
    maskHoles.push(
      `<rect x="${leftX}" y="${hy.toFixed(1)}" width="${holeW}" height="${holeH}" rx="${holeRx}" fill="black"/>`,
      `<rect x="${rightX}" y="${hy.toFixed(1)}" width="${holeW}" height="${holeH}" rx="${holeRx}" fill="black"/>`,
    );
  }

  // Photo slot placeholders (dark grey, behind user photos)
  const photoSlots = Array.from({ length: n }, (_, i) => {
    const y = padTop + i * (photoH + gap);
    return `<rect x="${photoX}" y="${y}" width="${photoW}" height="${photoH}" fill="#2d2d2d"/>`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FW} ${FH}">
    <defs>
      <mask id="filmMask">
        <rect x="0" y="0" width="${FW}" height="${FH}" fill="white"/>
        ${maskHoles.join('')}
      </mask>
    </defs>
    <g mask="url(#filmMask)">
      <rect x="0" y="0" width="${FW}" height="${FH}" fill="#3C3B3B"/>
      ${photoSlots.join('')}
    </g>
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    dims: { w: FILM_RENDER_W, h: Math.round(FH * scale) },
    slots,
    caption: { x: photoX / FW * 100, y: capY, w: photoW / FW * 100, h: capH / FH * 100 },
  };
}

function FilmCanisterSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 230" style={{ width:'100%', height:'100%', display:'block' }}>
      <rect x="-5" y="0" width="130" height="10" fill="url(#canCapGrad)" rx="1"/>
      <rect x="0" y="10" width="120" height="210" fill="url(#canBodyGrad)" rx="2"/>
      <rect x="-5" y="220" width="130" height="10" fill="url(#canCapGrad)" rx="1"/>
      <g transform="rotate(90 60 115) translate(-40 10)">
        <text x="60" y="30" textAnchor="middle" fill="#000" fontFamily="Helvetica,sans-serif" fontWeight="bold" fontSize="42">GOLD</text>
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

// Polaroid2: 479×321 – landscape
const P2_SLOT    = { x: 4.60, y: 6.85, w: 90.81, h: 68.85 };
const P2_CAPTION = { x: 5, y: 76, w: 90, h: 17 };
const P2_DIMS    = { w: 240, h: 161 };

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

// ─── Supabase sync ────────────────────────────────────────────────────────────

async function syncNote(n: NoteData) {
  await supabase.from('sticky_notes').upsert({
    id: n.id, x: n.left, y: n.top, rotation: n.rotation,
    color: n.color, content: n.note,
    has_pin: n.hasPin, has_tape: n.hasTape,
    pin_color: n.pinColor, tape_color: n.tapeColor, tape_image: n.tapeImage, items: n.items,
    scale: n.scale, z: n.z,
  });
}

async function syncFrame(f: PhotoFrameData) {
  await supabase.from('board_photos').upsert({
    id: f.id, kind: f.kind, x: f.left, y: f.top, rotation: f.rotation,
    photo_urls: f.photos, caption: f.caption,
    has_pin: f.hasPin, has_tape: f.hasTape,
    pin_color: f.pinColor, tape_color: f.tapeColor, tape_image: f.tapeImage, slot_count: f.slotCount,
    scale: f.scale, show_can: f.showCan, z: f.z,
  });
}

async function syncReceipt(r: ReceiptData) {
  await supabase.from('board_receipts').upsert({
    id: r.id, x: r.left, y: r.top, rotation: r.rotation, scale: r.scale,
    store_name: r.storeName, logo: r.logo, date: r.date,
    items: r.items, tax: r.tax,
    has_pin: r.hasPin, has_tape: r.hasTape,
    pin_color: r.pinColor, tape_color: r.tapeColor, tape_image: r.tapeImage,
    z: r.z,
  });
}

async function syncPaper(p: PaperData) {
  await supabase.from('board_papers').upsert({
    id: p.id, x: p.left, y: p.top, rotation: p.rotation, scale: p.scale,
    title: p.title, lines: p.lines, width: p.width, height: p.height,
    paper_style: p.paperStyle, paper_color: p.paperColor, paper_type: p.paperType,
    has_pin: p.hasPin, has_tape: p.hasTape,
    pin_color: p.pinColor, tape_color: p.tapeColor, tape_image: p.tapeImage,
    z: p.z,
  });
}

async function syncKeyring(k: KeyringData) {
  await supabase.from('keyrings').upsert({ id:k.id, x:k.left, y:k.top, color:k.color, locked:k.locked });
}

async function syncKeychain(k: KeychainData) {
  await supabase.from('keychains').upsert({ id:k.id, x:k.left, y:k.top, image_url:k.imageUrl, attached_ring_id:k.attachedRingId, img_offset_x:k.imgOffsetX, img_offset_y:k.imgOffsetY });
}

async function syncImage(img: ImageData) {
  await supabase.from('board_images').upsert({
    id: img.id, x: img.left, y: img.top, rotation: img.rotation, scale: img.scale,
    image_url: img.imageUrl, width: img.width, height: img.height,
    z: img.z,
    has_border: img.hasBorder, border_color: img.borderColor,
    has_frame: img.hasFrame, frame_style: img.frameStyle,
    has_filter: img.hasFilter, filter_style: img.filterStyle,
    has_texture: img.hasTexture, texture_style: img.textureStyle,
  });
}

// ─── PinSvg ───────────────────────────────────────────────────────────────────

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

// ─── TapeSvg ──────────────────────────────────────────────────────────────────

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

// ─── SelectionOverlay ─────────────────────────────────────────────────────────

interface SelOverlayProps {
  elemId: string; rotation: number; scale: number;
  onRotate: (r: number) => void; onResize: (s: number) => void;
}

function SelectionOverlay({ elemId, rotation, scale, onRotate, onResize }: SelOverlayProps) {
  const handleRotDown = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = document.getElementById(elemId); if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const startA = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    const startR = rotation;
    const move = (mv: MouseEvent) => {
      const a = Math.atan2(mv.clientY - cy, mv.clientX - cx) * 180 / Math.PI;
      el.style.transform = `rotate(${startR + a - startA}deg) scale(${scale})`;
    };
    const up = (uv: MouseEvent) => {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
      const a = Math.atan2(uv.clientY - cy, uv.clientX - cx) * 180 / Math.PI;
      onRotate(startR + a - startA);
    };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  const handleResizeDown = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = document.getElementById(elemId); if (!el) return;
    const rect = el.getBoundingClientRect();
    const startX = e.clientX, startW = rect.width / scale, startScale = scale;
    const move = (mv: MouseEvent) => {
      const ns = Math.max(0.3, Math.min(3, startScale + (mv.clientX - startX) / startW));
      el.style.transform = `rotate(${rotation}deg) scale(${ns})`;
    };
    const up = (uv: MouseEvent) => {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
      onResize(Math.max(0.3, Math.min(3, startScale + (uv.clientX - startX) / startW)));
    };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
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

function darken2(hex: string, amount: number): string {
  const c = hex.replace('#','');
  const r = Math.round(parseInt(c.slice(0,2),16) * (1-amount));
  const g = Math.round(parseInt(c.slice(2,4),16) * (1-amount));
  const b = Math.round(parseInt(c.slice(4,6),16) * (1-amount));
  return `rgb(${r},${g},${b})`;
}

// ─── CtxRow ───────────────────────────────────────────────────────────────────

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
      {children}
      {toggle ? (checked && <ChevronRight size={13} className="ctx-row__chevron"/>) : (submenu && <ChevronRight size={13} className="ctx-row__chevron"/>)}
      {showSub && submenu && <div className="ctx-submenu-wrap" onClick={e=>e.stopPropagation()}>{submenu}</div>}
    </div>
  );
}

// ─── Shared tape/pin submenu helper ──────────────────────────────────────────

function colorSub<T>(
  id: string,
  field: 'pinColor'|'tapeColor',
  colors: string[],
  active: boolean,
  currentVal: string,
  onPatch: (id: string, p: Partial<T>) => void,
) {
  return (
    <div className="ctx-submenu">
      {colors.map(c => (
        <button key={c} className="ctx-color-dot"
          style={{ background:c, outline: active&&currentVal===c?`2px solid ${darken(c,0.5)}`:'none' }}
          onClick={() => onPatch(id, { [field]: c, [field==='pinColor'?'hasPin':'hasTape']: true, ...(field==='tapeColor'?{tapeImage:''}:{}) } as Partial<T>)} />
      ))}
      {field === 'tapeColor' && (
        <label className="ctx-upload-row" title="upload tape design">
          <Upload size={13} /><span>upload</span>
          <input type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>onPatch(id,{tapeImage:r.result as string, hasTape:true} as unknown as Partial<T>); r.readAsDataURL(f); e.target.value=''; }} />
        </label>
      )}
    </div>
  );
}

// ─── Shared pin/tape decorations renderer ────────────────────────────────────

function Decorations({ hasPin, hasTape, pinColor, tapeColor, tapeImage }: {
  hasPin: boolean; hasTape: boolean; pinColor: string; tapeColor: string; tapeImage: string;
}) {
  return (
    <>
      {hasTape && (
        <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', width:90, height:26, pointerEvents:'none', zIndex:5, opacity:.92 }}>
          <TapeSvg color={tapeColor} image={tapeImage||undefined} />
        </div>
      )}
      {hasPin && (
        <div style={{ position:'absolute', top:'-17px', left:'50%', transform:'translateX(-50%)', width:32, height:56, pointerEvents:'none', zIndex:6, filter:'drop-shadow(1px 3px 4px rgba(0,0,0,0.45))' }}>
          <PinSvg color={pinColor} />
        </div>
      )}
    </>
  );
}

// ─── Frame context menu ───────────────────────────────────────────────────────

interface FrameCtxProps {
  frame: PhotoFrameData; x: number; y: number;
  onPatch: (id: string, p: Partial<PhotoFrameData>) => void;
  onRemove: (id: string) => void;
  onEditCaption: (id: string) => void;
  onDuplicate: (frame: PhotoFrameData) => void;
  onLayerUp: (id: string) => void;
  onLayerDown: (id: string) => void;
  onLayerToFront: (id: string) => void;
  onLayerToBack: (id: string) => void;
}

function FrameContextMenu({ frame, x, y, onPatch, onRemove, onEditCaption, onDuplicate, onLayerUp, onLayerDown, onLayerToFront, onLayerToBack }: FrameCtxProps) {
  const left = Math.min(x, window.innerWidth - 210);
  const top  = Math.min(y, window.innerHeight - 340);
  const isStripType = frame.kind === 'photostrip' || frame.kind === 'film';
  return (
    <div className="ctx-menu" style={{ left, top }} onClick={e=>e.stopPropagation()}>
      <CtxRow label="add text" onClick={() => onEditCaption(frame.id)} />
      <CtxRow label="washi tape" toggle checked={frame.hasTape}
        onToggleOn={() => onPatch(frame.id,{hasTape:true})}
        onToggleOff={() => onPatch(frame.id,{hasTape:false})}
        submenu={colorSub<PhotoFrameData>(frame.id,'tapeColor',TAPE_COLORS,frame.hasTape,frame.tapeColor,onPatch)} />
      <CtxRow label="push pin" toggle checked={frame.hasPin}
        onToggleOn={() => onPatch(frame.id,{hasPin:true})}
        onToggleOff={() => onPatch(frame.id,{hasPin:false})}
        submenu={colorSub<PhotoFrameData>(frame.id,'pinColor',PIN_COLORS,frame.hasPin,frame.pinColor,onPatch)} />
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
              onToggleOn={() => onPatch(frame.id,{showCan:true})}
              onToggleOff={() => onPatch(frame.id,{showCan:false})} />
          )}
        </>
      ) : (
        <CtxRow label="change orientation"
          onClick={() => onPatch(frame.id, { kind: frame.kind==='polaroid1'?'polaroid2':'polaroid1' })} />
      )}
      <CtxRow label="duplicate" onClick={() => onDuplicate(frame)} />
      <CtxRow label="layers" submenu={
        <div className="ctx-submenu ctx-submenu--nested">
          <CtxRow label="bring forward" onClick={() => onLayerUp(frame.id)} />
          <CtxRow label="bring to front" onClick={() => onLayerToFront(frame.id)} />
          <CtxRow label="send backward" onClick={() => onLayerDown(frame.id)} />
          <CtxRow label="send to back" onClick={() => onLayerToBack(frame.id)} />
        </div>
      } />
      <CtxRow label="delete" danger onClick={() => onRemove(frame.id)} />
    </div>
  );
}

// ─── PhotoFrame ───────────────────────────────────────────────────────────────

interface PhotoFrameProps {
  data: PhotoFrameData; isSelected: boolean;
  onSelect: () => void; onContextMenu: (e: React.MouseEvent) => void;
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

  let svgSrc: string, dims: { w:number; h:number };
  let slots: { x:number; y:number; w:number; h:number }[];
  let capSlot: { x:number; y:number; w:number; h:number };

  if (data.kind === 'photostrip') {
    const cfg = getStripConfig(data.slotCount);
    svgSrc = cfg.url; dims = cfg.dims; slots = cfg.slots; capSlot = cfg.caption;
  } else if (data.kind === 'film') {
    const cfg = getFilmConfig(data.slotCount);
    svgSrc = cfg.url; dims = cfg.dims; slots = cfg.slots; capSlot = cfg.caption;
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
    const move = (mv: MouseEvent) => { el.style.left = dragRef.current.oL+(mv.clientX-dragRef.current.sX)+'px'; el.style.top = dragRef.current.oT+(mv.clientY-dragRef.current.sY)+'px'; };
    const up = (uv: MouseEvent) => { window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); onDragEnd(data.id, dragRef.current.oL+(uv.clientX-dragRef.current.sX), dragRef.current.oT+(uv.clientY-dragRef.current.sY)); };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  };

  return (
    <div id={'frame-'+data.id}
      style={{ position:'absolute', left:data.left, top:data.top, width:dims.w, height:dims.h,
        cursor:'grab', userSelect:'none', transform:`rotate(${data.rotation}deg) scale(${data.scale})`,
        transformOrigin:'center center', filter:'drop-shadow(3px 6px 12px rgba(0,0,0,0.35))',
        overflow:'visible', zIndex: isSelected ? 50 : 'auto' }}
      onMouseDown={handleMD} onContextMenu={onContextMenu}>

      {isSelected && <SelectionOverlay elemId={'frame-'+data.id} rotation={data.rotation} scale={data.scale} onRotate={r => onRotateEnd(data.id,r)} onResize={s => onResizeEnd(data.id,s)} />}
      <Decorations hasPin={data.hasPin} hasTape={data.hasTape} pinColor={data.pinColor} tapeColor={data.tapeColor} tapeImage={data.tapeImage} />

      <img src={svgSrc} alt={data.kind} draggable={false}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'fill' }} />

      {slots.map((slot, i) => {
        const hasPhoto = !!data.photos[i];
        return (
          <label key={i} style={{ position:'absolute', left:`${slot.x}%`, top:`${slot.y}%`, width:`${slot.w}%`, height:`${slot.h}%`, display:'block', cursor:'pointer', overflow:'hidden' }}>
            {hasPhoto
              ? <img src={data.photos[i]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
                  background:(data.kind==='film'||data.kind==='photostrip')?'rgba(255,255,255,0.04)':'rgba(180,180,180,0.15)',
                  border:(data.kind==='film'||data.kind==='photostrip')?'1.5px dashed rgba(255,255,255,0.2)':'2px dashed rgba(120,120,120,0.38)', boxSizing:'border-box' }}>
                  <span style={{ fontSize:28, color:(data.kind==='film'||data.kind==='photostrip')?'rgba(255,255,255,0.35)':'rgba(80,80,80,0.5)', fontWeight:300, pointerEvents:'none' }}>+</span>
                </div>}
            <input type="file" accept="image/*" style={{ display:'none' }}
              onMouseDown={e=>e.stopPropagation()}
              onChange={e => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>onPhotoChange(data.id,i,r.result as string); r.readAsDataURL(f); e.target.value=''; }} />
          </label>
        );
      })}

      <div style={{ position:'absolute', left:`${capSlot.x}%`, top:`${capSlot.y}%`, width:`${capSlot.w}%`, height:`${capSlot.h}%`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', zIndex:3 }}
        onMouseDown={e=>e.stopPropagation()}>
        {editingCaption
          ? <input ref={captionRef} value={draftCap} onChange={e=>setDraftCap(e.target.value)}
              onBlur={() => onCaptionSave(data.id, draftCap)}
              onKeyDown={e => { if (e.key==='Enter') onCaptionSave(data.id, draftCap); }}
              style={{ width:'100%', background:'transparent', border:'none', outline:'none', textAlign:'center', fontFamily:"'Shadows Into Light',Arial", fontSize:20, color:'#444', padding:'0 4px' }} />
          : data.caption
            ? <span style={{ fontFamily:"'Shadows Into Light',Arial", fontSize:20, color:'#444', textAlign:'center', padding:'0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', display:'block' }}>{data.caption}</span>
            : null}
      </div>

      {data.kind === 'film' && data.showCan && (
        <div style={{ position:'absolute', left:-(FILM_CAN_DIMS.w+8), top:'50%', transform:'translateY(-50%)', width:FILM_CAN_DIMS.w, height:FILM_CAN_DIMS.h, pointerEvents:'none', zIndex:4, filter:'drop-shadow(4px 4px 8px rgba(0,0,0,0.4))' }}>
          <FilmCanisterSvg />
        </div>
      )}

      <button className="frame-remove-btn" onMouseDown={e=>e.stopPropagation()} onClick={()=>onRemove(data.id)} title="Remove">×</button>
    </div>
  );
}

// ─── Note ─────────────────────────────────────────────────────────────────────

interface NoteProps {
  data: NoteData; isSelected: boolean;
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
  const dragRef = useRef({ sX:0,sY:0,oL:0,oT:0 });

  useEffect(() => { if (!editing) { setDraftText(data.note); setDraftItems(data.items); } }, [data.note, data.items, editing]);
  useEffect(() => { if (editing && taRef.current) { taRef.current.focus(); autoGrow(taRef.current); } }, [editing]);

  const autoGrow = (el: HTMLTextAreaElement) => { el.style.height='auto'; el.style.height=el.scrollHeight+'px'; };

  const patchItem = (id: string, patch: Partial<StickyItem>) => setDraftItems(p => p.map(it => it.id===id ? {...it,...patch} : it));
  const removeItem = (id: string) => setDraftItems(p => p.filter(it => it.id!==id));
  const save = () => { onChange(data.id, draftText, draftItems); setEditing(false); };
  const cancel = () => { setDraftText(data.note); setDraftItems(data.items); setEditing(false); };

  const handleMD = (e: React.MouseEvent<HTMLDivElement>) => {
    onSelect();
    if (editing || (e.target as HTMLElement).closest('button,textarea,input,.sel-rot-handle,.sel-resize-handle')) return;
    e.preventDefault();
    dragRef.current = { sX:e.clientX, sY:e.clientY, oL:data.left, oT:data.top };
    const el = document.getElementById('note-'+data.id)!;
    const move = (mv: MouseEvent) => { el.style.left=dragRef.current.oL+(mv.clientX-dragRef.current.sX)+'px'; el.style.top=dragRef.current.oT+(mv.clientY-dragRef.current.sY)+'px'; };
    const up = (uv: MouseEvent) => { window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); onDragEnd(data.id, dragRef.current.oL+(uv.clientX-dragRef.current.sX), dragRef.current.oT+(uv.clientY-dragRef.current.sY)); };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  };

  const cc = darken(data.color, 0.45);
  return (
    <div id={'note-'+data.id} className="note"
      style={{ left:data.left, top:data.top, backgroundColor:data.color, cursor:editing?'default':undefined,
        overflow:'visible', transform:`rotate(${data.rotation}deg) scale(${data.scale})`, transformOrigin:'center center', zIndex:isSelected?1000:(data.z||0)+10 }}
      onMouseDown={handleMD} onContextMenu={onContextMenu}>

      {isSelected && <SelectionOverlay elemId={'note-'+data.id} rotation={data.rotation} scale={data.scale} onRotate={r=>onRotateEnd(data.id,r)} onResize={s=>onResizeEnd(data.id,s)} />}
      <Decorations hasPin={data.hasPin} hasTape={data.hasTape} pinColor={data.pinColor} tapeColor={data.tapeColor} tapeImage={data.tapeImage} />

      {editing ? (
        <>
          <textarea ref={taRef} value={draftText}
            onChange={e => { setDraftText(e.target.value); autoGrow(e.target); }}
            placeholder="Write a note..." rows={3}
            style={{ resize:'none', overflow:'hidden', width:'100%', fontFamily:"'Shadows Into Light',Arial", fontSize:18, lineHeight:1.2, border:'none', background:'transparent', outline:'none', color:cc, padding:'8px 8px 4px' }} />
          {draftItems.length > 0 && (
            <div style={{ padding:'0 2px' }}>
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
  onLayerUp: (id: string) => void;
  onLayerDown: (id: string) => void;
  onLayerToFront: (id: string) => void;
  onLayerToBack: (id: string) => void;
}

function NoteContextMenu({ note, x, y, onPatch, onRemove, onDuplicate, onLayerUp, onLayerDown, onLayerToFront, onLayerToBack }: NoteCtxProps) {
  const left = Math.min(x, window.innerWidth - 210);
  const top  = Math.min(y, window.innerHeight - 280);
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
        submenu={colorSub<NoteData>(note.id,'tapeColor',TAPE_COLORS,note.hasTape,note.tapeColor,onPatch)} />
      <CtxRow label="push pin" toggle checked={note.hasPin}
        onToggleOn={()=>onPatch(note.id,{hasPin:true})}
        onToggleOff={()=>onPatch(note.id,{hasPin:false})}
        submenu={colorSub<NoteData>(note.id,'pinColor',PIN_COLORS,note.hasPin,note.pinColor,onPatch)} />
      <CtxRow label="duplicate" onClick={() => onDuplicate(note)} />
      <CtxRow label="layers" submenu={
        <div className="ctx-submenu ctx-submenu--nested">
          <CtxRow label="bring forward" onClick={() => onLayerUp(note.id)} />
          <CtxRow label="bring to front" onClick={() => onLayerToFront(note.id)} />
          <CtxRow label="send backward" onClick={() => onLayerDown(note.id)} />
          <CtxRow label="send to back" onClick={() => onLayerToBack(note.id)} />
        </div>
      } />
      <CtxRow label="delete" danger onClick={() => onRemove(note.id)} />
    </div>
  );
}

// ─── Receipt Editor Popup ─────────────────────────────────────────────────────

interface ReceiptEditorProps {
  receipt: ReceiptData;
  onSave: (updated: ReceiptData) => void;
  onClose: () => void;
}

function ReceiptEditor({ receipt, onSave, onClose }: ReceiptEditorProps) {
  const [storeName, setStoreName] = useState(receipt.storeName);
  const [logo, setLogo] = useState(receipt.logo);
  const [date, setDate] = useState(receipt.date);
  const [items, setItems] = useState<ReceiptLineItem[]>(receipt.items);
  const [tax, setTax] = useState(receipt.tax);

  const addRow = () => setItems(p => [...p, { id:crypto.randomUUID(), name:'', qty:1, price:0 }]);
  const patchRow = (id: string, patch: Partial<ReceiptLineItem>) => setItems(p => p.map(r => r.id===id ? {...r,...patch} : r));
  const removeRow = (id: string) => setItems(p => p.filter(r => r.id!==id));
  const subtotal = items.reduce((s,i) => s + i.qty * i.price, 0);
  const total = subtotal + subtotal * tax / 100;

  const save = () => onSave({ ...receipt, storeName, logo, date, items, tax });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="receipt-editor" onClick={e=>e.stopPropagation()}>
        <div className="receipt-editor__header">
          <span>edit receipt</span>
          <button className="receipt-editor__close" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="receipt-editor__meta">
          <div className="receipt-field">
            <label>logo / emoji</label>
            <input value={logo} onChange={e=>setLogo(e.target.value)} placeholder="🛒" maxLength={4} style={{ width:52, textAlign:'center', fontSize:22 }} />
          </div>
          <div className="receipt-field" style={{ flex:1 }}>
            <label>store name</label>
            <input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="Store Name" />
          </div>
          <div className="receipt-field">
            <label>date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
        </div>
        <table className="receipt-table">
          <thead><tr><th>item</th><th>qty</th><th>price</th><th></th></tr></thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id}>
                <td><input value={row.name} onChange={e=>patchRow(row.id,{name:e.target.value})} placeholder="item name" /></td>
                <td><input type="number" min="1" value={row.qty} onChange={e=>patchRow(row.id,{qty:Math.max(1,+e.target.value)})} style={{ width:50 }} /></td>
                <td><input type="number" min="0" step="0.01" value={row.price} onChange={e=>patchRow(row.id,{price:+e.target.value})} style={{ width:70 }} /></td>
                <td><button className="receipt-row-del" onClick={()=>removeRow(row.id)}><Trash2 size={13}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="receipt-editor__footer-row">
          <button className="receipt-add-row" onClick={addRow}>+ add item</button>
          <div className="receipt-tax-row">
            <label>tax %</label>
            <input type="number" min="0" max="100" step="0.1" value={tax} onChange={e=>setTax(+e.target.value)} style={{ width:60 }} />
          </div>
        </div>
        <div className="receipt-editor__totals">
          <span>subtotal: <b>${subtotal.toFixed(2)}</b></span>
          <span>tax: <b>${(subtotal*tax/100).toFixed(2)}</b></span>
          <span>total: <b>${total.toFixed(2)}</b></span>
        </div>
        <div className="receipt-editor__actions">
          <button className="receipt-save-btn" onClick={save}>save receipt</button>
          <button className="receipt-cancel-btn" onClick={onClose}>cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt rendering ────────────────────────────────────────────────────────

interface ReceiptItemProps {
  data: ReceiptData; isSelected: boolean;
  onSelect: () => void; onContextMenu: (e: React.MouseEvent) => void;
  onRemove: (id: string) => void;
  onDragEnd: (id: string, l: number, t: number) => void;
  onRotateEnd: (id: string, r: number) => void;
  onResizeEnd: (id: string, s: number) => void;
  onEditReceipt: (id: string) => void;
}

function ReceiptItem({ data, isSelected, onSelect, onContextMenu, onRemove, onDragEnd, onRotateEnd, onResizeEnd }: ReceiptItemProps) {
  const dragRef = useRef({ sX:0,sY:0,oL:0,oT:0 });
  const subtotal = data.items.reduce((s,i) => s + i.qty * i.price, 0);
  const taxAmt = subtotal * data.tax / 100;
  const total = subtotal + taxAmt;

  const handleMD = (e: React.MouseEvent<HTMLDivElement>) => {
    onSelect();
    if ((e.target as HTMLElement).closest('button,input,.sel-rot-handle,.sel-resize-handle')) return;
    e.preventDefault();
    dragRef.current = { sX:e.clientX, sY:e.clientY, oL:data.left, oT:data.top };
    const el = document.getElementById('receipt-'+data.id)!;
    const move = (mv: MouseEvent) => { el.style.left=dragRef.current.oL+(mv.clientX-dragRef.current.sX)+'px'; el.style.top=dragRef.current.oT+(mv.clientY-dragRef.current.sY)+'px'; };
    const up = (uv: MouseEvent) => { window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); onDragEnd(data.id, dragRef.current.oL+(uv.clientX-dragRef.current.sX), dragRef.current.oT+(uv.clientY-dragRef.current.sY)); };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  };

  return (
    <div id={'receipt-'+data.id}
      style={{ position:'absolute', left:data.left, top:data.top, cursor:'grab', userSelect:'none',
        transform:`rotate(${data.rotation}deg) scale(${data.scale})`, transformOrigin:'center center',
        filter:'drop-shadow(3px 6px 12px rgba(0,0,0,0.35))', overflow:'visible', zIndex:isSelected?1000:(data.z||0)+10 }}
      onMouseDown={handleMD} onContextMenu={onContextMenu}>

      {isSelected && <SelectionOverlay elemId={'receipt-'+data.id} rotation={data.rotation} scale={data.scale} onRotate={r=>onRotateEnd(data.id,r)} onResize={s=>onResizeEnd(data.id,s)} />}
      <Decorations hasPin={data.hasPin} hasTape={data.hasTape} pinColor={data.pinColor} tapeColor={data.tapeColor} tapeImage={data.tapeImage} />

      <div className="receipt-card">
        {/* Jagged top edge */}
        <div className="receipt-card__tear receipt-card__tear--top" />
        <div className="receipt-card__body">
          <div className="receipt-card__store">
            {data.logo && <span className="receipt-card__logo">{data.logo}</span>}
            <span className="receipt-card__name">{data.storeName || 'Store'}</span>
          </div>
          {data.date && <div className="receipt-card__date">{data.date}</div>}
          <div className="receipt-card__divider">- - - - - - - - - - - - -</div>
          <div className="receipt-card__items">
            {data.items.length === 0
              ? <div className="receipt-card__empty">right-click → edit receipt</div>
              : data.items.map(item => (
                <div key={item.id} className="receipt-card__item">
                  <span className="receipt-card__item-name">{item.qty > 1 ? `${item.name} ×${item.qty}` : item.name}</span>
                  <span className="receipt-card__item-price">${(item.qty * item.price).toFixed(2)}</span>
                </div>
              ))}
          </div>
          <div className="receipt-card__divider">- - - - - - - - - - - - -</div>
          <div className="receipt-card__totals">
            <div className="receipt-card__total-row"><span>subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {data.tax > 0 && <div className="receipt-card__total-row"><span>tax ({data.tax}%)</span><span>${taxAmt.toFixed(2)}</span></div>}
            <div className="receipt-card__total-row receipt-card__total-row--final"><span>TOTAL</span><span>${total.toFixed(2)}</span></div>
          </div>
          <div className="receipt-card__thanks">thank you!</div>
          <div className="receipt-card__barcode">
            {Array.from({length:40},(_,i)=>(
              <div key={i} className="receipt-card__bar" style={{ width: (i%3===0?3:i%5===0?2:1)+'px' }} />
            ))}
          </div>
        </div>
        {/* Jagged bottom edge */}
        <div className="receipt-card__tear receipt-card__tear--bottom" />
      </div>

      <button className="frame-remove-btn" onMouseDown={e=>e.stopPropagation()} onClick={()=>onRemove(data.id)} title="Remove">×</button>
    </div>
  );
}

// ─── Receipt context menu ─────────────────────────────────────────────────────

interface ReceiptCtxProps {
  receipt: ReceiptData; x: number; y: number;
  onPatch: (id: string, p: Partial<ReceiptData>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (r: ReceiptData) => void;
  onEdit: (id: string) => void;
  onLayerUp: (id: string) => void;
  onLayerDown: (id: string) => void;
  onLayerToFront: (id: string) => void;
  onLayerToBack: (id: string) => void;
}

function ReceiptContextMenu({ receipt, x, y, onPatch, onRemove, onDuplicate, onEdit, onLayerUp, onLayerDown, onLayerToFront, onLayerToBack }: ReceiptCtxProps) {
  const left = Math.min(x, window.innerWidth - 210);
  const top  = Math.min(y, window.innerHeight - 320);
  return (
    <div className="ctx-menu" style={{ left, top }} onClick={e=>e.stopPropagation()}>
      <CtxRow label="edit receipt" onClick={() => onEdit(receipt.id)} />
      <CtxRow label="change logo" submenu={
        <div className="ctx-submenu" style={{ width:140 }}>
          {['🛒','🏪','☕','🍔','💊','✂️','👗','🎮','📚','🌸'].map(e => (
            <button key={e} onClick={()=>onPatch(receipt.id,{logo:e})}
              style={{ fontSize:22, background:'none', border:'none', cursor:'pointer', padding:'2px', borderRadius:4, outline: receipt.logo===e?'2px solid #888':'none' }}>{e}</button>
          ))}
        </div>} />
      <CtxRow label="washi tape" toggle checked={receipt.hasTape}
        onToggleOn={()=>onPatch(receipt.id,{hasTape:true})}
        onToggleOff={()=>onPatch(receipt.id,{hasTape:false})}
        submenu={colorSub<ReceiptData>(receipt.id,'tapeColor',TAPE_COLORS,receipt.hasTape,receipt.tapeColor,onPatch)} />
      <CtxRow label="push pin" toggle checked={receipt.hasPin}
        onToggleOn={()=>onPatch(receipt.id,{hasPin:true})}
        onToggleOff={()=>onPatch(receipt.id,{hasPin:false})}
        submenu={colorSub<ReceiptData>(receipt.id,'pinColor',PIN_COLORS,receipt.hasPin,receipt.pinColor,onPatch)} />
      <CtxRow label="duplicate" onClick={() => onDuplicate(receipt)} />
      <CtxRow label="layers" submenu={
        <div className="ctx-submenu ctx-submenu--nested">
          <CtxRow label="bring forward" onClick={() => onLayerUp(receipt.id)} />
          <CtxRow label="bring to front" onClick={() => onLayerToFront(receipt.id)} />
          <CtxRow label="send backward" onClick={() => onLayerDown(receipt.id)} />
          <CtxRow label="send to back" onClick={() => onLayerToBack(receipt.id)} />
        </div>
      } />
      <CtxRow label="delete" danger onClick={() => onRemove(receipt.id)} />
    </div>
  );
}

// ─── Paper style helpers ──────────────────────────────────────────────────────

const PAPER_COLORS: Record<PaperColor, string> = {
  cream: '#fefde6', yellow: '#fef9c3', blue: '#e8f4fd', pink: '#fce7f3', green: '#f0fdf4', white: '#ffffff',
};

const PAPER_LINE_COLORS: Record<PaperColor, string> = {
  cream: 'rgba(0,0,180,0.08)', yellow: 'rgba(0,0,180,0.09)', blue: 'rgba(0,100,220,0.12)',
  pink: 'rgba(180,0,100,0.08)', green: 'rgba(0,120,50,0.10)', white: 'rgba(0,0,0,0.08)',
};

function getPaperBackground(style: PaperStyle, color: PaperColor, lineH: number): React.CSSProperties {
  const bg = PAPER_COLORS[color];
  const lc = PAPER_LINE_COLORS[color];
  if (style === 'plain') return { backgroundColor: bg };
  if (style === 'dotted') return {
    backgroundColor: bg,
    backgroundImage: `radial-gradient(circle, ${lc.replace('rgba(','rgba(').replace(',0.',',0.35,')} 1.5px, transparent 1.5px)`,
    backgroundSize: `${lineH}px ${lineH}px`,
  };
  if (style === 'grid') return {
    backgroundColor: bg,
    backgroundImage: `linear-gradient(${lc} 1px, transparent 1px), linear-gradient(90deg, ${lc} 1px, transparent 1px)`,
    backgroundSize: `${lineH}px ${lineH}px`,
  };
  if (style === 'ancient') return {
    backgroundColor: '#e8dcc8',
    backgroundImage: `linear-gradient(rgba(100,70,20,0.12) 1px, transparent 1px)`,
    backgroundSize: `100% ${lineH}px`,
    backgroundPosition: `0 ${lineH * 1.35}px`,
    backgroundOrigin: 'content-box',
  };
  // lined (default)
  return {
    backgroundColor: bg,
    backgroundImage: `linear-gradient(${lc} 1px, transparent 1px)`,
    backgroundSize: `100% ${lineH}px`,
    backgroundPosition: `0 ${lineH * 1.35}px`,
    backgroundOrigin: 'content-box',
  };
}

function getPaperTypeClass(type: PaperType) {
  if (type === 'legal') return 'paper-type--legal';
  if (type === 'ring') return 'paper-type--ring';
  if (type === 'notepad') return 'paper-type--notepad';
  return '';
}

// ─── Sheet of Paper ───────────────────────────────────────────────────────────

function newLine(type: PaperLineType = 'text'): PaperLine {
  return { id: crypto.randomUUID(), type, text: '', checked: false, indent: 0 };
}

function PaperEditor({ title: initTitle, lines: initLines, onSave, onCancel }: {
  title: string; lines: PaperLine[];
  onSave: (title: string, lines: PaperLine[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initTitle);
  const [lines, setLines] = useState<PaperLine[]>(initLines.length ? initLines : [newLine()]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateLine = (id: string, patch: Partial<PaperLine>) =>
    setLines(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));

  const removeLine = (id: string) =>
    setLines(ls => ls.length > 1 ? ls.filter(l => l.id !== id) : ls);

  const moveLine = (id: string, dir: -1 | 1) => {
    setLines(ls => {
      const i = ls.findIndex(l => l.id === id);
      if (i < 0) return ls;
      // Gather the line and its subtask group (consecutive lines with higher indent)
      const baseIndent = ls[i].indent;
      let groupEnd = i + 1;
      while (groupEnd < ls.length && ls[groupEnd].indent > baseIndent) groupEnd++;
      const target = dir === -1 ? i - 1 : groupEnd;
      if (target < 0 || target >= ls.length) return ls;
      // Find the target group's start
      let targetStart = target;
      while (targetStart > 0 && ls[targetStart].indent > ls[target].indent && dir === 1) targetStart--;
      const targetGroupStart = dir === -1 ? (() => { let s = target; while (s > 0 && ls[s-1].indent > ls[target].indent) s--; return s; })() : target;
      const group = ls.slice(i, groupEnd);
      const rest = ls.filter((_, idx) => idx < i || idx >= groupEnd);
      const insertAt = dir === -1 ? targetGroupStart : targetGroupStart;
      const arr = [...rest.slice(0, insertAt), ...group, ...rest.slice(insertAt)];
      return arr;
    });
  };

  const dragLine = useRef<{ id: string } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, line: PaperLine) => {
    dragLine.current = { id: line.id };
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, line: PaperLine) => {
    e.preventDefault();
    setDragOverId(line.id);
  };
  const handleDrop = (e: React.DragEvent, targetLine: PaperLine) => {
    e.preventDefault();
    const dragged = dragLine.current;
    dragLine.current = null;
    setDragOverId(null);
    if (!dragged || dragged.id === targetLine.id) return;
    setLines(ls => {
      const di = ls.findIndex(l => l.id === dragged.id);
      const ti = ls.findIndex(l => l.id === targetLine.id);
      if (di < 0 || ti < 0) return ls;
      // Move dragged line and its subtask group to before the target
      const baseIndent = ls[di].indent;
      let groupEnd = di + 1;
      while (groupEnd < ls.length && ls[groupEnd].indent > baseIndent) groupEnd++;
      const group = ls.slice(di, groupEnd);
      const rest = ls.filter((_, idx) => idx < di || idx >= groupEnd);
      const newTi = rest.findIndex(l => l.id === targetLine.id);
      return [...rest.slice(0, newTi), ...group, ...rest.slice(newTi)];
    });
  };

  const insertLineAfter = (idx: number, type: PaperLineType) => {
    const fresh = newLine(type);
    setLines(ls => { const arr=[...ls]; arr.splice(idx+1,0,fresh); return arr; });
    setTimeout(() => inputRefs.current[fresh.id]?.focus(), 0);
  };

  const handleLineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, line: PaperLine, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = line.text;
      let nextType: PaperLineType = line.type;
      let cleanText = text;
      if (text.startsWith('--')) { nextType='important'; cleanText=text.slice(2).trimStart(); }
      else if (text.startsWith('-~')) { nextType='squiggly'; cleanText=text.slice(2).trimStart(); }
      else if (text.startsWith('-)')) { nextType='curved'; cleanText=text.slice(2).trimStart(); }
      else if (text.startsWith('-') && line.type==='text') { nextType='checkbox'; cleanText=text.slice(1).trimStart(); }
      if (cleanText !== text || nextType !== line.type) updateLine(line.id, { text: cleanText, type: nextType });
      const continuationType = (nextType==='checkbox'||nextType==='checkbox-sub') ? nextType : nextType;
      insertLineAfter(idx, continuationType);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const maxIndent = 3;
      if (e.shiftKey) {
        updateLine(line.id, { indent: Math.max(0, (line.indent||0) - 1), type: (line.indent||0) <= 1 ? 'checkbox' : 'checkbox-sub' });
      } else {
        const newIndent = Math.min(maxIndent, (line.indent||0) + 1);
        updateLine(line.id, { indent: newIndent, type: newIndent > 0 ? 'checkbox-sub' : 'checkbox' });
      }
    } else if (e.key === 'Backspace' && line.text === '' && lines.length > 1) {
      e.preventDefault();
      const prev = lines[idx-1];
      removeLine(line.id);
      if (prev) setTimeout(() => inputRefs.current[prev.id]?.focus(), 0);
    }
  };

  const handleLineBlur = (line: PaperLine) => {
    const t = line.text;
    if (t.startsWith('--')) updateLine(line.id, { type:'important', text:t.slice(2).trimStart() });
    else if (t.startsWith('-~')) updateLine(line.id, { type:'squiggly', text:t.slice(2).trimStart() });
    else if (t.startsWith('-)')) updateLine(line.id, { type:'curved', text:t.slice(2).trimStart() });
    else if (t.startsWith('-') && line.type==='text') updateLine(line.id, { type:'checkbox', text:t.slice(1).trimStart() });
  };

  const lineIcon = (type: PaperLineType) => {
    if (type==='important') return '∗';
    if (type==='squiggly') return '⤳';
    if (type==='curved') return '⤹';
    return null;
  };

  return (
    <div className="paper-editor">
      {/* Title row with done/cancel right-aligned */}
      <div className="paper-editor__title-row">
        <input
          className="paper-editor__title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title..."
          onMouseDown={e => e.stopPropagation()}
        />
        <div className="paper-editor__title-actions">
          <button className="paper-editor__done" onMouseDown={e=>e.stopPropagation()} onClick={() => onSave(title, lines)}>done</button>
          <button className="paper-editor__cancel" onMouseDown={e=>e.stopPropagation()} onClick={onCancel}>✕</button>
        </div>
      </div>
      <div className="paper-editor__divider" />
      <div className="paper-editor__body">
        {lines.map((line, idx) => {
          const isCb = line.type==='checkbox' || line.type==='checkbox-sub';
          const icon = lineIcon(line.type);
          const indentPx = (line.indent||0) * 20;
          return (
            <div key={line.id} className={`paper-line paper-line--${line.type}${dragOverId===line.id?' paper-line--dragover':''}`}
              draggable
              onDragStart={e => handleDragStart(e, line)}
              onDragOver={e => handleDragOver(e, line)}
              onDrop={e => handleDrop(e, line)}
              onDragEnd={() => { dragLine.current=null; setDragOverId(null); }}
              style={{ paddingLeft: indentPx }}
            >
              {isCb && (
                <button
                  className={`paper-cb${line.checked?' paper-cb--checked':''}`}
                  onMouseDown={e=>e.stopPropagation()}
                  onClick={() => updateLine(line.id, { checked:!line.checked })}
                />
              )}
              {!isCb && icon && <span className="paper-line__icon">{icon}</span>}
              <input
                ref={el => { inputRefs.current[line.id]=el; }}
                className={`paper-line__input${line.checked?' paper-line__input--done':''}${line.type==='checkbox-sub'?' paper-line__input--sub':''}`}
                value={line.text}
                placeholder={idx===0&&lines.length===1 ? '- checkbox  -- ★ item  -~ squiggly  -) curved  Tab=indent' : ''}
                onChange={e => updateLine(line.id, { text:e.target.value })}
                onKeyDown={e => handleLineKeyDown(e, line, idx)}
                onBlur={() => handleLineBlur(line)}
                onMouseDown={e => e.stopPropagation()}
              />
              <div className="paper-line__controls">
                <button className="paper-line__move" onMouseDown={e=>e.stopPropagation()} onClick={()=>moveLine(line.id,-1)} disabled={idx===0}>↑</button>
                <button className="paper-line__move" onMouseDown={e=>e.stopPropagation()} onClick={()=>moveLine(line.id,1)} disabled={idx===lines.length-1}>↓</button>
                <button className="paper-line__del" onMouseDown={e=>e.stopPropagation()} onClick={()=>removeLine(line.id)}>×</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaperDisplay({ title, lines, onToggle }: { title: string; lines: PaperLine[]; onToggle?: (id: string) => void }) {
  const lineIcon = (type: PaperLineType) => {
    if (type==='important') return '∗';
    if (type==='squiggly') return '⤳';
    if (type==='curved') return '⤹';
    return null;
  };
  return (
    <div className="paper-display">
      {title && <div className="paper-display__title">{title}</div>}
      {title && <div className="paper-editor__divider" />}
      <div className="paper-display__lines">
        {lines.length===0 && <span className="paper-display__empty">right-click → edit text</span>}
        {lines.map(line => {
          const isCb = line.type==='checkbox' || line.type==='checkbox-sub';
          const icon = lineIcon(line.type);
          return (
            <div key={line.id} className={`paper-line paper-line--${line.type}`}>
              {isCb && (
                <button
                  className={`paper-cb paper-cb--view${line.checked?' paper-cb--checked':''}`}
                  onMouseDown={e=>e.stopPropagation()}
                  onClick={() => onToggle?.(line.id)}
                />
              )}
              {!isCb && icon && <span className="paper-line__icon">{icon}</span>}
              <span className={`paper-line__text${line.checked?' paper-line__input--done':''}${line.type==='checkbox-sub'?' paper-line__input--sub':''}`}>{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PaperProps {
  data: PaperData; isSelected: boolean;
  onSelect: () => void; onContextMenu: (e: React.MouseEvent) => void;
  onRemove: (id: string) => void;
  onSaveContent: (id: string, title: string, lines: PaperLine[]) => void;
  onToggleLine: (id: string, lineId: string) => void;
  onDragEnd: (id: string, l: number, t: number) => void;
  onRotateEnd: (id: string, r: number) => void;
  onResizeEnd: (id: string, s: number) => void;
  onResizeDims: (id: string, w: number, h: number) => void;
  editing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
}

function PaperItem({ data, isSelected, onSelect, onContextMenu, onRemove, onSaveContent, onToggleLine, onDragEnd, onRotateEnd, onResizeEnd, onResizeDims, editing, onStartEdit, onEndEdit }: PaperProps) {
  const dragRef = useRef({ sX:0,sY:0,oL:0,oT:0 });
  const lineH = 34;

  const handleMD = (e: React.MouseEvent<HTMLDivElement>) => {
    onSelect();
    if (editing || (e.target as HTMLElement).closest('button,input,.sel-rot-handle,.sel-resize-handle,.paper-resize-corner')) return;
    e.preventDefault();
    dragRef.current = { sX:e.clientX, sY:e.clientY, oL:data.left, oT:data.top };
    const el = document.getElementById('paper-'+data.id)!;
    const move = (mv: MouseEvent) => { el.style.left=dragRef.current.oL+(mv.clientX-dragRef.current.sX)+'px'; el.style.top=dragRef.current.oT+(mv.clientY-dragRef.current.sY)+'px'; };
    const up = (uv: MouseEvent) => { window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); onDragEnd(data.id, dragRef.current.oL+(uv.clientX-dragRef.current.sX), dragRef.current.oT+(uv.clientY-dragRef.current.sY)); };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  };

  const handleCornerMD = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const startX=e.clientX, startY=e.clientY, startW=data.width, startH=data.height;
    const el = document.getElementById('paper-'+data.id)!;
    const move = (mv: MouseEvent) => {
      const nw=Math.max(220,startW+(mv.clientX-startX)/data.scale);
      const nh=Math.max(240,startH+(mv.clientY-startY)/data.scale);
      el.style.width=nw+'px'; el.style.height=nh+'px';
    };
    const up = (uv: MouseEvent) => {
      window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up);
      onResizeDims(data.id, Math.max(220,startW+(uv.clientX-startX)/data.scale), Math.max(240,startH+(uv.clientY-startY)/data.scale));
    };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  };

  const bgStyle = getPaperBackground(data.paperStyle, data.paperColor, lineH);
  const typeClass = getPaperTypeClass(data.paperType);

  return (
    <div id={'paper-'+data.id}
      style={{ position:'absolute', left:data.left, top:data.top, width:data.width, height:'auto', minHeight:data.height,
        cursor:editing?'default':'grab', userSelect:'none', transform:`rotate(${data.rotation}deg) scale(${data.scale})`,
        transformOrigin:'top left', filter:'drop-shadow(3px 6px 14px rgba(0,0,0,0.28))',
        overflow:'visible', zIndex:isSelected?1000:(data.z||0)+10 }}
      onMouseDown={handleMD} onContextMenu={onContextMenu}>

      {isSelected && <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, pointerEvents:'none', zIndex:17 }}>
        <SelectionOverlay elemId={'paper-'+data.id} rotation={data.rotation} scale={data.scale} onRotate={r=>onRotateEnd(data.id,r)} onResize={s=>onResizeEnd(data.id,s)} />
      </div>}
      <Decorations hasPin={data.hasPin} hasTape={data.hasTape} pinColor={data.pinColor} tapeColor={data.tapeColor} tapeImage={data.tapeImage} />

      <div className={`paper-card ${typeClass}`} style={{
        ...bgStyle,
        width:'100%',
        minHeight:data.height,
        height:'auto',
        padding:'18px 18px 28px',
        boxSizing:'border-box',
        overflow:'hidden',
        position:'relative',
      }}>
        {editing ? (
          <PaperEditor
            title={data.title}
            lines={data.lines}
            onSave={(t,ls) => { onSaveContent(data.id,t,ls); onEndEdit(); }}
            onCancel={onEndEdit}
          />
        ) : (
          <>
            <PaperDisplay title={data.title} lines={data.lines} onToggle={lid => onToggleLine(data.id, lid)} />
            <span className="note-controls" style={{ bottom:6, right:6 }}>
              <button className="note-ctrl-btn" style={{ color:'#5a6e3a', borderColor:'#5a6e3a' }} onMouseDown={e=>e.stopPropagation()} onClick={() => { onSelect(); onStartEdit(); }}>edit</button>
              <button className="note-ctrl-btn" style={{ color:'#b05050', borderColor:'#b05050' }} onMouseDown={e=>e.stopPropagation()} onClick={()=>onRemove(data.id)}>×</button>
            </span>
          </>
        )}
      </div>

      <div className="paper-resize-corner" onMouseDown={handleCornerMD} title="Drag to resize" />
    </div>
  );
}

// ─── Paper context menu ───────────────────────────────────────────────────────

// ─── Paper context menu ───────────────────────────────────────────────────────

// Circle preview swatch helper
function SwatchGrid<T extends string>({ options, current, onSelect, renderSwatch }: {
  options: T[]; current: T;
  onSelect: (v: T) => void;
  renderSwatch: (v: T) => React.ReactNode;
}) {
  return (
    <div className="ctx-submenu ctx-submenu--swatches">
      {options.map(v => (
        <button key={v} className={`ctx-swatch-btn${current===v?' ctx-swatch-btn--active':''}`} onClick={() => onSelect(v)} title={v}>
          {renderSwatch(v)}
        </button>
      ))}
    </div>
  );
}

function PaperStyleSwatch({ style }: { style: PaperStyle }) {
  const lineH = 10;
  const bg = getPaperBackground(style, 'cream', lineH);
  return (
    <div style={{ width:28, height:28, borderRadius:'50%', border:'1.5px solid rgba(0,0,0,0.15)', overflow:'hidden', ...bg, flexShrink:0 }} />
  );
}

function PaperColorSwatch({ color }: { color: PaperColor }) {
  return (
    <div style={{ width:28, height:28, borderRadius:'50%', border:'1.5px solid rgba(0,0,0,0.15)', background:PAPER_COLORS[color], flexShrink:0 }} />
  );
}

const PAPER_TYPE_LABELS: Record<PaperType, string> = {
  notepad: '📋', legal: '⚖', ring: '🔗', plain: '□',
};

const NOTE_KEY_TEXT = `Sheet shortcut keys:
Enter → new line
- + Enter → ☑ checkbox
Tab → indent (sub-subtasks with repeated Tab)

Shift+Tab → outdent
-- + Enter → ★ important
-~ + Enter → ⤳ squiggly  
-) + Enter → ⤹ curved
Backspace on empty line → delete line
Drag lines to reorder (subtasks move with their parent)`;

interface PaperCtxProps {
  paper: PaperData; x: number; y: number;
  onPatch: (id: string, p: Partial<PaperData>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (p: PaperData) => void;
  onEdit: (id: string) => void;
  onLayerUp: (id: string) => void;
  onLayerDown: (id: string) => void;
  onLayerToFront: (id: string) => void;
  onLayerToBack: (id: string) => void;
}

function PaperContextMenu({ paper, x, y, onPatch, onRemove, onDuplicate, onEdit, onLayerUp, onLayerDown, onLayerToFront, onLayerToBack }: PaperCtxProps) {
  const [showKey, setShowKey] = useState(false);
  const left = Math.min(x, window.innerWidth - 240);
  const top  = Math.min(y, window.innerHeight - 360);

  const PAPER_STYLES: PaperStyle[] = ['lined','dotted','grid','plain','ancient'];
  const PAPER_COLORS_LIST: PaperColor[] = ['cream','yellow','blue','pink','green','white'];
  const PAPER_TYPES: PaperType[] = ['notepad','legal','ring','plain'];

  return (
    <div className="ctx-menu" style={{ left, top }} onClick={e=>e.stopPropagation()}>
      <CtxRow label="edit text" onClick={() => onEdit(paper.id)} />
      <CtxRow label="open note key" onClick={() => setShowKey(true)} />
      <CtxRow label="change sheet" submenu={
        <div className="ctx-submenu ctx-submenu--nested">
          <CtxRow label="sheet style" submenu={
            <SwatchGrid
              options={PAPER_STYLES}
              current={paper.paperStyle}
              onSelect={v => onPatch(paper.id, { paperStyle: v })}
              renderSwatch={v => <PaperStyleSwatch style={v} />}
            />
          } />
          <CtxRow label="color" submenu={
            <SwatchGrid
              options={PAPER_COLORS_LIST}
              current={paper.paperColor}
              onSelect={v => onPatch(paper.id, { paperColor: v })}
              renderSwatch={v => <PaperColorSwatch color={v} />}
            />
          } />
          <CtxRow label="type" submenu={
            <SwatchGrid
              options={PAPER_TYPES}
              current={paper.paperType}
              onSelect={v => onPatch(paper.id, { paperType: v })}
              renderSwatch={v => (
                <div style={{ width:28, height:28, borderRadius:'50%', border:'1.5px solid rgba(0,0,0,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, background:'#fefde6' }}>
                  {PAPER_TYPE_LABELS[v]}
                </div>
              )}
            />
          } />
        </div>
      } />
      <CtxRow label="washi tape" toggle checked={paper.hasTape}
        onToggleOn={()=>onPatch(paper.id,{hasTape:true})}
        onToggleOff={()=>onPatch(paper.id,{hasTape:false})}
        submenu={colorSub<PaperData>(paper.id,'tapeColor',TAPE_COLORS,paper.hasTape,paper.tapeColor,onPatch)} />
      <CtxRow label="push pin" toggle checked={paper.hasPin}
        onToggleOn={()=>onPatch(paper.id,{hasPin:true})}
        onToggleOff={()=>onPatch(paper.id,{hasPin:false})}
        submenu={colorSub<PaperData>(paper.id,'pinColor',PIN_COLORS,paper.hasPin,paper.pinColor,onPatch)} />
      <CtxRow label="duplicate" onClick={() => onDuplicate(paper)} />
      <CtxRow label="layers" submenu={
        <div className="ctx-submenu ctx-submenu--nested">
          <CtxRow label="bring forward" onClick={() => onLayerUp(paper.id)} />
          <CtxRow label="bring to front" onClick={() => onLayerToFront(paper.id)} />
          <CtxRow label="send backward" onClick={() => onLayerDown(paper.id)} />
          <CtxRow label="send to back" onClick={() => onLayerToBack(paper.id)} />
        </div>
      } />
      <CtxRow label="delete" danger onClick={() => onRemove(paper.id)} />
      {showKey && (
        <div className="modal-backdrop" onClick={e=>{e.stopPropagation();setShowKey(false);}}>
          <div className="paper-key-popup" onClick={e=>e.stopPropagation()}>
            <div className="paper-key-popup__header">
              <span>note key</span>
              <button onClick={()=>setShowKey(false)}><X size={15}/></button>
            </div>
            <pre className="paper-key-popup__body">{NOTE_KEY_TEXT}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add menu ─────────────────────────────────────────────────────────────────

type AddType = 'note'|'polaroid1'|'photostrip'|'film'|'receipt'|'paper'|'keychain'|'image';

function AddMenu({ onAdd }: { onAdd: (t: AddType) => void }) {
  const [which, setWhich] = useState<'objects'|'decorations'|null>(null);
  useEffect(() => {
    if (!which) return;
    const c = () => setWhich(null);
    window.addEventListener('click', c);
    return () => window.removeEventListener('click', c);
  }, [which]);

  const objectItems: [AddType, string, React.ReactNode][] = [
    ['note',      'sticky note',    <StickyNote size={16}/>],
    ['polaroid1', 'polaroid',       <Image size={16}/>],
    ['image',     'image',          <ImageIcon size={16}/>],
    ['paper',     'sheet of paper', <FileText size={16}/>],
  ];
  const decoItems: [AddType, string, React.ReactNode][] = [
    ['photostrip','photo strip',    <Film size={16}/>],
    ['film',      'photo film',     <Film size={16}/>],
    ['receipt',   'receipt',        <Receipt size={16}/>],
    ['keychain',  'add keychain',   <Link size={16}/>],
  ];

  return (
    <div style={{ position:'fixed', top:10, right:10, zIndex:200, display:'flex', gap:8 }}>
      <button className="add-btn-rect"
        onClick={e=>{e.stopPropagation();setWhich(w=>w==='decorations'?null:'decorations');}} title="Decorations">
        decorations
      </button>
      <button className="add-btn-rect"
        onClick={e=>{e.stopPropagation();setWhich(w=>w==='objects'?null:'objects');}} title="Add objects">
        add objects
      </button>
      {which && (
        <div className="add-menu" style={{ right: which==='objects' ? 0 : 'auto', left: which==='objects' ? 'auto' : 0, top: 48 }}
          onClick={e=>e.stopPropagation()}>
          {(which==='objects'?objectItems:decoItems).map(([t,label,icon]) => (
            <button key={t} className="add-menu-item" onClick={()=>{onAdd(t);setWhich(null);}}>
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

// ─── Keyring + Keychain ────────────────────────────────────────────────────────

const RING_COLORS = ['#4ade80','#f9a8d4','#93c5fd','#fcd34d','#c4b5fd','#fb923c'];
const SNAP_RADIUS = 70; // px — how close the hook needs to be to snap

interface KeyringCtxProps { ring: KeyringData; x:number; y:number; onPatch:(id:string,p:Partial<KeyringData>)=>void; onRemove:(id:string)=>void; }
function KeyringContextMenu({ ring, x, y, onPatch, onRemove }: KeyringCtxProps) {
  const left = Math.min(x, window.innerWidth - 210);
  const top  = Math.min(y, window.innerHeight - 240);
  return (
    <div className="ctx-menu" style={{ left, top }} onClick={e=>e.stopPropagation()}>
      <CtxRow label={ring.locked ? 'unlock position' : 'lock position'}
        onClick={() => onPatch(ring.id, { locked: !ring.locked })} />
      <CtxRow label="change color" submenu={
        <div className="ctx-submenu ctx-submenu--swatches">
          {RING_COLORS.map(c => (
            <button key={c} className={`ctx-swatch-btn${ring.color===c?' ctx-swatch-btn--active':''}`}
              onClick={() => onPatch(ring.id, { color:c })}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:c, border:'1.5px solid rgba(0,0,0,0.15)' }} />
            </button>
          ))}
        </div>
      } />
      <CtxRow label="delete" danger onClick={() => onRemove(ring.id)} />
    </div>
  );
}

function KeyringItem({ data, onContextMenu, onChange }: {
  data: KeyringData;
  onContextMenu: (e:React.MouseEvent) => void;
  onChange: (id:string, left:number, top:number) => void;
}) {
  const dragRef = useRef({ sX:0,sY:0,oL:0,oT:0 });

  const handleMD = (e: React.MouseEvent) => {
    if (data.locked) return;
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { sX:e.clientX, sY:e.clientY, oL:data.left, oT:data.top };
    const el = document.getElementById('ring-'+data.id)!;
    const move = (mv:MouseEvent) => { el.style.left=dragRef.current.oL+(mv.clientX-dragRef.current.sX)+'px'; el.style.top=dragRef.current.oT+(mv.clientY-dragRef.current.sY)+'px'; };
    const up = (uv:MouseEvent) => { window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); onChange(data.id, dragRef.current.oL+(uv.clientX-dragRef.current.sX), dragRef.current.oT+(uv.clientY-dragRef.current.sY)); };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  };

  return (
    <div id={'ring-'+data.id} onContextMenu={onContextMenu} onMouseDown={handleMD}
      style={{ position:'absolute', left:data.left, top:data.top, width:56, height:56,
        cursor:data.locked?'context-menu':'grab', userSelect:'none', zIndex:30,
        filter:`drop-shadow(1px 2px 4px rgba(0,0,0,0.3)) hue-rotate(${ringHueShift(data.color)}deg) saturate(1.2)`,
      }}>
      <img src="/green.svg" alt="" style={{ width:56, height:56, display:'block', pointerEvents:'none' }} />
      {data.locked && (
        <div style={{ position:'absolute', bottom:-14, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'rgba(0,0,0,0.35)', whiteSpace:'nowrap', pointerEvents:'none' }}>locked</div>
      )}
    </div>
  );
}

function ringHueShift(color: string): number {
  // green.svg is green — shift hue to approximate the desired color
  const map: Record<string, number> = {
    '#4ade80': 0,      // green (base)
    '#f9a8d4': -120,   // pink
    '#93c5fd': -175,   // blue
    '#fcd34d': 60,     // yellow
    '#c4b5fd': -145,   // purple
    '#fb923c': 80,     // orange
  };
  return map[color] ?? 0;
}

// ─── Upload helper ─────────────────────────────────────────────────────────────
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── Keychain upload prompt ─────────────────────────────────────────────────
function KeychainUploadPrompt({ onUpload, onCancel }: {
  onUpload: (url: string, offsetX: number, offsetY: number) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgScale, setImgScale] = useState(1);
  const panRef = useRef({ sX: 0, sY: 0, oX: 0, oY: 0 });

  const handleFile = async (file: File) => {
    const url = await readFileAsDataURL(file);
    setPreview(url);
    setOffset({ x: 0, y: 0 });
    setImgScale(1);
  };

  const handlePanMD = (e: React.MouseEvent) => {
    if (!preview) return;
    e.preventDefault();
    panRef.current = { sX: e.clientX, sY: e.clientY, oX: offset.x, oY: offset.y };
    const move = (mv: MouseEvent) => {
      setOffset({ x: panRef.current.oX + (mv.clientX - panRef.current.sX), y: panRef.current.oY + (mv.clientY - panRef.current.sY) });
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const BASE_SIZE = 120;
  const displayW = BASE_SIZE * imgScale;
  const displayH = BASE_SIZE * imgScale;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="keychain-upload-modal" onClick={e => e.stopPropagation()}>
        <div className="keychain-upload-modal__header">
          <span>hang your charm</span>
          <button onClick={onCancel}><X size={15} /></button>
        </div>
        <p className="keychain-upload-modal__hint">
          Upload your design. Drag the image below to reposition it.
        </p>

        {!preview ? (
          <div className="keychain-upload-modal__drop"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#888' }}>
              <Upload size={28} />
              <span style={{ fontSize: 13 }}>click or drag your image here</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0 4px' }}>
            {/* Draggable preview — no circle shell, transparent checkerboard bg */}
            <div style={{ position: 'relative', width: 160, height: 160,
              borderRadius: 8, overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              cursor: 'grab', border: '1px solid rgba(0,0,0,0.1)',
              background: 'repeating-conic-gradient(#e0e0e0 0% 25%, #f8f8f8 0% 50%) 0 0 / 14px 14px',
            }} onMouseDown={handlePanMD}>
              <img src={preview} alt="charm preview"
                style={{ position: 'absolute', top: '50%', left: '50%',
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  maxWidth: 'none', maxHeight: 'none',
                  width: displayW, height: displayH,
                  objectFit: 'contain',
                  pointerEvents: 'none', userSelect: 'none',
                }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 160 }}>
              <span style={{ fontSize: 10, color: '#888', fontFamily: 'sans-serif' }}>size</span>
              <input type="range" min={0.5} max={3} step={0.1} value={imgScale}
                onChange={e => setImgScale(parseFloat(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }} />
            </div>
            <button className="paper-editor__cancel" style={{ fontSize: 11 }}
              onClick={() => fileRef.current?.click()}>change image</button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={async e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        <div className="keychain-upload-modal__footer">
          <button className="paper-editor__cancel" onClick={onCancel}>cancel</button>
          <button className="paper-editor__done" disabled={!preview}
            onClick={() => preview && onUpload(preview, offset.x, offset.y)}>
            attach charm
          </button>
        </div>
      </div>
    </div>
  );
}

interface KeychainCtxProps { chain:KeychainData; x:number; y:number; onChangeImage:()=>void; onDetach:()=>void; onUnlockMove:()=>void; onRemove:(id:string)=>void; }
function KeychainContextMenu({ chain, x, y, onChangeImage, onDetach, onRemove }: KeychainCtxProps) {
  const left = Math.min(x, window.innerWidth - 210);
  const top  = Math.min(y, window.innerHeight - 200);
  return (
    <div className="ctx-menu" style={{ left, top }} onClick={e=>e.stopPropagation()}>
      <CtxRow label="change image" onClick={onChangeImage} />
      {chain.attachedRingId && <CtxRow label="detach from ring" onClick={onDetach} />}
      <CtxRow label="delete" danger onClick={() => onRemove(chain.id)} />
    </div>
  );
}

function KeychainItem({ data, rings, onContextMenu, onDragEnd, onAttach, onDetach }: {
  data: KeychainData;
  rings: KeyringData[];
  onContextMenu: (e: React.MouseEvent) => void;
  onDragEnd: (id: string, left: number, top: number, snapRingId: string | null) => void;
  onAttach: (chainId: string, ringId: string) => void;
  onDetach: (chainId: string) => void;
}) {
  const dragRef = useRef({ sX: 0, sY: 0, oL: 0, oT: 0 });
  const [snapHighlight, setSnapHighlight] = useState<string | null>(null);

  const attachedRing = rings.find(r => r.id === data.attachedRingId);

  const HOOK_W = 90;
  const RING_W = 56;
  const RING_CENTER = 28; // half of ring width
  // Center the hook horizontally under the ring
  const displayLeft = attachedRing ? attachedRing.left + RING_CENTER - HOOK_W / 2 : data.left;
  // Position so the top of the hook overlaps the bottom of the ring
  const displayTop = attachedRing ? attachedRing.top + RING_W * 0.55 : data.top;

  const handleMD = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (data.attachedRingId) onDetach(data.id);

    dragRef.current = { sX: e.clientX, sY: e.clientY, oL: displayLeft, oT: displayTop };
    const el = document.getElementById('chain-' + data.id)!;

    const move = (mv: MouseEvent) => {
      const nl = dragRef.current.oL + (mv.clientX - dragRef.current.sX);
      const nt = dragRef.current.oT + (mv.clientY - dragRef.current.sY);
      el.style.left = nl + 'px'; el.style.top = nt + 'px';
      // Snap check: hook top-center vs ring center
      const hookX = nl + HOOK_W / 2; const hookY = nt + 12;
      const near = rings.find(r => Math.hypot((r.left + RING_CENTER) - hookX, (r.top + RING_CENTER) - hookY) < SNAP_RADIUS);
      setSnapHighlight(near?.id ?? null);
    };
    const up = (uv: MouseEvent) => {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
      const nl = dragRef.current.oL + (uv.clientX - dragRef.current.sX);
      const nt = dragRef.current.oT + (uv.clientY - dragRef.current.sY);
      const hookX = nl + HOOK_W / 2; const hookY = nt + 12;
      const near = rings.find(r => Math.hypot((r.left + RING_CENTER) - hookX, (r.top + RING_CENTER) - hookY) < SNAP_RADIUS);
      setSnapHighlight(null);
      if (near) onAttach(data.id, near.id);
      else onDragEnd(data.id, nl, nt, null);
    };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  return (
    <>
      {snapHighlight && rings.filter(r => r.id === snapHighlight).map(r => (
        <div key={r.id} style={{ position: 'absolute', left: r.left - 8, top: r.top - 8, width: 72, height: 72,
          borderRadius: '50%', border: '2px dashed rgba(74,222,128,0.8)',
          pointerEvents: 'none', zIndex: 28, animation: 'pulse-ring 0.6s ease infinite' }} />
      ))}

      <div id={'chain-' + data.id} onContextMenu={onContextMenu} onMouseDown={handleMD}
        style={{ position: 'absolute', left: displayLeft, top: displayTop,
          cursor: 'grab', userSelect: 'none',
          zIndex: data.attachedRingId ? 25 : 35,
          width: HOOK_W,
        }}>

        {/* Hook — centered under the ring. The ring (z-index 30) covers the top portion */}
        <img src="/hookything.svg" alt=""
          style={{ width: HOOK_W, height: HOOK_W, display: 'block', pointerEvents: 'none',
            position: 'relative', zIndex: 24, marginBottom: -12 }} />

        {/* Charm — rendered ON TOP of the hook (higher z-index) */}
        {data.imageUrl && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 26,
            filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))',
            marginTop: 2,
          }}>
            <img src={data.imageUrl} alt="charm"
              style={{
                maxWidth: 100, maxHeight: 110,
                objectFit: 'contain',
                display: 'block',
                pointerEvents: 'none',
                userSelect: 'none',
                transform: `translate(${data.imgOffsetX}px, ${data.imgOffsetY}px)`,
              }} />
          </div>
        )}
      </div>
    </>
  );
}

// ─── Image (regular photo) ────────────────────────────────────────────────────

interface ImageCtxProps {
  img: ImageData; x: number; y: number;
  onRemove: (id: string) => void;
  onDuplicate: (img: ImageData) => void;
  onChangeImage: (id: string) => void;
  onPatch: (id: string, p: Partial<ImageData>) => void;
  onLayerUp: (id: string) => void;
  onLayerDown: (id: string) => void;
  onLayerToFront: (id: string) => void;
  onLayerToBack: (id: string) => void;
}

function ImageContextMenu({ img, x, y, onRemove, onDuplicate, onChangeImage, onPatch, onLayerUp, onLayerDown, onLayerToFront, onLayerToBack }: ImageCtxProps) {
  const left = Math.min(x, window.innerWidth - 210);
  const top  = Math.min(y, window.innerHeight - 320);
  const BORDER_COLORS = ['#000000','#ffffff','#7f1d1d','#1e3a5f','#4d7c0f','#78350f'];
  const FRAME_STYLES: [string, string][] = [['wood','#8b6914'],['metal','#a0a0a0'],['plastic','#e8e8e8'],['ornate','#c9a84c']];
  const FILTER_STYLES: [string, string][] = [['sepia','#c4a46c'],['grayscale','#9a9a9a'],['vintage','#c9b07a'],['warm','#e8a050'],['cool','#5a9aaa'],['dramatic','#1a1a2e']];
  const TEXTURE_STYLES: [string, string][] = [['canvas','#d4c4a8'],['paper','#f5f0e0'],['grain','#c9c0b0'],['linen','#e8dcc8']];
  return (
    <div className="ctx-menu" style={{ left, top }} onClick={e=>e.stopPropagation()}>
      <CtxRow label="change image" onClick={() => onChangeImage(img.id)} />
      <CtxRow label="border" toggle checked={img.hasBorder}
        onToggleOn={()=>onPatch(img.id,{hasBorder:true,borderColor:BORDER_COLORS[0]})}
        onToggleOff={()=>onPatch(img.id,{hasBorder:false})}
        submenu={
          <div className="ctx-submenu">
            {BORDER_COLORS.map(c => (
              <button key={c} className="ctx-color-dot"
                style={{ background:c, outline: img.hasBorder&&img.borderColor===c?`2px solid ${darken2(c,0.5)}`:'none' }}
                onClick={() => onPatch(img.id, { hasBorder:true, borderColor:c })} />
            ))}
          </div>
        } />
      <CtxRow label="frame" toggle checked={img.hasFrame}
        onToggleOn={()=>onPatch(img.id,{hasFrame:true,frameStyle:FRAME_STYLES[0][0]})}
        onToggleOff={()=>onPatch(img.id,{hasFrame:false})}
        submenu={
          <div className="ctx-submenu">
            {FRAME_STYLES.map(([s,c]) => (
              <button key={s} className="ctx-color-dot"
                style={{ background:c, outline: img.hasFrame&&img.frameStyle===s?`2px solid ${darken2(c,0.5)}`:'none' }}
                onClick={() => onPatch(img.id, { hasFrame:true, frameStyle:s })} />
            ))}
          </div>
        } />
      <CtxRow label="filter" toggle checked={img.hasFilter}
        onToggleOn={()=>onPatch(img.id,{hasFilter:true,filterStyle:FILTER_STYLES[0][0]})}
        onToggleOff={()=>onPatch(img.id,{hasFilter:false})}
        submenu={
          <div className="ctx-submenu">
            {FILTER_STYLES.map(([s,c]) => (
              <button key={s} className="ctx-color-dot"
                style={{ background:c, outline: img.hasFilter&&img.filterStyle===s?`2px solid ${darken2(c,0.5)}`:'none' }}
                onClick={() => onPatch(img.id, { hasFilter:true, filterStyle:s })} />
            ))}
          </div>
        } />
      <CtxRow label="texture" toggle checked={img.hasTexture}
        onToggleOn={()=>onPatch(img.id,{hasTexture:true,textureStyle:TEXTURE_STYLES[0][0]})}
        onToggleOff={()=>onPatch(img.id,{hasTexture:false})}
        submenu={
          <div className="ctx-submenu">
            {TEXTURE_STYLES.map(([s,c]) => (
              <button key={s} className="ctx-color-dot"
                style={{ background:c, outline: img.hasTexture&&img.textureStyle===s?`2px solid ${darken2(c,0.5)}`:'none' }}
                onClick={() => onPatch(img.id, { hasTexture:true, textureStyle:s })} />
            ))}
          </div>
        } />
      <CtxRow label="layers" submenu={
        <div className="ctx-submenu ctx-submenu--nested">
          <CtxRow label="bring forward" onClick={() => onLayerUp(img.id)} />
          <CtxRow label="bring to front" onClick={() => onLayerToFront(img.id)} />
          <CtxRow label="send backward" onClick={() => onLayerDown(img.id)} />
          <CtxRow label="send to back" onClick={() => onLayerToBack(img.id)} />
        </div>
      } />
      <CtxRow label="duplicate" onClick={() => onDuplicate(img)} />
      <CtxRow label="delete" danger onClick={() => onRemove(img.id)} />
    </div>
  );
}

function ImageItem({ data, isSelected, onSelect, onContextMenu, onRemove, onDragEnd, onRotateEnd, onResizeEnd, onPhotoChange }: {
  data: ImageData; isSelected: boolean;
  onSelect: () => void; onContextMenu: (e: React.MouseEvent) => void;
  onRemove: (id: string) => void;
  onDragEnd: (id: string, l: number, t: number) => void;
  onRotateEnd: (id: string, r: number) => void;
  onResizeEnd: (id: string, s: number) => void;
  onPhotoChange: (id: string, url: string) => void;
}) {
  const dragRef = useRef({ sX:0, sY:0, oL:0, oT:0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleMD = (e: React.MouseEvent<HTMLDivElement>) => {
    onSelect();
    if ((e.target as HTMLElement).closest('button,.sel-rot-handle,.sel-resize-handle,.image-slot-label')) return;
    e.preventDefault();
    dragRef.current = { sX:e.clientX, sY:e.clientY, oL:data.left, oT:data.top };
    const el = document.getElementById('img-'+data.id)!;
    const move = (mv: MouseEvent) => { el.style.left=dragRef.current.oL+(mv.clientX-dragRef.current.sX)+'px'; el.style.top=dragRef.current.oT+(mv.clientY-dragRef.current.sY)+'px'; };
    const up = (uv: MouseEvent) => { window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); onDragEnd(data.id, dragRef.current.oL+(uv.clientX-dragRef.current.sX), dragRef.current.oT+(uv.clientY-dragRef.current.sY)); };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  };

  return (
    <div id={'img-'+data.id}
      style={{ position:'absolute', left:data.left, top:data.top, width:data.width, height:data.height,
        cursor:'grab', userSelect:'none', transform:`rotate(${data.rotation}deg) scale(${data.scale})`,
        transformOrigin:'center center', filter:'drop-shadow(3px 6px 12px rgba(0,0,0,0.35))', overflow:'visible', zIndex:isSelected?1000:(data.z||0)+10 }}
      onMouseDown={handleMD} onContextMenu={onContextMenu}>

      {isSelected && <SelectionOverlay elemId={'img-'+data.id} rotation={data.rotation} scale={data.scale} onRotate={r=>onRotateEnd(data.id,r)} onResize={s=>onResizeEnd(data.id,s)} />}

      {data.imageUrl ? (
        <img src={data.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', pointerEvents:'none', borderRadius:2 }} />
      ) : (
        <label className="image-slot-label" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8,
          background:'#7f1d1d', borderRadius:4, cursor:'pointer', color:'#fff', userSelect:'none' }}
          onMouseDown={e=>e.stopPropagation()}>
          <Plus size={32} />
          <span style={{ fontSize:13, fontFamily:'sans-serif' }}>click to add image</span>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>onPhotoChange(data.id, r.result as string); r.readAsDataURL(f); e.target.value=''; }} />
        </label>
      )}

      <span className="note-controls" style={{ bottom:-18, right:0 }}>
        <button className="note-ctrl-btn" style={{ color:'#b05050', borderColor:'#b05050' }} onMouseDown={e=>e.stopPropagation()} onClick={()=>onRemove(data.id)}>×</button>
      </span>
    </div>
  );
}

export default function Board() {
  const [notes,    setNotes]    = useState<NoteData[]>([]);
  const [frames,   setFrames]   = useState<PhotoFrameData[]>([]);
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [papers,   setPapers]   = useState<PaperData[]>([]);
  const [keyrings,   setKeyrings]   = useState<KeyringData[]>([]);
  const [keychains,  setKeychains]  = useState<KeychainData[]>([]);
  const [images,     setImages]     = useState<ImageData[]>([]);

  const zCounter = useRef(0);

  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [noteCtx,    setNoteCtx]    = useState<{v:boolean;x:number;y:number;id:string|null}>({v:false,x:0,y:0,id:null});
  const [frameCtx,   setFrameCtx]   = useState<{v:boolean;x:number;y:number;id:string|null}>({v:false,x:0,y:0,id:null});
  const [receiptCtx, setReceiptCtx] = useState<{v:boolean;x:number;y:number;id:string|null}>({v:false,x:0,y:0,id:null});
  const [paperCtx,   setPaperCtx]   = useState<{v:boolean;x:number;y:number;id:string|null}>({v:false,x:0,y:0,id:null});
  const [ringCtx,    setRingCtx]    = useState<{v:boolean;x:number;y:number;id:string|null}>({v:false,x:0,y:0,id:null});
  const [chainCtx,   setChainCtx]   = useState<{v:boolean;x:number;y:number;id:string|null}>({v:false,x:0,y:0,id:null});
  const [imageCtx,   setImageCtx]   = useState<{v:boolean;x:number;y:number;id:string|null}>({v:false,x:0,y:0,id:null});

  const [editCapId,      setEditCapId]      = useState<string|null>(null);
  const [editReceiptId,  setEditReceiptId]  = useState<string|null>(null);
  const [editPaperId,    setEditPaperId]    = useState<string|null>(null);
  const [uploadChainId,  setUploadChainId]  = useState<string|null>(null);
  const [pendingUploadChainId, setPendingUploadChainId] = useState<string|null>(null);
  const [uploadImageId,  setUploadImageId]  = useState<string|null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const hist    = useRef<BoardState[]>([]);
  const histPtr = useRef(-1);

  const pushHistory = useCallback((n: NoteData[], f: PhotoFrameData[], r: ReceiptData[], p: PaperData[]) => {
    const stack = hist.current.slice(0, histPtr.current + 1);
    stack.push({ notes:n, frames:f, receipts:r, papers:p });
    if (stack.length > 50) stack.shift();
    hist.current = stack;
    histPtr.current = stack.length - 1;
    setCanUndo(histPtr.current > 0);
    setCanRedo(false);
  }, []);

  const undo = () => {
    if (histPtr.current <= 0) return;
    histPtr.current--;
    const s = hist.current[histPtr.current];
    setNotes(s.notes); setFrames(s.frames); setReceipts(s.receipts); setPapers(s.papers);
    setCanUndo(histPtr.current > 0); setCanRedo(true);
  };

  const redo = () => {
    if (histPtr.current >= hist.current.length - 1) return;
    histPtr.current++;
    const s = hist.current[histPtr.current];
    setNotes(s.notes); setFrames(s.frames); setReceipts(s.receipts); setPapers(s.papers);
    setCanUndo(true); setCanRedo(histPtr.current < hist.current.length - 1);
  };

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
    let loadedNotes: NoteData[] = [];
    let loadedFrames: PhotoFrameData[] = [];
    let loadedReceipts: ReceiptData[] = [];
    let loadedPapers: PaperData[] = [];
    let done = 0;
    const trySetHistory = () => {
      done++;
      if (done === 4) hist.current = [{ notes:loadedNotes, frames:loadedFrames, receipts:loadedReceipts, papers:loadedPapers }], histPtr.current = 0;
      // Update zCounter to max z + 1 across all loaded items
      const maxZ = Math.max(0, ...loadedNotes.map(n=>n.z), ...loadedFrames.map(f=>f.z), ...loadedReceipts.map(r=>r.z), ...loadedPapers.map(p=>p.z));
      zCounter.current = maxZ;
    };

    supabase.from('sticky_notes').select('*').order('created_at').then(({ data }) => {
      if (data) {
        loadedNotes = data.map(n => ({
          id:n.id, left:n.x, top:n.y, rotation:n.rotation??0, scale:n.scale??1,
          color:n.color, note:n.content, hasPin:n.has_pin, hasTape:n.has_tape??false,
          pinColor:n.pin_color??PIN_DEFAULT, tapeColor:n.tape_color??'#fef08a',
          tapeImage:n.tape_image??'', items:n.items||[],
          z:n.z??0,
        }));
        setNotes(loadedNotes);
      }
      trySetHistory();
    });

    supabase.from('board_photos').select('*').order('created_at').then(({ data }) => {
      if (data) {
        loadedFrames = data.map(f => ({
          id:f.id, kind:f.kind as FrameKind, left:f.x, top:f.y, rotation:f.rotation??0, scale:f.scale??1,
          photos:f.photo_urls??[], caption:f.caption??'', hasPin:f.has_pin??false, hasTape:f.has_tape??false,
          pinColor:f.pin_color??PIN_DEFAULT, tapeColor:f.tape_color??'#fef08a', tapeImage:f.tape_image??'',
          slotCount:f.slot_count??3, showCan:f.show_can??false,
          z:f.z??0,
        }));
        setFrames(loadedFrames);
      }
      trySetHistory();
    });

    supabase.from('board_receipts').select('*').order('created_at').then(({ data }) => {
      if (data) {
        loadedReceipts = data.map(r => ({
          id:r.id, left:r.x, top:r.y, rotation:r.rotation??0, scale:r.scale??1,
          storeName:r.store_name??'', logo:r.logo??'🛒', date:r.date??'',
          items:r.items??[], tax:r.tax??0,
          hasPin:r.has_pin??false, hasTape:r.has_tape??false,
          pinColor:r.pin_color??PIN_DEFAULT, tapeColor:r.tape_color??'#fef08a', tapeImage:r.tape_image??'',
          z:r.z??0,
        }));
        setReceipts(loadedReceipts);
      }
      trySetHistory();
    });

    supabase.from('board_papers').select('*').order('created_at').then(({ data }) => {
      if (data) {
        loadedPapers = data.map(p => ({
          id:p.id, left:p.x, top:p.y, rotation:p.rotation??0, scale:p.scale??1,
          title:p.title??'', lines:(p.lines??[]).map((l: any) => ({ ...l, indent: l.indent ?? (l.type === 'checkbox-sub' ? 1 : 0) })), width:p.width??300, height:p.height??400,
          paperStyle:(p.paper_style??'lined') as PaperStyle,
          paperColor:(p.paper_color??'cream') as PaperColor,
          paperType:(p.paper_type??'notepad') as PaperType,
          hasPin:p.has_pin??false, hasTape:p.has_tape??false,
          pinColor:p.pin_color??PIN_DEFAULT, tapeColor:p.tape_color??'#fef08a', tapeImage:p.tape_image??'',
          z:p.z??0,
        }));
        setPapers(loadedPapers);
      }
      trySetHistory();
    });

    supabase.from('keyrings').select('*').order('created_at').then(({ data }) => {
      if (data) setKeyrings(data.map(r => ({ id:r.id, left:r.x, top:r.y, color:r.color??'#4ade80', locked:r.locked??true })));
    });
    supabase.from('keychains').select('*').order('created_at').then(({ data }) => {
      if (data) setKeychains(data.map(c => ({ id:c.id, left:c.x, top:c.y, imageUrl:c.image_url??'', attachedRingId:c.attached_ring_id??null, imgOffsetX:c.img_offset_x??0, imgOffsetY:c.img_offset_y??0 })));
    });
    supabase.from('board_images').select('*').order('created_at').then(({ data }) => {
      if (data) setImages(data.map(im => ({ id:im.id, left:im.x, top:im.y, rotation:im.rotation??0, scale:im.scale??1, imageUrl:im.image_url??'', width:im.width??200, height:im.height??240, z:im.z??0,
        hasBorder:im.has_border??false, borderColor:im.border_color??'#000000',
        hasFrame:im.has_frame??false, frameStyle:im.frame_style??'wood',
        hasFilter:im.has_filter??false, filterStyle:im.filter_style??'sepia',
        hasTexture:im.has_texture??false, textureStyle:im.texture_style??'canvas' })));
    });
  }, []);

  // Dismiss menus on outside click
  useEffect(() => {
    const d = () => {
      setNoteCtx(m=>({...m,v:false})); setFrameCtx(m=>({...m,v:false}));
      setReceiptCtx(m=>({...m,v:false})); setPaperCtx(m=>({...m,v:false}));
    };
    window.addEventListener('click', d);
    return () => window.removeEventListener('click', d);
  }, []);

  // ── Add ──

  const handleAdd = async (type: AddType) => {
    if (type === 'note') {
      const n: NoteData = {
        id:crypto.randomUUID(), left:rand(20,window.innerWidth-200), top:rand(60,window.innerHeight-220),
        rotation:rand(-3,3), scale:1, color:NOTE_COLORS[0], note:'new note',
        hasPin:false, hasTape:false, pinColor:PIN_DEFAULT, tapeColor:'#fef08a', tapeImage:'', items:[],
        z: ++zCounter.current,
      };
      const updated = [...notes, n];
      pushHistory(updated, frames, receipts, papers); setNotes(updated); syncNote(n);
    } else if (type === 'receipt') {
      const r: ReceiptData = {
        id:crypto.randomUUID(), left:rand(20,window.innerWidth-240), top:rand(60,window.innerHeight-400),
        rotation:rand(-2,2), scale:1, storeName:'My Store', logo:'🛒',
        date:new Date().toISOString().slice(0,10), items:[], tax:0,
        hasPin:false, hasTape:false, pinColor:PIN_DEFAULT, tapeColor:'#fef08a', tapeImage:'',
        z: ++zCounter.current,
      };
      const updated = [...receipts, r];
      pushHistory(notes, frames, updated, papers); setReceipts(updated); syncReceipt(r);
      setEditReceiptId(r.id);
    } else if (type === 'paper') {
      const p: PaperData = {
        id:crypto.randomUUID(), left:rand(20,window.innerWidth-340), top:rand(60,window.innerHeight-440),
        rotation:rand(-2,2), scale:1, title:'', lines:[], width:300, height:400,
        paperStyle:'lined', paperColor:'cream', paperType:'notepad',
        hasPin:false, hasTape:false, pinColor:PIN_DEFAULT, tapeColor:'#fef08a', tapeImage:'',
        z: ++zCounter.current,
      };
      const updated = [...papers, p];
      pushHistory(notes, frames, receipts, updated); setPapers(updated); syncPaper(p);
      setEditPaperId(p.id);
    } else if (type === 'keychain') {
      // Place the green ring on screen and prompt user to upload charm image
      const ring: KeyringData = {
        id: crypto.randomUUID(),
        left: rand(80, window.innerWidth - 180),
        top: rand(80, window.innerHeight - 200),
        color: '#4ade80', locked: true,
      };
      setKeyrings(prev => [...prev, ring]);
      syncKeyring(ring);
      // Add a keychain body without image yet — will be filled by upload prompt
      const chain: KeychainData = { id: crypto.randomUUID(), left: ring.left - 4, top: ring.top + 36, imageUrl: '', attachedRingId: ring.id, imgOffsetX: 0, imgOffsetY: 0 };
      setKeychains(prev => [...prev, chain]);
      syncKeychain(chain);
      setPendingUploadChainId(chain.id);
    } else if (type === 'image') {
      const img: ImageData = {
        id: crypto.randomUUID(),
        left: rand(20, window.innerWidth - 240),
        top: rand(60, window.innerHeight - 300),
        rotation: rand(-3, 3), scale: 1, imageUrl: '', width: 200, height: 240,
        z: ++zCounter.current,
        hasBorder: false, borderColor: '#000000',
        hasFrame: false, frameStyle: 'wood',
        hasFilter: false, filterStyle: 'sepia',
        hasTexture: false, textureStyle: 'canvas',
      };
      setImages(prev => [...prev, img]);
      syncImage(img);
    } else {
      const isStrip = type==='photostrip' || type==='film';
      const dims = type==='film' ? getFilmConfig(3).dims : isStrip ? getStripConfig(3).dims : P1_DIMS;
      const f: PhotoFrameData = {
        id:crypto.randomUUID(), kind:type,
        left:rand(20,window.innerWidth-dims.w-20), top:rand(60,window.innerHeight-dims.h-20),
        rotation:rand(-4,4), scale:1, photos:Array(isStrip?3:1).fill(''),
        caption:'', hasPin:false, hasTape:false,
        pinColor:PIN_DEFAULT, tapeColor:'#fef08a', tapeImage:'', slotCount:3, showCan:false,
        z: ++zCounter.current,
      };
      const updated = [...frames, f];
      pushHistory(notes, updated, receipts, papers); setFrames(updated); syncFrame(f);
    }
  };

  // ── Notes ──

  const updateNote = (id: string, text: string, items: StickyItem[]) => {
    const updated = notes.map(n => n.id===id ? {...n,note:text,items} : n);
    pushHistory(updated, frames, receipts, papers); setNotes(updated);
    const n = updated.find(n=>n.id===id); if (n) syncNote(n);
  };

  const removeNote = (id: string) => {
    const updated = notes.filter(n=>n.id!==id);
    pushHistory(updated, frames, receipts, papers); setNotes(updated);
    supabase.from('sticky_notes').delete().eq('id', id);
    setNoteCtx(m=>({...m,v:false}));
  };

  const noteDragEnd = (id: string, l: number, t: number) => {
    const updated = notes.map(n => n.id===id ? {...n,left:l,top:t} : n);
    pushHistory(updated, frames, receipts, papers); setNotes(updated);
    const n = updated.find(n=>n.id===id); if (n) syncNote(n);
  };

  const noteRotateEnd = (id: string, r: number) => {
    const updated = notes.map(n => n.id===id ? {...n,rotation:r} : n);
    pushHistory(updated, frames, receipts, papers); setNotes(updated);
    const n = updated.find(n=>n.id===id); if (n) syncNote(n);
  };

  const noteResizeEnd = (id: string, s: number) => {
    const updated = notes.map(n => n.id===id ? {...n,scale:s} : n);
    pushHistory(updated, frames, receipts, papers); setNotes(updated);
    const n = updated.find(n=>n.id===id); if (n) syncNote(n);
  };

  const patchNote = (id: string, patch: Partial<NoteData>) => {
    const updated = notes.map(n => n.id===id ? {...n,...patch} : n);
    pushHistory(updated, frames, receipts, papers); setNotes(updated);
    const n = updated.find(n=>n.id===id); if (n) syncNote(n);
    setNoteCtx(m=>({...m,v:false}));
  };

  const duplicateNote = (src: NoteData) => {
    const dup = { ...src, id:crypto.randomUUID(), left:src.left+20, top:src.top+20 };
    const updated = [...notes, dup];
    pushHistory(updated, frames, receipts, papers); setNotes(updated); syncNote(dup);
    setNoteCtx(m=>({...m,v:false}));
  };

  // ── Frames ──

  const patchFrame = (id: string, patch: Partial<PhotoFrameData>) => {
    const updated = frames.map(f => f.id===id ? {...f,...patch} : f);
    pushHistory(notes, updated, receipts, papers); setFrames(updated);
    const f = updated.find(f=>f.id===id); if (f) syncFrame(f);
    setFrameCtx(m=>({...m,v:false}));
  };

  const removeFrame = (id: string) => {
    const updated = frames.filter(f=>f.id!==id);
    pushHistory(notes, updated, receipts, papers); setFrames(updated);
    supabase.from('board_photos').delete().eq('id', id);
    setFrameCtx(m=>({...m,v:false}));
  };

  const frameDragEnd = (id: string, l: number, t: number) => {
    const updated = frames.map(f => f.id===id ? {...f,left:l,top:t} : f);
    pushHistory(notes, updated, receipts, papers); setFrames(updated);
    const f = updated.find(f=>f.id===id); if (f) syncFrame(f);
  };

  const frameRotateEnd = (id: string, r: number) => {
    const updated = frames.map(f => f.id===id ? {...f,rotation:r} : f);
    pushHistory(notes, updated, receipts, papers); setFrames(updated);
    const f = updated.find(f=>f.id===id); if (f) syncFrame(f);
  };

  const frameResizeEnd = (id: string, s: number) => {
    const updated = frames.map(f => f.id===id ? {...f,scale:s} : f);
    pushHistory(notes, updated, receipts, papers); setFrames(updated);
    const f = updated.find(f=>f.id===id); if (f) syncFrame(f);
  };

  const handlePhotoChange = (id: string, slot: number, url: string) => {
    const updated = frames.map(f => { if (f.id!==id) return f; const photos=[...f.photos]; photos[slot]=url; return {...f,photos}; });
    pushHistory(notes, updated, receipts, papers); setFrames(updated);
    const f = updated.find(f=>f.id===id); if (f) syncFrame(f);
  };

  const duplicateFrame = (src: PhotoFrameData) => {
    const dup = { ...src, id:crypto.randomUUID(), left:src.left+20, top:src.top+20 };
    const updated = [...frames, dup];
    pushHistory(notes, updated, receipts, papers); setFrames(updated); syncFrame(dup);
    setFrameCtx(m=>({...m,v:false}));
  };

  const saveCaptionEdit = (id: string, text: string) => {
    setEditCapId(null); patchFrame(id, { caption:text });
  };

  // ── Receipts ──

  const patchReceipt = (id: string, patch: Partial<ReceiptData>) => {
    const updated = receipts.map(r => r.id===id ? {...r,...patch} : r);
    pushHistory(notes, frames, updated, papers); setReceipts(updated);
    const r = updated.find(r=>r.id===id); if (r) syncReceipt(r);
    setReceiptCtx(m=>({...m,v:false}));
  };

  const removeReceipt = (id: string) => {
    const updated = receipts.filter(r=>r.id!==id);
    pushHistory(notes, frames, updated, papers); setReceipts(updated);
    supabase.from('board_receipts').delete().eq('id', id);
    setReceiptCtx(m=>({...m,v:false}));
  };

  const receiptDragEnd = (id: string, l: number, t: number) => {
    const updated = receipts.map(r => r.id===id ? {...r,left:l,top:t} : r);
    pushHistory(notes, frames, updated, papers); setReceipts(updated);
    const r = updated.find(r=>r.id===id); if (r) syncReceipt(r);
  };

  const receiptRotateEnd = (id: string, rot: number) => {
    const updated = receipts.map(r => r.id===id ? {...r,rotation:rot} : r);
    pushHistory(notes, frames, updated, papers); setReceipts(updated);
    const r = updated.find(r=>r.id===id); if (r) syncReceipt(r);
  };

  const receiptResizeEnd = (id: string, s: number) => {
    const updated = receipts.map(r => r.id===id ? {...r,scale:s} : r);
    pushHistory(notes, frames, updated, papers); setReceipts(updated);
    const r = updated.find(r=>r.id===id); if (r) syncReceipt(r);
  };

  const saveReceiptEdit = (updated: ReceiptData) => {
    const arr = receipts.map(r => r.id===updated.id ? updated : r);
    pushHistory(notes, frames, arr, papers); setReceipts(arr); syncReceipt(updated);
    setEditReceiptId(null);
  };

  const duplicateReceipt = (src: ReceiptData) => {
    const dup = { ...src, id:crypto.randomUUID(), left:src.left+20, top:src.top+20 };
    const updated = [...receipts, dup];
    pushHistory(notes, frames, updated, papers); setReceipts(updated); syncReceipt(dup);
    setReceiptCtx(m=>({...m,v:false}));
  };

  // ── Papers ──

  const patchPaper = (id: string, patch: Partial<PaperData>) => {
    const updated = papers.map(p => p.id===id ? {...p,...patch} : p);
    pushHistory(notes, frames, receipts, updated); setPapers(updated);
    const p = updated.find(p=>p.id===id); if (p) syncPaper(p);
    setPaperCtx(m=>({...m,v:false}));
  };

  const removePaper = (id: string) => {
    const updated = papers.filter(p=>p.id!==id);
    pushHistory(notes, frames, receipts, updated); setPapers(updated);
    supabase.from('board_papers').delete().eq('id', id);
    setPaperCtx(m=>({...m,v:false}));
  };

  const paperDragEnd = (id: string, l: number, t: number) => {
    const updated = papers.map(p => p.id===id ? {...p,left:l,top:t} : p);
    pushHistory(notes, frames, receipts, updated); setPapers(updated);
    const p = updated.find(p=>p.id===id); if (p) syncPaper(p);
  };

  const paperRotateEnd = (id: string, r: number) => {
    const updated = papers.map(p => p.id===id ? {...p,rotation:r} : p);
    pushHistory(notes, frames, receipts, updated); setPapers(updated);
    const p = updated.find(p=>p.id===id); if (p) syncPaper(p);
  };

  const paperResizeEnd = (id: string, s: number) => {
    const updated = papers.map(p => p.id===id ? {...p,scale:s} : p);
    pushHistory(notes, frames, receipts, updated); setPapers(updated);
    const p = updated.find(p=>p.id===id); if (p) syncPaper(p);
  };

  const paperResizeDims = (id: string, w: number, h: number) => {
    const updated = papers.map(p => p.id===id ? {...p,width:w,height:h} : p);
    pushHistory(notes, frames, receipts, updated); setPapers(updated);
    const p = updated.find(p=>p.id===id); if (p) syncPaper(p);
  };

  const updatePaperContent = (id: string, title: string, lines: PaperLine[]) => {
    const updated = papers.map(p => p.id===id ? {...p,title,lines} : p);
    pushHistory(notes, frames, receipts, updated); setPapers(updated);
    const p = updated.find(p=>p.id===id); if (p) syncPaper(p);
  };

  const duplicatePaper = (src: PaperData) => {
    const dup = { ...src, id:crypto.randomUUID(), left:src.left+20, top:src.top+20 };
    const updated = [...papers, dup];
    pushHistory(notes, frames, receipts, updated); setPapers(updated); syncPaper(dup);
    setPaperCtx(m=>({...m,v:false}));
  };

  const togglePaperLine = (paperId: string, lineId: string) => {
    const updated = papers.map(p => {
      if (p.id !== paperId) return p;
      return { ...p, lines: p.lines.map(l => l.id===lineId ? {...l, checked:!l.checked} : l) };
    });
    pushHistory(notes, frames, receipts, updated); setPapers(updated);
    const p = updated.find(p=>p.id===paperId); if (p) syncPaper(p);
  };

  // ── Keyring handlers ──
  const patchKeyring = (id: string, patch: Partial<KeyringData>) => {
    const updated = keyrings.map(r => r.id===id ? {...r,...patch} : r);
    setKeyrings(updated);
    const r = updated.find(r=>r.id===id); if (r) syncKeyring(r);
    setRingCtx(m=>({...m,v:false}));
  };
  const removeKeyring = (id: string) => {
    // Also delete any chains still attached to this ring from DB
    keychains.filter(c => c.attachedRingId === id).forEach(c => {
      supabase.from('keychains').delete().eq('id', c.id);
    });
    setKeychains(prev => prev.map(c => c.attachedRingId===id ? {...c,attachedRingId:null} : c));
    setKeyrings(prev => prev.filter(r=>r.id!==id));
    supabase.from('keyrings').delete().eq('id',id);
    setRingCtx(m=>({...m,v:false}));
  };
  const moveKeyring = (id: string, left: number, top: number) => {
    const updated = keyrings.map(r => r.id===id ? {...r,left,top} : r);
    setKeyrings(updated);
    const r = updated.find(r=>r.id===id); if (r) syncKeyring(r);
  };

  // ── Keychain handlers ──
  const removeKeychain = (id: string) => {
    setKeychains(prev => prev.filter(c=>c.id!==id));
    supabase.from('keychains').delete().eq('id',id);
    setChainCtx(m=>({...m,v:false}));
  };
  const chainDragEnd = (id: string, left: number, top: number, snapRingId: string|null) => {
    const updated = keychains.map(c => c.id===id ? {...c,left,top,attachedRingId:snapRingId} : c);
    setKeychains(updated);
    const c = updated.find(c=>c.id===id); if (c) syncKeychain(c);
  };
  const attachChain = (chainId: string, ringId: string) => {
    const updated = keychains.map(c => c.id===chainId ? {...c,attachedRingId:ringId} : c);
    setKeychains(updated);
    const c = updated.find(c=>c.id===chainId); if (c) syncKeychain(c);
  };
  const detachChain = (chainId: string) => {
    const c = keychains.find(c=>c.id===chainId);
    if (!c) return;
    const ring = keyrings.find(r=>r.id===c.attachedRingId);
    const freePos = ring ? { left: ring.left - 4, top: ring.top + 120 } : {};
    const updated = keychains.map(ch => ch.id===chainId ? {...ch, attachedRingId:null, ...freePos} : ch);
    setKeychains(updated);
    const upd = updated.find(c=>c.id===chainId); if (upd) syncKeychain(upd);
  };
  const updateChainImage = (chainId: string, imageUrl: string, imgOffsetX = 0, imgOffsetY = 0) => {
    const updated = keychains.map(c => c.id===chainId ? {...c,imageUrl,imgOffsetX,imgOffsetY} : c);
    setKeychains(updated);
    const c = updated.find(c=>c.id===chainId); if (c) syncKeychain(c);
    setUploadChainId(null); setPendingUploadChainId(null);
    setChainCtx(m=>({...m,v:false}));
  };

  // ── Image handlers ──
  const patchImage = (id: string, patch: Partial<ImageData>) => {
    const updated = images.map(im => im.id===id ? {...im,...patch} : im);
    setImages(updated);
    const im = updated.find(im=>im.id===id); if (im) syncImage(im);
    setImageCtx(m=>({...m,v:false}));
  };
  const removeImage = (id: string) => {
    setImages(prev => prev.filter(im=>im.id!==id));
    supabase.from('board_images').delete().eq('id',id);
    setImageCtx(m=>({...m,v:false}));
  };
  const duplicateImage = (src: ImageData) => {
    const dup = { ...src, id:crypto.randomUUID(), left:src.left+20, top:src.top+20 };
    setImages(prev => [...prev, dup]);
    syncImage(dup);
    setImageCtx(m=>({...m,v:false}));
  };
  const imageDragEnd = (id: string, l: number, t: number) => {
    const updated = images.map(im => im.id===id ? {...im,left:l,top:t} : im);
    setImages(updated);
    const im = updated.find(im=>im.id===id); if (im) syncImage(im);
  };
  const imageRotateEnd = (id: string, r: number) => {
    const updated = images.map(im => im.id===id ? {...im,rotation:r} : im);
    setImages(updated);
    const im = updated.find(im=>im.id===id); if (im) syncImage(im);
  };
  const imageResizeEnd = (id: string, s: number) => {
    const updated = images.map(im => im.id===id ? {...im,scale:s} : im);
    setImages(updated);
    const im = updated.find(im=>im.id===id); if (im) syncImage(im);
  };
  const updateImageFile = (id: string, imageUrl: string) => {
    const updated = images.map(im => im.id===id ? {...im,imageUrl} : im);
    setImages(updated);
    const im = updated.find(im=>im.id===id); if (im) syncImage(im);
    setUploadImageId(null);
    setImageCtx(m=>({...m,v:false}));
  };

  // ── Layering handlers ──
  const layerUp = (type: 'note'|'frame'|'receipt'|'paper'|'image', id: string) => {
    const z = ++zCounter.current;
    if (type==='note')   { const u = notes.map(n=>n.id===id?{...n,z}:n);   setNotes(u);   const n=u.find(n=>n.id===id); if(n) syncNote(n); }
    if (type==='frame')  { const u = frames.map(f=>f.id===id?{...f,z}:f);  setFrames(u);  const f=u.find(f=>f.id===id); if(f) syncFrame(f); }
    if (type==='receipt'){ const u = receipts.map(r=>r.id===id?{...r,z}:r); setReceipts(u); const r=u.find(r=>r.id===id); if(r) syncReceipt(r); }
    if (type==='paper')  { const u = papers.map(p=>p.id===id?{...p,z}:p);  setPapers(u);  const p=u.find(p=>p.id===id); if(p) syncPaper(p); }
    if (type==='image')  { const u = images.map(im=>im.id===id?{...im,z}:im); setImages(u); const im=u.find(im=>im.id===id); if(im) syncImage(im); }
  };
  const layerDown = (type: 'note'|'frame'|'receipt'|'paper'|'image', id: string) => {
    const z = zCounter.current = Math.max(0, zCounter.current - 1);
    if (type==='note')   { const u = notes.map(n=>n.id===id?{...n,z}:n);   setNotes(u);   const n=u.find(n=>n.id===id); if(n) syncNote(n); }
    if (type==='frame')  { const u = frames.map(f=>f.id===id?{...f,z}:f);  setFrames(u);  const f=u.find(f=>f.id===id); if(f) syncFrame(f); }
    if (type==='receipt'){ const u = receipts.map(r=>r.id===id?{...r,z}:r); setReceipts(u); const r=u.find(r=>r.id===id); if(r) syncReceipt(r); }
    if (type==='paper')  { const u = papers.map(p=>p.id===id?{...p,z}:p);  setPapers(u);  const p=u.find(p=>p.id===id); if(p) syncPaper(p); }
    if (type==='image')  { const u = images.map(im=>im.id===id?{...im,z}:im); setImages(u); const im=u.find(im=>im.id===id); if(im) syncImage(im); }
  };
  const layerToFront = (type: 'note'|'frame'|'receipt'|'paper'|'image', id: string) => {
    const z = zCounter.current + 1000;
    zCounter.current = z;
    if (type==='note')   { const u = notes.map(n=>n.id===id?{...n,z}:n);   setNotes(u);   const n=u.find(n=>n.id===id); if(n) syncNote(n); }
    if (type==='frame')  { const u = frames.map(f=>f.id===id?{...f,z}:f);  setFrames(u);  const f=u.find(f=>f.id===id); if(f) syncFrame(f); }
    if (type==='receipt'){ const u = receipts.map(r=>r.id===id?{...r,z}:r); setReceipts(u); const r=u.find(r=>r.id===id); if(r) syncReceipt(r); }
    if (type==='paper')  { const u = papers.map(p=>p.id===id?{...p,z}:p);  setPapers(u);  const p=u.find(p=>p.id===id); if(p) syncPaper(p); }
    if (type==='image')  { const u = images.map(im=>im.id===id?{...im,z}:im); setImages(u); const im=u.find(im=>im.id===id); if(im) syncImage(im); }
  };
  const layerToBack = (type: 'note'|'frame'|'receipt'|'paper'|'image', id: string) => {
    // Find current minimum z and set this item below it
    const allZ = [
      ...notes.map(n=>n.z), ...frames.map(f=>f.z), ...receipts.map(r=>r.z),
      ...papers.map(p=>p.z), ...images.map(im=>im.z),
    ].filter(z => z !== undefined);
    const minZ = allZ.length ? Math.min(...allZ) : 0;
    const z = minZ - 10;
    if (type==='note')   { const u = notes.map(n=>n.id===id?{...n,z}:n);   setNotes(u);   const n=u.find(n=>n.id===id); if(n) syncNote(n); }
    if (type==='frame')  { const u = frames.map(f=>f.id===id?{...f,z}:f);  setFrames(u);  const f=u.find(f=>f.id===id); if(f) syncFrame(f); }
    if (type==='receipt'){ const u = receipts.map(r=>r.id===id?{...r,z}:r); setReceipts(u); const r=u.find(r=>r.id===id); if(r) syncReceipt(r); }
    if (type==='paper')  { const u = papers.map(p=>p.id===id?{...p,z}:p);  setPapers(u);  const p=u.find(p=>p.id===id); if(p) syncPaper(p); }
    if (type==='image')  { const u = images.map(im=>im.id===id?{...im,z}:im); setImages(u); const im=u.find(im=>im.id===id); if(im) syncImage(im); }
  };

  const activeNote    = noteCtx.id    ? notes.find(n=>n.id===noteCtx.id)       : null;
  const activeFrame   = frameCtx.id   ? frames.find(f=>f.id===frameCtx.id)     : null;
  const activeReceipt = receiptCtx.id ? receipts.find(r=>r.id===receiptCtx.id) : null;
  const activePaper   = paperCtx.id   ? papers.find(p=>p.id===paperCtx.id)     : null;
  const activeRing    = ringCtx.id    ? keyrings.find(r=>r.id===ringCtx.id)    : null;
  const activeChain   = chainCtx.id   ? keychains.find(c=>c.id===chainCtx.id)  : null;
  const activeImage   = imageCtx.id   ? images.find(im=>im.id===imageCtx.id)   : null;
  const editingReceipt = editReceiptId ? receipts.find(r=>r.id===editReceiptId) : null;

  // pending chain = the keychain waiting for image upload
  const pendingChain = pendingUploadChainId ? keychains.find(c=>c.id===pendingUploadChainId) : null;
  const uploadChain  = uploadChainId ? keychains.find(c=>c.id===uploadChainId) : null;

  return (
    <div className="board"
      style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden',
        background:"url('/cork.jpeg') no-repeat center center fixed", backgroundSize:'cover' }}
      onClick={() => { setSelectedId(null); setRingCtx(m=>({...m,v:false})); setChainCtx(m=>({...m,v:false})); }}
      onContextMenu={e => {
        e.preventDefault();
        setNoteCtx(m=>({...m,v:false})); setFrameCtx(m=>({...m,v:false}));
        setReceiptCtx(m=>({...m,v:false})); setPaperCtx(m=>({...m,v:false}));
        setImageCtx(m=>({...m,v:false})); setRingCtx(m=>({...m,v:false})); setChainCtx(m=>({...m,v:false}));
        setSelectedId(null);
      }}>

      {notes.map(n => (
        <Note key={n.id} data={n} isSelected={selectedId===n.id}
          onSelect={() => setSelectedId(n.id)}
          onChange={updateNote} onRemove={removeNote}
          onDragEnd={noteDragEnd} onRotateEnd={noteRotateEnd} onResizeEnd={noteResizeEnd}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelectedId(n.id); setNoteCtx({v:true,x:e.clientX,y:e.clientY,id:n.id}); }} />
      ))}

      {frames.map(f => (
        <PhotoFrame key={f.id} data={f} isSelected={selectedId===f.id}
          onSelect={() => setSelectedId(f.id)}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelectedId(f.id); setFrameCtx({v:true,x:e.clientX,y:e.clientY,id:f.id}); }}
          onPhotoChange={handlePhotoChange} onRemove={removeFrame}
          onDragEnd={frameDragEnd} onRotateEnd={frameRotateEnd} onResizeEnd={frameResizeEnd}
          editingCaption={editCapId===f.id} onCaptionSave={saveCaptionEdit} />
      ))}

      {receipts.map(r => (
        <ReceiptItem key={r.id} data={r} isSelected={selectedId===r.id}
          onSelect={() => setSelectedId(r.id)}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelectedId(r.id); setReceiptCtx({v:true,x:e.clientX,y:e.clientY,id:r.id}); }}
          onRemove={removeReceipt}
          onDragEnd={receiptDragEnd} onRotateEnd={receiptRotateEnd} onResizeEnd={receiptResizeEnd}
          onEditReceipt={id => { setEditReceiptId(id); setReceiptCtx(m=>({...m,v:false})); }} />
      ))}

      {papers.map(p => (
        <PaperItem key={p.id} data={p} isSelected={selectedId===p.id}
          onSelect={() => setSelectedId(p.id)}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelectedId(p.id); setPaperCtx({v:true,x:e.clientX,y:e.clientY,id:p.id}); }}
          onRemove={removePaper} onSaveContent={updatePaperContent}
          onToggleLine={togglePaperLine}
          onDragEnd={paperDragEnd} onRotateEnd={paperRotateEnd} onResizeEnd={paperResizeEnd}
          onResizeDims={paperResizeDims}
          editing={editPaperId===p.id}
          onStartEdit={() => setEditPaperId(p.id)}
          onEndEdit={() => setEditPaperId(null)} />
      ))}

      {images.map(im => (
        <ImageItem key={im.id} data={im} isSelected={selectedId===im.id}
          onSelect={() => setSelectedId(im.id)}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelectedId(im.id); setImageCtx({v:true,x:e.clientX,y:e.clientY,id:im.id}); }}
          onRemove={removeImage}
          onDragEnd={imageDragEnd} onRotateEnd={imageRotateEnd} onResizeEnd={imageResizeEnd}
          onPhotoChange={(id, url) => updateImageFile(id, url)} />
      ))}

      {/* Keychain bodies — rendered BELOW the rings in z-order (z-index 25) */}
      {keychains.map(c => (
        <KeychainItem key={c.id} data={c} rings={keyrings}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setChainCtx({v:true,x:e.clientX,y:e.clientY,id:c.id}); }}
          onDragEnd={chainDragEnd} onAttach={attachChain} onDetach={detachChain} />
      ))}

      {/* Green rings — rendered ABOVE the hook portion (z-index 30) */}
      {keyrings.map(r => (
        <KeyringItem key={r.id} data={r}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setRingCtx({v:true,x:e.clientX,y:e.clientY,id:r.id}); }}
          onChange={moveKeyring} />
      ))}

      {/* Toolbar */}
      <div style={{ position:'fixed', top:10, left:10, zIndex:200, display:'flex', gap:6 }}>
        <button className="toolbar-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Undo2 size={16}/></button>
        <button className="toolbar-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"><Redo2 size={16}/></button>
      </div>

      <AddMenu onAdd={handleAdd} />

      {noteCtx.v && activeNote && (
        <NoteContextMenu note={activeNote} x={noteCtx.x} y={noteCtx.y}
          onPatch={patchNote} onRemove={removeNote} onDuplicate={duplicateNote}
          onLayerUp={id => layerUp('note', id)} onLayerDown={id => layerDown('note', id)}
          onLayerToFront={id => layerToFront('note', id)} onLayerToBack={id => layerToBack('note', id)} />
      )}
      {frameCtx.v && activeFrame && (
        <FrameContextMenu frame={activeFrame} x={frameCtx.x} y={frameCtx.y}
          onPatch={patchFrame} onRemove={removeFrame}
          onEditCaption={id => { setEditCapId(id); setFrameCtx(m=>({...m,v:false})); }}
          onDuplicate={duplicateFrame}
          onLayerUp={id => layerUp('frame', id)} onLayerDown={id => layerDown('frame', id)}
          onLayerToFront={id => layerToFront('frame', id)} onLayerToBack={id => layerToBack('frame', id)} />
      )}
      {receiptCtx.v && activeReceipt && (
        <ReceiptContextMenu receipt={activeReceipt} x={receiptCtx.x} y={receiptCtx.y}
          onPatch={patchReceipt} onRemove={removeReceipt} onDuplicate={duplicateReceipt}
          onEdit={id => { setEditReceiptId(id); setReceiptCtx(m=>({...m,v:false})); }}
          onLayerUp={id => layerUp('receipt', id)} onLayerDown={id => layerDown('receipt', id)}
          onLayerToFront={id => layerToFront('receipt', id)} onLayerToBack={id => layerToBack('receipt', id)} />
      )}
      {paperCtx.v && activePaper && (
        <PaperContextMenu paper={activePaper} x={paperCtx.x} y={paperCtx.y}
          onPatch={patchPaper} onRemove={removePaper} onDuplicate={duplicatePaper}
          onEdit={id => { setEditPaperId(id); setPaperCtx(m=>({...m,v:false})); }}
          onLayerUp={id => layerUp('paper', id)} onLayerDown={id => layerDown('paper', id)}
          onLayerToFront={id => layerToFront('paper', id)} onLayerToBack={id => layerToBack('paper', id)} />
      )}
      {imageCtx.v && activeImage && (
        <ImageContextMenu img={activeImage} x={imageCtx.x} y={imageCtx.y}
          onRemove={removeImage} onDuplicate={duplicateImage}
          onChangeImage={id => { setUploadImageId(id); setImageCtx(m=>({...m,v:false})); }}
          onPatch={patchImage}
          onLayerUp={id => layerUp('image', id)} onLayerDown={id => layerDown('image', id)}
          onLayerToFront={id => layerToFront('image', id)} onLayerToBack={id => layerToBack('image', id)} />
      )}
      {ringCtx.v && activeRing && (
        <KeyringContextMenu ring={activeRing} x={ringCtx.x} y={ringCtx.y}
          onPatch={patchKeyring} onRemove={removeKeyring} />
      )}
      {chainCtx.v && activeChain && (
        <KeychainContextMenu chain={activeChain} x={chainCtx.x} y={chainCtx.y}
          onChangeImage={() => { setUploadChainId(activeChain.id); setChainCtx(m=>({...m,v:false})); }}
          onDetach={() => { detachChain(activeChain.id); setChainCtx(m=>({...m,v:false})); }}
          onUnlockMove={() => setChainCtx(m=>({...m,v:false}))}
          onRemove={removeKeychain} />
      )}

      {/* Receipt editor modal */}
      {editingReceipt && (
        <ReceiptEditor receipt={editingReceipt} onSave={saveReceiptEdit} onClose={() => setEditReceiptId(null)} />
      )}

      {/* Keychain upload prompt — shown when a new keychain is placed */}
      {(pendingChain || uploadChain) && (
        <KeychainUploadPrompt
          onUpload={(url, ox, oy) => updateChainImage((pendingChain || uploadChain)!.id, url, ox, oy)}
          onCancel={() => {
            if (pendingChain) {
              // Remove the ring + chain if upload is cancelled before first image
              removeKeychain(pendingChain.id);
              const chainRingId = pendingChain.attachedRingId;
              if (chainRingId) { setKeyrings(prev=>prev.filter(r=>r.id!==chainRingId)); supabase.from('keyrings').delete().eq('id',chainRingId); }
            }
            setUploadChainId(null); setPendingUploadChainId(null);
          }}
        />
      )}

      {/* Image upload prompt */}
      {uploadImageId && (
        <KeychainUploadPrompt
          onUpload={(url) => updateImageFile(uploadImageId, url)}
          onCancel={() => {
            // If the image has no URL yet, remove it (was just created)
            const img = images.find(im => im.id === uploadImageId);
            if (img && !img.imageUrl) removeImage(uploadImageId);
            else setUploadImageId(null);
          }}
        />
      )}
    </div>
  );
}
