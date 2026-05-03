# -*- coding: utf-8 -*-
"""
数字人集群对话编排引擎
控制多个 LLM 实例的发言顺序、内容关联、终止条件
"""

import json
import time
import os
import httpx
import asyncio
from typing import Dict, Any, List, Optional, AsyncGenerator

from py.cluster_roles import CLUSTER_ROLES, CLUSTER_MODES
from py.education_api import get_global_http_client, analyze_emotion
from py.get_setting import load_settings, USER_DATA_DIR


class ClusterOrchestrator:
    """集群对话编排器"""

    def __init__(self, mode: str, role_ids: List[str], max_rounds: int = 3):
        self.mode = mode
        self.role_ids = role_ids
        self.max_rounds = max_rounds
        self.history: List[Dict[str, Any]] = []
        self.current_round = 0
        self._interrupted = False
        self._interrupt_message = ""

        # 好感度矩阵：{ "innovator": { "skeptic": 50, "integrator": 50 }, ... }
        # 值范围 0-100，50 为中性
        self.affection_matrix: Dict[str, Dict[str, int]] = {}
        self._init_affection_matrix()

    def interrupt(self, message: str):
        """用户插话中断"""
        self._interrupted = True
        self._interrupt_message = message

    async def run_discussion(
        self,
        topic: str,
        user_input: str = "",
        history: List[Dict[str, Any]] = None,
        session_id: str = ""
    ) -> AsyncGenerator[str, None]:
        """执行讨论，返回 SSE 事件流"""

        if history:
            self.history = history

        self._session_id = session_id or f"cluster-{int(time.time())}"
        self._topic = topic
        self._created_at = time.time()

        mode_config = CLUSTER_MODES.get(self.mode)
        if not mode_config:
            yield f"data: {json.dumps({'type': 'error', 'message': f'未知模式: {self.mode}'}, ensure_ascii=False)}\n\n"
            return

        # 验证角色数量
        min_roles = mode_config["min_roles"]
        max_roles = mode_config["max_roles"]
        if len(self.role_ids) < min_roles:
            yield f"data: {json.dumps({'type': 'error', 'message': f'{mode_config["name"]}至少需要{min_roles}个角色'}, ensure_ascii=False)}\n\n"
            return
        if len(self.role_ids) > max_roles:
            yield f"data: {json.dumps({'type': 'error', 'message': f'{mode_config["name"]}最多支持{max_roles}个角色'}, ensure_ascii=False)}\n\n"
            return

        # 限制最大轮次
        effective_max_rounds = min(self.max_rounds, mode_config["max_rounds"])

        if self.mode == "roundtable":
            async for event in self._roundtable(topic, user_input, effective_max_rounds):
                yield event
        elif self.mode == "debate":
            async for event in self._debate(topic, user_input, effective_max_rounds):
                yield event
        elif self.mode == "consultation":
            async for event in self._consultation(topic, user_input):
                yield event

        # 所有模式结束后生成讨论总结
        summary = ""
        if self.history:
            summary = await self._generate_summary(topic, self.history)
            yield f"data: {json.dumps({'type': 'summary', 'content': summary}, ensure_ascii=False)}\n\n"

        # 保存讨论记录到数据库
        await self._save_session(topic, self._session_id, summary)

        yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

    async def _roundtable(
        self,
        topic: str,
        user_input: str,
        max_rounds: int
    ) -> AsyncGenerator[str, None]:
        """圆桌讨论：按角色顺序发言，可引用前人观点"""

        for round_num in range(1, max_rounds + 1):
            self.current_round = round_num

            # 检查中断
            if self._interrupted:
                user_msg = self._interrupt_message
                self._interrupted = False
                self._interrupt_message = ""

                yield f"data: {json.dumps({'type': 'interrupt', 'message': user_msg}, ensure_ascii=False)}\n\n"

                # 所有角色依次回应用户插话
                for role_id in self.role_ids:
                    role = CLUSTER_ROLES.get(role_id)
                    if not role:
                        continue

                    yield f"data: {json.dumps({'type': 'role_start', 'role_id': role_id, 'role_name': role['name'], 'round': round_num, 'color': role['color'], 'interrupt_response': True}, ensure_ascii=False)}\n\n"

                    system_prompt = self._build_interrupt_response_prompt(role_id, user_msg, topic)
                    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}]

                    full_response = ""
                    async for chunk in self._call_llm_stream(messages):
                        if chunk:
                            full_response += chunk
                            yield f"data: {json.dumps({'type': 'role_chunk', 'role_id': role_id, 'content': chunk}, ensure_ascii=False)}\n\n"

                    emotion = analyze_emotion(full_response)
                    yield f"data: {json.dumps({'type': 'role_end', 'role_id': role_id, 'emotion': emotion}, ensure_ascii=False)}\n\n"

                    self.history.append({
                        "role": role["name"],
                        "role_id": role_id,
                        "content": full_response,
                        "round": round_num,
                        "interrupt_response": True
                    })

                # 插话回应完毕，将用户消息作为后续讨论的 user_input
                user_input = user_msg

            yield f"data: {json.dumps({'type': 'round_start', 'round': round_num}, ensure_ascii=False)}\n\n"

            round_responses = []

            for role_id in self.role_ids:
                role = CLUSTER_ROLES.get(role_id)
                if not role:
                    continue

                # 发送角色开始事件
                yield f"data: {json.dumps({'type': 'role_start', 'role_id': role_id, 'role_name': role['name'], 'round': round_num, 'color': role['color']}, ensure_ascii=False)}\n\n"

                # 构建角色提示词
                system_prompt = self._build_role_prompt(role_id, topic, round_responses, user_input)
                messages = self._build_messages(system_prompt, topic, user_input, round_responses)

                # 流式调用 LLM
                full_response = ""
                async for chunk in self._call_llm_stream(messages):
                    if chunk:
                        full_response += chunk
                        yield f"data: {json.dumps({'type': 'role_chunk', 'role_id': role_id, 'content': chunk}, ensure_ascii=False)}\n\n"

                # 情绪分析
                emotion = analyze_emotion(full_response)

                # 更新好感度矩阵
                self.update_affection_from_response(role_id, full_response)

                # 发送角色结束事件
                yield f"data: {json.dumps({'type': 'role_end', 'role_id': role_id, 'emotion': emotion}, ensure_ascii=False)}\n\n"

                # 记录到历史
                round_responses.append({
                    "role_id": role_id,
                    "role_name": role["name"],
                    "content": full_response,
                    "emotion": emotion
                })
                self.history.append({
                    "role": role["name"],
                    "role_id": role_id,
                    "content": full_response,
                    "round": round_num
                })

            # 每轮结束发送好感度更新事件
            yield f"data: {json.dumps({'type': 'affection_update', 'matrix': self.affection_matrix}, ensure_ascii=False)}\n\n"

            yield f"data: {json.dumps({'type': 'round_end', 'round': round_num}, ensure_ascii=False)}\n\n"

    async def _debate(
        self,
        topic: str,
        user_input: str,
        max_rounds: int
    ) -> AsyncGenerator[str, None]:
        """辩论模式：正反方交替发言"""

        # 辩论模式固定 2 个角色
        pro_role_id = self.role_ids[0]  # 正方
        con_role_id = self.role_ids[1]  # 反方

        for round_num in range(1, max_rounds + 1):
            self.current_round = round_num

            if self._interrupted:
                user_msg = self._interrupt_message
                self._interrupted = False
                self._interrupt_message = ""

                yield f"data: {json.dumps({'type': 'interrupt', 'message': user_msg}, ensure_ascii=False)}\n\n"

                # 正反方依次回应用户插话
                for role_id, stance in [(pro_role_id, "正方"), (con_role_id, "反方")]:
                    role = CLUSTER_ROLES.get(role_id)
                    if not role:
                        continue

                    yield f"data: {json.dumps({'type': 'role_start', 'role_id': role_id, 'role_name': role['name'], 'round': round_num, 'stance': stance, 'color': role['color'], 'interrupt_response': True}, ensure_ascii=False)}\n\n"

                    system_prompt = self._build_interrupt_response_prompt(role_id, user_msg, topic)
                    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}]

                    full_response = ""
                    async for chunk in self._call_llm_stream(messages):
                        if chunk:
                            full_response += chunk
                            yield f"data: {json.dumps({'type': 'role_chunk', 'role_id': role_id, 'content': chunk}, ensure_ascii=False)}\n\n"

                    emotion = analyze_emotion(full_response)
                    yield f"data: {json.dumps({'type': 'role_end', 'role_id': role_id, 'emotion': emotion}, ensure_ascii=False)}\n\n"

                    self.history.append({
                        "role": role["name"],
                        "role_id": role_id,
                        "stance": stance,
                        "content": full_response,
                        "round": round_num,
                        "interrupt_response": True
                    })

                user_input = user_msg

            yield f"data: {json.dumps({'type': 'round_start', 'round': round_num}, ensure_ascii=False)}\n\n"

            round_responses = []

            # 正方发言
            async for event in self._debate_role_turn(
                pro_role_id, topic, round_num, "正方",
                round_responses, user_input
            ):
                yield event

            # 反方反驳
            async for event in self._debate_role_turn(
                con_role_id, topic, round_num, "反方",
                round_responses, user_input
            ):
                yield event

            # 每轮结束发送好感度更新事件
            yield f"data: {json.dumps({'type': 'affection_update', 'matrix': self.affection_matrix}, ensure_ascii=False)}\n\n"

            yield f"data: {json.dumps({'type': 'round_end', 'round': round_num}, ensure_ascii=False)}\n\n"

    async def _debate_role_turn(
        self,
        role_id: str,
        topic: str,
        round_num: int,
        stance: str,
        round_responses: list,
        user_input: str
    ) -> AsyncGenerator[str, None]:
        """辩论中单个角色的发言回合"""

        role = CLUSTER_ROLES.get(role_id)
        if not role:
            return

        yield f"data: {json.dumps({'type': 'role_start', 'role_id': role_id, 'role_name': role['name'], 'round': round_num, 'stance': stance, 'color': role['color']}, ensure_ascii=False)}\n\n"

        # 构建辩论提示词
        system_prompt = self._build_debate_prompt(role_id, stance, topic, round_responses)
        messages = self._build_messages(system_prompt, topic, user_input, round_responses)

        full_response = ""
        async for chunk in self._call_llm_stream(messages):
            if chunk:
                full_response += chunk
                yield f"data: {json.dumps({'type': 'role_chunk', 'role_id': role_id, 'content': chunk}, ensure_ascii=False)}\n\n"

        emotion = analyze_emotion(full_response)

        # 更新好感度矩阵
        self.update_affection_from_response(role_id, full_response)

        yield f"data: {json.dumps({'type': 'role_end', 'role_id': role_id, 'emotion': emotion}, ensure_ascii=False)}\n\n"

        round_responses.append({
            "role_id": role_id,
            "role_name": role["name"],
            "stance": stance,
            "content": full_response,
            "emotion": emotion
        })
        self.history.append({
            "role": role["name"],
            "role_id": role_id,
            "stance": stance,
            "content": full_response,
            "round": round_num
        })

    async def _consultation(
        self,
        topic: str,
        user_input: str
    ) -> AsyncGenerator[str, None]:
        """会诊模式：各角色独立并行回答，然后顺序输出"""

        yield f"data: {json.dumps({'type': 'round_start', 'round': 1}, ensure_ascii=False)}\n\n"

        # 并行调用各角色（会诊模式下角色互不可见）
        tasks = []
        for role_id in self.role_ids:
            role = CLUSTER_ROLES.get(role_id)
            if not role:
                continue
            tasks.append((role_id, role))

        # 并行发起 LLM 调用，收集完整结果
        async def _call_role(role_id: str, role: dict) -> dict:
            system_prompt = self._build_consultation_prompt(role_id, topic)
            messages = self._build_messages(system_prompt, topic, user_input, [])

            full_response = ""
            async for chunk in self._call_llm_stream(messages):
                if chunk:
                    full_response += chunk

            emotion = analyze_emotion(full_response)
            return {
                "role_id": role_id,
                "role_name": role["name"],
                "content": full_response,
                "emotion": emotion,
                "color": role["color"]
            }

        # 并行执行所有角色调用
        results = await asyncio.gather(*[_call_role(rid, r) for rid, r in tasks], return_exceptions=True)

        # 顺序输出结果（保证 SSE 不交错）
        all_responses = []
        for i, result in enumerate(results):
            role_id, role = tasks[i]

            if isinstance(result, Exception):
                yield f"data: {json.dumps({'type': 'role_start', 'role_id': role_id, 'role_name': role['name'], 'round': 1, 'color': role['color']}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'role_chunk', 'role_id': role_id, 'content': f'回答失败: {str(result)[:50]}'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'role_end', 'role_id': role_id, 'emotion': 'neutral'}, ensure_ascii=False)}\n\n"
                continue

            yield f"data: {json.dumps({'type': 'role_start', 'role_id': role_id, 'role_name': role['name'], 'round': 1, 'color': result['color']}, ensure_ascii=False)}\n\n"

            # 分块输出内容（模拟流式效果）
            content = result["content"]
            chunk_size = max(1, len(content) // 8)
            for j in range(0, len(content), chunk_size):
                chunk = content[j:j + chunk_size]
                yield f"data: {json.dumps({'type': 'role_chunk', 'role_id': role_id, 'content': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.02)  # 微小延迟模拟流式

            yield f"data: {json.dumps({'type': 'role_end', 'role_id': role_id, 'emotion': result['emotion']}, ensure_ascii=False)}\n\n"

            all_responses.append(result)
            self.history.append({
                "role": result["role_name"],
                "role_id": role_id,
                "content": result["content"],
                "round": 1
            })

        # 汇总
        yield f"data: {json.dumps({'type': 'round_end', 'round': 1}, ensure_ascii=False)}\n\n"

    def _build_role_prompt(
        self,
        role_id: str,
        topic: str,
        previous_responses: List[Dict],
        user_input: str = ""
    ) -> str:
        """构建圆桌讨论的角色提示词"""

        role = CLUSTER_ROLES.get(role_id)
        base_prompt = role["system_prompt"]

        # 集群讨论的额外指令
        cluster_instruction = f"""

## 集群讨论规则
你正在参与一个多角色学术讨论，讨论话题是：{topic}

### 重要约束
- 你的回复应简洁有力，不超过 200 字
- 不要重复前面角色已经说过的观点
- 如果前面角色提出了有价值的观点，可以引用并在此基础上延伸
- 保持你作为{role['name']}的专业视角和独特风格
- 如果用户插话，优先回应用户的问题

### 当前讨论上下文
"""

        if previous_responses:
            context_lines = []
            for resp in previous_responses:
                context_lines.append(f"- {resp['role_name']}：{resp['content'][:150]}...")
            cluster_instruction += "\n前面角色的发言摘要：\n" + "\n".join(context_lines)

        if user_input:
            cluster_instruction += f"\n\n用户插话：{user_input}"

        # 注入好感度上下文
        affection_ctx = self._build_affection_context(role_id)
        if affection_ctx:
            cluster_instruction += affection_ctx

        return base_prompt + cluster_instruction

    def _build_debate_prompt(
        self,
        role_id: str,
        stance: str,
        topic: str,
        previous_responses: List[Dict]
    ) -> str:
        """构建辩论模式的角色提示词"""

        role = CLUSTER_ROLES.get(role_id)
        base_prompt = role["system_prompt"]

        stance_instruction = {
            "正方": "你持正方立场，需要提出支持性的论据和观点",
            "反方": "你持反方立场，需要提出反驳性的论据和观点"
        }

        debate_instruction = f"""

## 辩论规则
你正在参与一场学术辩论，辩论话题是：{topic}
你的立场是：{stance_instruction[stance]}

### 重要约束
- 你的回复应简洁有力，不超过 200 字
- 作为{stance}方，必须坚持你的立场，提出有力的论据
- 如果对方提出了观点，你需要针对性地反驳或回应
- 保持学术辩论的理性，不要攻击对方
- 保持你作为{role['name']}的专业视角

### 当前辩论上下文
"""

        if previous_responses:
            for resp in previous_responses:
                debate_instruction += f"\n{resp['stance']}方({resp['role_name']})：{resp['content'][:150]}..."

        # 注入好感度上下文
        affection_ctx = self._build_affection_context(role_id)
        if affection_ctx:
            debate_instruction += affection_ctx

        return base_prompt + debate_instruction

    def _build_consultation_prompt(
        self,
        role_id: str,
        topic: str
    ) -> str:
        """构建会诊模式的角色提示词"""

        role = CLUSTER_ROLES.get(role_id)
        base_prompt = role["system_prompt"]

        consultation_instruction = f"""

## 导师会诊规则
你正在参与导师会诊，从你的专业角度独立回答以下问题：{topic}

### 重要约束
- 你独立回答，不需要参考其他角色的观点
- 从你作为{role['name']}的专业领域出发给出建议
- 回复不超过 300 字
- 给出具体、可操作的建议
"""

        return base_prompt + consultation_instruction

    def _build_interrupt_response_prompt(
        self,
        role_id: str,
        user_msg: str,
        topic: str
    ) -> str:
        """构建用户插话时各角色的响应提示词"""

        role = CLUSTER_ROLES.get(role_id)
        base_prompt = role["system_prompt"]

        interrupt_instruction = f"""

## 用户插话
讨论话题：{topic}
用户刚刚插话说：「{user_msg}」

### 回应规则
- 你必须优先回应用户的插话内容
- 从你作为{role['name']}的专业视角给出回应
- 回应应简洁，不超过 150 字
- 如果用户提出了问题，直接回答
- 如果用户表达了观点，可以表示认同或补充
- 回应完后，可以简要衔接回讨论主线
"""

        return base_prompt + interrupt_instruction

    # ==================== 好感度矩阵 ====================

    def _init_affection_matrix(self):
        """初始化好感度矩阵，所有角色间初始值为 50（中性）"""
        for rid in self.role_ids:
            self.affection_matrix[rid] = {}
            for other_rid in self.role_ids:
                if other_rid != rid:
                    self.affection_matrix[rid][other_rid] = 50

    def update_affection_from_response(self, speaker_id: str, content: str):
        """根据发言内容更新好感度矩阵

        规则：
        - 赞同/引用他人观点 → 对该角色好感 +3~5
        - 反驳/质疑他人观点 → 对该角色好感 -2~3（辩论模式除外）
        - 辩论模式中反驳不降低好感
        - 好感度范围 0-100
        """
        import re

        for other_id in self.role_ids:
            if other_id == speaker_id:
                continue

            other_role = CLUSTER_ROLES.get(other_id)
            if not other_role:
                continue

            other_name = other_role["name"]
            delta = 0

            # 检测赞同/引用
            agree_patterns = [
                rf"{other_name}.*说得对", rf"同意{other_name}", rf"赞同{other_name}",
                rf"正如{other_name}.*所说", rf"{other_name}.*的观点.*正确",
                rf"我认同{other_name}", rf"{other_name}.*很有道理",
            ]
            for pat in agree_patterns:
                if re.search(pat, content):
                    delta += 4
                    break

            # 检测反驳/质疑（辩论模式不降好感）
            if self.mode != "debate":
                disagree_patterns = [
                    rf"不认同{other_name}", rf"{other_name}.*不对", rf"反对{other_name}",
                    rf"{other_name}.*有误", rf"我不同意{other_name}",
                ]
                for pat in disagree_patterns:
                    if re.search(pat, content):
                        delta -= 2
                        break

            if delta != 0:
                current = self.affection_matrix.get(speaker_id, {}).get(other_id, 50)
                new_val = max(0, min(100, current + delta))
                self.affection_matrix.setdefault(speaker_id, {})[other_id] = new_val

    def get_affection_matrix(self) -> Dict[str, Dict[str, int]]:
        """获取当前好感度矩阵"""
        return self.affection_matrix

    def _build_affection_context(self, role_id: str) -> str:
        """为角色构建好感度上下文，影响发言倾向"""
        affections = self.affection_matrix.get(role_id, {})
        if not affections:
            return ""

        lines = []
        for other_id, value in affections.items():
            other_role = CLUSTER_ROLES.get(other_id)
            if not other_role:
                continue
            if value >= 70:
                lines.append(f"你很欣赏{other_role['name']}的观点")
            elif value >= 55:
                lines.append(f"你比较认同{other_role['name']}")
            elif value <= 30:
                lines.append(f"你对{other_role['name']}的观点持保留态度")
            elif value <= 45:
                lines.append(f"你与{other_role['name']}存在一些分歧")

        if not lines:
            return ""

        return "\n### 你对其他角色的态度\n" + "；".join(lines) + "。"

    def _build_messages(
        self,
        system_prompt: str,
        topic: str,
        user_input: str = "",
        previous_responses: List[Dict] = None
    ) -> List[Dict[str, str]]:
        """构建 LLM 调用的消息列表"""

        messages = [{"role": "system", "content": system_prompt}]

        # 如果有历史上下文（续聊模式），添加之前的讨论记录
        if self.history and len(self.history) > 0:
            continuation_context = self._build_continuation_context(topic)
            if continuation_context:
                messages.append({"role": "user", "content": continuation_context})

        # 添加当前用户输入或话题
        if user_input:
            messages.append({"role": "user", "content": user_input})
        else:
            messages.append({"role": "user", "content": f"请就以下话题展开讨论：{topic}"})

        return messages

    def _build_continuation_context(self, topic: str) -> str:
        """构建续聊上下文，将之前的讨论记录格式化"""
        if not self.history:
            return ""

        lines = ["这是之前我们讨论过的内容，请在此基础上继续深入：\n"]

        # 按轮次分组
        rounds = {}
        for msg in self.history:
            round_num = msg.get("round", 1)
            if round_num not in rounds:
                rounds[round_num] = []
            rounds[round_num].append(msg)

        for round_num in sorted(rounds.keys()):
            lines.append(f"### 第{round_num}轮")
            for msg in rounds[round_num]:
                role_name = msg.get("role", msg.get("role_id", "未知"))
                content = msg.get("content", "")
                stance = msg.get("stance", "")
                prefix = f"[{stance}方] " if stance else ""
                lines.append(f"- {prefix}{role_name}：{content[:150]}{'...' if len(content) > 150 else ''}")
            lines.append("")

        return "\n".join(lines)

    async def _call_llm_stream(
        self,
        messages: List[Dict[str, str]]
    ) -> AsyncGenerator[str, None]:
        """流式调用 LLM，返回文本块"""

        # 获取 LLM 配置
        settings = await load_settings()
        api_key = settings.get("apiKey", "")
        base_url = settings.get("baseUrl", "https://api.openai.com/v1")
        model = settings.get("model", "gpt-3.5-turbo")
        temperature = settings.get("temperature", 0.7)
        max_tokens = settings.get("max_tokens", 512)  # 集群讨论限制 token

        # Provider 选择逻辑（复用 education_api 的模式）
        selected_provider = settings.get("selectedProvider", None)
        model_providers = settings.get("modelProviders", [])

        if selected_provider and model_providers:
            for provider in model_providers:
                provider_id = str(provider.get("id", ""))
                if provider_id == str(selected_provider):
                    if provider.get("apiKey"):
                        api_key = provider["apiKey"]
                    elif provider.get("api_key"):
                        api_key = provider["api_key"]
                    if provider.get("url"):
                        base_url = provider["url"]
                    elif provider.get("base_url"):
                        base_url = provider["base_url"]
                    if provider.get("modelId"):
                        model = provider["modelId"]
                    elif provider.get("model"):
                        model = provider["model"]
                    break

        if not api_key:
            yield "⚠️ 未配置 API Key，无法进行集群讨论。"
            return

        # 构建请求体
        request_body = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }

        # 使用全局客户端（复用连接池）
        global_client = get_global_http_client()

        try:
            if global_client:
                async with global_client.stream(
                    "POST",
                    f"{base_url.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json=request_body,
                    timeout=60.0
                ) as response:
                    async for line in response.aiter_lines():
                        if not line or line == "data: [DONE]":
                            continue
                        if line.startswith("data: "):
                            try:
                                chunk = json.loads(line[6:])
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                continue
            else:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    async with client.stream(
                        "POST",
                        f"{base_url.rstrip('/')}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json"
                        },
                        json=request_body
                    ) as response:
                        async for line in response.aiter_lines():
                            if not line or line == "data: [DONE]":
                                continue
                            if line.startswith("data: "):
                                try:
                                    chunk = json.loads(line[6:])
                                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield content
                                except json.JSONDecodeError:
                                    continue

        except httpx.TimeoutException:
            yield "⏱️ 响应超时，请稍后重试。"
        except Exception as e:
            error_msg = str(e)
            print(f"[集群编排] LLM调用失败: {error_msg}")
            yield f"❌ 对话失败: {error_msg[:50]}"

    async def _generate_summary(
        self,
        topic: str,
        responses: List[Dict]
    ) -> str:
        """生成讨论总结，兼容 history 格式和 response 格式"""

        # 构建总结请求 — 兼容 role_name 和 role 两种键名
        summary_content = "各角色观点摘要：\n"
        for resp in responses:
            name = resp.get("role_name") or resp.get("role", "未知")
            content = resp.get("content", "")
            stance = resp.get("stance", "")
            prefix = f"[{stance}方] " if stance else ""
            summary_content += f"- {prefix}{name}：{content[:150]}...\n"

        messages = [
            {"role": "system", "content": "你是一个学术讨论总结助手。请将以下多角色讨论内容汇总为简洁的结构化总结，包括：共识点、分歧点、建议。用中文回答。"},
            {"role": "user", "content": f"讨论话题：{topic}\n\n{summary_content}\n请生成总结。"}
        ]

        # 非流式调用
        settings = await load_settings()
        api_key = settings.get("apiKey", "")
        base_url = settings.get("baseUrl", "https://api.openai.com/v1")
        model = settings.get("model", "gpt-3.5-turbo")

        selected_provider = settings.get("selectedProvider", None)
        model_providers = settings.get("modelProviders", [])
        if selected_provider and model_providers:
            for provider in model_providers:
                if str(provider.get("id", "")) == str(selected_provider):
                    if provider.get("apiKey"):
                        api_key = provider["apiKey"]
                    elif provider.get("api_key"):
                        api_key = provider["api_key"]
                    if provider.get("url"):
                        base_url = provider["url"]
                    elif provider.get("base_url"):
                        base_url = provider["base_url"]
                    if provider.get("modelId"):
                        model = provider["modelId"]
                    elif provider.get("model"):
                        model = provider["model"]
                    break

        if not api_key:
            return "未配置 API Key，无法生成总结。"

        try:
            global_client = get_global_http_client()
            client = global_client or httpx.AsyncClient(timeout=30.0)

            request_body = {
                "model": model,
                "messages": messages,
                "temperature": 0.3,
                "max_tokens": 300,
                "stream": False
            }

            if global_client:
                response = await client.post(
                    f"{base_url.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json=request_body,
                    timeout=30.0
                )
            else:
                async with client as c:
                    response = await c.post(
                        f"{base_url.rstrip('/')}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json"
                        },
                        json=request_body,
                        timeout=30.0
                    )

            result = response.json()
            return result.get("choices", [{}])[0].get("message", {}).get("content", "总结生成失败")

        except Exception as e:
            print(f"[集群编排] 总结生成失败: {e}")
            return "总结生成失败，请查看各角色观点自行总结。"

    async def _save_session(self, topic: str, session_id: str, summary: str = ""):
        """保存讨论记录到数据库"""
        try:
            from py.edu_storage import MemoryCache, ensure_storage

            await ensure_storage()
            cache = await MemoryCache.get_instance()

            session_data = {
                "id": session_id,
                "topic": topic,
                "mode": self.mode,
                "roles": self.role_ids,
                "messages": self.history,
                "summary": summary,
                "created_at": getattr(self, '_created_at', time.time()),
                "updated_at": time.time()
            }

            await cache.add_cluster_session(session_data)
            print(f"[集群编排] 讨论记录已保存: {session_id}")
        except Exception as e:
            print(f"[集群编排] 保存讨论记录失败: {e}")

    async def _extract_role_memories(self, topic: str):
        """从讨论中提取各角色对用户的观察记忆"""
        try:
            from py.edu_storage import MemoryCache, ensure_storage

            await ensure_storage()
            cache = await MemoryCache.get_instance()

            for role_id in self.role_ids:
                # 收集该角色的所有发言
                role_messages = [
                    msg for msg in self.history
                    if msg.get("role_id") == role_id
                ]
                if not role_messages:
                    continue

                # 用 LLM 提取记忆
                role = CLUSTER_ROLES.get(role_id, {})
                role_name = role.get("name", role_id)

                extract_prompt = f"""你是一个记忆提取助手。请从以下{role_name}的发言中，提取关于用户的关键信息。

要求：
- 只提取能观察到的用户特征（偏好、互动风格、关注点）
- 每条记忆不超过 30 字
- 最多提取 3 条
- 如果没有可提取的信息，返回空
- 格式：每行一条，以"-"开头

{role_name}的发言：
"""
                for msg in role_messages:
                    extract_prompt += f"- {msg['content'][:100]}\n"

                messages = [
                    {"role": "system", "content": "你是一个简洁的记忆提取助手，只输出关键信息。"},
                    {"role": "user", "content": extract_prompt}
                ]

                try:
                    result = ""
                    async for chunk in self._call_llm_stream(messages):
                        if chunk:
                            result += chunk

                    if result.strip():
                        await cache.save_role_memory(
                            role_id=role_id,
                            memory_type="interaction_style",
                            content=result.strip()
                        )
                except Exception as e:
                    print(f"[集群编排] 提取角色{role_id}记忆失败: {e}")

        except Exception as e:
            print(f"[集群编排] 记忆提取失败: {e}")

    async def _load_role_memories(self) -> Dict[str, str]:
        """加载各角色的记忆，返回 {role_id: memory_text}"""
        memories = {}
        try:
            from py.edu_storage import MemoryCache, ensure_storage

            await ensure_storage()
            cache = await MemoryCache.get_instance()

            for role_id in self.role_ids:
                role_memories = await cache.get_role_memory(role_id)
                if role_memories:
                    memory_lines = []
                    for mem in role_memories:
                        memory_lines.append(mem["content"])
                    memories[role_id] = "\n".join(memory_lines)

        except Exception as e:
            print(f"[集群编排] 加载角色记忆失败: {e}")

        return memories


# 全局编排器管理
_active_orchestrators: Dict[str, ClusterOrchestrator] = {}


def create_orchestrator(session_id: str, mode: str, role_ids: List[str], max_rounds: int = 3) -> ClusterOrchestrator:
    """创建编排器实例"""
    orchestrator = ClusterOrchestrator(mode=mode, role_ids=role_ids, max_rounds=max_rounds)
    _active_orchestrators[session_id] = orchestrator
    return orchestrator


def get_orchestrator(session_id: str) -> Optional[ClusterOrchestrator]:
    """获取编排器实例"""
    return _active_orchestrators.get(session_id)


def remove_orchestrator(session_id: str) -> bool:
    """移除编排器实例"""
    if session_id in _active_orchestrators:
        del _active_orchestrators[session_id]
        return True
    return False