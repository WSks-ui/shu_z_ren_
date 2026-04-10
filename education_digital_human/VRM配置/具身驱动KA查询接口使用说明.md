具身驱动KA查询接口使用说明
1.鉴权说明
1.鉴权
1.1 X-TOKEN计算
接口接收参数：

1.数据体：data = {"xxxx": "xxxx"} or {}

2.分配给外部的密钥：secret = "iamsecret"

3.接口方法路径（不包含host）：api_path = "/xxx/xxx?xx=xxx"

计算步骤：

1.将api_path转换为全小写形式：lower_api_path

2.将请求method方法转为小写形式：lower_method（例如:"delete"/"post"/...）

3.将data转换为json的字符串形式：sort_json_str，以python为例：json.dumps(dict(data), sort_keys=True).replace(' ', '') 

4.按照如下顺序连接字符串：lower_api_path + lower_method + sort_json_str + secret + X-TIMESTAM

  a.X-TIMESTAMP：接口秒级时间戳，距当前时间60s内有效

  b.得到sign：/xxx/xxx?xx=xxx{"xxxx": "xxxx"}iamsecret1489133053

5.将sign以utf8编码，计算md5得到X-TOKEN：ddc6457fd0b373475ac65912b797ef05

1.2 接口调用
请求接口时应该加入如下头部信息：

X-APP-ID：应用AK
X-TIMESTAMP：秒级时间戳
X-TOKEN：签名计算结果
1.3 demo代码
import time
import json
import hashlib
import requests
from urllib.parse import urljoin


def encode_with_md5(s):
    m = hashlib.md5()
    m.update(s.encode('utf-8'))
    return m.hexdigest()


def headers_need_sign(ak, secret, method, url, data):
    headers = {}
    t = int(time.time())

    data = json.dumps(dict(data), sort_keys=True).replace(' ', '')
    ori_sign = '{0}{1}{2}{3}{4}'.format(url.lower(), method.lower(), data, secret, t)
    sign = encode_with_md5(ori_sign)
    headers["X-APP-ID"] = ak
    headers["X-TOKEN"] = sign
    headers["X-TIMESTAMP"] = str(t)
    return headers


if __name__ == '__main__':
    ak = '37514ac0-3fce-4f4c-bc3f-86eba37da7dd'
    secret = 'bb81b706-ef1f-443e-9e86-9df8399f796b'
    method = 'POST'
    host = 'https://nebula-agent.xingyun3d.com'
    url = '/xxx/xxx?x=xx&z=zz'
    req_data = {
        "data1": "data1",
        "data2": "data2",
    }

    # 计算获取请求headers
    req_headers = headers_need_sign(ak, secret, method, url, req_data)

    # 请求接口
    req_url = urljoin(host, url)
    resp = requests.request(method, req_url, json=req_data, headers=req_headers)


2. KA动作查询API调用
2.1 查询
host: https://nebula-agent.xingyun3d.com

请求路径：Get:  /user/v1/external/lite_ka_summary

请求参数：无

返回参数：

一级参数名

二级参数名

类型

名称

备注

error_code



int

错误码

0:成功 其他：错误

error_reason



string

错误原因



data



dict







name

string

动作名称

示例：M_CN03_show03__PointingSelf

在speak方法中使用时，仅需动作名称最后一段

例如

<speak>
  好的，请看
  <ue4event>
    <type>ka</type>
    <data><action_semantic>PointingSelf</action_semantic></data>
  </ue4event>
  左边大屏幕
</speak>


cn_name

string

动作中文名





ka_type

string

动作类型





render_image_oss

string

动作图片路径





render_movie_oss

string

动作动画路径





3.代码示例
# -- coding: utf-8 --
"""
Created on Tue Nov 11 15:04:24 2025

@author: admin
"""

import time
import json
import hashlib
import requests
from urllib.parse import urljoin

def encode_with_md5(s):
    m = hashlib.md5()
    m.update(s.encode('utf-8'))
    return m.hexdigest()
    
def headers_need_sign(ak, secret, method, url, data):
    headers = {}
    t = int(time.time())
    data = json.dumps(dict(data), sort_keys=True).replace(' ', '')
    ori_sign = '{0}{1}{2}{3}{4}'.format(url.lower(), method.lower(), data, secret, t)
    sign = encode_with_md5(ori_sign)
    headers["X-APP-ID"] = ak
    headers["X-TOKEN"] = sign
    headers["X-TIMESTAMP"] = str(t)
    return headers
    
if __name__ == '__main__':
    ak = '64b544633a474b4d9a5abec1e0df7a49' #这边填入数字人驱动的appid
    secret = '9d69026e57c34e05a454706d110ea338' #这边填入数字人驱动的appsecret
    method = 'GET'
    host = 'https://nebula-agent.xingyun3d.com'
    url = '/user/v1/external/lite_ka_summary'
    req_data = {
    }

    # 计算获取请求headers
    req_headers = headers_need_sign(ak, secret, method, url, req_data)

    # 请求接口
    req_url = urljoin(host, url)
    resp = requests.request(method, req_url, json=req_data, headers=req_headers)
    print(resp.content)