import { Stage } from './stage/Stage';
import { EduChapterHost } from './stage/EduChapterHost';
import { EduProgressBar } from './stage/EduProgressBar';
import { useEduHotKeys } from './stage/useEduHotKeys';
import { eduStepStore, useEduStep } from './store/useEduStep';
import { eduChapters } from './chapters';

/**
 * 教育数字人演示应用
 * 使用独立的 eduChapters 和 eduStepStore
 */
function EduApp() {
  useEduHotKeys();
  const { chapterIndex } = useEduStep();
  const theme = eduChapters[chapterIndex]?.theme ?? 'ink';

  return (
    <div
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-no-step]')) return;
        eduStepStore.next();
      }}
    >
      <Stage theme={theme}>
        <EduChapterHost chapters={eduChapters} stepStore={eduStepStore} />
      </Stage>
      <div data-no-step>
        <EduProgressBar chapters={eduChapters} stepStore={eduStepStore} />
      </div>
    </div>
  );
}

export default EduApp;
