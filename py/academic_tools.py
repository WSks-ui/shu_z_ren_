# -*- coding: utf-8 -*-
"""
学术工具模块 - 教育数字人专用
包含 Semantic Scholar, CrossRef, OpenAlex 等学术 API 工具
"""

import asyncio
import json
import aiohttp
from typing import Dict, List, Optional
from datetime import datetime


# ==================== Semantic Scholar API ====================

SEMANTIC_SCHOLAR_API_BASE = "https://api.semanticscholar.org/graph/v1"


async def search_semantic_scholar(
    query: str,
    max_results: int = 10,
    year_range: Optional[str] = None,
    fields: Optional[List[str]] = None
) -> str:
    """
    使用 Semantic Scholar API 搜索学术论文

    :param query: 搜索关键词
    :param max_results: 返回结果数量 (1-100)
    :param year_range: 年份范围，如 "2020-2024" 或 "2020-"
    :param fields: 返回字段列表
    :return: JSON 格式的搜索结果
    """
    if fields is None:
        fields = [
            "title", "authors", "year", "abstract",
            "citationCount", "referenceCount", "url",
            "venue", "publicationDate", "externalIds"
        ]

    params = {
        "query": query,
        "limit": min(max_results, 100),
        "fields": ",".join(fields)
    }

    if year_range:
        params["year"] = year_range

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{SEMANTIC_SCHOLAR_API_BASE}/paper/search",
                params=params,
                headers={"User-Agent": "Educational-Digital-Human/1.0"}
            ) as resp:
                if resp.status != 200:
                    return json.dumps({"error": f"API 请求失败: HTTP {resp.status}"}, ensure_ascii=False)

                data = await resp.json()

        results = []
        for paper in data.get("data", []):
            paper_info = {
                "title": paper.get("title", ""),
                "authors": [a.get("name", "") for a in paper.get("authors", [])],
                "year": paper.get("year"),
                "abstract": paper.get("abstract", "")[:500] if paper.get("abstract") else "",
                "citation_count": paper.get("citationCount", 0),
                "reference_count": paper.get("referenceCount", 0),
                "url": paper.get("url", ""),
                "venue": paper.get("venue", ""),
                "publication_date": paper.get("publicationDate", ""),
                "doi": paper.get("externalIds", {}).get("DOI", ""),
                "arxiv_id": paper.get("externalIds", {}).get("ArXiv", "")
            }
            results.append(paper_info)

        if not results:
            return json.dumps({"message": f"未找到与 '{query}' 相关的论文"}, ensure_ascii=False)

        return json.dumps({
            "query": query,
            "total": data.get("total", len(results)),
            "count": len(results),
            "results": results
        }, ensure_ascii=False, indent=2)

    except Exception as e:
        return json.dumps({"error": f"搜索失败: {str(e)}"}, ensure_ascii=False)


semantic_scholar_tool = {
    "type": "function",
    "function": {
        "name": "search_semantic_scholar",
        "description": "使用 Semantic Scholar 搜索学术论文。该数据库包含超过2亿篇论文，支持引用分析和作者信息。适合进行文献综述和学术研究。",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "搜索关键词，支持英文"
                },
                "max_results": {
                    "type": "integer",
                    "description": "返回结果数量 (1-100)",
                    "default": 10
                },
                "year_range": {
                    "type": "string",
                    "description": "年份范围，如 '2020-2024' 或 '2020-' 表示2020年以后"
                },
                "fields": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "返回字段列表，可选值: title,authors,year,abstract,citationCount,url,venue"
                }
            },
            "required": ["query"]
        }
    }
}


async def get_paper_citations(
    paper_id: str,
    max_results: int = 10
) -> str:
    """
    获取论文的引用信息

    :param paper_id: 论文 ID (DOI, ArXiv ID, 或 Semantic Scholar ID)
    :param max_results: 返回结果数量
    :return: JSON 格式的引用列表
    """
    fields = "title,authors,year,url,venue"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{SEMANTIC_SCHOLAR_API_BASE}/paper/{paper_id}/citations",
                params={"limit": max_results, "fields": fields},
                headers={"User-Agent": "Educational-Digital-Human/1.0"}
            ) as resp:
                if resp.status != 200:
                    return json.dumps({"error": f"API 请求失败: HTTP {resp.status}"}, ensure_ascii=False)

                data = await resp.json()

        citations = []
        for item in data.get("data", []):
            citing_paper = item.get("citingPaper", {})
            citations.append({
                "title": citing_paper.get("title", ""),
                "authors": [a.get("name", "") for a in citing_paper.get("authors", [])],
                "year": citing_paper.get("year"),
                "url": citing_paper.get("url", ""),
                "venue": citing_paper.get("venue", "")
            })

        return json.dumps({
            "paper_id": paper_id,
            "count": len(citations),
            "citations": citations
        }, ensure_ascii=False, indent=2)

    except Exception as e:
        return json.dumps({"error": f"获取引用失败: {str(e)}"}, ensure_ascii=False)


paper_citations_tool = {
    "type": "function",
    "function": {
        "name": "get_paper_citations",
        "description": "获取某篇论文被引用的情况，了解该论文的学术影响力",
        "parameters": {
            "type": "object",
            "properties": {
                "paper_id": {
                    "type": "string",
                    "description": "论文 ID，可以是 DOI、ArXiv ID 或 Semantic Scholar ID"
                },
                "max_results": {
                    "type": "integer",
                    "description": "返回结果数量",
                    "default": 10
                }
            },
            "required": ["paper_id"]
        }
    }
}


# ==================== CrossRef API ====================

CROSSREF_API_BASE = "https://api.crossref.org"


async def search_crossref(
    query: str,
    max_results: int = 10,
    filter_type: Optional[str] = None,
    sort: str = "relevance"
) -> str:
    """
    使用 CrossRef API 搜索学术文献

    :param query: 搜索关键词
    :param max_results: 返回结果数量
    :param filter_type: 过滤条件，如 "type:journal-article"
    :param sort: 排序方式 (relevance, published, deposited)
    :return: JSON 格式的搜索结果
    """
    params = {
        "query": query,
        "rows": min(max_results, 100),
        "sort": sort
    }

    if filter_type:
        params["filter"] = filter_type

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{CROSSREF_API_BASE}/works",
                params=params,
                headers={"User-Agent": "Educational-Digital-Human/1.0 (mailto:contact@example.com)"}
            ) as resp:
                if resp.status != 200:
                    return json.dumps({"error": f"API 请求失败: HTTP {resp.status}"}, ensure_ascii=False)

                data = await resp.json()

        results = []
        for item in data.get("message", {}).get("items", []):
            results.append({
                "title": item.get("title", [""])[0] if item.get("title") else "",
                "authors": [
                    f"{a.get('given', '')} {a.get('family', '')}".strip()
                    for a in item.get("author", [])
                ],
                "year": item.get("published-print", {}).get("date-parts", [[None]])[0][0] or
                        item.get("published-online", {}).get("date-parts", [[None]])[0][0],
                "doi": item.get("DOI", ""),
                "url": item.get("URL", ""),
                "type": item.get("type", ""),
                "container_title": item.get("container-title", [""])[0] if item.get("container-title") else "",
                "publisher": item.get("publisher", ""),
                "is_referenced_by_count": item.get("is-referenced-by-count", 0),
                "abstract": item.get("abstract", "")
            })

        if not results:
            return json.dumps({"message": f"未找到与 '{query}' 相关的文献"}, ensure_ascii=False)

        return json.dumps({
            "query": query,
            "total": data.get("message", {}).get("total-results", len(results)),
            "count": len(results),
            "results": results
        }, ensure_ascii=False, indent=2)

    except Exception as e:
        return json.dumps({"error": f"搜索失败: {str(e)}"}, ensure_ascii=False)


crossref_tool = {
    "type": "function",
    "function": {
        "name": "search_crossref",
        "description": "使用 CrossRef 搜索学术文献。CrossRef 是最大的 DOI 注册机构，包含期刊文章、会议论文、书籍等。适合查找正式发表的学术论文。",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "搜索关键词"
                },
                "max_results": {
                    "type": "integer",
                    "description": "返回结果数量 (1-100)",
                    "default": 10
                },
                "filter_type": {
                    "type": "string",
                    "description": "过滤条件，如 'type:journal-article' 或 'from-pub-date:2020'"
                },
                "sort": {
                    "type": "string",
                    "enum": ["relevance", "published", "deposited"],
                    "description": "排序方式",
                    "default": "relevance"
                }
            },
            "required": ["query"]
        }
    }
}


async def get_doi_metadata(doi: str) -> str:
    """
    根据 DOI 获取文献元数据

    :param doi: DOI 标识符
    :return: JSON 格式的文献信息
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{CROSSREF_API_BASE}/works/{doi}",
                headers={"User-Agent": "Educational-Digital-Human/1.0 (mailto:contact@example.com)"}
            ) as resp:
                if resp.status == 404:
                    return json.dumps({"error": f"未找到 DOI: {doi}"}, ensure_ascii=False)
                if resp.status != 200:
                    return json.dumps({"error": f"API 请求失败: HTTP {resp.status}"}, ensure_ascii=False)

                data = await resp.json()

        item = data.get("message", {})

        result = {
            "title": item.get("title", [""])[0] if item.get("title") else "",
            "authors": [
                {
                    "name": f"{a.get('given', '')} {a.get('family', '')}".strip(),
                    "affiliation": a.get("affiliation", [])
                }
                for a in item.get("author", [])
            ],
            "year": item.get("published-print", {}).get("date-parts", [[None]])[0][0] or
                    item.get("published-online", {}).get("date-parts", [[None]])[0][0],
            "doi": item.get("DOI", ""),
            "url": item.get("URL", ""),
            "type": item.get("type", ""),
            "container_title": item.get("container-title", [""])[0] if item.get("container-title") else "",
            "publisher": item.get("publisher", ""),
            "volume": item.get("volume", ""),
            "issue": item.get("issue", ""),
            "page": item.get("page", ""),
            "is_referenced_by_count": item.get("is-referenced-by-count", 0),
            "references_count": item.get("references-count", 0),
            "abstract": item.get("abstract", ""),
            "license": item.get("license", [])
        }

        return json.dumps(result, ensure_ascii=False, indent=2)

    except Exception as e:
        return json.dumps({"error": f"获取元数据失败: {str(e)}"}, ensure_ascii=False)


doi_metadata_tool = {
    "type": "function",
    "function": {
        "name": "get_doi_metadata",
        "description": "根据 DOI 获取文献的详细元数据，包括作者、期刊、引用次数等信息",
        "parameters": {
            "type": "object",
            "properties": {
                "doi": {
                    "type": "string",
                    "description": "DOI 标识符，如 '10.1038/nature12373'"
                }
            },
            "required": ["doi"]
        }
    }
}


# ==================== OpenAlex API ====================

OPENALEX_API_BASE = "https://api.openalex.org"


async def search_openalex(
    query: str,
    max_results: int = 10,
    filter_query: Optional[str] = None
) -> str:
    """
    使用 OpenAlex API 搜索学术文献

    :param query: 搜索关键词
    :param max_results: 返回结果数量
    :param filter_query: 过滤查询，如 "publication_year:2020-2024"
    :return: JSON 格式的搜索结果
    """
    params = {
        "search": query,
        "per_page": min(max_results, 200),
        "mailto": "contact@example.com"  # 使用 Polite Pool
    }

    if filter_query:
        params["filter"] = filter_query

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{OPENALEX_API_BASE}/works",
                params=params,
                headers={"User-Agent": "Educational-Digital-Human/1.0"}
            ) as resp:
                if resp.status != 200:
                    return json.dumps({"error": f"API 请求失败: HTTP {resp.status}"}, ensure_ascii=False)

                data = await resp.json()

        results = []
        for item in data.get("results", []):
            results.append({
                "id": item.get("id", ""),
                "title": item.get("title", ""),
                "authors": [
                    a.get("author", {}).get("display_name", "")
                    for a in item.get("authorships", [])
                ],
                "year": item.get("publication_year"),
                "doi": item.get("doi", ""),
                "url": item.get("id", "").replace("api.", ""),
                "type": item.get("type", ""),
                "venue": item.get("primary_location", {}).get("source", {}).get("display_name", ""),
                "cited_by_count": item.get("cited_by_count", 0),
                "referenced_works_count": len(item.get("referenced_works", [])),
                "open_access": item.get("open_access", {}).get("is_oa", False),
                "abstract": item.get("abstract_inverted_index", "")
            })

        if not results:
            return json.dumps({"message": f"未找到与 '{query}' 相关的文献"}, ensure_ascii=False)

        return json.dumps({
            "query": query,
            "total": data.get("meta", {}).get("count", len(results)),
            "count": len(results),
            "results": results
        }, ensure_ascii=False, indent=2)

    except Exception as e:
        return json.dumps({"error": f"搜索失败: {str(e)}"}, ensure_ascii=False)


openalex_tool = {
    "type": "function",
    "function": {
        "name": "search_openalex",
        "description": "使用 OpenAlex 搜索学术文献。OpenAlex 是一个免费开放的学术图谱，包含超过2.5亿篇文献。支持开放获取筛选。",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "搜索关键词"
                },
                "max_results": {
                    "type": "integer",
                    "description": "返回结果数量 (1-200)",
                    "default": 10
                },
                "filter_query": {
                    "type": "string",
                    "description": "过滤条件，如 'publication_year:2020-2024,is_oa:true'"
                }
            },
            "required": ["query"]
        }
    }
}


# ==================== 学术分析工具 ====================

async def analyze_research_trends(
    topic: str,
    years: int = 5
) -> str:
    """
    分析某研究主题的发展趋势

    :param topic: 研究主题
    :param years: 分析的年份数
    :return: JSON 格式的趋势分析
    """
    current_year = datetime.now().year
    start_year = current_year - years

    try:
        # 使用 OpenAlex 获取每年论文数量
        trends = []

        async with aiohttp.ClientSession() as session:
            for year in range(start_year, current_year + 1):
                params = {
                    "search": topic,
                    "filter": f"publication_year:{year}",
                    "per_page": 1,
                    "mailto": "contact@example.com"
                }

                async with session.get(
                    f"{OPENALEX_API_BASE}/works",
                    params=params
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        count = data.get("meta", {}).get("count", 0)
                        trends.append({
                            "year": year,
                            "paper_count": count
                        })

        if not trends:
            return json.dumps({"error": "无法获取趋势数据"}, ensure_ascii=False)

        # 计算增长率
        for i in range(1, len(trends)):
            prev_count = trends[i-1]["paper_count"]
            curr_count = trends[i]["paper_count"]
            if prev_count > 0:
                growth_rate = (curr_count - prev_count) / prev_count * 100
            else:
                growth_rate = 0
            trends[i]["growth_rate"] = round(growth_rate, 2)

        total_papers = sum(t["paper_count"] for t in trends)
        avg_growth = sum(t.get("growth_rate", 0) for t in trends[1:]) / max(len(trends) - 1, 1)

        return json.dumps({
            "topic": topic,
            "time_range": f"{start_year}-{current_year}",
            "total_papers": total_papers,
            "average_growth_rate": round(avg_growth, 2),
            "trend": "上升" if avg_growth > 0 else "下降" if avg_growth < 0 else "平稳",
            "yearly_data": trends
        }, ensure_ascii=False, indent=2)

    except Exception as e:
        return json.dumps({"error": f"分析失败: {str(e)}"}, ensure_ascii=False)


research_trends_tool = {
    "type": "function",
    "function": {
        "name": "analyze_research_trends",
        "description": "分析某研究主题在过去几年的发展趋势，包括论文数量变化和增长率",
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "研究主题关键词"
                },
                "years": {
                    "type": "integer",
                    "description": "分析的年份数",
                    "default": 5
                }
            },
            "required": ["topic"]
        }
    }
}


# ==================== 导出所有工具 ====================

ACADEMIC_TOOLS = [
    semantic_scholar_tool,
    paper_citations_tool,
    crossref_tool,
    doi_metadata_tool,
    openalex_tool,
    research_trends_tool
]

ACADEMIC_FUNCTIONS = {
    "search_semantic_scholar": search_semantic_scholar,
    "get_paper_citations": get_paper_citations,
    "search_crossref": search_crossref,
    "get_doi_metadata": get_doi_metadata,
    "search_openalex": search_openalex,
    "analyze_research_trends": analyze_research_trends
}
