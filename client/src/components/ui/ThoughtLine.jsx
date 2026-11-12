import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './ThoughtLine.css';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
const GLYPH_DONE = 0.55;
const EMPTY_STEPS = [];

const fmt = (ds) =>
  ds < 600
    ? `${(ds / 10).toFixed(1)}s`
    : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`;

const spoken = (ds) =>
  ds < 600
    ? `${(ds / 10).toFixed(1)} seconds`
    : `${Math.floor(ds / 600)} minutes ${((ds % 600) / 10).toFixed(1)} seconds`;

function animateElement(el, keyframes, options) {
  if (!el || typeof el.animate !== 'function') {
    return {
      stop() {},
      then(cb) {
        if (cb) Promise.resolve().then(cb);
      }
    };
  }
  const opFrames = Array.isArray(keyframes.opacity)
    ? keyframes.opacity.map((v) => ({ opacity: v }))
    : [{ opacity: keyframes.opacity }];

  const anim = el.animate(opFrames, {
    duration: (options.duration || 0.2) * 1000,
    delay: (options.delay || 0) * 1000,
    easing: options.ease || 'ease',
    iterations: options.repeat === Infinity ? Infinity : 1,
    fill: 'forwards'
  });

  return {
    stop() {
      try {
        anim.cancel();
      } catch {
        // Ignore if already cancelled
      }
    },
    then(cb) {
      anim.finished.then(cb).catch(() => {});
    }
  };
}

function SparkleSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3C12 7.97056 16.0294 12 21 12C16.0294 12 12 16.0294 12 21C12 16.0294 7.97056 12 3 12C7.97056 12 12 7.97056 12 3Z" />
      <path d="M19 3V7M21 5H17" />
    </svg>
  );
}

function ChevronDownSvg() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9L12 15L18 9" />
    </svg>
  );
}

function TickSvg() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13L9 17L19 7" />
    </svg>
  );
}

export default function ThoughtLine({
  label = 'Thinking…',
  doneLabel = '',
  renderLabel,
  glyph = 'sparkle',
  steps = EMPTY_STEPS,
  collapsible = true,
  collapseOnSettle = true,
  color = 'currentColor',
  glyphColor = '',
  fontSize = 16,
  breathPeriod = 1.6,
  breathDepth = 0.45,
  shimmer = true,
  shimmerDuration = 1.8,
  settleDuration = 350,
  settleBlur = 2,
  working = true,
  settleAfter = 0,
  elapsed,
  showTimer = true,
  onSettle,
  className = '',
  style
}) {
  const [autoSettled, setAutoSettled] = useState(false);
  const [manualToggle, setManualToggle] = useState(null);

  const isWorking = working && !autoSettled;
  const open = manualToggle !== null ? manualToggle : isWorking ? true : !collapseOnSettle;

  const doneText = doneLabel || (showTimer ? 'Thought for' : 'Done thinking');
  const hasTrace = steps.length > 0;
  const depth = breathDepth;
  const period = breathPeriod;
  const trough = 1 - depth;
  const sheen = shimmer;

  const glyphRef = useRef(null);
  const breathRef = useRef(null);
  const timerRef = useRef(null);
  const stackRef = useRef(null);
  const workRef = useRef(null);
  const doneRef = useRef(null);
  const srRef = useRef(null);
  const dsRef = useRef(0);
  const prevWorking = useRef(isWorking);
  const latest = useRef({ onSettle });

  useEffect(() => {
    latest.current = { onSettle };
  }, [onSettle]);

  useEffect(() => {
    const glyphEl = glyphRef.current;
    const breathEl = breathRef.current;
    if (!breathEl) return undefined;
    const s = settleDuration / 1000;
    const loop = (el, delay) =>
      animateElement(el, { opacity: [trough, 1, trough] }, { duration: period, ease: EASE_IN_OUT, repeat: Infinity, delay });
    let cancelled = false;
    const running = [];
    if (isWorking) {
      if (depth > 0) {
        if (sheen) running.push(animateElement(breathEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT }));
        if (glyphEl) {
          const lead = animateElement(glyphEl, { opacity: trough }, { duration: 0.2, ease: EASE_OUT });
          running.push(lead);
          lead.then(() => {
            if (cancelled) return;
            running.push(loop(glyphEl, 0));
            if (!sheen) running.push(loop(breathEl, 0.14));
          });
        } else if (!sheen) {
          running.push(loop(breathEl, 0.14));
        }
      } else {
        if (glyphEl) running.push(animateElement(glyphEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT }));
        running.push(animateElement(breathEl, { opacity: 1 }, { duration: 0.2, ease: EASE_OUT }));
      }
    } else {
      if (glyphEl) running.push(animateElement(glyphEl, { opacity: GLYPH_DONE }, { duration: s, ease: EASE_OUT }));
      running.push(animateElement(breathEl, { opacity: 1 }, { duration: s, ease: EASE_OUT }));
    }
    return () => {
      cancelled = true;
      running.forEach((a) => a.stop());
    };
  }, [isWorking, period, depth, trough, settleDuration, glyph, sheen]);

  useLayoutEffect(() => {
    const paint = (ds) => {
      dsRef.current = ds;
      if (timerRef.current) timerRef.current.textContent = fmt(ds);
    };
    if (elapsed != null) {
      paint(Math.round(elapsed * 10));
      return undefined;
    }
    if (!isWorking) return undefined;
    const startedAt = performance.now();
    paint(0);
    const id = setInterval(() => {
      const ds = Math.floor((performance.now() - startedAt) / 100);
      paint(ds);
      if (settleAfter > 0 && ds >= Math.round(settleAfter * 10)) {
        setAutoSettled(true);
      }
    }, 100);
    return () => clearInterval(id);
  }, [isWorking, elapsed, settleAfter]);

  useLayoutEffect(() => {
    const t = timerRef.current;
    const stack = stackRef.current;
    if (!t || !stack) return undefined;
    const place = (glide) => {
      const active = isWorking ? workRef.current : doneRef.current;
      if (!active) return;
      const shift = active.offsetWidth - stack.offsetWidth;
      if (!glide) t.style.transition = 'none';
      t.style.transform = `translateX(${shift}px)`;
      if (!glide) {
        void t.offsetWidth;
        t.style.transition = '';
      }
    };
    const transitioned = prevWorking.current !== isWorking;
    place(transitioned);
    if (transitioned && !isWorking) {
      setManualToggle(null);
      latest.current.onSettle?.(dsRef.current / 10);
    }
    if (srRef.current) {
      srRef.current.textContent = isWorking
        ? label
        : showTimer
        ? `${doneText} ${spoken(dsRef.current)}`
        : doneText;
    }
    prevWorking.current = isWorking;
    const ro = new ResizeObserver(() => place(false));
    if (workRef.current) ro.observe(workRef.current);
    if (doneRef.current) ro.observe(doneRef.current);
    return () => ro.disconnect();
  }, [isWorking, label, doneText, fontSize, showTimer]);

  const toggle = hasTrace && collapsible;
  const head = (
    <>
      {glyph !== 'none' ? (
        <span ref={glyphRef} className="thought-line__glyph" aria-hidden="true">
          {glyph === 'sparkle' ? (
            <SparkleSvg />
          ) : glyph === 'dot' ? (
            <span className="thought-line__dot" />
          ) : (
            glyph
          )}
        </span>
      ) : null}
      <span ref={stackRef} className="thought-line__label" aria-hidden="true">
        <span ref={workRef} className="thought-line__text" data-active={isWorking ? '' : undefined}>
          <span ref={breathRef} className="thought-line__breath" data-shimmer={sheen ? '' : undefined}>
            {renderLabel ? renderLabel(label, true) : label}
          </span>
        </span>
        <span
          ref={doneRef}
          className="thought-line__text thought-line__text--done"
          data-active={isWorking ? undefined : ''}
        >
          {renderLabel ? renderLabel(doneText, false) : doneText}
        </span>
      </span>
      {showTimer ? (
        <span ref={timerRef} className="thought-line__timer" data-done={isWorking ? undefined : ''} aria-hidden="true">
          0.0s
        </span>
      ) : null}
      {collapsible ? (
        <span className="thought-line__chevron" data-on={hasTrace ? '' : undefined} aria-hidden="true">
          <ChevronDownSvg />
        </span>
      ) : null}
      <span ref={srRef} className="thought-line__sr" role="status">
        {label}
      </span>
    </>
  );

  return (
    <div
      className={`thought-line${className ? ` ${className}` : ''}`}
      data-working={isWorking ? '' : undefined}
      data-open={open && hasTrace ? '' : undefined}
      style={{
        '--tl-font': `${fontSize}px`,
        '--tl-color': color,
        '--tl-glyph': glyphColor || color,
        '--tl-settle': `${settleDuration}ms`,
        '--tl-blur': `${settleBlur}px`,
        '--tl-shimmer': `${shimmerDuration}s`,
        ...style
      }}
    >
      {collapsible ? (
        <button
          type="button"
          className="thought-line__head"
          data-toggle={toggle ? '' : undefined}
          aria-expanded={toggle ? open : undefined}
          tabIndex={toggle ? 0 : -1}
          onClick={() => {
            if (toggle) setManualToggle(!open);
          }}
        >
          {head}
        </button>
      ) : (
        <div className="thought-line__head">{head}</div>
      )}
      {hasTrace ? (
        <div className="thought-line__trace" data-open={open ? '' : undefined} aria-hidden={!open}>
          <div className="thought-line__fold">
            <div className="thought-line__steps">
              {steps.map((text, i) => {
                const done = !isWorking || i < steps.length - 1;
                return (
                  <div key={`${i}-${text}`} className="thought-line__step" data-done={done ? '' : undefined}>
                    <span className="thought-line__mark" aria-hidden="true">
                      {done ? <TickSvg /> : <i className="thought-line__pulse" />}
                    </span>
                    <span className="thought-line__step-text">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

