import type { ChapterContext, ChapterDef } from '../types';
import { Reveal } from '../../shared/Reveal';
import './Edu07.css';

/**
 * Chapter 07 · 结束
 *
 * 口播主旨：
 *  「研伴——协作者，而非答案生成器」
 *
 * 节奏（3 步 / step 0..2）：
 *  0  项目名称
 *  1  核心定位
 *  2  感谢
 */

function Edu07({ localStep }: ChapterContext) {
  const at = (n: number) => localStep >= n;

  return (
    <section className="edu07">
      {/* 背景网格 */}
      <div className="edu07__grid" aria-hidden />

      {/* 角落装饰 */}
      <div className="edu07__cornerTL" aria-hidden>
        <span /><span />
      </div>
      <div className="edu07__cornerBR" aria-hidden>
        <span /><span />
      </div>

      {/* 主内容 */}
      <div className="edu07__main">
        {/* Step 0: 项目名称 */}
        {at(0) && (
          <Reveal kind="blur" duration={1200} delay={100} className="edu07__title">
            研伴
          </Reveal>
        )}

        {/* Step 1: 核心定位 */}
        {at(1) && (
          <Reveal kind="rise" duration={800} delay={200} className="edu07__positioning">
            <span className="edu07__positioning-highlight">协作者</span>
            <span className="edu07__positioning-connector">，而非</span>
            <span className="edu07__positioning-muted">答案生成器</span>
          </Reveal>
        )}

        {/* Step 2: 感谢 */}
        {at(2) && (
          <Reveal kind="fade" duration={600} delay={300} className="edu07__thanks">
            <div className="edu07__thanks-text">感谢聆听</div>
            <div className="edu07__thanks-sub">普通高等教育组 · 竞赛演示</div>
          </Reveal>
        )}
      </div>

      {/* 底部标识 */}
      <div className="edu07__footer">
        <span>智能教育数字人系统</span>
      </div>
    </section>
  );
}

const def: ChapterDef = {
  id: 'edu07',
  title: '结束',
  eyebrow: '07',
  steps: 3,
  theme: 'ink',
  Component: Edu07,
};

export default def;
