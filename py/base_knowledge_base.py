# -*- coding: utf-8 -*-
"""
知识库基类
提供统一的嵌入、检索、缓存和增量更新功能
"""

import asyncio
import hashlib
import json
import os
import time
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Union

import httpx
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter

from py.get_setting import DEFAULT_KB_CONFIG


# ==================== 异常定义 ====================

class KnowledgeBaseError(Exception):
    """知识库错误基类"""
    pass


class EmbeddingError(KnowledgeBaseError):
    """嵌入服务错误"""
    pass


class VectorStoreError(KnowledgeBaseError):
    """向量存储错误"""
    pass


# ==================== 辅助函数 ====================

def clean_text(text: str) -> str:
    """
    清洗文本，移除无法编码的 Unicode 代理字符（surrogates）。
    解决 'utf-8' codec can't encode character ... surrogates not allowed 错误。
    """
    if not isinstance(text, str):
        return str(text)
    return text.encode('utf-8', 'ignore').decode('utf-8')


def get_file_hash(file_path: Path) -> str:
    """获取文件的 MD5 哈希值，用于变更检测"""
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


# ==================== 嵌入类 ====================

class MyOpenAICompatibleEmbeddings(Embeddings):
    """
    OpenAI 兼容的词嵌入类，使用 httpx 异步客户端进行非阻塞网络请求。
    """

    def __init__(self, base_url: str, model: str, api_key: str = "empty"):
        self.base_url = base_url
        self.model = model
        self.api_key = api_key
        self.endpoint = f"{self.base_url}/embeddings"

    async def _aembed(self, texts: Union[str, List[str]]) -> List[Dict]:
        """异步发送嵌入请求并处理响应"""
        headers = {"Authorization": f"Bearer {self.api_key}"}
        json_data = {"model": self.model, "input": texts}

        async with httpx.AsyncClient(timeout=None) as client:
            try:
                response = await client.post(self.endpoint, headers=headers, json=json_data)
                response.raise_for_status()
                return response.json()["data"]
            except httpx.HTTPStatusError as e:
                detail = e.response.json().get('detail', e.response.text) if e.response.text else 'Unknown error'
                raise EmbeddingError(f"Embedding API HTTP Error {e.response.status_code}: {detail}")
            except Exception as e:
                raise EmbeddingError(f"Embedding API connection failed: {e.__class__.__name__}: {e}")

    def embed_query(self, text: str) -> List[float]:
        data = asyncio.run(self.aembed_query(text))
        return data

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        data = asyncio.run(self.aembed_documents(texts))
        return data

    async def aembed_query(self, text: str) -> List[float]:
        data = await self._aembed(text)
        return data[0]["embedding"]

    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        data = await self._aembed(texts)
        return [r["embedding"] for r in data]


class CachedEmbeddings(Embeddings):
    """
    带缓存的嵌入类，避免重复计算相同文本的嵌入
    """

    def __init__(self, base_embeddings: Embeddings, cache_size: int = 1000):
        self.base_embeddings = base_embeddings
        self._cache: Dict[str, List[float]] = {}
        self._cache_size = cache_size
        self._cache_order: List[str] = []  # 用于 LRU 淘汰

    def _get_cache_key(self, text: str) -> str:
        """生成缓存键"""
        return hashlib.md5(text.encode('utf-8')).hexdigest()

    def _evict_if_needed(self):
        """LRU 缓存淘汰"""
        while len(self._cache) > self._cache_size:
            oldest_key = self._cache_order.pop(0)
            self._cache.pop(oldest_key, None)

    async def aembed_query(self, text: str) -> List[float]:
        key = self._get_cache_key(text)

        # 检查缓存
        if key in self._cache:
            # 更新 LRU 顺序
            if key in self._cache_order:
                self._cache_order.remove(key)
            self._cache_order.append(key)
            return self._cache[key]

        # 计算嵌入
        result = await self.base_embeddings.aembed_query(text)

        # 存入缓存
        self._cache[key] = result
        self._cache_order.append(key)
        self._evict_if_needed()

        return result

    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        results = []
        uncached_texts = []
        uncached_indices = []

        # 检查每个文本的缓存状态
        for i, text in enumerate(texts):
            key = self._get_cache_key(text)
            if key in self._cache:
                results.append((i, self._cache[key]))
            else:
                uncached_texts.append(text)
                uncached_indices.append(i)

        # 批量计算未缓存的嵌入
        if uncached_texts:
            uncached_embeddings = await self.base_embeddings.aembed_documents(uncached_texts)
            for idx, text, embedding in zip(uncached_indices, uncached_texts, uncached_embeddings):
                results.append((idx, embedding))
                key = self._get_cache_key(text)
                self._cache[key] = embedding
                self._cache_order.append(key)
                self._evict_if_needed()

        # 按原始顺序返回
        results.sort(key=lambda x: x[0])
        return [r[1] for r in results]

    def embed_query(self, text: str) -> List[float]:
        return asyncio.run(self.aembed_query(text))

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return asyncio.run(self.aembed_documents(texts))


# ==================== 知识库基类 ====================

class BaseKnowledgeBase(ABC):
    """
    知识库基类，统一嵌入、检索和缓存逻辑
    """

    def __init__(
        self,
        kb_dir: Path,
        vector_dir: Path,
        config: Dict = None
    ):
        self.kb_dir = Path(kb_dir)
        self.vector_dir = Path(vector_dir)
        self.config = {**DEFAULT_KB_CONFIG, **(config or {})}

        self.vector_store: Optional[FAISS] = None
        self.embeddings: Optional[Embeddings] = None
        self.documents: List[Document] = []

        self._initialized = False
        self._last_init_time: Optional[datetime] = None
        self._file_hashes: Dict[str, str] = {}  # 文件路径 -> 哈希值

        # 确保目录存在
        self.kb_dir.mkdir(parents=True, exist_ok=True)
        self.vector_dir.mkdir(parents=True, exist_ok=True)

    # ==================== 抽象方法 ====================

    @abstractmethod
    async def _load_knowledge_files(self) -> List[Document]:
        """加载知识库文件（子类实现）"""
        pass

    @abstractmethod
    def get_kb_name(self) -> str:
        """获取知识库名称（用于日志）"""
        pass

    # ==================== 核心方法 ====================

    async def initialize(self, embedding_config: Dict[str, str] = None):
        """
        初始化知识库

        Args:
            embedding_config: 嵌入模型配置，包含 base_url, model, api_key
        """
        if self._initialized:
            return

        # 加载嵌入模型
        await self._init_embeddings(embedding_config)

        # 加载文件哈希记录
        await self._load_file_hashes()

        # 加载或构建向量库
        await self._load_or_build_vector_store()

        self._initialized = True
        self._last_init_time = datetime.now()
        print(f"[{self.get_kb_name()}] 初始化完成，文档数: {len(self.documents)}")

    async def _init_embeddings(self, embedding_config: Dict[str, str] = None):
        """初始化嵌入模型"""
        if embedding_config:
            base_embeddings = MyOpenAICompatibleEmbeddings(
                base_url=embedding_config.get("base_url", ""),
                model=embedding_config.get("model", ""),
                api_key=embedding_config.get("api_key", "")
            )
        else:
            # 尝试从设置加载
            base_embeddings = await self._load_embeddings_from_settings()

        if base_embeddings:
            # 如果启用缓存，包装嵌入类
            if self.config.get("embedding_cache", True):
                cache_size = self.config.get("embedding_cache_size", 1000)
                self.embeddings = CachedEmbeddings(base_embeddings, cache_size)
            else:
                self.embeddings = base_embeddings

    async def _load_embeddings_from_settings(self) -> Optional[Embeddings]:
        """从设置加载嵌入配置"""
        try:
            from py.get_setting import load_settings
            settings = await load_settings()

            # 优先使用知识库设置
            kb_settings = settings.get("KBSettings", {})
            if kb_settings.get("base_url"):
                return MyOpenAICompatibleEmbeddings(
                    base_url=kb_settings.get("base_url", ""),
                    model=kb_settings.get("model", "text-embedding-ada-002"),
                    api_key=kb_settings.get("api_key", "")
                )

            # 使用主模型提供商的嵌入配置
            selected_provider = settings.get("selectedProvider")
            providers = settings.get("modelProviders", [])
            for provider in providers:
                if str(provider.get("id")) == str(selected_provider):
                    return MyOpenAICompatibleEmbeddings(
                        base_url=provider.get("url", provider.get("base_url", "")),
                        model=provider.get("modelId", provider.get("model", "")),
                        api_key=provider.get("apiKey", provider.get("api_key", ""))
                    )
        except Exception as e:
            print(f"[{self.get_kb_name()}] 加载嵌入配置失败: {e}")

        return None

    async def _load_file_hashes(self):
        """加载文件哈希记录"""
        hash_file = self.vector_dir / "file_hashes.json"
        if hash_file.exists():
            try:
                self._file_hashes = await asyncio.to_thread(
                    lambda: json.load(open(hash_file, "r", encoding="utf-8"))
                )
            except Exception:
                self._file_hashes = {}

    async def _save_file_hashes(self):
        """保存文件哈希记录"""
        hash_file = self.vector_dir / "file_hashes.json"
        await asyncio.to_thread(
            lambda: json.dump(
                self._file_hashes,
                open(hash_file, "w", encoding="utf-8"),
                ensure_ascii=False
            )
        )

    async def _load_or_build_vector_store(self):
        """加载已有向量库或构建新向量库"""
        index_path = self.vector_dir / "index"

        if index_path.with_suffix(".faiss").exists() and self.embeddings:
            try:
                self.vector_store = await asyncio.to_thread(
                    FAISS.load_local,
                    folder_path=str(self.vector_dir),
                    embeddings=self.embeddings,
                    allow_dangerous_deserialization=True,
                    index_name="index"
                )
                print(f"[{self.get_kb_name()}] 已加载向量库: {self.vector_dir}")
                return
            except Exception as e:
                print(f"[{self.get_kb_name()}] 加载向量库失败: {e}")

        # 构建新向量库
        await self.build_vector_store()

    async def build_vector_store(self, force_rebuild: bool = False):
        """
        构建知识库向量索引

        Args:
            force_rebuild: 是否强制重建
        """
        if not self.embeddings:
            print(f"[{self.get_kb_name()}] 警告: 未配置嵌入模型，跳过向量库构建")
            return

        # 加载所有知识库文件
        self.documents = await self._load_knowledge_files()

        if not self.documents:
            print(f"[{self.get_kb_name()}] 警告: 没有找到知识库文件")
            return

        print(f"[{self.get_kb_name()}] 开始构建向量库，文档块数: {len(self.documents)}")

        # 分批构建向量库
        batch_size = self.config.get("batch_size", 20)
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

        # 保存向量库
        if self.vector_store:
            await asyncio.to_thread(
                self.vector_store.save_local,
                folder_path=str(self.vector_dir),
                index_name="index"
            )
            # 保存文件哈希记录
            await self._save_file_hashes()
            print(f"[{self.get_kb_name()}] 向量库已保存: {self.vector_dir}")

    async def detect_changes(self) -> Dict[str, List[Path]]:
        """
        检测知识库文件变更

        Returns:
            包含 added, removed, modified 三个列表的字典
        """
        current_files = set()
        current_hashes = {}

        # 扫描当前文件
        if self.kb_dir.exists():
            for file_path in self.kb_dir.glob("**/*"):
                if file_path.is_file() and self._is_supported_file(file_path):
                    current_files.add(str(file_path))
                    try:
                        current_hashes[str(file_path)] = get_file_hash(file_path)
                    except Exception:
                        pass

        indexed_files = set(self._file_hashes.keys())

        # 检测变更
        added = [Path(f) for f in current_files - indexed_files]
        removed = [Path(f) for f in indexed_files - current_files]

        # 检测修改的文件
        modified = []
        for file_path in current_files & indexed_files:
            if current_hashes.get(file_path) != self._file_hashes.get(file_path):
                modified.append(Path(file_path))

        return {
            "added": added,
            "removed": removed,
            "modified": modified
        }

    def _is_supported_file(self, file_path: Path) -> bool:
        """检查文件是否为支持的类型"""
        return file_path.suffix.lower() in [".md", ".txt"]

    async def incremental_update(self) -> Dict[str, int]:
        """
        增量更新向量库

        Returns:
            更新统计信息
        """
        if not self.embeddings or not self.vector_store:
            # 没有向量库，执行完整构建
            await self.build_vector_store()
            return {"added": len(self.documents), "removed": 0, "modified": 0}

        changes = await self.detect_changes()

        stats = {
            "added": len(changes["added"]),
            "removed": len(changes["removed"]),
            "modified": len(changes["modified"])
        }

        if not any(changes.values()):
            print(f"[{self.get_kb_name()}] 没有检测到文件变更")
            return stats

        print(f"[{self.get_kb_name()}] 检测到变更: 新增 {stats['added']}, 删除 {stats['removed']}, 修改 {stats['modified']}")

        # 处理删除和修改的文件（需要从向量库移除）
        files_to_remove = changes["removed"] + changes["modified"]
        # 注意：FAISS 不支持直接删除文档，这里简单处理为重建

        if files_to_remove:
            print(f"[{self.get_kb_name()}] 检测到删除/修改，需要重建向量库")
            await self.build_vector_store(force_rebuild=True)
            return stats

        # 只处理新增文件
        if changes["added"]:
            new_docs = []
            for file_path in changes["added"]:
                docs = await self._process_file(file_path)
                new_docs.extend(docs)

            if new_docs:
                await asyncio.to_thread(
                    self.vector_store.add_documents, new_docs
                )
                self.documents.extend(new_docs)

                # 更新哈希记录
                for file_path in changes["added"]:
                    try:
                        self._file_hashes[str(file_path)] = get_file_hash(file_path)
                    except Exception:
                        pass

                await self._save_file_hashes()

                # 保存更新后的向量库
                await asyncio.to_thread(
                    self.vector_store.save_local,
                    folder_path=str(self.vector_dir),
                    index_name="index"
                )

        return stats

    async def _process_file(self, file_path: Path) -> List[Document]:
        """处理单个文件，返回文档块列表"""
        content = await asyncio.to_thread(
            lambda: file_path.read_text(encoding="utf-8", errors="ignore")
        )

        if not content.strip():
            return []

        content = clean_text(content)

        # 根据文件类型选择分割策略
        if file_path.suffix.lower() == ".md":
            docs = await self._split_markdown(content, file_path)
        else:
            docs = await self._split_text(content, file_path)

        return docs

    async def _split_markdown(self, content: str, file_path: Path) -> List[Document]:
        """分割 Markdown 文件，保留标题结构"""
        documents = []

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
            return await self._split_text(content, file_path)

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config["chunk_size"],
            chunk_overlap=self.config["chunk_overlap"],
            separators=["\n\n", "\n", "。", "！", "？", "!", "?", "."]
        )

        for md_doc in md_docs:
            chunks = await asyncio.to_thread(
                text_splitter.split_text, md_doc.page_content
            )

            for chunk in chunks:
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
            chunk_size=self.config["chunk_size"],
            chunk_overlap=self.config["chunk_overlap"],
            separators=["\n\n", "\n", "。", "！", "？", "!", "?", "."]
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

    async def search(
        self,
        query: str,
        k: int = None,
        score_threshold: float = None
    ) -> List[Dict[str, Any]]:
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

        k = k or self.config["retrieval_k"]
        score_threshold = score_threshold or self.config["score_threshold"]

        try:
            results = await asyncio.to_thread(
                self.vector_store.similarity_search_with_score,
                query, k=k
            )

            formatted_results = []
            for doc, score in results:
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
            print(f"[{self.get_kb_name()}] 检索失败: {e}")
            return []

    def get_context_for_chat(
        self,
        results: List[Dict[str, Any]],
        max_length: int = 2000
    ) -> str:
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

        for result in results:
            content = result["content"]
            source = result["metadata"].get("file_name", "知识库")
            header = result["metadata"].get("header", "")

            if header:
                snippet = f"【{header}】\n{content}"
            else:
                snippet = content

            if current_length + len(snippet) > max_length:
                break

            context_parts.append(snippet)
            current_length += len(snippet)

        if not context_parts:
            return ""

        return "\n\n---\n\n".join(context_parts)

    async def get_stats(self) -> Dict[str, Any]:
        """获取知识库统计信息"""
        # 计算向量库大小
        index_size_mb = 0
        if self.vector_dir.exists():
            for file in self.vector_dir.glob("*"):
                if file.is_file():
                    index_size_mb += file.stat().st_size
            index_size_mb = round(index_size_mb / (1024 * 1024), 2)

        return {
            "initialized": self._initialized,
            "document_count": len(self.documents),
            "vector_store_exists": self.vector_store is not None,
            "index_size_mb": index_size_mb,
            "last_init_time": self._last_init_time.isoformat() if self._last_init_time else None,
            "kb_directory": str(self.kb_dir),
            "vector_directory": str(self.vector_dir),
            "config": self.config,
            "embedding": {
                "model": getattr(self.embeddings, 'model', None) if self.embeddings else None,
                "cached": isinstance(self.embeddings, CachedEmbeddings)
            }
        }
