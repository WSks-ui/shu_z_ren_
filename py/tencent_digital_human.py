# -*- coding: utf-8 -*-
"""
腾讯智能数智人 API 封装
文档: https://cloud.tencent.com/document/product/1240/100385
"""

import json
import time
import hashlib
import hmac
import base64
import asyncio
import websockets
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
import httpx
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field

# ==================== 配置 ====================

TENCENT_BASE_URL = "https://gw.tvs.qq.com"
TENCENT_WS_URL = "wss://gw.tvs.qq.com"

# 用户提供的认证信息
TENCENT_CONFIG = {
    "appkey": "f10ffb9b56c6454a981e8417f6eb5255",
    "accesstoken": "f8e790d6a788490ba9bac5029640a24e",
    "virtualmanProjectId": "099e1687a4c44318afe2027321a43625",
    "sign": "2OYinqSQTk+6iJM2iUmHgcleVJ6180xNvFNZV5DOQQ7QHZOKMJfaj3EaY573m9MofaL6tebBUATKWLLqzBfdfR+kH0bMjQ5ggdiFN2EVckysJDyPmg8WDJv2FUrt3gMcrqfTR+fv41hQTLB4PaKd8A==",
}

# API 路径
API_PATHS = {
    "create_session": "/v2/ivh/sessionmanager/sessionmanagerservice/createsession",
    "create_session_by_asset": "/v2/ivh/sessionmanager/sessionmanagerservice/createsessionbyasset",
    "close_session": "/v2/ivh/sessionmanager/sessionmanagerservice/closesession",
    "start_session": "/v2/ivh/sessionmanager/sessionmanagerservice/startsession",
    "stat_session": "/v2/ivh/sessionmanager/sessionmanagerservice/statsession",
    "get_trtc_sign": "/v2/ivh/sessionmanager/sessionmanagerservice/gettrtcsign",
    "list_session_uin": "/v2/ivh/sessionmanager/sessionmanagerservice/listsessionofuin",
    "list_session_project": "/v2/ivh/sessionmanager/sessionmanagerservice/listsessionofprojectid",
    "update_session_config": "/v2/ivh/sessionmanager/sessionmanagerservice/updatesessionconfig",
    "command": "/v2/ivh/interactdriver/interactdriverservice/command",
    "ws_command": "/v2/ws/ivh/interactdriver/interactdriverservice/commandchannel",
}

# ==================== 数据模型 ====================

class CreateSessionRequest(BaseModel):
    """创建会话请求"""
    VirtualmanProjectId: str = Field(default=TENCENT_CONFIG["virtualmanProjectId"])
    SessionDescription: str = Field(default="教育数字人会话")
    DriverType: int = Field(default=1, description="1=文本驱动, 3=音频驱动")
    VideoProfile: str = Field(default="720p")
    Protocol: str = Field(default="webrtc", description="webrtc或trtc")


class DriveTextRequest(BaseModel):
    """文本驱动请求"""
    SessionId: str
    Text: str
    Interrupt: bool = Field(default=False, description="是否打断当前播放")


class DriveAudioRequest(BaseModel):
    """音频驱动请求"""
    SessionId: str
    AudioData: str = Field(description="Base64编码的音频数据")
    AudioType: str = Field(default="wav")
    Interrupt: bool = Field(default=False)


class EmotionDriveRequest(BaseModel):
    """情绪驱动请求"""
    SessionId: str
    Emotion: str = Field(description="情绪类型: happy, sad, angry, neutral等")
    Intensity: float = Field(default=0.5, ge=0.0, le=1.0)


# ==================== 腾讯数智人客户端 ====================

class TencentDigitalHumanClient:
    """腾讯智能数智人客户端"""

    def __init__(self):
        self.config = TENCENT_CONFIG
        self.base_url = TENCENT_BASE_URL
        self.ws_url = TENCENT_WS_URL
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.active_sessions: Dict[str, Dict] = {}
        self.ws_connections: Dict[str, websockets.WebSocketClientProtocol] = {}

    def _build_auth_params(self) -> Dict[str, str]:
        """构建认证参数"""
        return {
            "appkey": self.config["appkey"],
            "accesstoken": self.config["accesstoken"],
            "sign": self.config["sign"],
        }

    def _build_url(self, path: str, use_ws: bool = False) -> str:
        """构建完整URL"""
        base = self.ws_url if use_ws else self.base_url
        auth_params = self._build_auth_params()
        query = "&".join([f"{k}={v}" for k, v in auth_params.items()])
        return f"{base}{path}?{query}"

    async def create_session(
        self,
        driver_type: int = 1,
        protocol: str = "webrtc",
        video_profile: str = "720p",
        description: str = "教育数字人会话"
    ) -> Dict[str, Any]:
        """
        创建会话

        Args:
            driver_type: 驱动类型 (1=文本, 3=音频)
            protocol: 协议类型 (webrtc/trtc)
            video_profile: 视频质量
            description: 会话描述

        Returns:
            包含 SessionId 和播放地址的响应
        """
        url = self._build_url(API_PATHS["create_session"])

        payload = {
            "VirtualmanProjectId": self.config["virtualmanProjectId"],
            "SessionDescription": description,
            "DriverType": driver_type,
            "VideoProfile": video_profile,
            "Protocol": protocol,
        }

        try:
            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()

            if result.get("ErrCode") == 0:
                session_id = result.get("SessionId")
                self.active_sessions[session_id] = {
                    "driver_type": driver_type,
                    "protocol": protocol,
                    "created_at": time.time(),
                    "play_url": result.get("PlayUrl"),
                }
                return result
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"创建会话失败: {result.get('ErrMsg', '未知错误')}"
                )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")

    async def create_session_by_asset(
        self,
        asset_vk: str,
        driver_type: int = 1,
        protocol: str = "webrtc"
    ) -> Dict[str, Any]:
        """
        使用资产创建会话

        Args:
            asset_vk: 资产虚拟人Key
            driver_type: 驱动类型
            protocol: 协议类型
        """
        url = self._build_url(API_PATHS["create_session_by_asset"])

        payload = {
            "VirtualmanProjectId": self.config["virtualmanProjectId"],
            "AssetVk": asset_vk,
            "DriverType": driver_type,
            "Protocol": protocol,
        }

        try:
            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()

            if result.get("ErrCode") == 0:
                session_id = result.get("SessionId")
                self.active_sessions[session_id] = {
                    "driver_type": driver_type,
                    "protocol": protocol,
                    "asset_vk": asset_vk,
                    "created_at": time.time(),
                }
                return result
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"创建会话失败: {result.get('ErrMsg', '未知错误')}"
                )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")

    async def start_session(self, session_id: str) -> Dict[str, Any]:
        """开始会话"""
        url = self._build_url(API_PATHS["start_session"])

        payload = {
            "SessionId": session_id,
        }

        try:
            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")

    async def close_session(self, session_id: str) -> Dict[str, Any]:
        """关闭会话"""
        url = self._build_url(API_PATHS["close_session"])

        payload = {
            "SessionId": session_id,
        }

        try:
            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()

            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
            if session_id in self.ws_connections:
                await self.ws_connections[session_id].close()
                del self.ws_connections[session_id]

            return result
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")

    async def stat_session(self, session_id: str) -> Dict[str, Any]:
        """查询会话状态"""
        url = self._build_url(API_PATHS["stat_session"])

        payload = {
            "SessionId": session_id,
        }

        try:
            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")

    async def drive_text(
        self,
        session_id: str,
        text: str,
        interrupt: bool = False
    ) -> Dict[str, Any]:
        """
        文本驱动

        Args:
            session_id: 会话ID
            text: 要播报的文本
            interrupt: 是否打断当前播放
        """
        url = self._build_url(API_PATHS["command"])

        payload = {
            "Header": {
                "SessionId": session_id,
                "MessageType": "DriveIntention",
            },
            "Payload": {
                "DriverType": 1,  # 文本驱动
                "Text": text,
                "Interrupt": interrupt,
            }
        }

        try:
            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")

    async def drive_audio(
        self,
        session_id: str,
        audio_data: str,
        audio_type: str = "wav",
        interrupt: bool = False
    ) -> Dict[str, Any]:
        """
        音频驱动

        Args:
            session_id: 会话ID
            audio_data: Base64编码的音频数据
            audio_type: 音频格式
            interrupt: 是否打断当前播放
        """
        url = self._build_url(API_PATHS["command"])

        payload = {
            "Header": {
                "SessionId": session_id,
                "MessageType": "DriveIntention",
            },
            "Payload": {
                "DriverType": 3,  # 音频驱动
                "AudioData": audio_data,
                "AudioType": audio_type,
                "Interrupt": interrupt,
            }
        }

        try:
            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")

    async def drive_emotion(
        self,
        session_id: str,
        emotion: str,
        intensity: float = 0.5
    ) -> Dict[str, Any]:
        """
        情绪驱动

        Args:
            session_id: 会话ID
            emotion: 情绪类型
            intensity: 情绪强度 (0.0-1.0)
        """
        # 情绪映射到动作/表情
        emotion_mapping = {
            "happy": {"Action": "smile", "Intensity": intensity},
            "sad": {"Action": "sad", "Intensity": intensity},
            "angry": {"Action": "angry", "Intensity": intensity},
            "neutral": {"Action": "neutral", "Intensity": 0.5},
            "surprised": {"Action": "surprise", "Intensity": intensity},
            "thinking": {"Action": "think", "Intensity": intensity},
            "encouraging": {"Action": "nod", "Intensity": intensity},
            "curious": {"Action": "tilt", "Intensity": intensity},
        }

        action_data = emotion_mapping.get(emotion, emotion_mapping["neutral"])

        url = self._build_url(API_PATHS["command"])

        payload = {
            "Header": {
                "SessionId": session_id,
                "MessageType": "DriveIntention",
            },
            "Payload": {
                "DriverType": 1,
                "Action": action_data.get("Action"),
                "Intensity": action_data.get("Intensity"),
            }
        }

        try:
            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")

    async def connect_websocket(self, session_id: str) -> bool:
        """
        连接WebSocket驱动通道

        Args:
            session_id: 会话ID

        Returns:
            是否连接成功
        """
        url = self._build_url(API_PATHS["ws_command"], use_ws=True)
        url = url.replace("wss://", "ws://")  # websockets库要求

        try:
            ws = await websockets.connect(url)
            self.ws_connections[session_id] = ws

            # 发送初始消息
            init_msg = {
                "Header": {
                    "SessionId": session_id,
                    "MessageType": "Connect",
                },
                "Payload": {}
            }
            await ws.send(json.dumps(init_msg))
            return True
        except Exception as e:
            print(f"WebSocket连接失败: {e}")
            return False

    async def send_ws_text(
        self,
        session_id: str,
        text: str,
        interrupt: bool = False
    ) -> bool:
        """通过WebSocket发送文本驱动"""
        if session_id not in self.ws_connections:
            return False

        ws = self.ws_connections[session_id]

        # 文本分块发送
        msg = {
            "Header": {
                "SessionId": session_id,
                "MessageType": "SEND_TEXT",
            },
            "Payload": {
                "Text": text,
                "Interrupt": interrupt,
            }
        }

        try:
            await ws.send(json.dumps(msg))
            return True
        except Exception as e:
            print(f"WebSocket发送失败: {e}")
            return False

    async def send_heartbeat(self, session_id: str) -> bool:
        """发送心跳"""
        if session_id not in self.ws_connections:
            return False

        ws = self.ws_connections[session_id]

        msg = {
            "Header": {
                "SessionId": session_id,
                "MessageType": "SEND_HEARTBEAT",
            },
            "Payload": {}
        }

        try:
            await ws.send(json.dumps(msg))
            return True
        except Exception:
            return False

    async def get_trtc_sign(self, session_id: str) -> Dict[str, Any]:
        """获取TRTC签名"""
        url = self._build_url(API_PATHS["get_trtc_sign"])

        payload = {
            "SessionId": session_id,
        }

        try:
            response = await self.http_client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")


# ==================== FastAPI 路由 ====================

router = APIRouter(prefix="/api/tencent_digital_human", tags=["Tencent Digital Human"])

# 全局客户端实例
client = TencentDigitalHumanClient()


@router.post("/create_session")
async def api_create_session(
    driver_type: int = Body(default=1),
    protocol: str = Body(default="webrtc"),
    video_profile: str = Body(default="720p")
):
    """创建数字人会话"""
    result = await client.create_session(
        driver_type=driver_type,
        protocol=protocol,
        video_profile=video_profile
    )
    return result


@router.post("/close_session")
async def api_close_session(session_id: str = Body(...)):
    """关闭数字人会话"""
    result = await client.close_session(session_id)
    return result


@router.post("/start_session")
async def api_start_session(session_id: str = Body(...)):
    """开始数字人会话"""
    result = await client.start_session(session_id)
    return result


@router.get("/stat_session/{session_id}")
async def api_stat_session(session_id: str):
    """查询会话状态"""
    result = await client.stat_session(session_id)
    return result


@router.post("/drive_text")
async def api_drive_text(
    session_id: str = Body(...),
    text: str = Body(...),
    interrupt: bool = Body(default=False)
):
    """文本驱动数字人"""
    result = await client.drive_text(session_id, text, interrupt)
    return result


@router.post("/drive_audio")
async def api_drive_audio(
    session_id: str = Body(...),
    audio_data: str = Body(...),
    audio_type: str = Body(default="wav"),
    interrupt: bool = Body(default=False)
):
    """音频驱动数字人"""
    result = await client.drive_audio(session_id, audio_data, audio_type, interrupt)
    return result


@router.post("/drive_emotion")
async def api_drive_emotion(
    session_id: str = Body(...),
    emotion: str = Body(...),
    intensity: float = Body(default=0.5)
):
    """情绪驱动数字人"""
    result = await client.drive_emotion(session_id, emotion, intensity)
    return result


@router.post("/connect_websocket")
async def api_connect_websocket(session_id: str = Body(...)):
    """连接WebSocket驱动通道"""
    success = await client.connect_websocket(session_id)
    return {"success": success, "session_id": session_id}


@router.get("/active_sessions")
async def api_get_active_sessions():
    """获取活跃会话列表"""
    return {
        "sessions": [
            {
                "session_id": sid,
                **info
            }
            for sid, info in client.active_sessions.items()
        ]
    }


@router.get("/health")
async def api_health():
    """健康检查"""
    return {
        "status": "ok",
        "config": {
            "appkey": client.config["appkey"][:8] + "...",
            "project_id": client.config["virtualmanProjectId"],
        },
        "active_sessions": len(client.active_sessions),
        "ws_connections": len(client.ws_connections),
    }
