# -*- coding: utf-8 -*-
"""
教育数字人系统 API
包含成长系统、协作记录、情绪状态、对话系统、语音交互等功能的持久化接口
"""

import json
import os
import httpx
import base64
import asyncio
from pathlib import Path
from fastapi import APIRouter, Body, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

# 路由前缀
router = APIRouter(prefix="/api/education", tags=["Education Digital Human"])

# 数据存储目录
EDUCATION_DATA_DIR = Path(os.path.join(os.path.dirname(__file__), "..", "education_digital_human", "数据"))
EDUCATION_DATA_DIR.mkdir(parents=True, exist_ok=True)

GROWTH_DATA_FILE = EDUCATION_DATA_DIR / "growth_data.json"
COLLABORATION_DATA_FILE = EDUCATION_DATA_DIR / "collaboration_data.json"
ACHIEVEMENT_DATA_FILE = EDUCATION_DATA_DIR / "achievement_data.json"
CHAT_HISTORY_FILE = EDUCATION_DATA_DIR / "chat_history.json"

# 技能系统提示词
SKILL_PROMPTS = {
    "research-assistant": """你是一位专业的科研助手，专注于帮助研究人员进行学术研究。你的角色是协作者，而非替代者。

## 核心能力
- 文献检索与综述：帮助设计检索策略，选择合适的数据库
- 实验设计支持：帮助明确研究问题和假设，指导选择合适的研究方法
- 数据分析指导：帮助选择合适的统计方法，解释分析结果的含义

## 工作原则
- 引导式协作：通过提问帮助用户澄清思路，提供方法论层面的建议
- 学术诚信：明确标注 AI 生成的内容，提醒用户验证重要信息
- 批判性思维：讨论研究的局限性，提出可能的改进方向

请用专业但友好的语气回答问题，引导用户独立思考。""",

    "literature-review": """你是一位文献综述专家，帮助用户进行系统性文献综述和元分析。

## 核心能力
- 检索策略设计：帮助制定 PICO 框架，设计检索词和布尔逻辑
- 文献筛选与管理：协助制定纳入/排除标准，指导使用 PRISMA 流程图
- 质量评估：提供研究质量评估框架，帮助识别潜在偏倚

## PRISMA 声明提醒
在综述过程中，提醒用户遵循 PRISMA 声明的要求。

请用系统化的方法指导用户完成文献综述。""",

    "paper-writing": """你是一位学术论文写作指导专家，帮助用户撰写高质量的学术论文。

## 核心能力
- 论文结构规划：帮助设计论文框架和章节安排
- 写作技巧指导：提供学术写作的语言和风格建议
- 引用格式支持：支持 APA、MLA、Chicago、GB/T 7714、IEEE 等引用格式

## 写作原则
- 学术规范：确保论文符合学术写作规范
- 逻辑清晰：帮助用户理清论证逻辑
- 语言准确：提供专业的学术表达建议

请帮助用户逐步完善论文内容。""",

    "academic-tutoring": """你是一位虚拟导师，为学习者提供个性化的学习支持和答疑解惑。

## 核心能力
- 知识讲解：用通俗易懂的方式解释复杂概念
- 学习规划：帮助制定学习计划和目标
- 答疑解惑：回答学习过程中的各种问题

## 教学原则
- 因材施教：根据用户的背景调整讲解深度
- 启发式教学：通过提问引导用户思考
- 耐心细致：确保用户真正理解知识点

请用鼓励和引导的方式帮助用户学习。"""
}


# ==================== 数据模型 ====================

class GrowthStats(BaseModel):
    """成长统计"""
    conversations: int = 0
    papers_read: int = 0
    experiments_designed: int = 0
    papers_written: int = 0
    tutoring_sessions: int = 0
    hours_spent: float = 0.0


class GrowthSystem(BaseModel):
    """成长系统数据"""
    level: int = 1
    exp: int = 0
    totalExp: int = 0
    achievements: List[str] = []
    stats: GrowthStats = GrowthStats()


class CollaborationSession(BaseModel):
    """协作会话记录"""
    id: str
    type: str  # 'paper', 'experiment', 'review', 'tutoring'
    startTime: str
    endTime: Optional[str] = None
    aiContributions: List[Dict[str, Any]] = []
    humanContributions: List[Dict[str, Any]] = []
    summary: Optional[str] = None


class CollaborationRecords(BaseModel):
    """协作记录集合"""
    papers: List[CollaborationSession] = []
    experiments: List[CollaborationSession] = []
    reviews: List[CollaborationSession] = []
    sessions: List[CollaborationSession] = []


class Achievement(BaseModel):
    """成就"""
    id: str
    name: str
    description: str
    icon: str
    unlockedAt: Optional[str] = None


class EmotionState(BaseModel):
    """情绪状态"""
    current: str = "neutral"
    intensity: float = 0.5
    history: List[Dict[str, Any]] = []


# ==================== 辅助函数 ====================

def _read_json_file(file_path: Path, default: Any = None) -> Any:
    """安全读取 JSON 文件"""
    if not file_path.exists():
        return default
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"读取文件失败 {file_path}: {e}")
        return default


def _write_json_file(file_path: Path, data: Any) -> bool:
    """安全写入 JSON 文件"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"写入文件失败 {file_path}: {e}")
        return False


# ==================== 成长系统 API ====================

@router.get("/growth")
async def get_growth_data():
    """获取成长系统数据"""
    data = _read_json_file(GROWTH_DATA_FILE, {
        "level": 1,
        "exp": 0,
        "totalExp": 0,
        "achievements": [],
        "stats": {
            "conversations": 0,
            "papers_read": 0,
            "experiments_designed": 0,
            "papers_written": 0,
            "tutoring_sessions": 0,
            "hours_spent": 0.0
        }
    })
    return data


@router.post("/growth")
async def save_growth_data(data: Dict[str, Any] = Body(...)):
    """保存成长系统数据"""
    if _write_json_file(GROWTH_DATA_FILE, data):
        return {"status": "success", "message": "成长数据保存成功"}
    raise HTTPException(status_code=500, detail="保存成长数据失败")


@router.post("/growth/add_exp")
async def add_experience(amount: int = Body(..., embed=True)):
    """增加经验值"""
    data = _read_json_file(GROWTH_DATA_FILE, {
        "level": 1,
        "exp": 0,
        "totalExp": 0,
        "achievements": [],
        "stats": {}
    })

    data["exp"] = data.get("exp", 0) + amount
    data["totalExp"] = data.get("totalExp", 0) + amount

    # 计算升级 (每100经验升一级)
    exp_for_next = data["level"] * 100
    while data["exp"] >= exp_for_next:
        data["exp"] -= exp_for_next
        data["level"] += 1
        exp_for_next = data["level"] * 100

    if _write_json_file(GROWTH_DATA_FILE, data):
        return {
            "status": "success",
            "message": f"获得 {amount} 经验值",
            "newLevel": data["level"],
            "currentExp": data["exp"],
            "expForNext": exp_for_next
        }
    raise HTTPException(status_code=500, detail="保存成长数据失败")


@router.post("/growth/update_stats")
async def update_growth_stats(stats: Dict[str, Any] = Body(...)):
    """更新成长统计"""
    data = _read_json_file(GROWTH_DATA_FILE, {"level": 1, "exp": 0, "totalExp": 0, "achievements": [], "stats": {}})

    current_stats = data.get("stats", {})
    for key, value in stats.items():
        if isinstance(value, (int, float)):
            current_stats[key] = current_stats.get(key, 0) + value

    data["stats"] = current_stats

    if _write_json_file(GROWTH_DATA_FILE, data):
        return {"status": "success", "stats": current_stats}
    raise HTTPException(status_code=500, detail="保存统计数据失败")


# ==================== 成就系统 API ====================

@router.get("/achievements")
async def get_achievements():
    """获取成就列表和解锁状态"""
    data = _read_json_file(ACHIEVEMENT_DATA_FILE, {"unlocked": [], "history": []})

    # 定义所有成就
    all_achievements = [
        {"id": "first_chat", "name": "初次对话", "description": "完成第一次对话", "icon": "fa-comments"},
        {"id": "paper_reader", "name": "文献读者", "description": "阅读10篇文献", "icon": "fa-book"},
        {"id": "experiment_designer", "name": "实验设计师", "description": "设计5个实验方案", "icon": "fa-flask"},
        {"id": "paper_writer", "name": "论文写作者", "description": "完成论文写作协助", "icon": "fa-pen"},
        {"id": "level_5", "name": "进阶学者", "description": "达到5级", "icon": "fa-star"},
        {"id": "level_10", "name": "资深学者", "description": "达到10级", "icon": "fa-crown"},
        {"id": "collaboration_master", "name": "协作大师", "description": "完成20次人机协作", "icon": "fa-handshake"},
        {"id": "knowledge_seeker", "name": "知识探索者", "description": "使用所有教育技能", "icon": "fa-compass"}
    ]

    unlocked_ids = data.get("unlocked", [])

    for ach in all_achievements:
        ach["unlocked"] = ach["id"] in unlocked_ids
        if ach["unlocked"]:
            # 查找解锁时间
            for h in data.get("history", []):
                if h.get("id") == ach["id"]:
                    ach["unlockedAt"] = h.get("unlockedAt")
                    break

    return {"achievements": all_achievements, "unlockedCount": len(unlocked_ids)}


@router.post("/achievements/unlock")
async def unlock_achievement(achievement_id: str = Body(..., embed=True)):
    """解锁成就"""
    data = _read_json_file(ACHIEVEMENT_DATA_FILE, {"unlocked": [], "history": []})

    if achievement_id in data.get("unlocked", []):
        return {"status": "already_unlocked", "message": "成就已解锁"}

    data.setdefault("unlocked", []).append(achievement_id)
    data.setdefault("history", []).append({
        "id": achievement_id,
        "unlockedAt": datetime.now().isoformat()
    })

    if _write_json_file(ACHIEVEMENT_DATA_FILE, data):
        return {"status": "success", "message": f"成就 {achievement_id} 已解锁"}
    raise HTTPException(status_code=500, detail="保存成就数据失败")


# ==================== 协作记录 API ====================

@router.get("/collaboration")
async def get_collaboration_data():
    """获取协作记录数据"""
    data = _read_json_file(COLLABORATION_DATA_FILE, {
        "papers": [],
        "experiments": [],
        "reviews": [],
        "sessions": []
    })
    return data


@router.post("/collaboration")
async def save_collaboration_data(data: Dict[str, Any] = Body(...)):
    """保存协作记录数据"""
    if _write_json_file(COLLABORATION_DATA_FILE, data):
        return {"status": "success", "message": "协作记录保存成功"}
    raise HTTPException(status_code=500, detail="保存协作记录失败")


@router.post("/collaboration/start_session")
async def start_collaboration_session(session_type: str = Body(...), session_id: str = Body(...)):
    """开始新的协作会话"""
    data = _read_json_file(COLLABORATION_DATA_FILE, {
        "papers": [],
        "experiments": [],
        "reviews": [],
        "sessions": []
    })

    new_session = {
        "id": session_id,
        "type": session_type,
        "startTime": datetime.now().isoformat(),
        "endTime": None,
        "aiContributions": [],
        "humanContributions": [],
        "summary": None
    }

    # 根据类型添加到对应列表
    type_mapping = {
        "paper": "papers",
        "experiment": "experiments",
        "review": "reviews",
        "tutoring": "sessions"
    }

    list_key = type_mapping.get(session_type, "sessions")
    data.setdefault(list_key, []).append(new_session)

    if _write_json_file(COLLABORATION_DATA_FILE, data):
        return {"status": "success", "session": new_session}
    raise HTTPException(status_code=500, detail="创建会话失败")


@router.post("/collaboration/add_contribution")
async def add_collaboration_contribution(
    session_id: str = Body(...),
    session_type: str = Body(...),
    is_ai: bool = Body(...),
    content: str = Body(...),
    contribution_type: str = Body(default="text")
):
    """向协作会话添加贡献"""
    data = _read_json_file(COLLABORATION_DATA_FILE, {
        "papers": [],
        "experiments": [],
        "reviews": [],
        "sessions": []
    })

    # 找到对应的会话
    type_mapping = {
        "paper": "papers",
        "experiment": "experiments",
        "review": "reviews",
        "tutoring": "sessions"
    }

    list_key = type_mapping.get(session_type, "sessions")

    for session in data.get(list_key, []):
        if session.get("id") == session_id:
            contribution = {
                "content": content,
                "type": contribution_type,
                "timestamp": datetime.now().isoformat()
            }

            if is_ai:
                session.setdefault("aiContributions", []).append(contribution)
            else:
                session.setdefault("humanContributions", []).append(contribution)

            if _write_json_file(COLLABORATION_DATA_FILE, data):
                return {"status": "success", "message": "贡献已记录"}
            raise HTTPException(status_code=500, detail="保存贡献失败")

    raise HTTPException(status_code=404, detail="会话不存在")


@router.post("/collaboration/end_session")
async def end_collaboration_session(
    session_id: str = Body(...),
    session_type: str = Body(...),
    summary: str = Body(default="")
):
    """结束协作会话"""
    data = _read_json_file(COLLABORATION_DATA_FILE, {
        "papers": [],
        "experiments": [],
        "reviews": [],
        "sessions": []
    })

    type_mapping = {
        "paper": "papers",
        "experiment": "experiments",
        "review": "reviews",
        "tutoring": "sessions"
    }

    list_key = type_mapping.get(session_type, "sessions")

    for session in data.get(list_key, []):
        if session.get("id") == session_id:
            session["endTime"] = datetime.now().isoformat()
            session["summary"] = summary

            if _write_json_file(COLLABORATION_DATA_FILE, data):
                return {"status": "success", "message": "会话已结束"}
            raise HTTPException(status_code=500, detail="保存会话失败")

    raise HTTPException(status_code=404, detail="会话不存在")


@router.get("/collaboration/stats")
async def get_collaboration_stats():
    """获取协作统计信息"""
    data = _read_json_file(COLLABORATION_DATA_FILE, {
        "papers": [],
        "experiments": [],
        "reviews": [],
        "sessions": []
    })

    stats = {
        "totalSessions": 0,
        "totalAIContributions": 0,
        "totalHumanContributions": 0,
        "byType": {}
    }

    for key in ["papers", "experiments", "reviews", "sessions"]:
        sessions = data.get(key, [])
        stats["totalSessions"] += len(sessions)

        type_stats = {
            "count": len(sessions),
            "aiContributions": 0,
            "humanContributions": 0
        }

        for session in sessions:
            type_stats["aiContributions"] += len(session.get("aiContributions", []))
            type_stats["humanContributions"] += len(session.get("humanContributions", []))
            stats["totalAIContributions"] += len(session.get("aiContributions", []))
            stats["totalHumanContributions"] += len(session.get("humanContributions", []))

        stats["byType"][key] = type_stats

    # 计算协作比例
    total = stats["totalAIContributions"] + stats["totalHumanContributions"]
    if total > 0:
        stats["collaborationRatio"] = {
            "ai": round(stats["totalAIContributions"] / total * 100, 1),
            "human": round(stats["totalHumanContributions"] / total * 100, 1)
        }
    else:
        stats["collaborationRatio"] = {"ai": 0, "human": 0}

    return stats


# ==================== 情绪状态 API ====================

@router.get("/emotion/history")
async def get_emotion_history(limit: int = 100):
    """获取情绪历史记录"""
    growth_data = _read_json_file(GROWTH_DATA_FILE, {})
    history = growth_data.get("emotionHistory", [])[-limit:]
    return {"history": history}


@router.post("/emotion/record")
async def record_emotion(emotion: str = Body(...), intensity: float = Body(...)):
    """记录情绪状态"""
    data = _read_json_file(GROWTH_DATA_FILE, {
        "level": 1, "exp": 0, "totalExp": 0, "achievements": [], "stats": {},
        "emotionHistory": []
    })

    data.setdefault("emotionHistory", []).append({
        "emotion": emotion,
        "intensity": intensity,
        "timestamp": datetime.now().isoformat()
    })

    # 只保留最近500条记录
    if len(data["emotionHistory"]) > 500:
        data["emotionHistory"] = data["emotionHistory"][-500:]

    if _write_json_file(GROWTH_DATA_FILE, data):
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="保存情绪记录失败")


# ==================== 技能使用统计 API ====================

@router.post("/skills/record_usage")
async def record_skill_usage(skill_id: str = Body(...)):
    """记录技能使用"""
    data = _read_json_file(GROWTH_DATA_FILE, {
        "level": 1, "exp": 0, "totalExp": 0, "achievements": [], "stats": {},
        "skillUsage": {}
    })

    data.setdefault("skillUsage", {})
    data["skillUsage"][skill_id] = data["skillUsage"].get(skill_id, 0) + 1

    if _write_json_file(GROWTH_DATA_FILE, data):
        return {"status": "success", "usage": data["skillUsage"]}
    raise HTTPException(status_code=500, detail="保存技能使用记录失败")


@router.get("/skills/usage_stats")
async def get_skill_usage_stats():
    """获取技能使用统计"""
    data = _read_json_file(GROWTH_DATA_FILE, {"skillUsage": {}})
    return {"usageStats": data.get("skillUsage", {})}


# ==================== 健康检查 ====================

@router.get("/health")
async def education_health_check():
    """教育系统健康检查"""
    return {
        "status": "ok",
        "dataDir": str(EDUCATION_DATA_DIR),
        "files": {
            "growth": GROWTH_DATA_FILE.exists(),
            "collaboration": COLLABORATION_DATA_FILE.exists(),
            "achievement": ACHIEVEMENT_DATA_FILE.exists()
        }
    }


# ==================== 对话系统 API ====================

class ChatMessage(BaseModel):
    """对话消息"""
    role: str  # 'user' 或 'assistant'
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class ChatRequest(BaseModel):
    """对话请求"""
    message: str
    skill_id: Optional[str] = None
    session_id: Optional[str] = None
    history: List[Dict[str, str]] = []


class ChatResponse(BaseModel):
    """对话响应"""
    response: str
    emotion: Optional[str] = None
    exp_gained: int = 0


@router.post("/chat")
async def education_chat(request: ChatRequest = Body(...)):
    """
    教育对话接口
    自动添加技能系统提示词，调用后端 LLM API
    """
    # 获取系统设置
    try:
        from py.get_setting import get_settings_path
        import json as json_module

        settings_path = get_settings_path()
        if settings_path.exists():
            with open(settings_path, 'r', encoding='utf-8') as f:
                settings = json_module.load(f)
        else:
            settings = {}
    except Exception:
        settings = {}

    # 构建消息
    messages = []

    # 添加技能系统提示词
    if request.skill_id and request.skill_id in SKILL_PROMPTS:
        messages.append({
            "role": "system",
            "content": SKILL_PROMPTS[request.skill_id]
        })
    else:
        # 默认教育助手提示词
        messages.append({
            "role": "system",
            "content": """你是一位友好的教育数字人助手，帮助用户学习和研究。
请用简洁、专业的语言回答问题，必要时提供学习建议。"""
        })

    # 添加历史消息
    for msg in request.history[-10:]:  # 最多保留10条历史
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })

    # 添加当前消息
    messages.append({"role": "user", "content": request.message})

    # 获取 API 配置
    api_key = settings.get("api_key", "")
    base_url = settings.get("base_url", "https://api.openai.com/v1")
    model = settings.get("model", "gpt-3.5-turbo")

    if not api_key:
        # 模拟模式下也记录协作
        mock_response = "您好！我是教育数字人助手。要启用完整对话功能，请在主界面配置 API Key。\n\n您可以前往「设置」页面配置语言模型 API。"
        await update_chat_stats(request.skill_id)
        if request.session_id and request.skill_id:
            await _auto_record_collaboration(
                session_id=request.session_id,
                skill_id=request.skill_id,
                user_message=request.message,
                ai_message=mock_response
            )
        return ChatResponse(
            response=mock_response,
            emotion="neutral",
            exp_gained=5
        )

    # 调用 LLM API
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": settings.get("temperature", 0.7),
                    "max_tokens": settings.get("max_tokens", 2048)
                }
            )

            if response.status_code == 200:
                result = response.json()
                assistant_message = result.get("choices", [{}])[0].get("message", {}).get("content", "")

                # 分析情绪
                emotion = analyze_emotion(assistant_message)

                # 更新统计
                await update_chat_stats(request.skill_id)

                # 自动记录协作贡献
                if request.session_id and request.skill_id:
                    await _auto_record_collaboration(
                        session_id=request.session_id,
                        skill_id=request.skill_id,
                        user_message=request.message,
                        ai_message=assistant_message
                    )

                return ChatResponse(
                    response=assistant_message,
                    emotion=emotion,
                    exp_gained=10
                )
            else:
                error_detail = response.json().get("error", {}).get("message", "API 调用失败")
                raise HTTPException(status_code=response.status_code, detail=error_detail)

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="API 请求超时")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")


def analyze_emotion(text: str) -> str:
    """分析文本情绪"""
    emotion_keywords = {
        "happy": ["开心", "高兴", "太好了", "谢谢", "棒", "优秀", "成功", "happy", "great"],
        "thinking": ["为什么", "如何", "怎么", "思考", "分析", "研究", "why", "how"],
        "curious": ["什么是", "能不能", "可以吗", "有趣", "好奇", "what", "interesting"],
        "encouraging": ["加油", "继续", "不错", "很好", "努力", "good", "keep"],
        "neutral": []
    }

    text_lower = text.lower()
    for emotion, keywords in emotion_keywords.items():
        for keyword in keywords:
            if keyword in text_lower:
                return emotion

    return "neutral"


async def update_chat_stats(skill_id: str = None):
    """更新对话统计"""
    data = _read_json_file(GROWTH_DATA_FILE, {
        "level": 1, "exp": 0, "totalExp": 0, "achievements": [], "stats": {},
        "skillUsage": {}
    })

    # 更新对话次数
    stats = data.get("stats", {})
    stats["conversations"] = stats.get("conversations", 0) + 1
    data["stats"] = stats

    # 更新技能使用
    if skill_id:
        data.setdefault("skillUsage", {})
        data["skillUsage"][skill_id] = data["skillUsage"].get(skill_id, 0) + 1

    # 增加经验值
    data["exp"] = data.get("exp", 0) + 10
    data["totalExp"] = data.get("totalExp", 0) + 10

    # 检查升级
    exp_for_next = data["level"] * 100
    while data["exp"] >= exp_for_next:
        data["exp"] -= exp_for_next
        data["level"] += 1
        exp_for_next = data["level"] * 100

    _write_json_file(GROWTH_DATA_FILE, data)


# 技能ID到协作类型的映射
SKILL_TO_COLLAB_TYPE = {
    "research-assistant": "experiment",
    "literature-review": "review",
    "paper-writing": "paper",
    "academic-tutoring": "tutoring"
}

SKILL_TO_TITLE = {
    "research-assistant": "科研助手协作",
    "literature-review": "文献综述协作",
    "paper-writing": "论文写作协作",
    "academic-tutoring": "虚拟导师辅导"
}


async def _auto_record_collaboration(
    session_id: str,
    skill_id: str,
    user_message: str,
    ai_message: str
):
    """自动记录协作贡献到协作记录中"""
    collab_type = SKILL_TO_COLLAB_TYPE.get(skill_id, "sessions")
    type_mapping = {
        "paper": "papers",
        "experiment": "experiments",
        "review": "reviews",
        "tutoring": "sessions"
    }
    list_key = type_mapping.get(collab_type, "sessions")

    data = _read_json_file(COLLABORATION_DATA_FILE, {
        "papers": [], "experiments": [], "reviews": [], "sessions": []
    })

    # 查找已有会话或创建新会话
    found = False
    for session in data.get(list_key, []):
        if session.get("id") == session_id:
            found = True
            # 添加人类贡献
            session.setdefault("humanContributions", []).append({
                "content": user_message[:200],
                "type": "text",
                "timestamp": datetime.now().isoformat()
            })
            # 添加 AI 贡献
            session.setdefault("aiContributions", []).append({
                "content": ai_message[:200],
                "type": "text",
                "timestamp": datetime.now().isoformat()
            })
            # 更新标题（取用户第一条消息的前20个字）
            if not session.get("title") or session["title"] == "":
                session["title"] = user_message[:30] + ("..." if len(user_message) > 30 else "")
            break

    if not found:
        # 创建新会话
        new_session = {
            "id": session_id,
            "type": collab_type,
            "title": user_message[:30] + ("..." if len(user_message) > 30 else ""),
            "startTime": datetime.now().isoformat(),
            "endTime": None,
            "aiContributions": [{
                "content": ai_message[:200],
                "type": "text",
                "timestamp": datetime.now().isoformat()
            }],
            "humanContributions": [{
                "content": user_message[:200],
                "type": "text",
                "timestamp": datetime.now().isoformat()
            }],
            "summary": None
        }
        data.setdefault(list_key, []).append(new_session)

    _write_json_file(COLLABORATION_DATA_FILE, data)


@router.post("/collaboration/generate_summary")
async def generate_collaboration_summary(
    session_id: str = Body(...),
    session_type: str = Body(...)
):
    """为协作会话生成摘要"""
    data = _read_json_file(COLLABORATION_DATA_FILE, {
        "papers": [], "experiments": [], "reviews": [], "sessions": []
    })

    type_mapping = {
        "paper": "papers",
        "experiment": "experiments",
        "review": "reviews",
        "tutoring": "sessions"
    }
    list_key = type_mapping.get(session_type, "sessions")

    for session in data.get(list_key, []):
        if session.get("id") == session_id:
            # 收集所有贡献内容
            all_content = []
            for c in session.get("humanContributions", []):
                all_content.append(f"用户: {c.get('content', '')}")
            for c in session.get("aiContributions", []):
                all_content.append(f"AI: {c.get('content', '')}")

            # 生成简单摘要
            total = len(session.get("humanContributions", [])) + len(session.get("aiContributions", []))
            ai_count = len(session.get("aiContributions", []))
            human_count = len(session.get("humanContributions", []))

            summary = f"共 {total} 次交互（用户 {human_count} 次，AI {ai_count} 次）"
            if all_content:
                # 取第一条用户消息作为摘要开头
                first_msg = session.get("humanContributions", [{}])[0].get("content", "")
                if first_msg:
                    summary = f"关于「{first_msg[:50]}」的协作 - " + summary

            session["summary"] = summary

            # 计算持续时间
            if session.get("startTime"):
                try:
                    start = datetime.fromisoformat(session["startTime"].replace("Z", "+00:00"))
                    end = datetime.now()
                    duration_minutes = int((end - start).total_seconds() / 60)
                    session["duration"] = duration_minutes
                except Exception:
                    pass

            _write_json_file(COLLABORATION_DATA_FILE, data)
            return {"status": "success", "summary": summary}

    raise HTTPException(status_code=404, detail="会话不存在")


@router.get("/chat/history")
async def get_chat_history(session_id: str = None, limit: int = 50):
    """获取对话历史"""
    data = _read_json_file(CHAT_HISTORY_FILE, {"sessions": {}})

    if session_id:
        return {"history": data.get("sessions", {}).get(session_id, [])}

    # 返回所有会话的最新消息
    all_sessions = data.get("sessions", {})
    result = []
    for sid, messages in all_sessions.items():
        if messages:
            result.append({
                "session_id": sid,
                "last_message": messages[-1] if messages else None,
                "count": len(messages)
            })

    return {"sessions": sorted(result, key=lambda x: x.get("last_message", {}).get("timestamp", ""), reverse=True)[:limit]}


@router.post("/chat/save")
async def save_chat_history(
    session_id: str = Body(...),
    message: Dict[str, Any] = Body(...)
):
    """保存对话消息"""
    data = _read_json_file(CHAT_HISTORY_FILE, {"sessions": {}})

    data.setdefault("sessions", {})
    data["sessions"].setdefault(session_id, [])

    message["timestamp"] = datetime.now().isoformat()
    data["sessions"][session_id].append(message)

    # 限制每个会话最多保存100条消息
    if len(data["sessions"][session_id]) > 100:
        data["sessions"][session_id] = data["sessions"][session_id][-100:]

    _write_json_file(CHAT_HISTORY_FILE, data)
    return {"status": "success"}


@router.delete("/chat/history/{session_id}")
async def delete_chat_history(session_id: str):
    """删除对话历史"""
    data = _read_json_file(CHAT_HISTORY_FILE, {"sessions": {}})

    if session_id in data.get("sessions", {}):
        del data["sessions"][session_id]
        _write_json_file(CHAT_HISTORY_FILE, data)
        return {"status": "success"}

    raise HTTPException(status_code=404, detail="会话不存在")


# ==================== 技能提示词 API ====================

@router.get("/skills/prompts")
async def get_skill_prompts():
    """获取所有技能的系统提示词"""
    return {"prompts": SKILL_PROMPTS}


@router.get("/skills/{skill_id}/prompt")
async def get_skill_prompt(skill_id: str):
    """获取指定技能的系统提示词"""
    if skill_id in SKILL_PROMPTS:
        return {"skill_id": skill_id, "prompt": SKILL_PROMPTS[skill_id]}
    raise HTTPException(status_code=404, detail="技能不存在")


# ==================== 综合统计 API ====================

@router.get("/dashboard")
async def get_dashboard():
    """获取仪表盘数据"""
    growth_data = _read_json_file(GROWTH_DATA_FILE, {
        "level": 1, "exp": 0, "totalExp": 0, "achievements": [], "stats": {}
    })

    collab_data = _read_json_file(COLLABORATION_DATA_FILE, {
        "papers": [], "experiments": [], "reviews": [], "sessions": []
    })

    # 计算协作统计
    total_sessions = sum(len(collab_data.get(k, [])) for k in ["papers", "experiments", "reviews", "sessions"])

    return {
        "level": growth_data.get("level", 1),
        "exp": growth_data.get("exp", 0),
        "totalExp": growth_data.get("totalExp", 0),
        "achievements": len(growth_data.get("achievements", [])),
        "stats": growth_data.get("stats", {}),
        "collaborationSessions": total_sessions,
        "skillUsage": growth_data.get("skillUsage", {})
    }


# ==================== 语音交互 API ====================

class VoiceChatRequest(BaseModel):
    """语音对话请求"""
    audio_data: str  # base64 编码的音频数据
    skill_id: Optional[str] = None
    session_id: Optional[str] = None
    language: str = "zh"
    digital_human_type: str = "vrm"  # "vrm" 或 "tencent"
    tencent_session_id: Optional[str] = None  # 腾讯数智人会话 ID


class VoiceChatResponse(BaseModel):
    """语音对话响应"""
    text: str  # 识别的文本
    response: str  # AI回复文本
    audio_data: Optional[str] = None  # base64 编码的音频响应（仅 VRM 模式）
    emotion: Optional[str] = None
    exp_gained: int = 0
    digital_human_driven: bool = False  # 是否已驱动数字人播报


@router.post("/voice/chat")
async def voice_chat(request: VoiceChatRequest = Body(...)):
    """
    语音对话接口
    1. 接收音频数据，使用 Sherpa ASR 进行语音识别
    2. 调用 LLM 生成回复
    3. 根据数字人类型选择输出方式：
       - 腾讯数智人：直接驱动数字人播报，不返回 audio_data
       - VRM 数字人：使用 TTS 合成音频返回
    """
    try:
        # 1. 解码音频数据
        audio_bytes = base64.b64decode(request.audio_data)

        # 2. 语音识别 (Sherpa ASR)
        recognized_text = await _recognize_speech(audio_bytes, request.language)

        if not recognized_text or not recognized_text.strip():
            return VoiceChatResponse(
                text="",
                response="抱歉，我没有听清，请再说一次。",
                exp_gained=0
            )

        # 3. 调用 LLM 获取回复
        chat_response = await _get_llm_response(
            message=recognized_text,
            skill_id=request.skill_id,
            session_id=request.session_id
        )

        response_text = chat_response["response"]
        audio_data = None
        digital_human_driven = False

        # 4. 根据数字人类型处理语音输出
        if request.digital_human_type == "tencent" and request.tencent_session_id:
            # 腾讯数智人：直接驱动数字人播报，不生成独立音频
            try:
                await _drive_tencent_digital_human(
                    session_id=request.tencent_session_id,
                    text=response_text
                )
                digital_human_driven = True
            except Exception as e:
                print(f"驱动腾讯数智人失败: {e}")
                # 失败时降级到 TTS
                audio_data = await _synthesize_speech(response_text, request.language)
        else:
            # VRM 或无数字人：使用 TTS 合成音频
            audio_data = await _synthesize_speech(response_text, request.language)

        # 5. 保存对话历史
        if request.session_id:
            await _save_voice_chat_history(
                session_id=request.session_id,
                user_message=recognized_text,
                assistant_message=response_text,
                skill_id=request.skill_id
            )

        return VoiceChatResponse(
            text=recognized_text,
            response=response_text,
            audio_data=audio_data,
            emotion=chat_response.get("emotion"),
            exp_gained=chat_response.get("exp_gained", 10),
            digital_human_driven=digital_human_driven
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"语音对话失败: {str(e)}")


@router.post("/voice/recognize")
async def voice_recognize(request: Dict[str, Any] = Body(...)):
    """
    单独的语音识别接口
    """
    try:
        audio_data = request.get("audio_data", "")
        language = request.get("language", "zh")
        audio_bytes = base64.b64decode(audio_data)
        text = await _recognize_speech(audio_bytes, language)
        return {"text": text, "success": True}
    except Exception as e:
        return {"text": "", "success": False, "error": str(e)}


@router.post("/voice/synthesize")
async def voice_synthesize(request: Dict[str, Any] = Body(...)):
    """
    单独的语音合成接口
    """
    try:
        text = request.get("text", "")
        language = request.get("language", "zh")
        engine = request.get("engine", "edge")
        voice_id = request.get("voice_id", "default")
        audio_bytes = await _synthesize_speech(text, language, engine, voice_id)
        return {"audio_data": audio_bytes, "success": True}
    except Exception as e:
        return {"audio_data": None, "success": False, "error": str(e)}


@router.websocket("/ws/voice")
async def websocket_voice_chat(websocket: WebSocket):
    """
    WebSocket 语音对话接口
    实现实时语音交互

    消息协议:
    - 客户端 -> 服务端:
      { "type": "audio", "data": "base64_audio", "language": "zh" }
      { "type": "text", "data": "文本消息", "skill_id": "...", "session_id": "..." }
      { "type": "config", "skill_id": "...", "session_id": "...", "digital_human_type": "vrm", "tencent_session_id": "..." }

    - 服务端 -> 客户端:
      { "type": "recognized", "text": "识别的文本" }
      { "type": "response", "text": "AI回复" }
      { "type": "audio", "data": "base64_audio" }  // 仅 VRM 模式
      { "type": "digital_human_driven", "success": true }  // 腾讯模式
      { "type": "emotion", "emotion": "happy" }
      { "type": "error", "message": "错误信息" }
    """
    await websocket.accept()

    session_config = {
        "skill_id": None,
        "session_id": "voice_" + datetime.now().strftime("%Y%m%d_%H%M%S"),
        "language": "zh",
        "digital_human_type": "vrm",
        "tencent_session_id": None
    }

    try:
        while True:
            # 接收消息
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")

            if msg_type == "config":
                # 更新会话配置
                session_config["skill_id"] = message.get("skill_id")
                session_config["session_id"] = message.get("session_id", session_config["session_id"])
                session_config["language"] = message.get("language", "zh")
                session_config["digital_human_type"] = message.get("digital_human_type", "vrm")
                session_config["tencent_session_id"] = message.get("tencent_session_id")
                await websocket.send_json({"type": "config", "status": "ok"})

            elif msg_type == "audio":
                # 语音识别
                audio_data = message.get("data", "")
                language = message.get("language", session_config["language"])

                try:
                    audio_bytes = base64.b64decode(audio_data)
                    recognized_text = await _recognize_speech(audio_bytes, language)

                    await websocket.send_json({
                        "type": "recognized",
                        "text": recognized_text
                    })

                    if recognized_text and recognized_text.strip():
                        # 获取 AI 回复
                        response = await _get_llm_response(
                            message=recognized_text,
                            skill_id=session_config["skill_id"],
                            session_id=session_config["session_id"]
                        )

                        # 发送回复文本
                        await websocket.send_json({
                            "type": "response",
                            "text": response["response"]
                        })

                        # 发送情绪
                        if response.get("emotion"):
                            await websocket.send_json({
                                "type": "emotion",
                                "emotion": response["emotion"]
                            })

                        # 合成语音
                        audio_response = await _synthesize_speech(response["response"], language)
                        await websocket.send_json({
                            "type": "audio",
                            "data": audio_response
                        })

                        # 保存历史
                        await _save_voice_chat_history(
                            session_id=session_config["session_id"],
                            user_message=recognized_text,
                            assistant_message=response["response"],
                            skill_id=session_config["skill_id"]
                        )

                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"语音处理失败: {str(e)}"
                    })

            elif msg_type == "text":
                # 直接处理文本消息
                text_data = message.get("data", "")

                try:
                    response = await _get_llm_response(
                        message=text_data,
                        skill_id=session_config["skill_id"],
                        session_id=session_config["session_id"]
                    )

                    await websocket.send_json({
                        "type": "response",
                        "text": response["response"]
                    })

                    # 合成语音
                    audio_response = await _synthesize_speech(
                        response["response"],
                        session_config["language"]
                    )
                    await websocket.send_json({
                        "type": "audio",
                        "data": audio_response
                    })

                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e)
                    })

    except WebSocketDisconnect:
        print(f"WebSocket 语音连接断开: {session_config['session_id']}")
    except Exception as e:
        print(f"WebSocket 错误: {e}")


# ==================== 辅助函数 ====================

async def _recognize_speech(audio_bytes: bytes, language: str = "zh") -> str:
    """使用 Sherpa ASR 进行语音识别"""
    try:
        from py.sherpa_asr import sherpa_recognize
        # 根据语言选择模型
        model_map = {
            "zh": "sherpa-onnx-sense-voice-zh-en-ja-ko-yue",
            "en": "sherpa-onnx-sense-voice-zh-en-ja-ko-yue",
            "ja": "sherpa-onnx-sense-voice-zh-en-ja-ko-yue",
            "ko": "sherpa-onnx-sense-voice-zh-en-ja-ko-yue",
            "yue": "sherpa-onnx-sense-voice-zh-en-ja-ko-yue"
        }
        model_name = model_map.get(language, "sherpa-onnx-sense-voice-zh-en-ja-ko-yue")
        text = await sherpa_recognize(audio_bytes, model_name)
        return text or ""
    except Exception as e:
        print(f"语音识别失败: {e}")
        raise RuntimeError(f"语音识别失败: {e}")


async def _synthesize_speech(
    text: str,
    language: str = "zh",
    engine: str = "edge",
    voice_id: str = "default"
) -> str:
    """使用 TTS 适配器合成语音，返回 base64 编码"""
    try:
        from py.tts_adapter import tts_adapter

        # 获取语音设置
        try:
            from py.get_setting import get_settings_path
            settings_path = get_settings_path()
            if settings_path.exists():
                with open(settings_path, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                    engine = settings.get("tts_engine", engine)
                    voice_id = settings.get("tts_voice", voice_id)
            else:
                settings = {}
        except Exception:
            settings = {}

        # 合成音频
        audio_bytes = await tts_adapter.synthesize(
            text=text,
            engine=engine,
            voice_id=voice_id,
            language=language
        )

        # 返回 base64 编码
        return base64.b64encode(audio_bytes).decode('utf-8')

    except Exception as e:
        print(f"语音合成失败: {e}")
        # 返回空字符串而不是抛出异常，允许文本对话继续
        return ""


async def _get_llm_response(
    message: str,
    skill_id: str = None,
    session_id: str = None
) -> Dict[str, Any]:
    """调用 LLM 获取回复"""
    # 获取系统设置
    try:
        from py.get_setting import get_settings_path
        settings_path = get_settings_path()
        if settings_path.exists():
            with open(settings_path, 'r', encoding='utf-8') as f:
                settings = json.load(f)
        else:
            settings = {}
    except Exception:
        settings = {}

    # 构建消息
    messages = []

    # 添加技能系统提示词
    if skill_id and skill_id in SKILL_PROMPTS:
        messages.append({
            "role": "system",
            "content": SKILL_PROMPTS[skill_id]
        })
    else:
        messages.append({
            "role": "system",
            "content": """你是一位友好的教育数字人助手，帮助用户学习和研究。
请用简洁、专业的语言回答问题，必要时提供学习建议。
由于是语音交互，请保持回复简洁，适合朗读。"""
        })

    # 添加用户消息
    messages.append({"role": "user", "content": message})

    # 获取 API 配置
    api_key = settings.get("api_key", "")
    base_url = settings.get("base_url", "https://api.openai.com/v1")
    model = settings.get("model", "gpt-3.5-turbo")

    if not api_key:
        # 模拟模式
        mock_response = "您好！我是教育数字人助手。要启用完整功能，请在主界面配置 API Key。"
        return {
            "response": mock_response,
            "emotion": "neutral",
            "exp_gained": 5
        }

    # 调用 LLM API
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": settings.get("temperature", 0.7),
                    "max_tokens": settings.get("max_tokens", 1024)  # 语音交互用较短的回复
                }
            )

            if response.status_code == 200:
                result = response.json()
                assistant_message = result.get("choices", [{}])[0].get("message", {}).get("content", "")

                # 分析情绪
                emotion = analyze_emotion(assistant_message)

                # 更新统计
                await update_chat_stats(skill_id)

                return {
                    "response": assistant_message,
                    "emotion": emotion,
                    "exp_gained": 10
                }
            else:
                error_detail = response.json().get("error", {}).get("message", "API 调用失败")
                raise Exception(error_detail)

    except httpx.TimeoutException:
        raise Exception("API 请求超时")
    except Exception as e:
        raise Exception(f"对话失败: {str(e)}")


async def _drive_tencent_digital_human(session_id: str, text: str) -> bool:
    """
    驱动腾讯数智人播报文本

    Args:
        session_id: 腾讯数智人会话 ID
        text: 要播报的文本

    Returns:
        是否成功驱动
    """
    try:
        from py.tencent_digital_human import client as tencent_client

        result = await tencent_client.drive_text(
            session_id=session_id,
            text=text,
            interrupt=True
        )

        # 检查是否成功
        if result.get("ErrCode") == 0:
            return True
        else:
            print(f"腾讯数智人驱动失败: {result.get('ErrMsg', '未知错误')}")
            return False

    except Exception as e:
        print(f"驱动腾讯数智人异常: {e}")
        return False


async def _save_voice_chat_history(
    session_id: str,
    user_message: str,
    assistant_message: str,
    skill_id: str = None
):
    """保存语音对话历史"""
    # 保存到聊天历史
    data = _read_json_file(CHAT_HISTORY_FILE, {"sessions": {}})

    data.setdefault("sessions", {})
    data["sessions"].setdefault(session_id, [])

    # 添加用户消息
    data["sessions"][session_id].append({
        "role": "user",
        "content": user_message,
        "timestamp": datetime.now().isoformat(),
        "type": "voice"
    })

    # 添加助手消息
    data["sessions"][session_id].append({
        "role": "assistant",
        "content": assistant_message,
        "timestamp": datetime.now().isoformat(),
        "type": "voice"
    })

    # 限制历史长度
    if len(data["sessions"][session_id]) > 100:
        data["sessions"][session_id] = data["sessions"][session_id][-100:]

    _write_json_file(CHAT_HISTORY_FILE, data)

    # 同时记录协作贡献
    if skill_id:
        await _auto_record_collaboration(
            session_id=session_id,
            skill_id=skill_id,
            user_message=user_message,
            ai_message=assistant_message
        )
