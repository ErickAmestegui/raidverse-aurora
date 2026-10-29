export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10H7V10"/><path d="M10 20v-7h5v7"/></>,
    artifact: <><path d="m12 2 9 9-9 11L3 11Z M3 11h18 M12 2 8 11l4 11 4-11Z"/></>,
    transfers: <><path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/></>,
    memories: <><path d="M12 6C8 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-6-1-10 2Zm0 0v15M5 8l4 1m6 0 4-1M5 12l4 1m6 0 4-1"/></>,
    settings: <><path d="m9 3 1-1h4l1 3 3 1 3 1v4l-2 2v3l-3 2-1 3h-5l-1-3-3-1-3-2v-4l2-2V6Z"/><circle cx="12" cy="12" r="3"/></>,
    light: <><path d="m12 1 2.8 7.2L22 11l-7.2 2.8L12 21l-2.8-7.2L2 11l7.2-2.8Z"/><circle cx="12" cy="11" r="2"/></>,
    fire: <><path d="M12 2c.5 3-1.5 5.5-3 7.5C7.5 11.5 6 13.5 6 16.5a6 6 0 0 0 12 0c0-3.5-2-5.5-3-7.5-1-2-1.5-4-1.5-7-.5 1-1 2-1.5 2.5Z"/><path d="M12 14c-.6 1.2-1.5 1.8-1.5 3a1.5 1.5 0 0 0 3 0c0-1.2-.9-1.8-1.5-3Z"/></>,
    storm: <><path d="M12 3a9 9 0 0 1 8.8 7.2c-.4 2.8-2.2 5.2-4.8 6.3-3.2 1.4-7 .3-8.8-2.3-1.9-2.7-1.4-6.5 1.2-8.5 2.5-2 6.2-1.4 7.9 1.2 1.4 2.2.8 5.1-1.3 6.6-1.8 1.2-4.2.6-5.1-1.1-.7-1.4-.2-3.1 1.1-3.8 1-.5 2.3-.1 2.7.9"/></>,
    crystal: <><polygon points="12 2 21 8.5 17 22 7 22 3 8.5 12 2"/><line x1="12" y1="2" x2="12" y2="22"/><polyline points="3 8.5 12 13 21 8.5"/><polyline points="7 22 12 13 17 22"/></>,
    people: <><circle cx="9" cy="7" r="3"/><path d="M2 21v-4c0-5 14-5 14 0v4ZM16 3c6 0 6 7 1 7m2 3c3 1 4 3 3 7"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="3"/><path d="M16 5V3H3v13h2"/></>,
    edit: <><path d="m14 4 6 6M3 21l1-7L17 1l6 6L10 20Z"/></>,
    hide: <><path d="M3 3 21 21M9 5l3-1c6 0 10 8 10 8l-4 5M6 6c-3 2-5 6-5 6s4 8 11 8l4-1"/><path d="M9 9a4 4 0 0 0 6 6"/></>,
    check: <path d="m4 12 5 5L21 5"/>,
    twitch: <><path d="M4 2h18v13l-6 6h-5l-4 3v-3H2V6Zm0 0v15h5v3l3-3h5l3-3V4"/><path d="M10 7v5m6-5v5"/></>,
    link: <><path d="m9 15 6-6M8 17l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 8a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-2 2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.artifact}</svg>;
}
