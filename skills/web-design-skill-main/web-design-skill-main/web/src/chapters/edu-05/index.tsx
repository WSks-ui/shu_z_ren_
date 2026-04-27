import type { ChapterContext, ChapterDef } from '../types';
import { Reveal } from '../../shared/Reveal';
import './Edu05.css';

/**
 * Chapter 05 · 人机协作
 *
 * 口播主旨：
 *  「记录每一次协作，见证共同成长」
 *
 * 节奏（4 步 / step 0..3）：
 *  0  标题
 *  1  协作类型
 *  2  贡献追踪
 *  3  学习报告
 */

function Edu05({ localStep }: ChapterContext) {
  const at = (n: number) => localStep >= n;

  const collabTypes = [
    { type: '论文协作', icon: '📝', count: 12 },
    { type: '实验协作', icon: '🔬', count: 8 },
    { type: '综述协作', icon: '📚', count: 5 },
    { type: '辅导协作', icon: '🎓', count: 23 },
  ];

  return (
    <section className="edu05">
      {/* 背景网格 */}
      <div className="edu05__grid" aria-hidden />

      {/* 标题区 */}
      <div className="edu05__header">
        <Reveal kind="fade" duration={600} className="edu05__eyebrow">
          <span className="edu05__eyebrow-bar" />
          <span>05 · 人机协作</span>
          <span className="edu05__eyebrow-bar" />
        </Reveal>

        {at(0) && (
          <Reveal kind="blur" duration={900} delay={80} className="edu05__title">
            记录每一次<span className="edu05__title-em">协作</span>
          </Reveal>
        )}
      </div>

      {/* 主内容区 */}
      <div className="edu05__content">
        {/* Step 1: 协作类型 */}
        {at(1) && (
          <div className="edu05__types">
            {collabTypes.map((item, idx) => (
              <Reveal key={item.type} kind="rise" duration={600} delay={80 + idx * 100} className="edu05__type-card">
                <span className="edu05__type-icon">{item.icon}</span>
                <span className="edu05__type-name">{item.type}</span>
                <span className="edu05__type-count">{item.count} 次</span>
              </Reveal>
            ))}
          </div>
        )}

        {/* Step 2: 贡献追踪 */}
        {at(2) && (
          <Reveal kind="rise" duration={720} delay={100} className="edu05__contribution">
            <div className="edu05__contribution-header">
              <span className="edu05__contribution-title">贡献追踪</span>
              <span className="edu05__contribution-label">人机协作比例</span>
            </div>
            <div className="edu05__contribution-bar">
              <div className="edu05__contribution-ai" style={{ width: '35%' }}>
                <span>AI 35%</span>
              </div>
              <div className="edu05__contribution-human" style={{ width: '65%' }}>
                <span>用户 65%</span>
              </div>
            </div>
            <div className="edu05__contribution-note">
              自动记录双方贡献，支持导出 Word 格式学习报告
            </div>
          </Reveal>
        )}

        {/* Step 3: 学习报告 */}
        {at(3) && (
          <Reveal kind="fade" duration={600} delay={100} className="edu05__report">
            <div className="edu05__report-preview">
              <div className="edu05__report-header">
                <span className="edu05__report-icon">📊</span>
                <span className="edu05__report-title">学习报告</span>
              </div>
              <div className="edu05__report-content">
                <div className="edu05__report-section">
                  <span className="edu05__report-section-title">成就时间线</span>
                  <div className="edu05__report-timeline">
                    <div className="edu05__report-timeline-item">进阶学者 · 2026-04-20</div>
                    <div className="edu05__report-timeline-item">协作大师 · 2026-04-22</div>
                    <div className="edu05__report-timeline-item">番茄大师 · 2026-04-25</div>
                  </div>
                </div>
                <div className="edu05__report-section">
                  <span className="edu05__report-section-title">技能使用趋势</span>
                  <div className="edu05__report-chart">
                    <div className="edu05__report-bar" style={{ width: '80%' }}>科研助手</div>
                    <div className="edu05__report-bar" style={{ width: '60%' }}>文献综述</div>
                    <div className="edu05__report-bar" style={{ width: '45%' }}>论文写作</div>
                  </div>
                </div>
                <div className="edu05__report-section">
                  <span className="edu05__report-section-title">智能学习建议</span>
                  <div className="edu05__report-suggestion">
                    建议增加数学助手使用频率，提升公式推导能力
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        )}
      </div>

      {/* 底部标识 */}
      <div className="edu05__footer">
        <span>人机协作 · 共同成长</span>
      </div>
    </section>
  );
}

const def: ChapterDef = {
  id: 'edu05',
  title: '人机协作',
  eyebrow: '05',
  steps: 4,
  theme: 'ink',
  Component: Edu05,
};

export default def;
