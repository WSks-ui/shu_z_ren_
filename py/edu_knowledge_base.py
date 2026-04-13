# -*- coding: utf-8 -*-
"""
教育数字人知识库服务
实现教育知识库的向量化、检索和 RAG 集成
"""

import os
from pathlib import Path
from typing import List, Dict, Any, Optional

from langchain_core.documents import Document

from py.base_knowledge_base import BaseKnowledgeBase


# 数据目录
EDUCATION_KB_DIR = Path(os.path.join(os.path.dirname(__file__), "..", "education_digital_human", "知识库"))
EDUCATION_VECTOR_DIR = Path(os.path.join(os.path.dirname(__file__), "..", "education_digital_human", "向量库"))


class EducationKnowledgeBase(BaseKnowledgeBase):
    """教育数字人知识库管理器"""

    def __init__(self, config: Dict = None):
        super().__init__(
            kb_dir=EDUCATION_KB_DIR,
            vector_dir=EDUCATION_VECTOR_DIR,
            config=config
        )

    def get_kb_name(self) -> str:
        """获取知识库名称"""
        return "教育知识库"

    async def _load_knowledge_files(self) -> List[Document]:
        """加载知识库目录下的所有文件"""
        documents = []

        if not self.kb_dir.exists():
            print(f"[{self.get_kb_name()}] 知识库目录不存在: {self.kb_dir}")
            return documents

        # 遍历知识库目录
        for file_path in self.kb_dir.glob("**/*"):
            if file_path.is_file() and self._is_supported_file(file_path):
                try:
                    docs = await self._process_file(file_path)
                    documents.extend(docs)
                    # 更新文件哈希
                    from py.base_knowledge_base import get_file_hash
                    self._file_hashes[str(file_path)] = get_file_hash(file_path)
                    print(f"[{self.get_kb_name()}] 已加载: {file_path.name}")
                except Exception as e:
                    print(f"[{self.get_kb_name()}] 加载文件失败 {file_path.name}: {e}")

        return documents


# 全局知识库实例
_education_kb: Optional[EducationKnowledgeBase] = None


async def get_education_kb() -> EducationKnowledgeBase:
    """获取教育知识库单例"""
    global _education_kb

    if _education_kb is None:
        _education_kb = EducationKnowledgeBase()
        await _education_kb.initialize()

    return _education_kb


async def search_education_knowledge(query: str, k: int = 5) -> List[Dict[str, Any]]:
    """
    便捷函数：搜索教育知识库

    Args:
        query: 查询文本
        k: 返回结果数量

    Returns:
        检索结果列表
    """
    kb = await get_education_kb()
    return await kb.search(query, k=k)


async def get_education_context(query: str, max_length: int = 2000) -> str:
    """
    便捷函数：获取教育知识库上下文

    Args:
        query: 查询文本
        max_length: 最大上下文长度

    Returns:
        格式化的上下文字符串
    """
    kb = await get_education_kb()
    results = await kb.search(query)
    return kb.get_context_for_chat(results, max_length=max_length)


async def preload_education_kb():
    """
    预加载教育知识库（服务启动时调用）
    避免首次对话时的延迟
    """
    global _education_kb

    if _education_kb is None:
        _education_kb = EducationKnowledgeBase()

    try:
        await _education_kb.initialize()
        print("[教育知识库] 预加载完成")
        return True
    except Exception as e:
        print(f"[教育知识库] 预加载失败: {e}")
        return False


async def get_education_kb_stats() -> Dict[str, Any]:
    """获取教育知识库统计信息"""
    kb = await get_education_kb()
    return await kb.get_stats()


async def incremental_update_education_kb() -> Dict[str, int]:
    """增量更新教育知识库"""
    kb = await get_education_kb()
    return await kb.incremental_update()
