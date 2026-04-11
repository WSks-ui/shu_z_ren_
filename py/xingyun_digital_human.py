# -*- coding: utf-8 -*-
"""
魔珐星云具身驱动 API 封装
文档: https://xingyun3d.com/
"""

import os
import time
import json
import hashlib
import httpx
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field

# ==================== 配置 ====================

XINGYUN_BASE_URL = "https://nebula-agent.xingyun3d.com"

# 魔珐星云配置
XINGYUN_CONFIG = {
    "app_id": "869cc917e55e42ffacb3abde578d597d",
    "app_secret": "3b226e202c07463cb5db3c4c4575c75f",
    "gateway_server": "https://nebula-agent.xingyun3d.com/user/v1/ttsa/session",
}


# ==================== 工具函数 ====================

def encode_with_md5(s: str) -> str:
    """计算 MD5"""
    m = hashlib.md5()
    m.update(s.encode('utf-8'))
    return m.hexdigest()


def build_auth_headers(app_id: str, app_secret: str, method: str, url: str, data: dict = None) -> Dict[str, str]:
    """
    构建认证请求头

    Args:
        app_id: 应用ID
        app_secret: 应用密钥
        method: HTTP方法 (GET/POST等)
        url: 请求路径 (不包含host)
        data: 请求体数据

    Returns:
        包含认证信息的请求头
    """
    if data is None:
        data = {}

    timestamp = int(time.time())
    # 将data转换为json字符串，key排序，去掉空格
    json_str = json.dumps(dict(data), sort_keys=True, ensure_ascii=False).replace(' ', '')

    # 计算签名: url_lowercase + method_lowercase + json_data + secret + timestamp
    sign_str = f"{url.lower()}{method.lower()}{json_str}{app_secret}{timestamp}"
    token = encode_with_md5(sign_str)

    return {
        "X-APP-ID": app_id,
        "X-TOKEN": token,
        "X-TIMESTAMP": str(timestamp),
        "Content-Type": "application/json",
    }


# ==================== 魔珐星云客户端 ====================

class XingYunDigitalHumanClient:
    """魔珐星云具身驱动客户端"""

    def __init__(self):
        self.config = XINGYUN_CONFIG
        self.base_url = XINGYUN_BASE_URL
        self.http_client = httpx.AsyncClient(timeout=30.0)

    def _get_config(self) -> Dict[str, str]:
        """获取前端SDK配置"""
        return {
            "appId": self.config["app_id"],
            "appSecret": self.config["app_secret"],
            "gatewayServer": self.config["gateway_server"],
        }

    async def get_ka_summary(self) -> Dict[str, Any]:
        """
        查询KA动作列表

        Returns:
            KA动作列表
        """
        url = "/user/v1/external/lite_ka_summary"
        headers = build_auth_headers(
            self.config["app_id"],
            self.config["app_secret"],
            "GET",
            url
        )

        try:
            full_url = f"{self.base_url}{url}"
            response = await self.http_client.get(full_url, headers=headers)
            response.raise_for_status()
            result = response.json()

            if result.get("error_code") == 0:
                return result
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"查询KA动作失败: {result.get('error_reason', '未知错误')}"
                )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")

    async def get_consume_record(self) -> Dict[str, Any]:
        """
        查询消耗记录

        Returns:
            消耗记录列表
        """
        url = "/user/v1/external/consume_record"
        headers = build_auth_headers(
            self.config["app_id"],
            self.config["app_secret"],
            "GET",
            url
        )

        try:
            full_url = f"{self.base_url}{url}"
            response = await self.http_client.get(full_url, headers=headers)
            response.raise_for_status()
            result = response.json()

            if result.get("error_code") == 0:
                return result
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"查询消耗记录失败: {result.get('error_reason', '未知错误')}"
                )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"HTTP请求失败: {str(e)}")


# ==================== FastAPI 路由 ====================

router = APIRouter(prefix="/api/xingyun_digital_human", tags=["XingYun Digital Human"])

# 全局客户端实例
client = XingYunDigitalHumanClient()


@router.get("/config")
async def api_get_config():
    """获取前端SDK配置"""
    return client._get_config()


@router.get("/ka_summary")
async def api_get_ka_summary():
    """查询KA动作列表"""
    result = await client.get_ka_summary()
    return result


@router.get("/consume_record")
async def api_get_consume_record():
    """查询消耗记录"""
    result = await client.get_consume_record()
    return result


@router.get("/health")
async def api_health():
    """健康检查"""
    return {
        "status": "ok",
        "config": {
            "app_id": client.config["app_id"][:8] + "...",
            "gateway_server": client.config["gateway_server"],
        },
    }
