import type { ChapterContext, ChapterDef } from '../types';
import { Reveal } from '../../shared/Reveal';
import './Edu06.css';

/**
 * Chapter 06 · 技术架构
 *
 * 口播主旨：
 *  「前后端分离，RAG知识检索，学术API集成」
 *
 * 节奏（4 步 / step 0..3）：
 *  0  标题
 *  1  前端技术栈
 *  2  后端技术栈
 *  3  外部服务集成
 */

function Edu06({ localStep }: ChapterContext) {
  const at = (n: number) => localStep >= n;

  return (
    <section className="edu06">
      {/* 背景网格 */}
      <div className="edu06__grid" aria-hidden />

      {/* 标题区 */}
      <div className="edu06__header">
        <Reveal kind="fade" duration={600} className="edu06__eyebrow">
          <span className="edu06__eyebrow-bar" />
          <span>06 · 技术架构</span>
          <span className="edu06__eyebrow-bar" />
        </Reveal>

        {at(0) && (
          <Reveal kind="blur" duration={900} delay={80} className="edu06__title">
            技术<span className="edu06__title-em">架构</span>
          </Reveal>
        )}
      </div>

      {/* 架构图 */}
      <div className="edu06__architecture">
        {/* Step 1: 前端 */}
        {at(1) && (
          <Reveal kind="rise" duration={720} delay={100} className="edu06__layer edu06__layer--frontend">
            <div className="edu06__layer-header">
              <span className="edu06__layer-badge">前端</span>
              <span className="edu06__layer-title">Vue.js 3 + Element Plus</span>
            </div>
            <div className="edu06__layer-items">
              <div className="edu06__item">3D 数字人 (魔珐星云SDK)</div>
              <div className="edu06__item">对话界面 (Markdown渲染)</div>
              <div className="edu06__item">教育功能面板 (成长/协作/情绪)</div>
            </div>
          </Reveal>
        )}

        {/* 连接线 */}
        {at(1) && at(2) && (
          <div className="edu06__connector">
            <span className="edu06__connector-text">HTTP / WebSocket / SSE</span>
          </div>
        )}

        {/* Step 2: 后端 */}
        {at(2) && (
          <Reveal kind="rise" duration={720} delay={100} className="edu06__layer edu06__layer--backend">
            <div className="edu06__layer-header">
              <span className="edu06__layer-badge">后端</span>
              <span className="edu06__layer-title">Python FastAPI</span>
            </div>
            <div className="edu06__layer-grid">
              <div className="edu06__module">education_api<br /><span>成长/协作</span></div>
              <div className="edu06__module">xingyun_digital_human<br /><span>数字人客户端</span></div>
              <div className="edu06__module">edu_knowledge_base<br /><span>RAG向量检索</span></div>
              <div className="edu06__module">affection_system<br /><span>情绪映射</span></div>
              <div className="edu06__module">academic_tools<br /><span>学术API</span></div>
              <div className="edu06__module">edu_storage<br /><span>SQLite持久化</span></div>
            </div>
          </Reveal>
        )}

        {/* Step 3: 外部服务 */}
        {at(3) && (
          <Reveal kind="rise" duration={720} delay={100} className="edu06__layer edu06__layer--external">
            <div className="edu06__layer-header">
              <span className="edu06__layer-badge">外部服务</span>
              <span className="edu06__layer-title">API 集成</span>
            </div>
            <div className="edu06__external-grid">
              <div className="edu06__external">
                <span className="edu06__external-icon">☁️</span>
                <span className="edu06__external-name">魔珐星云</span>
                <span className="edu06__external-desc">3D数字人渲染</span>
              </div>
              <div className="edu06__external">
                <span className="edu06__external-icon">📄</span>
                <span className="edu06__external-name">arXiv / Semantic Scholar</span>
                <span className="edu06__external-desc">学术论文检索</span>
              </div>
              <div className="edu06__external">
                <span className="edu06__external-icon">🔢</span>
                <span className="edu06__external-name">SimpleTex</span>
                <span className="edu06__external-desc">公式OCR识别</span>
              </div>
            </div>
          </Reveal>
        )}
      </div>

      {/* 底部标识 */}
      <div className="edu06__footer">
        <span>前后端分离 · RAG检索 · 学术API</span>
      </div>
    </section>
  );
}

const def: ChapterDef = {
  id: 'edu06',
  title: '技术架构',
  eyebrow: '06',
  steps: 4,
  theme: 'ink',
  Component: Edu06,
};

export default def;
