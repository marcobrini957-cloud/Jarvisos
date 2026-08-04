/**
 * VELQUOR icon set — one stroke weight, one grid, currentColor.
 *
 * Emoji were doing this job. They render differently on every OS, carry their
 * own colours (which fight the palette), and read as consumer software next to
 * a P&L figure. These are drawn on a 16px grid at 1.5px stroke so a row of
 * labels stays optically even.
 */

export type IconName =
  | 'streak' | 'journal' | 'habit' | 'trophy' | 'target' | 'alert' | 'check'
  | 'trendUp' | 'trendDown' | 'chart' | 'calendar' | 'clock' | 'spark'
  | 'shield' | 'key' | 'lock' | 'mail' | 'upload' | 'camera' | 'doc' | 'bolt'
  | 'home' | 'briefcase' | 'globe' | 'checkSquare' | 'swap' | 'gift'
  | 'more' | 'settings' | 'close' | 'pencil' | 'repeat' | 'folder' | 'download'
  | 'search' | 'chevronLeft' | 'chevronRight' | 'chevronDown' | 'plus'

/** Runtime guard — anything persisted as an icon (habits) is validated against this. */
export function isIconName(v: unknown): v is IconName {
  return typeof v === 'string' && v in PATHS
}

const PATHS: Record<IconName, React.ReactNode> = {
  // an ascending run of bars — a streak of results, not a flame
  streak:    <><path d="M2.5 12.5v-3" /><path d="M6.5 12.5v-6" /><path d="M10.5 12.5v-8.5" /><path d="M14 12.5v-4.5" /></>,
  journal:   <><path d="M4 2.5h7.5a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" /><path d="M6 5.5h4" /><path d="M6 8h4" /><path d="M6 10.5h2.5" /></>,
  habit:     <><path d="M8 2.5v11" /><path d="M4 5.5v5" /><path d="M12 5.5v5" /><path d="M2 7v2" /><path d="M14 7v2" /></>,
  trophy:    <><path d="M5 2.5h6v3.5a3 3 0 0 1-6 0V2.5Z" /><path d="M5 4H3.2a2 2 0 0 0 1.9 2.6" /><path d="M11 4h1.8a2 2 0 0 1-1.9 2.6" /><path d="M8 9v2.5" /><path d="M5.5 13.5h5" /></>,
  target:    <><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5v1.5" /><path d="M8 13v1.5" /></>,
  alert:     <><path d="M8 2.8 14 13H2L8 2.8Z" /><path d="M8 6.5v3" /><path d="M8 11.2h.01" /></>,
  check:     <path d="M3 8.5 6.5 12 13 4.5" />,
  trendUp:   <><path d="M2 11.5 6 7l3 2.5L14 4" /><path d="M10.5 4H14v3.5" /></>,
  trendDown: <><path d="M2 4.5 6 9l3-2.5L14 12" /><path d="M10.5 12H14V8.5" /></>,
  chart:     <><path d="M2.5 13.5h11" /><path d="M4.5 11V7" /><path d="M8 11V3.5" /><path d="M11.5 11V8.5" /></>,
  calendar:  <><rect x="2.5" y="3.5" width="11" height="10" rx="1" /><path d="M2.5 6.5h11" /><path d="M5.5 2v2.5" /><path d="M10.5 2v2.5" /></>,
  clock:     <><circle cx="8" cy="8" r="5.75" /><path d="M8 4.75V8l2.25 1.5" /></>,
  spark:     <><path d="M8 2.2l1.5 4.3L13.8 8l-4.3 1.5L8 13.8l-1.5-4.3L2.2 8l4.3-1.5L8 2.2Z" /></>,
  shield:    <><path d="M8 2 13 4v4c0 3-2.1 5.2-5 6-2.9-.8-5-3-5-6V4l5-2Z" /><path d="M6 8l1.5 1.5L10.5 6.5" /></>,
  key:       <><circle cx="5.5" cy="8" r="2.75" /><path d="M8.25 8H14" /><path d="M11.5 8v2.25" /><path d="M13.5 8v1.5" /></>,
  lock:      <><rect x="3.5" y="7" width="9" height="6.5" rx="1" /><path d="M5.75 7V5.25a2.25 2.25 0 0 1 4.5 0V7" /></>,
  mail:      <><rect x="2" y="3.5" width="12" height="9" rx="1" /><path d="m2.5 4.5 5.5 4 5.5-4" /></>,
  upload:    <><path d="M8 10.5V2.5" /><path d="m5 5.5 3-3 3 3" /><path d="M2.5 10v2.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" /></>,
  camera:    <><rect x="2" y="4.5" width="12" height="9" rx="1.5" /><circle cx="8" cy="9" r="2.5" /><path d="M6 4.5l1-2h2l1 2" /></>,
  doc:       <><path d="M4 2h5l3 3v9H4V2Z" /><path d="M9 2v3h3" /></>,
  bolt:      <path d="M9 1.5 3.5 9H7l-.5 5.5L12.5 7H9l0-5.5Z" />,
  home:      <><path d="M2.5 7 8 2.5 13.5 7" /><path d="M4 6.5v7h8v-7" /></>,
  briefcase: <><rect x="2" y="5" width="12" height="8.5" rx="1" /><path d="M6 5V3.5h4V5" /><path d="M2 8.5h12" /></>,
  globe:     <><circle cx="8" cy="8" r="5.75" /><path d="M2.4 8h11.2" /><path d="M8 2.25c1.6 1.7 2.4 3.6 2.4 5.75S9.6 12.05 8 13.75C6.4 12.05 5.6 10.15 5.6 8s.8-4.05 2.4-5.75Z" /></>,
  checkSquare: <><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><path d="m5.5 8.25 1.75 1.75L10.75 6.5" /></>,
  swap:      <><path d="M2.5 5.5h9" /><path d="m9 3 2.5 2.5L9 8" /><path d="M13.5 10.5h-9" /><path d="M7 8l-2.5 2.5L7 13" /></>,
  gift:      <><rect x="2" y="6.5" width="12" height="7" rx="1" /><path d="M2 9h12" /><path d="M8 6.5v7" /><path d="M8 6.5C6.5 6.5 4.5 6 4.5 4.5S7 3 8 6.5Z" /><path d="M8 6.5c1.5 0 3.5-.5 3.5-2S9 3 8 6.5Z" /></>,
  more:      <><circle cx="3.5" cy="8" r=".9" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none" /><circle cx="12.5" cy="8" r=".9" fill="currentColor" stroke="none" /></>,
  settings:  <><circle cx="8" cy="8" r="2.25" /><path d="M8 1.5v1.75M8 12.75v1.75M14.5 8h-1.75M3.25 8H1.5M12.6 3.4l-1.24 1.24M4.64 11.36 3.4 12.6M12.6 12.6l-1.24-1.24M4.64 4.64 3.4 3.4" /></>,
  // dismiss — a drawn cross, not the multiplication sign it used to be
  close:     <path d="M4 4l8 8M12 4l-8 8" />,
  pencil:    <><path d="M11.2 2.3a1.6 1.6 0 0 1 2.3 2.3L5.6 12.5 2.5 13.5l1-3.1 7.7-8.1Z" /><path d="M10.2 3.4l2.3 2.3" /></>,
  repeat:    <><path d="M2.5 7V5.5a2 2 0 0 1 2-2h7" /><path d="M9.5 1.5 11.5 3.5 9.5 5.5" /><path d="M13.5 9v1.5a2 2 0 0 1-2 2h-7" /><path d="M6.5 14.5 4.5 12.5 6.5 10.5" /></>,
  folder:    <><path d="M2 4.5a1 1 0 0 1 1-1h3l1.5 1.75h5.5a1 1 0 0 1 1 1v6.25a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5Z" /></>,
  download:  <><path d="M8 2.5v8" /><path d="m5 7.5 3 3 3-3" /><path d="M2.5 12v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" /></>,
  search:    <><circle cx="7" cy="7" r="4.5" /><path d="M10.4 10.4 14 14" /></>,
  // Direction. These exist because ‹ › ▶ ▾ were doing the work in four places —
  // typographic glyphs inherit the text face and its weight, so they never
  // matched the drawn set beside them.
  chevronLeft:  <path d="M10 3.5 5.5 8l4.5 4.5" />,
  chevronRight: <path d="M6 3.5 10.5 8 6 12.5" />,
  chevronDown:  <path d="M3.5 6 8 10.5 12.5 6" />,
  plus:      <><path d="M8 3.5v9" /><path d="M3.5 8h9" /></>,
}

export default function Icon({
  name, size = 14, className, style, strokeWidth = 1.5,
}: {
  name:         IconName
  size?:        number
  className?:   string
  style?:       React.CSSProperties
  strokeWidth?: number
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, display: 'block', ...style }}
      aria-hidden="true" focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
