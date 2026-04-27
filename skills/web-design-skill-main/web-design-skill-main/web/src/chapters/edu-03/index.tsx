import type { ChapterContext, ChapterDef } from '../types';
import { Reveal } from '../../shared/Reveal';
import './Edu03.css';

/**
 * Chapter 03 · 五大教育技能
 *
 * 口播主旨：
 *  「苏格拉底式引导，培养独立思考能力」
 *
 * 节奏（5 步 / step 0..4）：
 *  0  标题
 *  1  科研助手 + 文献综述
 *  2  论文写作 + 虚拟导师
 *  3  数学助手
 *  4  共同特性
 */

function Edu03({ localStep }: ChapterContext) {
  const at = (n: number) => localStep >= n;

  const skills = [
    { id: 'research', icon: '🔬', title: '科研助手', desc: '实验设计、研究方法、数据分析', stages: '选题探索 → 假设构建 → 实验设计 → 数据分析' },
    { id: 'literature', icon: '📚', title: '文献综述', desc: 'PICO框架、PRISMA流程、检索策略', stages: '主题界定 → 检索策略 → 筛选评估 → 综合撰写' },
    { id: 'writing', icon: '✍️', title: '论文写作', desc: '结构规划、写作技巧、多格式引用', stages: '论文选题 → 框架搭建 → 内容撰写 → 润色定稿' },
    { id: 'tutor', icon: '🎓', title: '虚拟导师', desc: '知识讲解、学习规划、答疑解惑', stages: '学情诊断 → 知识讲解 → 练习巩固 → 总结提升' },
    { id: 'math', icon: '📐', title: '数学助手', desc: '公式识别、分步解题、错题分析', stages: '问题理解 → 方法选择 → 逐步求解 → 验证总结' },
  ];

  return (
    <section className="edu03">
      {/* 背景网格 */}
      <div className="edu03__grid" aria-hidden />

      {/* 标题区 */}
      <div className="edu03__header">
        <Reveal kind="fade" duration={600} className="edu03__eyebrow">
          <span className="edu03__eyebrow-bar" />
          <span>03 · 教育技能</span>
          <span className="edu03__eyebrow-bar" />
        </Reveal>

        {at(0) && (
          <Reveal kind="blur" duration={900} delay={80} className="edu03__title">
            五大专业<span className="edu03__title-em">教育技能</span>
          </Reveal>
        )}
      </div>

      {/* 技能卡片 */}
      <div className="edu03__skills">
        {at(1) && (
          <>
            <Reveal kind="rise" duration={720} delay={100} className="edu03__skill">
              <div className="edu03__skill-icon">{skills[0].icon}</div>
              <div className="edu03__skill-content">
                <div className="edu03__skill-title">{skills[0].title}</div>
                <div className="edu03__skill-desc">{skills[0].desc}</div>
                <div className="edu03__skill-stages">{skills[0].stages}</div>
              </div>
            </Reveal>
            <Reveal kind="rise" duration={720} delay={180} className="edu03__skill">
              <div className="edu03__skill-icon">{skills[1].icon}</div>
              <div className="edu03__skill-content">
                <div className="edu03__skill-title">{skills[1].title}</div>
                <div className="edu03__skill-desc">{skills[1].desc}</div>
                <div className="edu03__skill-stages">{skills[1].stages}</div>
              </div>
            </Reveal>
          </>
        )}

        {at(2) && (
          <>
            <Reveal kind="rise" duration={720} delay={100} className="edu03__skill">
              <div className="edu03__skill-icon">{skills[2].icon}</div>
              <div className="edu03__skill-content">
                <div className="edu03__skill-title">{skills[2].title}</div>
                <div className="edu03__skill-desc">{skills[2].desc}</div>
                <div className="edu03__skill-stages">{skills[2].stages}</div>
              </div>
            </Reveal>
            <Reveal kind="rise" duration={720} delay={180} className="edu03__skill">
              <div className="edu03__skill-icon">{skills[3].icon}</div>
              <div className="edu03__skill-content">
                <div className="edu03__skill-title">{skills[3].title}</div>
                <div className="edu03__skill-desc">{skills[3].desc}</div>
                <div className="edu03__skill-stages">{skills[3].stages}</div>
              </div>
            </Reveal>
          </>
        )}

        {at(3) && (
          <Reveal kind="rise" duration={720} delay={100} className="edu03__skill edu03__skill--wide">
            <div className="edu03__skill-icon">{skills[4].icon}</div>
            <div className="edu03__skill-content">
              <div className="edu03__skill-title">{skills[4].title}</div>
              <div className="edu03__skill-desc">{skills[4].desc}</div>
              <div className="edu03__skill-stages">{skills[4].stages}</div>
            </div>
          </Reveal>
        )}
      </div>

      {/* Step 4: 共同特性 */}
      {at(4) && (
        <Reveal kind="fade" duration={600} delay={200} className="edu03__features">
          <div className="edu03__feature">
            <span className="edu03__feature-check">✓</span>
            <span>图片识别（公式/文献/笔记）</span>
          </div>
          <div className="edu03__feature">
            <span className="edu03__feature-check">✓</span>
            <span>阶段跳转指令</span>
          </div>
          <div className="edu03__feature">
            <span className="edu03__feature-check">✓</span>
            <span>番茄钟时间管理</span>
          </div>
          <div className="edu03__feature">
            <span className="edu03__feature-check">✓</span>
            <span>AI笔记生成</span>
          </div>
        </Reveal>
      )}

      {/* 底部标识 */}
      <div className="edu03__footer">
        <span>苏格拉底式引导 · 培养独立思考</span>
      </div>
    </section>
  );
}

const def: ChapterDef = {
  id: 'edu03',
  title: '教育技能',
  eyebrow: '03',
  steps: 5,
  theme: 'ink',
  Component: Edu03,
};

export default def;
