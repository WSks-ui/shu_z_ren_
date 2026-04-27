import { useEffect } from 'react';
import { eduStepStore } from '../store/useEduStep';

/**
 * 教育演示专用快捷键
 */
export function useEduHotKeys() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          eduStepStore.next();
          break;
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault();
          eduStepStore.prev();
          break;
        case 'Home':
          e.preventDefault();
          eduStepStore.goToGlobal(0);
          break;
        case 'End':
          e.preventDefault();
          eduStepStore.goToGlobal(10000);
          break;
        default:
          // 数字键 1-9 跳转章节
          const num = parseInt(e.key);
          if (num >= 1 && num <= 9) {
            e.preventDefault();
            eduStepStore.goToChapter(num - 1);
          }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
