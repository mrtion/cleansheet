#!/usr/bin/env python3
"""
CleanSheet 每日博客发布脚本
用法: python3 daily_blog_publish.py <posts.json>

posts.json 格式:
{
  "slug": "shopee-settlement-guide",
  "zh": {"title": "...", "description": "...", "content_md": "..."},
  "en": {"title": "...", "description": "...", "content_md": "..."}
}

行为:
- 检查 slug 是否已存在（中英任一），存在则拒绝插入
- 插入中文版（id=post-<slug>, translation_group=post-<slug>）
- 插入英文版（id=post-<slug>-en, translation_group=post-<slug>）
- 两篇 status='published'，published_at=now
"""
import json, sys, urllib.request, datetime, re

def load_token():
    """从 cloudflare_info.md 读取正式环境 token"""
    for line in open('/home/hatch/workspace/user/files/cloudflare_info.md'):
        if '正式环境' in line:
            in_prod = True
        elif line.startswith('## ') and '正式环境' not in line:
            in_prod = False
        if in_prod and 'API Token' in line:
            return line.split('：')[-1].strip()
    raise RuntimeError('未找到正式环境 token')

TOKEN = load_token()
ACCT = "dec6981c3e06935f377720a1185d2a2f"
D1 = "eecfd1a1-b5c9-4985-91fc-9339905fe1ea"

def query(sql, params=None):
    body = {'sql': sql}
    if params:
        body['params'] = params
    req = urllib.request.Request(
        f'https://api.cloudflare.com/client/v4/accounts/{ACCT}/d1/database/{D1}/query',
        data=json.dumps(body).encode(),
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
        method='POST')
    res = urllib.request.urlopen(req, timeout=60)
    d = json.loads(res.read())
    if not d.get('success'):
        raise RuntimeError(f'D1 error: {d.get("errors")}')
    return d['result'][0]

def main():
    data = json.load(open(sys.argv[1]))
    slug = data['slug'].strip().lower()
    if not slug.replace('-', '').isalnum():
        print(f'ERROR: slug 非法: {slug}')
        sys.exit(1)

    # 检查是否已存在
    existing = query('select locale from posts where slug = ?', [slug])['results']
    if existing:
        print(f'SKIP: slug "{slug}" 已存在（{",".join(r["locale"] for r in existing)}），跳过发布')
        sys.exit(2)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    zh_id = f'post-{slug}'

    # 中文版
    query(
        'insert into posts (id, slug, title, description, content_md, status, locale, translation_group, published_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [zh_id, slug, data['zh']['title'], data['zh']['description'], data['zh']['content_md'],
         'published', 'zh', zh_id, now, now, now])

    # 英文版
    query(
        'insert into posts (id, slug, title, description, content_md, status, locale, translation_group, published_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [f'{zh_id}-en', slug, data['en']['title'], data['en']['description'], data['en']['content_md'],
         'published', 'en', zh_id, now, now, now])

    print(f'OK: 已发布 "{slug}"（中英双版）')
    print(f'  zh: {data["zh"]["title"]}')
    print(f'  en: {data["en"]["title"]}')

    # IndexNow：通知 Bing/Yandex 等搜索引擎即时收录新文章
    try:
        indexnow_key = '0efbed13f2dedafbcab3078c604a6cf0'
        post_url = f'https://tools.daintyagent.com/blog/{slug}'
        ping_url = f'https://api.indexnow.org/indexnow?url={urllib.request.quote(post_url, safe="")}&key={indexnow_key}'
        req = urllib.request.Request(ping_url, method='GET')
        res = urllib.request.urlopen(req, timeout=15)
        print(f'  IndexNow: 已通知 ({res.status}) -> {post_url}')
    except Exception as e:
        print(f'  IndexNow: 通知失败（不影响发布）: {e}')

    # Cloudflare 边缘缓存清理：/blog 列表页 SSR 但可能被边缘缓存，
    # 不清理会导致新文章数小时内在列表页不可见
    try:
        cf_text = open('/home/hatch/workspace/user/files/cloudflare_info.md').read()
        cf_prod = cf_text.split('## 正式环境')[1]
        cf_token = re.search(r'Cloudflare API Token：\s*(\S+)', cf_prod).group(1)
        cf_zone = '392b9844df3662a4f02cbe087e872ea1'
        purge_data = json.dumps({'files': [
            'https://tools.daintyagent.com/blog',
            'https://tools.daintyagent.com/blog/*',
        ]}).encode()
        purge_req = urllib.request.Request(
            f'https://api.cloudflare.com/client/v4/zones/{cf_zone}/purge_cache',
            data=purge_data,
            headers={'Authorization': f'Bearer {cf_token}', 'Content-Type': 'application/json'},
            method='POST')
        purge_res = json.loads(urllib.request.urlopen(purge_req, timeout=20).read())
        if purge_res.get('success'):
            print('  CF purge: /blog 缓存已清理')
        else:
            print(f'  CF purge: 返回失败 {purge_res.get("errors")}')
    except Exception as e:
        print(f'  CF purge: 跳过（{str(e)[:80]}）——需给 token 加 Cache Purge 权限')

if __name__ == '__main__':
    main()
