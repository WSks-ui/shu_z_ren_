# -*- coding: utf-8 -*-
"""
教育数字人系统 API
包含成长系统、协作记录、情绪状态等数据的持久化接口
"""

import json
import os
from pathlib import Path
from fastapi import APIRouter, Body, HTTPException
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
