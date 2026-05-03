# -*- coding: utf-8 -*-
"""
教育数字人数据存储优化层
- 内存缓存 + SQLite 持久化
- 高频操作低延迟
- 自动批量写入，减少 IO
"""

import asyncio
import aiosqlite
import json
import time
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

# 数据存储目录 - 与 education_api.py 保持一致
EDUCATION_DATA_DIR = Path(os.path.join(os.path.dirname(__file__), "..", "education_digital_human", "数据"))
EDUCATION_DATA_DIR.mkdir(parents=True, exist_ok=True)

# 数据库路径
EDU_DB_PATH = EDUCATION_DATA_DIR / "education_data.db"

# 旧 JSON 文件路径（用于数据迁移）
GROWTH_DATA_FILE = EDUCATION_DATA_DIR / "growth_data.json"
COLLABORATION_DATA_FILE = EDUCATION_DATA_DIR / "collaboration_data.json"
ACHIEVEMENT_DATA_FILE = EDUCATION_DATA_DIR / "achievement_data.json"
CHAT_HISTORY_FILE = EDUCATION_DATA_DIR / "chat_history.json"

# 缓存配置
CACHE_FLUSH_INTERVAL = 5.0  # 缓存刷新间隔（秒）
CACHE_MAX_AGE = 30.0  # 缓存最大存活时间（秒）


# ==================== 内存缓存管理器 ====================

class MemoryCache:
    """内存缓存管理器 - 支持延迟写入和批量操作"""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._dirty: Dict[str, float] = {}  # 记录脏数据的时间戳
        self._lock = asyncio.Lock()
        self._flush_task: Optional[asyncio.Task] = None
        self._db_conn: Optional[aiosqlite.Connection] = None

    async def initialize(self):
        """初始化缓存和数据库"""
        # 创建数据库连接
        self._db_conn = await aiosqlite.connect(EDU_DB_PATH)

        # 创建表
        await self._create_tables()

        # 迁移旧 JSON 数据（如果存在）
        await self._migrate_from_json()

        # 启动定期刷新任务
        self._flush_task = asyncio.create_task(self._periodic_flush())

        print("[教育数据存储] 初始化完成")

    async def _migrate_from_json(self):
        """从旧 JSON 文件迁移数据到 SQLite"""
        migrations = [
            ("growth", GROWTH_DATA_FILE),
            ("collaboration", COLLABORATION_DATA_FILE),
            ("achievement", ACHIEVEMENT_DATA_FILE),
        ]

        for key, json_file in migrations:
            # 检查数据库是否已有数据
            try:
                cursor = await self._db_conn.execute(
                    f"SELECT COUNT(*) FROM {key}_data"
                )
                count = (await cursor.fetchone())[0]

                # 如果数据库为空且 JSON 文件存在，则迁移
                if count == 0 and json_file.exists():
                    try:
                        with open(json_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        await self.set(key, data, immediate=True)
                        print(f"[教育数据存储] 迁移 {key} 数据: {json_file} -> SQLite")
                    except Exception as e:
                        print(f"[教育数据存储] 迁移 {key} 失败: {e}")
            except Exception as e:
                print(f"[教育数据存储] 检查 {key} 表失败: {e}")

        # 迁移对话历史（结构不同）
        if CHAT_HISTORY_FILE.exists():
            try:
                cursor = await self._db_conn.execute(
                    "SELECT COUNT(*) FROM chat_history"
                )
                count = (await cursor.fetchone())[0]

                if count == 0:
                    try:
                        with open(CHAT_HISTORY_FILE, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        sessions = data.get("sessions", {})
                        for session_id, messages in sessions.items():
                            await self._db_conn.execute('''
                                INSERT OR REPLACE INTO chat_history (session_id, messages, updated_at)
                                VALUES (?, ?, ?)
                            ''', (session_id, json.dumps(messages, ensure_ascii=False), time.time()))
                        await self._db_conn.commit()
                        print(f"[教育数据存储] 迁移 chat_history 数据: {len(sessions)} 个会话")
                    except Exception as e:
                        print(f"[教育数据存储] 迁移 chat_history 失败: {e}")
            except Exception as e:
                print(f"[教育数据存储] 检查 chat_history 表失败: {e}")

    async def close(self):
        """关闭连接"""
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass

        # 最后一次刷新
        await self._flush_all_dirty()

        if self._db_conn:
            await self._db_conn.close()

    async def _create_tables(self):
        """创建数据表"""
        await self._db_conn.executescript('''
            -- 成长数据表
            CREATE TABLE IF NOT EXISTS growth_data (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL,
                updated_at REAL NOT NULL
            );

            -- 协作记录表
            CREATE TABLE IF NOT EXISTS collaboration_data (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL,
                updated_at REAL NOT NULL
            );

            -- 成就数据表
            CREATE TABLE IF NOT EXISTS achievement_data (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL,
                updated_at REAL NOT NULL
            );

            -- 对话历史表（支持按会话查询）
            CREATE TABLE IF NOT EXISTS chat_history (
                session_id TEXT PRIMARY KEY,
                messages TEXT NOT NULL,
                updated_at REAL NOT NULL
            );

            -- 协作会话索引表（支持按类型和时间查询）
            CREATE TABLE IF NOT EXISTS collaboration_sessions (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                title TEXT,
                start_time TEXT,
                end_time TEXT,
                data TEXT NOT NULL,
                created_at REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_collab_type ON collaboration_sessions(type);
            CREATE INDEX IF NOT EXISTS idx_collab_start ON collaboration_sessions(start_time);

            -- 集群会话记录表
            CREATE TABLE IF NOT EXISTS cluster_sessions (
                id TEXT PRIMARY KEY,
                topic TEXT NOT NULL,
                mode TEXT NOT NULL,
                roles TEXT NOT NULL,
                messages TEXT NOT NULL,
                summary TEXT,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_cluster_mode ON cluster_sessions(mode);
            CREATE INDEX IF NOT EXISTS idx_cluster_created ON cluster_sessions(created_at);

            -- 自定义集群角色表
            CREATE TABLE IF NOT EXISTS custom_cluster_roles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT 'fa-solid fa-user',
                color TEXT NOT NULL DEFAULT '#6366f1',
                personality TEXT NOT NULL DEFAULT '',
                expertise TEXT NOT NULL DEFAULT '[]',
                speaking_style TEXT NOT NULL DEFAULT '',
                system_prompt TEXT NOT NULL,
                voice_id TEXT NOT NULL DEFAULT '',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );

            -- 集群角色记忆表
            CREATE TABLE IF NOT EXISTS cluster_role_memory (
                role_id TEXT NOT NULL,
                user_key TEXT NOT NULL DEFAULT 'default',
                memory_type TEXT NOT NULL,
                content TEXT NOT NULL,
                updated_at REAL NOT NULL,
                PRIMARY KEY (role_id, user_key, memory_type)
            );
        ''')
        await self._db_conn.commit()

    # ==================== 读操作（优先缓存） ====================

    async def get(self, key: str, default: Any = None) -> Any:
        """获取数据（优先从缓存读取）"""
        async with self._lock:
            # 1. 检查缓存
            if key in self._cache:
                return self._cache[key]["data"]

            # 2. 从数据库加载
            data = await self._load_from_db(key)
            if data is not None:
                self._cache[key] = {"data": data, "loaded_at": time.time()}
                return data

            return default

    async def _load_from_db(self, key: str) -> Optional[Any]:
        """从数据库加载数据"""
        table_map = {
            "growth": "growth_data",
            "collaboration": "collaboration_data",
            "achievement": "achievement_data",
            "chat_history": "chat_history"
        }

        table = table_map.get(key)
        if not table:
            return None

        try:
            if key == "chat_history":
                # 对话历史：加载所有会话
                cursor = await self._db_conn.execute(
                    "SELECT session_id, messages FROM chat_history"
                )
                rows = await cursor.fetchall()
                sessions = {row[0]: json.loads(row[1]) for row in rows}
                return {"sessions": sessions}
            else:
                cursor = await self._db_conn.execute(
                    f"SELECT data FROM {table} WHERE id = 1"
                )
                row = await cursor.fetchone()
                if row:
                    return json.loads(row[0])
        except Exception as e:
            print(f"[教育数据存储] 加载数据失败 {key}: {e}")

        return None

    # ==================== 写操作（写入缓存，延迟持久化） ====================

    async def set(self, key: str, value: Any, immediate: bool = False):
        """设置数据（写入缓存，可选立即持久化）"""
        async with self._lock:
            self._cache[key] = {"data": value, "loaded_at": time.time()}
            self._dirty[key] = time.time()

            if immediate:
                await self._flush_key_unlocked(key)

    async def update(self, key: str, updates: Dict[str, Any], immediate: bool = False):
        """部分更新（合并现有数据）"""
        async with self._lock:
            current = self._cache.get(key, {}).get("data", {})

            # 深度合并
            if isinstance(current, dict) and isinstance(updates, dict):
                merged = self._deep_merge(current, updates)
            else:
                merged = updates

            self._cache[key] = {"data": merged, "loaded_at": time.time()}
            self._dirty[key] = time.time()

            if immediate:
                await self._flush_key_unlocked(key)

    def _deep_merge(self, base: dict, updates: dict) -> dict:
        """深度合并字典"""
        result = base.copy()
        for key, value in updates.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    # ==================== 高频操作优化 ====================

    async def increment(self, key: str, field: str, amount: int = 1):
        """原子增量操作（用于经验值、统计等）"""
        async with self._lock:
            # 如果缓存为空，先从数据库加载
            if key not in self._cache:
                data = await self._load_from_db(key)
                if data is not None:
                    self._cache[key] = {"data": data, "loaded_at": time.time()}
                else:
                    self._cache[key] = {"data": {}, "loaded_at": time.time()}

            data = self._cache[key]["data"]

            # 支持嵌套字段（如 stats.conversations）
            parts = field.split(".")
            current = data
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]

            final_key = parts[-1]
            current[final_key] = current.get(final_key, 0) + amount

            self._cache[key] = {"data": data, "loaded_at": time.time()}
            self._dirty[key] = time.time()

    async def append_to_list(self, key: str, field: str, item: Any, max_items: int = 500):
        """追加到列表（自动限制长度）"""
        async with self._lock:
            # 如果缓存为空，先从数据库加载
            if key not in self._cache:
                data = await self._load_from_db(key)
                if data is not None:
                    self._cache[key] = {"data": data, "loaded_at": time.time()}
                else:
                    self._cache[key] = {"data": {}, "loaded_at": time.time()}

            data = self._cache[key]["data"]

            # 支持嵌套字段
            parts = field.split(".")
            current = data
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]

            final_key = parts[-1]
            if final_key not in current:
                current[final_key] = []

            current[final_key].append(item)

            # 限制列表长度
            if len(current[final_key]) > max_items:
                current[final_key] = current[final_key][-max_items:]

            self._cache[key] = {"data": data, "loaded_at": time.time()}
            self._dirty[key] = time.time()

    # ==================== 协作会话操作 ====================

    async def add_collaboration_session(self, session: Dict[str, Any]):
        """添加协作会话（支持索引查询）"""
        async with self._lock:
            session_id = session.get("id")
            session_type = session.get("type", "unknown")
            data_json = json.dumps(session, ensure_ascii=False)

            await self._db_conn.execute('''
                INSERT OR REPLACE INTO collaboration_sessions
                (id, type, title, start_time, end_time, data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                session_id,
                session_type,
                session.get("title", ""),
                session.get("startTime", ""),
                session.get("endTime", ""),
                data_json,
                time.time()
            ))
            await self._db_conn.commit()

    async def get_collaboration_sessions(
        self,
        session_type: str = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """获取协作会话列表（支持按类型筛选）"""
        if session_type:
            cursor = await self._db_conn.execute('''
                SELECT data FROM collaboration_sessions
                WHERE type = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', (session_type, limit, offset))
        else:
            cursor = await self._db_conn.execute('''
                SELECT data FROM collaboration_sessions
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', (limit, offset))

        rows = await cursor.fetchall()
        return [json.loads(row[0]) for row in rows]

    # ==================== 集群会话 ====================

    async def add_cluster_session(self, session: Dict[str, Any]):
        """保存集群讨论记录"""
        async with self._lock:
            await self._db_conn.execute('''
                INSERT OR REPLACE INTO cluster_sessions
                (id, topic, mode, roles, messages, summary, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session.get("id", ""),
                session.get("topic", ""),
                session.get("mode", ""),
                json.dumps(session.get("roles", []), ensure_ascii=False),
                json.dumps(session.get("messages", []), ensure_ascii=False),
                session.get("summary", ""),
                session.get("created_at", time.time()),
                session.get("updated_at", time.time())
            ))
            await self._db_conn.commit()

    async def get_cluster_sessions(
        self,
        mode: str = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """获取集群讨论历史列表（摘要，不含完整 messages）"""
        if mode:
            cursor = await self._db_conn.execute('''
                SELECT id, topic, mode, roles, summary, created_at, updated_at
                FROM cluster_sessions
                WHERE mode = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', (mode, limit, offset))
        else:
            cursor = await self._db_conn.execute('''
                SELECT id, topic, mode, roles, summary, created_at, updated_at
                FROM cluster_sessions
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', (limit, offset))

        rows = await cursor.fetchall()
        results = []
        for row in rows:
            results.append({
                "id": row[0],
                "topic": row[1],
                "mode": row[2],
                "roles": json.loads(row[3]) if row[3] else [],
                "summary": row[4] or "",
                "created_at": row[5],
                "updated_at": row[6]
            })
        return results

    async def get_cluster_session_detail(self, session_id: str) -> Optional[Dict[str, Any]]:
        """获取单条集群讨论详情（含完整 messages）"""
        cursor = await self._db_conn.execute('''
            SELECT id, topic, mode, roles, messages, summary, created_at, updated_at
            FROM cluster_sessions WHERE id = ?
        ''', (session_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        return {
            "id": row[0],
            "topic": row[1],
            "mode": row[2],
            "roles": json.loads(row[3]) if row[3] else [],
            "messages": json.loads(row[4]) if row[4] else [],
            "summary": row[5] or "",
            "created_at": row[6],
            "updated_at": row[7]
        }

    async def delete_cluster_session(self, session_id: str) -> bool:
        """删除集群讨论记录"""
        async with self._lock:
            cursor = await self._db_conn.execute(
                'DELETE FROM cluster_sessions WHERE id = ?', (session_id,)
            )
            await self._db_conn.commit()
            return cursor.rowcount > 0

    # ==================== 自定义集群角色 ====================

    async def add_custom_cluster_role(self, role: Dict[str, Any]):
        """添加自定义集群角色"""
        async with self._lock:
            await self._db_conn.execute('''
                INSERT OR REPLACE INTO custom_cluster_roles
                (id, name, icon, color, personality, expertise, speaking_style, system_prompt, voice_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                role.get("id", ""),
                role.get("name", ""),
                role.get("icon", "fa-solid fa-user"),
                role.get("color", "#6366f1"),
                role.get("personality", ""),
                json.dumps(role.get("expertise", []), ensure_ascii=False),
                role.get("speaking_style", ""),
                role.get("system_prompt", ""),
                role.get("voice_id", ""),
                role.get("created_at", time.time()),
                role.get("updated_at", time.time())
            ))
            await self._db_conn.commit()

    async def get_custom_cluster_roles(self) -> List[Dict[str, Any]]:
        """获取所有自定义集群角色"""
        cursor = await self._db_conn.execute('''
            SELECT id, name, icon, color, personality, expertise, speaking_style, system_prompt, voice_id, created_at, updated_at
            FROM custom_cluster_roles ORDER BY created_at DESC
        ''')
        rows = await cursor.fetchall()
        results = []
        for row in rows:
            results.append({
                "id": row[0],
                "name": row[1],
                "icon": row[2],
                "color": row[3],
                "personality": row[4],
                "expertise": json.loads(row[5]) if row[5] else [],
                "speaking_style": row[6],
                "system_prompt": row[7],
                "voice_id": row[8],
                "created_at": row[9],
                "updated_at": row[10]
            })
        return results

    async def get_custom_cluster_role(self, role_id: str) -> Optional[Dict[str, Any]]:
        """获取单个自定义集群角色"""
        cursor = await self._db_conn.execute('''
            SELECT id, name, icon, color, personality, expertise, speaking_style, system_prompt, voice_id, created_at, updated_at
            FROM custom_cluster_roles WHERE id = ?
        ''', (role_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        return {
            "id": row[0],
            "name": row[1],
            "icon": row[2],
            "color": row[3],
            "personality": row[4],
            "expertise": json.loads(row[5]) if row[5] else [],
            "speaking_style": row[6],
            "system_prompt": row[7],
            "voice_id": row[8],
            "created_at": row[9],
            "updated_at": row[10]
        }

    async def update_custom_cluster_role(self, role_id: str, updates: Dict[str, Any]) -> bool:
        """更新自定义集群角色"""
        async with self._lock:
            existing = await self.get_custom_cluster_role(role_id)
            if not existing:
                return False

            merged = {**existing, **updates, "updated_at": time.time()}
            if "expertise" in merged:
                merged["expertise"] = json.dumps(merged["expertise"], ensure_ascii=False)

            await self._db_conn.execute('''
                INSERT OR REPLACE INTO custom_cluster_roles
                (id, name, icon, color, personality, expertise, speaking_style, system_prompt, voice_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                merged["id"], merged["name"], merged["icon"], merged["color"],
                merged["personality"], merged["expertise"], merged["speaking_style"],
                merged["system_prompt"], merged["voice_id"],
                merged["created_at"], merged["updated_at"]
            ))
            await self._db_conn.commit()
            return True

    async def delete_custom_cluster_role(self, role_id: str) -> bool:
        """删除自定义集群角色"""
        async with self._lock:
            cursor = await self._db_conn.execute(
                'DELETE FROM custom_cluster_roles WHERE id = ?', (role_id,)
            )
            await self._db_conn.commit()
            return cursor.rowcount > 0

    # ==================== 持久化 ====================

    async def _periodic_flush(self):
        """定期刷新脏数据到数据库"""
        while True:
            try:
                await asyncio.sleep(CACHE_FLUSH_INTERVAL)
                await self._flush_all_dirty()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[教育数据存储] 定期刷新失败: {e}")

    async def _flush_all_dirty(self):
        """刷新所有脏数据"""
        async with self._lock:
            if not self._dirty:
                return

            for key in list(self._dirty.keys()):
                try:
                    await self._flush_key_unlocked(key)
                except Exception as e:
                    print(f"[教育数据存储] 刷新失败 {key}: {e}")

    async def _flush_key(self, key: str):
        """刷新单个 key 到数据库"""
        async with self._lock:
            await self._flush_key_unlocked(key)

    async def _flush_key_unlocked(self, key: str):
        """刷新单个 key（不持有锁）"""
        if key not in self._cache:
            return

        data = self._cache[key]["data"]
        data_json = json.dumps(data, ensure_ascii=False)
        now = time.time()

        table_map = {
            "growth": "growth_data",
            "collaboration": "collaboration_data",
            "achievement": "achievement_data",
            "chat_history": "chat_history"
        }

        table = table_map.get(key)
        if not table:
            return

        if key == "chat_history":
            # 对话历史：逐会话保存
            sessions = data.get("sessions", {})
            for session_id, messages in sessions.items():
                await self._db_conn.execute('''
                    INSERT OR REPLACE INTO chat_history (session_id, messages, updated_at)
                    VALUES (?, ?, ?)
                ''', (session_id, json.dumps(messages, ensure_ascii=False), now))
        else:
            await self._db_conn.execute(f'''
                INSERT OR REPLACE INTO {table} (id, data, updated_at)
                VALUES (1, ?, ?)
            ''', (data_json, now))

        await self._db_conn.commit()

        # 标记为干净
        if key in self._dirty:
            del self._dirty[key]

    async def force_flush(self):
        """强制刷新所有缓存"""
        await self._flush_all_dirty()


# ==================== 全局实例 ====================

_cache_instance: Optional[MemoryCache] = None
_init_lock = asyncio.Lock()  # 初始化锁，防止并发初始化


async def get_cache() -> MemoryCache:
    """获取全局缓存实例（线程安全）"""
    global _cache_instance
    async with _init_lock:
        if _cache_instance is None:
            _cache_instance = MemoryCache()
            await _cache_instance.initialize()
    return _cache_instance


async def close_cache():
    """关闭缓存"""
    global _cache_instance
    if _cache_instance:
        await _cache_instance.close()
        _cache_instance = None
