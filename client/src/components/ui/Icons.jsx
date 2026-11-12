// Lightweight stroke icon set (24px grid, currentColor) used across the app.
// Keeping icons inline avoids adding an icon dependency.

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const make = (paths) =>
  function Icon({ className = 'h-5 w-5', ...props }) {
    return (
      <svg {...base} className={className} {...props}>
        {paths}
      </svg>
    );
  };

export const IconSparkles = make(<>
  <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" />
  <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
</>);
export const IconArrowRight = make(<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>);
export const IconArrowUpRight = make(<><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>);
export const IconChevronRight = make(<path d="M9 6l6 6-6 6" />);
export const IconChevronDown = make(<path d="M6 9l6 6 6-6" />);
export const IconCheck = make(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconCheckCircle = make(<><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>);
export const IconX = make(<><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>);
export const IconMenu = make(<><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>);
export const IconBrain = make(<>
  <path d="M9.5 4.5A2.5 2.5 0 0 0 7 7v.2A3 3 0 0 0 4.5 10a3 3 0 0 0 1 2.2A3 3 0 0 0 7 17.5 2.5 2.5 0 0 0 12 18V6a1.5 1.5 0 0 0-2.5-1.5z" />
  <path d="M14.5 4.5A2.5 2.5 0 0 1 17 7v.2a3 3 0 0 1 2.5 2.8 3 3 0 0 1-1 2.2 3 3 0 0 1-1.5 5.3A2.5 2.5 0 0 1 12 18" />
</>);
export const IconZap = make(<path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" />);
export const IconLayers = make(<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>);
export const IconCode = make(<><path d="M8 7l-5 5 5 5" /><path d="M16 7l5 5-5 5" /><path d="M14 4l-4 16" /></>);
export const IconFileText = make(<>
  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
  <path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h6" />
</>);
export const IconUpload = make(<><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>);
export const IconDownload = make(<><path d="M12 4v12" /><path d="M7 11l5 5 5-5" /><path d="M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1" /></>);
export const IconUsers = make(<>
  <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
  <path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
</>);
export const IconUser = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const IconUserPlus = make(<>
  <circle cx="10" cy="8" r="4" /><path d="M2.5 21a7.5 7.5 0 0 1 15 0" /><path d="M19 8v6" /><path d="M16 11h6" />
</>);
export const IconSliders = make(<>
  <path d="M4 6h10" /><path d="M18 6h2" /><circle cx="16" cy="6" r="2" />
  <path d="M4 12h4" /><path d="M12 12h8" /><circle cx="10" cy="12" r="2" />
  <path d="M4 18h12" /><path d="M20 18h0" /><circle cx="18" cy="18" r="2" />
</>);
export const IconShield = make(<><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>);
export const IconLock = make(<><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>);
export const IconClock = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconBriefcase = make(<>
  <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" />
</>);
export const IconTrendingUp = make(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>);
export const IconHeart = make(<path d="M12 20s-7.5-4.6-9-9.5C2 6.9 4.4 4.5 7.2 4.5c1.9 0 3.4 1 4.8 2.8 1.4-1.8 2.9-2.8 4.8-2.8 2.8 0 5.2 2.4 4.2 6C19.5 15.4 12 20 12 20z" />);
export const IconScale = make(<>
  <path d="M12 4v16" /><path d="M7 20h10" /><path d="M5 7h14" />
  <path d="M5 7l-3 6a3 3 0 0 0 6 0L5 7z" /><path d="M19 7l-3 6a3 3 0 0 0 6 0l-3-6z" />
</>);
export const IconTarget = make(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>);
export const IconActivity = make(<path d="M3 12h4l3-8 4 16 3-8h4" />);
export const IconHome = make(<><path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h12V9.5" /></>);
export const IconLogOut = make(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h10" /></>);
export const IconMessage = make(<path d="M4 5h16v11H9l-5 4V5z" />);
export const IconCopy = make(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>);
export const IconSearch = make(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>);
export const IconExternal = make(<><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" /></>);
export const IconGitBranch = make(<>
  <circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="8" r="2" />
  <path d="M6 7v10" /><path d="M18 10c0 4-6 3-12 7" />
</>);

// Mode → icon mapping shared by HR and Employee interfaces
export const MODE_ICONS = {
  hiring: IconBriefcase,
  assessment: IconTrendingUp,
  retention: IconHeart,
  layoff: IconScale,
};
