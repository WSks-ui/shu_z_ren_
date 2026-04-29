import type { ChapterContext, ChapterDef } from '../types';
import { Reveal } from '../../shared/Reveal';
import './Opening.css';

/**
 * Chapter 01 · 开场
 * 4 个 step
 */

function Opening({ localStep }: ChapterContext) {
  const at = (n: number) => localStep >= n;

  return (
    <section className="opening">
      {/* 背景 */}
      <div className="opening__bg">
        <div className="opening__glow opening__glow--1" />
        <div className="opening__glow opening__glow--2" />
      </div>

      {/* 主内容 */}
      <div className="opening__content">
        {/* Step 0: 项目名称 */}
        {at(0) && (
          <Reveal kind="blur" duration={1200} className="opening__title">
            <span className="opening__title-main">研伴</span>
          </Reveal>
        )}

        {/* Step 1: 副标题 */}
        {at(1) && (
          <Reveal kind="rise" duration={800} delay={200} className="opening__subtitle">
            智能教育数字人系统
          </Reveal>
        )}

        {/* Step 2: 核心定位 */}
        {at(2) && (
          <Reveal kind="rise" duration={800} delay={100} className="opening__positioning">
            <div className="opening__positioning-tag">核心定位</div>
            <div className="opening__positioning-text">
              <span className="opening__positioning-highlight">协作者</span>
              <span className="opening__positioning-connector">，而非</span>
              <span className="opening__positioning-muted">答案生成器</span>
            </div>
          </Reveal>
        )}

        {/* Step 3: 三大设计理念 */}
        {at(3) && (
          <Reveal kind="rise" duration={800} className="opening__principles">
            <div className="opening__principle">
              <div className="opening__principle-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="opening__principle-title">引导式交互</div>
              <div className="opening__principle-desc">苏格拉底式提问，培养独立思考</div>
            </div>
            <div className="opening__principle">
              <div className="opening__principle-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="opening__principle-title">方法论支撑</div>
              <div className="opening__principle-desc">内置科研方法论知识库</div>
            </div>
            <div className="opening__principle">
              <div className="opening__principle-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
              </div>
              <div className="opening__principle-title">成长可量化</div>
              <div className="opening__principle-desc">学习进步有据可查</div>
            </div>
          </Reveal>
        )}
      </div>

      {/* 底部标识 */}
      <div className="opening__footer">
        <span>普通高等教育组 · 竞赛演示</span>
      </div>
    </section>
  );
}

const def: ChapterDef = {
  id: 'opening',
  title: '开场 · 研伴',
  eyebrow: '01',
  steps: 4,
  theme: 'ink',
  Component: Opening,
};

export default def;
