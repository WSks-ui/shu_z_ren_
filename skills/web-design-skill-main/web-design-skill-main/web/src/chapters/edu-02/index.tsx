import type { ChapterContext, ChapterDef } from '../types';
import { Reveal } from '../../shared/Reveal';
import { SceneFade } from '../../shared/SceneFade';
import './Edu02.css';

/**
 * Chapter 02 · 数字人
 *
 * 口播主旨：
 *  「云端渲染的3D数字人，低带宽可用，有温度的交互体验」
 *
 * 节奏（4 步 / step 0..3）：
 *  0  数字人形象展示
 *  1  云端渲染特性
 *  2  低带宽优势
 *  3  情绪联动能力
 */

function Edu02({ localStep }: ChapterContext) {
  const at = (n: number) => localStep >= n;

  return (
    <section className="edu02">
      {/* 背景网格 */}
      <div className="edu02__grid" aria-hidden />

      {/* 左侧：数字人形象区 */}
      <div className="edu02__avatar">
        <div className="edu02__avatar-frame">
          <div className="edu02__avatar-placeholder">
            <span className="edu02__avatar-icon">👤</span>
            <span className="edu02__avatar-label">3D 数字人形象</span>
          </div>
          {at(1) && (
            <Reveal kind="fade" duration={600} className="edu02__avatar-badge">
              <span className="edu02__avatar-badge-dot" />
              云端渲染中
            </Reveal>
          )}
        </div>
      </div>

      {/* 右侧：特性说明 */}
      <div className="edu02__content">
        {/* Step 0: 标题 */}
        <Reveal kind="fade" duration={700} className="edu02__eyebrow">
          <span className="edu02__eyebrow-bar" />
          <span>02 · 数字人</span>
          <span className="edu02__eyebrow-bar" />
        </Reveal>

        {at(0) && (
          <Reveal kind="blur" duration={1000} delay={80} className="edu02__title">
            有温度的<span className="edu02__title-em">数字人</span>
          </Reveal>
        )}

        {/* Step 1: 云端渲染 */}
        {at(1) && (
          <Reveal kind="rise" duration={720} delay={120} className="edu02__feature">
            <div className="edu02__feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
            </div>
            <div className="edu02__feature-text">
              <div className="edu02__feature-title">云端渲染</div>
              <div className="edu02__feature-desc">高质量3D形象，无需本地GPU</div>
            </div>
          </Reveal>
        )}

        {/* Step 2: 低带宽 */}
        {at(2) && (
          <Reveal kind="rise" duration={720} delay={180} className="edu02__feature">
            <div className="edu02__feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2v20M2 12h20" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div className="edu02__feature-text">
              <div className="edu02__feature-title">低带宽可用</div>
              <div className="edu02__feature-desc">网络要求低，随时随地访问</div>
            </div>
          </Reveal>
        )}

        {/* Step 3: 情绪联动 */}
        {at(3) && (
          <Reveal kind="rise" duration={720} delay={240} className="edu02__feature">
            <div className="edu02__feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <div className="edu02__feature-text">
              <div className="edu02__feature-title">情绪联动</div>
              <div className="edu02__feature-desc">10+ 种情绪识别，表情实时响应</div>
            </div>
          </Reveal>
        )}
      </div>

      {/* 底部标识 */}
      <div className="edu02__footer">
        <span>魔珐星云引擎驱动</span>
      </div>
    </section>
  );
}

const def: ChapterDef = {
  id: 'edu02',
  title: '数字人',
  eyebrow: '02',
  steps: 4,
  theme: 'ink',
  Component: Edu02,
};

export default def;
