import { useEffect, useRef, useState } from 'react';
import type { ChapterDef } from '../chapters/types';
import './ProgressBar.css';

interface StepStore {
  subscribe(l: () => void): () => void;
  getSnapshot(): {
    globalStep: number;
    totalSteps: number;
    chapterIndex: number;
    localStep: number;
    direction: 1 | -1;
  };
  goToGlobal(n: number): void;
  goToChapter(i: number): void;
}

interface Props {
  chapters: ChapterDef[];
  stepStore: StepStore;
}

function chapterStartGlobal(chapters: ChapterDef[], chapterIndex: number): number {
  let acc = 0;
  for (let i = 0; i < chapterIndex; i++) acc += chapters[i].steps;
  return acc;
}

/**
 * 可参数化的进度条
 */
export function EduProgressBar({ chapters, stepStore }: Props) {
  const [snapshot, setSnapshot] = useState(stepStore.getSnapshot());

  useEffect(() => {
    return stepStore.subscribe(() => setSnapshot(stepStore.getSnapshot()));
  }, [stepStore]);

  const { globalStep, totalSteps, chapterIndex } = snapshot;
  const [visible, setVisible] = useState(false);
  const draggingRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const show = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setVisible(true);
  };

  const scheduleHide = () => {
    if (draggingRef.current) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setVisible(false), 1200);
  };

  const seekFromEvent = (clientX: number) => {
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const target = Math.round(ratio * (totalSteps - 1));
    stepStore.goToGlobal(target);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) seekFromEvent(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
      scheduleHide();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [totalSteps, stepStore]);

  const ticks = chapters.map((_, i) => chapterStartGlobal(chapters, i) / Math.max(1, totalSteps - 1));
  const progress = totalSteps > 1 ? globalStep / (totalSteps - 1) : 0;
  const currentChapter = chapters[chapterIndex];

  return (
    <div
      className={`progress-zone ${visible ? 'is-visible' : ''}`}
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="progress-meta">
        <span className="progress-meta__num">
          {String(chapterIndex + 1).padStart(2, '0')}
        </span>
        <span className="progress-meta__title">{currentChapter.title}</span>
        <span className="progress-meta__count">
          {globalStep + 1} / {totalSteps}
        </span>
      </div>

      <div
        className="progress-bar"
        ref={barRef}
        onMouseDown={(e) => {
          draggingRef.current = true;
          seekFromEvent(e.clientX);
        }}
      >
        <div className="progress-bar__track" />
        <div
          className="progress-bar__fill"
          style={{ transform: `scaleX(${progress})` }}
        />
        {ticks.map((r, i) => (
          <button
            key={i}
            className={`progress-bar__tick ${i === chapterIndex ? 'is-current' : ''}`}
            style={{ left: `${r * 100}%` }}
            title={chapters[i].title}
            onClick={(e) => {
              e.stopPropagation();
              stepStore.goToChapter(i);
            }}
          />
        ))}
      </div>
    </div>
  );
}