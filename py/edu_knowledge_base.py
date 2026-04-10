# -*- coding: utf-8 -*-
"""
教育数字人知识库服务
实现教育知识库的向量化、检索和 RAG 集成
"""

import os
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

# LangChain 组件
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.embeddings import Embeddings

# 复用现有的嵌入类
from py.know_base import MyOpenAICompatibleEmbeddings, clean_text

# 数据目录
EDUCATION_KB_DIR = Path(os.path.join(os.path.dirname(__file__), "..", "education_digital_human", "知识库"))
EDUCATION_VECTOR_DIR = Path(os.path.join(os.path.dirname(__file__), "..", "education_digital_human", "向量库"))

# 默认知识库配置
DEFAULT_KB_CONFIG = {
    "chunk_size": 500,
    "chunk_overlap": 50,
    "retrieval_k": 5,
    "score_threshold": 0.7
}


class EducationKnowledgeBase:
    """教育数字人知识库管理器"""

    def __init__(self):
        self.vector_store: Optional[FAISS] = None
        self.embeddings: Optional[Embeddings] = None
        self.documents: List[Document] = []
        self._initialized = False
        self._last_init_time: Optional[datetime] = None

    async def initialize(self, embedding_config: Dict[str, str] = None):
        """
        初始化知识库

        Args:
            embedding_config: 嵌入模型配置，包含 base_url, model, api_key
        """
        if self._initialized:
            return

        # 确保向量库目录存在
        EDUCATION_VECTOR_DIR.mkdir(parents=True, exist_ok=True)

        # 加载嵌入模型配置
        if embedding_config:
            self.embeddings = MyOpenAICompatibleEmbeddings(
                base_url=embedding_config.get("base_url", ""),
                model=embedding_config.get("model", ""),
                api_key=embedding_config.get("api_key", "")
            )
        else:
            # 尝试从设置加载
            try:
                from py.get_setting import load_settings
                settings = await load_settings()

                # 优先使用知识库设置
                kb_settings = settings.get("KBSettings", {})
                if kb_settings.get("base_url"):
                    self.embeddings = MyOpenAICompatibleEmbeddings(
                        base_url=kb_settings.get("base_url", ""),
                        model=kb_settings.get("model", "text-embedding-ada-002"),
                        api_key=kb_settings.get("api_key", "")
                    )
                else:
                    # 使用主模型提供商的嵌入配置
                    selected_provider = settings.get("selectedProvider")
                    providers = settings.get("modelProviders", [])
                    for provider in providers:
                        if str(provider.get("id")) == str(selected_provider):
                            self.embeddings = MyOpenAICompatibleEmbeddings(
                                base_url=provider.get("url", provider.get("base_url", "")),
                                model=provider.get("modelId", provider.get("model", "")),
                                api_key=provider.get("apiKey", provider.get("api_key", ""))
                            )
                            break
            except Exception as e:
                print(f"[教育知识库] 加载嵌入配置失败: {e}")

        # 尝试加载已有向量库
        await self._load_or_build_vector_store()

        self._initialized = True
        self._last_init_time = datetime.now()
        print(f"[教育知识库] 初始化完成，文档数: {len(self.documents)}")

    async def _load_or_build_vector_store(self):
        """加载已有向量库或构建新向量库"""
        index_path = EDUCATION_VECTOR_DIR / "index"

        if index_path.with_suffix(".faiss").exists() and self.embeddings:
            try:
                # 加载已有向量库
                self.vector_store = await asyncio.to_thread(
                    FAISS.load_local,
                    folder_path=str(EDUCATION_VECTOR_DIR),
                    embeddings=self.embeddings,
                    allow_dangerous_deserialization=True,
                    index_name="index"
                )
                print(f"[教育知识库] 已加载向量库: {EDUCATION_VECTOR_DIR}")
                return
            except Exception as e:
                print(f"[教育知识库] 加载向量库失败: {e}")

        # 构建新向量库
        await self.build_vector_store()

    async def build_vector_store(self, force_rebuild: bool = False):
        """
        构建知识库向量索引

        Args:
            force_rebuild: 是否强制重建
        """
        if not self.embeddings:
            print("[教育知识库] 警告: 未配置嵌入模型，跳过向量库构建")
            return

        # 加载所有知识库文件
        self.documents = await self._load_knowledge_files()

        if not self.documents:
            print("[教育知识库] 警告: 没有找到知识库文件")
            return

        print(f"[教育知识库] 开始构建向量库，文档块数: {len(self.documents)}")

        # 分批构建向量库
        batch_size = 20
        self.vector_store = None

        for i in range(0, len(self.documents), batch_size):
            batch = self.documents[i:i + batch_size]

            if self.vector_store is None:
                self.vector_store = await asyncio.to_thread(
                    FAISS.from_documents, batch, self.embeddings
                )
            else:
                await asyncio.to_thread(
                    self.vector_store.add_documents, batch
                )

            print(f"[教育知识库] 处理进度: {min(i + batch_size, len(self.documents))}/{len(self.documents)}")

        # 保存向量库
        if self.vector_store:
            await asyncio.to_thread(
                self.vector_store.save_local,
                folder_path=str(EDUCATION_VECTOR_DIR),
                index_name="index"
            )
            print(f"[教育知识库] 向量库已保存: {EDUCATION_VECTOR_DIR}")

    async def _load_knowledge_files(self) -> List[Document]:
        """加载知识库目录下的所有文件"""
        documents = []

        if not EDUCATION_KB_DIR.exists():
            print(f"[教育知识库] 知识库目录不存在: {EDUCATION_KB_DIR}")
            return documents

        # 遍历知识库目录
        for file_path in EDUCATION_KB_DIR.glob("**/*"):
            if file_path.is_file() and file_path.suffix.lower() in [".md", ".txt"]:
                try:
                    docs = await self._process_file(file_path)
                    documents.extend(docs)
                    print(f"[教育知识库] 已加载: {file_path.name}")
                except Exception as e:
                    print(f"[教育知识库] 加载文件失败 {file_path.name}: {e}")

        return documents

    async def _process_file(self, file_path: Path) -> List[Document]:
        """处理单个文件，返回文档块列表"""
        # 读取文件内容
        content = await asyncio.to_thread(
            lambda: file_path.read_text(encoding="utf-8", errors="ignore")
        )

        if not content.strip():
            return []

        # 清洗文本
        content = clean_text(content)

        # 根据文件类型选择分割策略
        if file_path.suffix.lower() == ".md":
            # Markdown 文件使用标题分割
            docs = await self._split_markdown(content, file_path)
        else:
            # 普通文本文件
            docs = await self._split_text(content, file_path)

        return docs

    async def _split_markdown(self, content: str, file_path: Path) -> List[Document]:
        """分割 Markdown 文件，保留标题结构"""
        documents = []

        # 首先按标题分割
        headers_to_split_on = [
            ("#", "header1"),
            ("##", "header2"),
            ("###", "header3"),
        ]

        markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=headers_to_split_on,
            strip_headers=False
        )

        try:
            md_docs = await asyncio.to_thread(
                markdown_splitter.split_text, content
            )
        except Exception:
            # 如果标题分割失败，使用普通文本分割
            return await self._split_text(content, file_path)

        # 对每个块进一步分割
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=DEFAULT_KB_CONFIG["chunk_size"],
            chunk_overlap=DEFAULT_KB_CONFIG["chunk_overlap"],
            separators=["\n\n", "\n", "。", "！", "？", "！", "?", "."]
        )

        for md_doc in md_docs:
            # 进一步分割大块
            chunks = await asyncio.to_thread(
                text_splitter.split_text, md_doc.page_content
            )

            for chunk in chunks:
                # 构建元数据
                metadata = {
                    "source": str(file_path),
                    "file_name": file_path.name,
                    "header": md_doc.metadata.get("header1", "") or
                              md_doc.metadata.get("header2", "") or
                              md_doc.metadata.get("header3", ""),
                }
                documents.append(Document(page_content=chunk, metadata=metadata))

        return documents

    async def _split_text(self, content: str, file_path: Path) -> List[Document]:
        """分割普通文本文件"""
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=DEFAULT_KB_CONFIG["chunk_size"],
            chunk_overlap=DEFAULT_KB_CONFIG["chunk_overlap"],
            separators=["\n\n", "\n", "。", "！", "？", "！", "?", "."]
        )

        chunks = await asyncio.to_thread(text_splitter.split_text, content)

        documents = []
        for i, chunk in enumerate(chunks):
            metadata = {
                "source": str(file_path),
                "file_name": file_path.name,
                "chunk_index": i
            }
            documents.append(Document(page_content=chunk, metadata=metadata))

        return documents

    async def search(self, query: str, k: int = None, score_threshold: float = None) -> List[Dict[str, Any]]:
        """
        语义检索知识库

        Args:
            query: 查询文本
            k: 返回结果数量
            score_threshold: 相似度阈值

        Returns:
            检索结果列表
        """
        if not self.vector_store:
            await self.initialize()
            if not self.vector_store:
                return []

        k = k or DEFAULT_KB_CONFIG["retrieval_k"]
        score_threshold = score_threshold or DEFAULT_KB_CONFIG["score_threshold"]

        try:
            # 使用相似度搜索并返回分数
            results = await asyncio.to_thread(
                self.vector_store.similarity_search_with_score,
                query, k=k
            )

            # 过滤低分结果并格式化
            formatted_results = []
            for doc, score in results:
                # FAISS 返回的是距离，越小越相似，转换为相似度
                similarity = 1 / (1 + score)

                if similarity >= score_threshold:
                    formatted_results.append({
                        "content": doc.page_content,
                        "metadata": doc.metadata,
                        "score": float(score),
                        "similarity": similarity
                    })

            return formatted_results

        except Exception as e:
            print(f"[教育知识库] 检索失败: {e}")
            return []

    def get_context_for_chat(self, results: List[Dict[str, Any]], max_length: int = 2000) -> str:
        """
        将检索结果转换为对话上下文

        Args:
            results: 检索结果列表
            max_length: 最大上下文长度

        Returns:
            格式化的上下文字符串
        """
        if not results:
            return ""

        context_parts = []
        current_length = 0

        for i, result in enumerate(results):
            content = result["content"]
            source = result["metadata"].get("file_name", "知识库")
            header = result["metadata"].get("header", "")

            # 构建上下文片段
            if header:
                snippet = f"【{header}】\n{content}"
            else:
                snippet = content

            # 检查长度限制
            if current_length + len(snippet) > max_length:
                break

            context_parts.append(snippet)
            current_length += len(snippet)

        if not context_parts:
            return ""

        return "\n\n---\n\n".join(context_parts)

    async def get_stats(self) -> Dict[str, Any]:
        """获取知识库统计信息"""
        return {
            "initialized": self._initialized,
            "document_count": len(self.documents),
            "vector_store_exists": self.vector_store is not None,
            "last_init_time": self._last_init_time.isoformat() if self._last_init_time else None,
            "kb_directory": str(EDUCATION_KB_DIR),
            "vector_directory": str(EDUCATION_VECTOR_DIR),
            "config": DEFAULT_KB_CONFIG
        }


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
