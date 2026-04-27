import type { ChapterContext, ChapterDef } from '../types';
import { Reveal } from '../../shared/Reveal';
import './Edu04.css';

/**
 * Chapter 04 · 成长系统
 *
 * 口播主旨：
 *  「学习进步有据可查，成就解锁激励前行」
 *
 * 节奏（4 步 / step 0..3）：
 *  0  标题 + 经验等级
 *  1  成就徽章墙
 *  2  成就分类展示
 *  3  统计数据
 */

function Edu04({ localStep }: ChapterContext) {
  const at = (n: number) => localStep >= n;

  const achievements = [
    { category: '基础', items: ['初次对话', '技能探索者'], color: 'var(--accent)' },
    { category: '进阶', items: ['进阶学者', '协作大师', '番茄大师', '知识收藏家'], color: 'oklch(0.75 0.15 180)' },
    { category: '挑战', items: ['资深学者', '任务达人', '公式达人', '阶段大师'], color: 'oklch(0.70 0.18 280)' },
    { category: '隐藏', items: ['夜间学者', '语音先锋'], color: 'oklch(0.65 0.12 320)' },
  ];

  return (
    <section className="edu04">
      {/* 背景网格 */}
      <div className="edu04__grid" aria-hidden />

      {/* 左侧：经验等级 */}
      <div className="edu04__left">
        <Reveal kind="fade" duration={600} className="edu04__eyebrow">
          <span className="edu04__eyebrow-bar" />
          <span>04 · 成长系统</span>
        </Reveal>

        {at(0) && (
          <>
            <Reveal kind="blur" duration={900} delay={80} className="edu04__title">
              学习进步<br /><span className="edu04__title-em">有据可查</span>
            </Reveal>

            <Reveal kind="rise" duration={720} delay={200} className="edu04__level">
              <div className="edu04__level-badge">
                <span className="edu04__level-num">Lv.5</span>
              </div>
              <div className="edu04__level-info">
                <div className="edu04__level-label">当前等级</div>
                <div className="edu04__level-exp">
                  <div className="edu04__level-bar">
                    <div className="edu04__level-bar-fill" style={{ width: '65%' }} />
                  </div>
                  <span>650 / 1000 EXP</span>
                </div>
              </div>
            </Reveal>
          </>
        )}
      </div>

      {/* 右侧：成就系统 */}
      <div className="edu04__right">
        {at(1) && (
          <Reveal kind="fade" duration={600} delay={100} className="edu04__achievements-header">
            <div className="edu04__achievements-title">成就徽章墙</div>
            <div className="edu04__achievements-count">12 枚徽章</div>
          </Reveal>
        )}

        {at(2) && (
          <div className="edu04__achievements-grid">
            {achievements.map((cat, catIdx) => (
              <Reveal key={cat.category} kind="rise" duration={600} delay={100 + catIdx * 120} className="edu04__achievement-category">
                <div className="edu04__category-header" style={{ borderColor: cat.color }}>
                  <span className="edu04__category-name" style={{ color: cat.color }}>{cat.category}</span>
                  <span className="edu04__category-count">{cat.items.length}</span>
                </div>
                <div className="edu04__category-items">
                  {cat.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="edu04__badge">
                      <span className="edu04__badge-icon">🏆</span>
                      <span className="edu04__badge-name">{item}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {at(3) && (
          <Reveal kind="rise" duration={600} delay={100} className="edu04__stats">
            <div className="edu04__stat">
              <span className="edu04__stat-value">156</span>
              <span className="edu04__stat-label">对话次数</span>
            </div>
            <div className="edu04__stat">
              <span className="edu04__stat-value">23</span>
              <span className="edu04__stat-label">论文阅读</span>
            </div>
            <div className="edu04__stat">
              <span className="edu04__stat-value">8</span>
              <span className="edu04__stat-label">实验设计</span>
            </div>
            <div className="edu04__stat">
              <span className="edu04__stat-value">42h</span>
              <span className="edu04__stat-label">学习时长</span>
            </div>
          </Reveal>
        )}
      </div>

      {/* 底部标识 */}
      <div className="edu04__footer">
        <span>成长激励 · 持续进步</span>
      </div>
    </section>
  );
}

const def: ChapterDef = {
  id: 'edu04',
  title: '成长系统',
  eyebrow: '04',
  steps: 4,
  theme: 'ink',
  Component: Edu04,
};

export default def;
