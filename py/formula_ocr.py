# -*- coding: utf-8 -*-
"""
手写公式识别模块
支持 SimpleTex API 进行公式 OCR 识别
"""

import base64
import aiohttp
import json
import os
from typing import Optional, Dict, Any
from io import BytesIO

# SimpleTex API 配置
SIMPLETEX_API_URL_STANDARD = "https://server.simpletex.cn/api/latex_ocr"
SIMPLETEX_API_URL_TURBO = "https://server.simpletex.cn/api/latex_ocr_turbo"
# API Key 从环境变量或 settings 中获取，不再硬编码
SIMPLETEX_API_KEY = os.environ.get("SIMPLETEX_API_KEY", "")


async def recognize_formula_simpletex(image_base64: str, api_key: Optional[str] = None, model: str = "standard") -> Dict[str, Any]:
    """
    使用 SimpleTex API 识别手写公式

    Args:
        image_base64: 图片的 base64 编码（不含 data:image/xxx;base64, 前缀）
        api_key: SimpleTex API Key，如果不提供则使用全局配置
        model: 模型类型，"standard" 或 "turbo"

    Returns:
        {
            "latex": "E = mc^2",
            "confidence": 0.95,
            "success": True,
            "error": None
        }
    """
    key = api_key or SIMPLETEX_API_KEY

    if not key:
        return {
            "latex": "",
            "confidence": 0,
            "success": False,
            "error": "未配置 SimpleTex API Key，请在设置中配置"
        }

    # 选择 API 地址
    api_url = SIMPLETEX_API_URL_TURBO if model == "turbo" else SIMPLETEX_API_URL_STANDARD

    headers = {
        "token": key
    }

    try:
        async with aiohttp.ClientSession() as session:
            # 使用 form-data 格式上传，字段名必须是 "file"
            form_data = aiohttp.FormData()
            form_data.add_field('file', base64.b64decode(image_base64), filename='image.png', content_type='image/png')

            async with session.post(
                api_url,
                headers=headers,
                data=form_data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    return {
                        "latex": "",
                        "confidence": 0,
                        "success": False,
                        "error": f"API 请求失败: {response.status} - {error_text}"
                    }

                result = await response.json()

                # SimpleTex 返回格式: {"status": true, "res": {"latex": "...", "conf": 0.95}}
                if result.get("status") and "res" in result:
                    latex = result["res"].get("latex", "")
                    conf = result["res"].get("conf", 0.9)  # 使用 API 返回的置信度
                    return {
                        "latex": latex,
                        "confidence": conf,
                        "success": True,
                        "error": None
                    }
                else:
                    return {
                        "latex": "",
                        "confidence": 0,
                        "success": False,
                        "error": f"识别失败: {result.get('message', '未知错误')}"
                    }

    except aiohttp.ClientError as e:
        return {
            "latex": "",
            "confidence": 0,
            "success": False,
            "error": f"网络请求错误: {str(e)}"
        }
    except Exception as e:
        return {
            "latex": "",
            "confidence": 0,
            "success": False,
            "error": f"识别过程出错: {str(e)}"
        }


async def recognize_formula_multimodal(image_base64: str, client, model: str = None) -> Dict[str, Any]:
    """
    使用多模态 LLM 作为 fallback 进行公式识别

    Args:
        image_base64: 图片的 base64 编码
        client: OpenAI 兼容客户端
        model: 模型名称

    Returns:
        识别结果字典
    """
    if not client:
        return {
            "latex": "",
            "confidence": 0,
            "success": False,
            "error": "多模态客户端未配置"
        }

    try:
        # 构建多模态消息
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "请识别图片中的数学公式，只返回 LaTeX 格式的公式代码，不要有任何其他说明文字。如果是多个公式，用换行分隔。"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{image_base64}"
                        }
                    }
                ]
            }
        ]

        model_name = model or "gpt-4o"

        response = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=500
        )

        latex = response.choices[0].message.content.strip()

        # 清理可能的 markdown 代码块标记
        if latex.startswith("```"):
            lines = latex.split("\n")
            latex = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        return {
            "latex": latex,
            "confidence": 0.85,
            "success": True,
            "error": None
        }

    except Exception as e:
        return {
            "latex": "",
            "confidence": 0,
            "success": False,
            "error": f"多模态识别出错: {str(e)}"
        }


async def recognize_formula(
    image_base64: str,
    api_key: Optional[str] = None,
    model: str = "standard",
    fallback_client=None,
    fallback_model: str = None
) -> Dict[str, Any]:
    """
    手写公式识别主入口

    优先使用 SimpleTex API，失败时回退到多模态 LLM

    Args:
        image_base64: 图片的 base64 编码（不含前缀）
        api_key: SimpleTex API Key
        model: 模型类型，"standard" 或 "turbo"
        fallback_client: 多模态 LLM 客户端（回退用）
        fallback_model: 回退模型名称

    Returns:
        {
            "latex": "E = mc^2",
            "confidence": 0.95,
            "success": True,
            "error": None,
            "method": "simpletex" | "multimodal"
        }
    """
    # 1. 尝试 SimpleTex API
    if api_key or SIMPLETEX_API_KEY:
        result = await recognize_formula_simpletex(image_base64, api_key, model)
        if result["success"]:
            result["method"] = "simpletex"
            return result

    # 2. 回退到多模态 LLM
    if fallback_client:
        result = await recognize_formula_multimodal(image_base64, fallback_client, fallback_model)
        if result["success"]:
            result["method"] = "multimodal"
            return result

    # 3. 都失败了
    return {
        "latex": "",
        "confidence": 0,
        "success": False,
        "error": "公式识别失败：未配置 SimpleTex API Key 且无可用的多模态模型",
        "method": None
    }


def strip_base64_prefix(data_url: str) -> str:
    """
    去除 base64 数据 URL 的前缀

    "data:image/png;base64,xxxxx" -> "xxxxx"
    """
    if data_url.startswith("data:"):
        # 格式: data:image/png;base64,xxxxx
        comma_index = data_url.find(",")
        if comma_index != -1:
            return data_url[comma_index + 1:]
    return data_url


# 工具定义（用于 agent 调用）
formula_ocr_tool = {
    "type": "function",
    "function": {
        "name": "recognize_formula",
        "description": "识别图片中的手写数学公式，返回 LaTeX 格式代码",
        "parameters": {
            "type": "object",
            "properties": {
                "image_url": {
                    "type": "string",
                    "description": "包含手写公式的图片 URL 或 base64 数据"
                }
            },
            "required": ["image_url"]
        }
    }
}
