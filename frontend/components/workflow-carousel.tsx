"use client";
/* Arrow-corner cards (Uiverse.io by satyamchaudharydev, MIT) inside a themed scroll-snap carousel. */
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

export type Tile = [string, string, string, string];
const GAP = 12;

function usePerPage() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const upd = () => setN(window.matchMedia("(max-width:640px)").matches ? 1 : window.matchMedia("(max-width:960px)").matches ? 2 : 3);
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);
  return n;
}

export function WorkflowCarousel({ tiles, highlight = 1 }: { tiles: Tile[]; highlight?: number }) {
  const view = useRef<HTMLDivElement>(null);
  const per = usePerPage();
  const [cardW, setCardW] = useState(230);
  const [page, setPage] = useState(0);
  const [reduce, setReduce] = useState(false);
  const pages = Math.max(1, Math.ceil(tiles.length / per));
  const pageW = () => per * (cardW + GAP);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync(); mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const measure = useCallback(() => {
    const el = view.current; if (!el) return;
    setCardW(Math.max(160, (el.clientWidth - GAP * (per - 1)) / per));
  }, [per]);

  useLayoutEffect(() => {
    measure();
    const el = view.current; if (!el) return;
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const syncPage = useCallback(() => {
    const el = view.current; if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    if (el.scrollLeft >= max - 4) { setPage(pages - 1); return; }
    setPage(Math.max(0, Math.min(pages - 1, Math.round(el.scrollLeft / Math.max(1, pageW())))));
  }, [cardW, per, pages]);

  useEffect(() => {
    const el = view.current; if (!el) return;
    syncPage();
    el.addEventListener("scroll", syncPage, { passive: true });
    return () => el.removeEventListener("scroll", syncPage);
  }, [syncPage]);

  useEffect(() => {
    const el = view.current; if (!el) return;
    el.scrollTo({ left: 0, behavior: "auto" });
    setPage(0);
  }, [per]);

  const go = (p: number) => {
    const el = view.current; if (!el) return;
    const next = Math.max(0, Math.min(pages - 1, p));
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = next >= pages - 1 ? max : next * pageW();
    el.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
    setPage(next);
  };

  return (
    <div className="v-car">
      <div
        ref={view}
        className="v-car-view"
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label="Workflows and APIs"
        onKeyDown={e => { if (e.key === "ArrowRight") { e.preventDefault(); go(page + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(page - 1); } }}
      >
        <ul className="v-tiles">
          {tiles.map(([t, c, m, href], i) => (
            <li key={t} style={{ width: cardW }}>
              <Link href={href} className={`v-acard ${i === highlight ? "on" : ""}`}>
                <span className="v-acard-t">{t}</span>
                <span className="v-acard-c">{c}</span>
                <span className="v-acard-m">{m}</span>
                <span className="v-acard-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M13.2 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4l4.3-4.3H4a1 1 0 1 1 0-2h13.5l-4.3-4.3a1 1 0 0 1 0-1.4z"/></svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="v-car-bar">
        <button type="button" className="v-car-btn" aria-label="Previous workflows" disabled={page <= 0} onClick={() => go(page - 1)}>
          <Icon n="arrowLeft" size={18} />
        </button>
        <div className="v-car-dots" role="tablist" aria-label="Carousel pages">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === page} aria-label={`Show page ${i + 1} of ${pages}`}
              className={`v-car-dot${i === page ? " on" : ""}`} onClick={() => go(i)} />
          ))}
        </div>
        <button type="button" className="v-car-btn" aria-label="Next workflows" disabled={page >= pages - 1} onClick={() => go(page + 1)}>
          <Icon n="arrow" size={18} />
        </button>
      </div>
    </div>
  );
}
