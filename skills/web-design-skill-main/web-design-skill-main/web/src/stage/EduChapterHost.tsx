import { useEffect, useRef, useState } from 'react';
import type { ChapterDef } from '../chapters/types';

interface StepStore {
  subscribe(l: () => void): () => void;
  getSnapshot(): {
    globalStep: number;
    totalSteps: number;
    chapterIndex: number;
    localStep: number;
    direction: 1 | -1;
  };
}

interface Props {
  chapters: ChapterDef[];
  stepStore: StepStore;
}

/**
 * 可参数化的章节装载器
 */
export function ChapterHost({ chapters, stepStore }: Props) {
  const { chapterIndex, localStep, direction } = stepStore.getSnapshot();
  const [, forceUpdate] = useState(0);

  // 监听 store 变化
  useEffect(() => {
    return stepStore.subscribe(() => forceUpdate((n) => n + 1));
  }, [stepStore]);

  const Current = chapters[chapterIndex];

  const [renderedIdx, setRenderedIdx] = useState(chapterIndex);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const pendingRef = useRef<number | null>(null);

  useEffect(() => {
    if (chapterIndex === renderedIdx) return;
    pendingRef.current = chapterIndex;
    setPhase('out');
    const t = setTimeout(() => {
      setRenderedIdx(pendingRef.current!);
      setPhase('in');
    }, 220);
    return () => clearTimeout(t);
  }, [chapterIndex, renderedIdx]);

  const Active = chapters[renderedIdx] ?? Current;
  const themeClass = Active.theme === 'ink' ? 'theme-ink' : '';
  const Component = Active.Component;

  return (
    <div
      className={`chapter-host ${themeClass}`}
      data-phase={phase}
      data-chapter-id={Active.id}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--bg)',
        color: 'var(--fg)',
        opacity: phase === 'in' ? 1 : 0,
        transform: phase === 'in' ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 220ms var(--ease-exit), transform 220ms var(--ease-exit), background 480ms var(--ease-enter), color 480ms var(--ease-enter)',
      }}
    >
      <Component
        localStep={renderedIdx === chapterIndex ? localStep : Active.steps - 1}
        steps={Active.steps}
        direction={direction}
      />
    </div>
  );
}