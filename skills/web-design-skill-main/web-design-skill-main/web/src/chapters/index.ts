import type { ChapterDef } from './types';
import Opening from './01-opening';
import Video from './02-video';
import CorePoint from './03-core-point';
import Role from './04-role';
import Workflow from './05-workflow';
import AntiAi from './06-anti-ai';
import Oklch from './07-oklch';
import Restraint from './08-restraint';
import Verification from './09-verification';
import ToSkill from './10-to-skill';
import SkillChanges from './11-skill-changes';
import References from './12-references';
import Closing from './13-closing';
import Outro from './14-outro';

// 教育数字人演示章节
import Edu01 from './edu-01';
import Edu02 from './edu-02';
import Edu03 from './edu-03';
import Edu04 from './edu-04';
import Edu05 from './edu-05';
import Edu06 from './edu-06';
import Edu07 from './edu-07';

/**
 * 章节注册表 —— 顺序即播放顺序。
 * 原有章节保留，教育演示章节追加。
 */

// 原有章节（保留）
export const chapters: ChapterDef[] = [
  Opening,
  Video,
  CorePoint,
  Role,
  Workflow,
  AntiAi,
  Oklch,
  Restraint,
  Verification,
  ToSkill,
  SkillChanges,
  References,
  Closing,
  Outro,
];

// 教育数字人演示章节（独立导出）
export const eduChapters: ChapterDef[] = [
  Edu01,
  Edu02,
  Edu03,
  Edu04,
  Edu05,
  Edu06,
  Edu07,
];