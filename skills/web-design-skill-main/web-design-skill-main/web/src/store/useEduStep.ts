import { useSyncExternalStore } from 'react';
import { eduChapters } from '../chapters';

/**
 * 教育演示专用 step 状态
 */

type Listener = () => void;

interface Snapshot {
  globalStep: number;
  totalSteps: number;
  chapterIndex: number;
  localStep: number;
  direction: 1 | -1;
}

let listeners = new Set<Listener>();

const chapters = eduChapters;

const totalSteps = () =>
  chapters.reduce((acc, c) => acc + c.steps, 0);

function locate(global: number): { chapterIndex: number; localStep: number } {
  let acc = 0;
  for (let i = 0; i < chapters.length; i++) {
    const next = acc + chapters[i].steps;
    if (global < next) return { chapterIndex: i, localStep: global - acc };
    acc = next;
  }
  const last = chapters.length - 1;
  return { chapterIndex: last, localStep: chapters[last].steps - 1 };
}

export function chapterStartGlobal(chapterIndex: number): number {
  let acc = 0;
  for (let i = 0; i < chapterIndex; i++) acc += chapters[i].steps;
  return acc;
}

let snapshot: Snapshot = {
  globalStep: 0,
  totalSteps: totalSteps(),
  chapterIndex: 0,
  localStep: 0,
  direction: 1,
};

function emit() {
  listeners.forEach((l) => l());
}

function set(globalStep: number, direction: 1 | -1) {
  const total = totalSteps();
  const clamped = Math.max(0, Math.min(total - 1, globalStep));
  if (clamped === snapshot.globalStep) return;
  const loc = locate(clamped);
  snapshot = {
    globalStep: clamped,
    totalSteps: total,
    chapterIndex: loc.chapterIndex,
    localStep: loc.localStep,
    direction,
  };
  emit();
}

export const eduStepStore = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot() {
    return snapshot;
  },
  next() { set(snapshot.globalStep + 1, 1); },
  prev() { set(snapshot.globalStep - 1, -1); },
  goToGlobal(n: number) {
    const dir: 1 | -1 = n >= snapshot.globalStep ? 1 : -1;
    set(n, dir);
  },
  goToChapter(chapterIndex: number) {
    const target = chapterStartGlobal(chapterIndex);
    const dir: 1 | -1 = target >= snapshot.globalStep ? 1 : -1;
    set(target, dir);
  },
};

export function useEduStep(): Snapshot {
  return useSyncExternalStore(eduStepStore.subscribe, eduStepStore.getSnapshot, eduStepStore.getSnapshot);
}
