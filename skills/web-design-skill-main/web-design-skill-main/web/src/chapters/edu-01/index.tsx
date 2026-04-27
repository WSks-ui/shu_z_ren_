import type { ChapterContext, ChapterDef } from '../types';
import { Reveal } from '../../shared/Reveal';
import { SceneFade } from '../../shared/SceneFade';
import './Edu01.css';

/**
 * Chapter 01 · 开场
 *
 * 口播主旨：
 *  「研伴——一个面向高校教育场景的智能科研协作数字人。
 *   它不是简单的问答工具，而是能够与学习者共同探索、协同创造的学术伙伴。」
 *
 * 节奏（4 步 / step 0..3）：
 *  0  环境（深墨底 + 网格氛围）
 *  1  项目名称 "研伴"
 *  2  副标题 + 核心定位
 *  3  三大设计理念
 */

function Edu01({ localStep }: ChapterContext) {
  const at = (n: number) => localStep >= n;

  return (
    <section className="edu01">
      {/* 装饰性背景网格 + 角落坐标 */}
      <div className="edu01__grid" aria-hidden />
      <div className="edu01__cornerTL" aria-hidden>
        <span /><span />
      </div>
      <div className="edu01__cornerBR" aria-hidden>
        <span /><span />
      </div>

      {/* 主内容区 */}
      <div className="edu01__main">
        {/* Step 0: Eyebrow */}
        <Reveal kind="fade" duration={700} delay={120} className="edu01__eyebrow">
          <span className="edu01__eyebrow-bar" />
          <span>01 · 开场</span>
          <span className="edu01__eyebrow-bar" />
        </Reveal>

        {/* Step 1: 项目名称 */}
        {at(1) && (
          <Reveal kind="blur" duration={1100} delay={80} className="edu01__title" as="h1">
            研伴
          </Reveal>
        )}

        {/* Step 2: 副标题 + 核心定位 */}
        {at(2) && (
          <div className="edu01__subtitle-wrap">
            <Reveal kind="rise" duration={800} delay={120} className="edu01__subtitle">
              智能教育数字人系统
            </Reveal>
            <Reveal kind="rise" duration={800} delay={320} className="edu01__positioning">
              <span className="edu01__positioning-highlight">协作者</span>
              <span className="edu01__positioning-muted">，而非</span>
              <span className="edu01__positioning-line">答案生成器</span>
            </Reveal>
          </div>
        )}

        {/* Step 3: 三大设计理念 */}
        {at(3) && (
          <div className="edu01__principles">
            <Reveal kind="rise" duration={720} delay={80} className="edu01__principle">
              <div className="edu01__principle-num">01</div>
              <div className="edu01__principle-title">引导式交互</div>
              <div className="edu01__principle-desc">苏格拉底式提问，培养独立思考</div>
            </Reveal>
            <Reveal kind="rise" duration={720} delay={180} className="edu01__principle">
              <div className="edu01__principle-num">02</div>
              <div className="edu01__principle-title">方法论支撑</div>
              <div className="edu01__principle-desc">内置科研方法论知识库</div>
            </Reveal>
            <Reveal kind="rise" duration={720} delay={280} className="edu01__principle">
              <div className="edu01__principle-num">03</div>
              <div className="edu01__principle-title">成长可量化</div>
              <div className="edu01__principle-desc">学习进步有据可查</div>
            </Reveal>
          </div>
        )}
      </div>

      {/* 底部标识 */}
      <div className="edu01__footer">
        <span>普通高等教育组 · 竞赛演示</span>
      </div>
    </section>
  );
}

const def: ChapterDef = {
  id: 'edu01',
  title: '开场',
  eyebrow: '01',
  steps: 4,
  theme: 'ink',
  Component: Edu01,
};

export default def;
