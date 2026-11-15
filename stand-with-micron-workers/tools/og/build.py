"""Builds the per-language link-preview images (og-*.png) and the small per-language
landing pages (en/, ja/, ko/, zh-hans/) that carry each language's preview tags.
usage (from the stand-with-micron-workers folder):
  python3 tools/og/build.py && node tools/og/render.cjs
Needs: pip install opencc ; Playwright for render.cjs."""
import os, json, opencc
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BASE = 'https://micronmonkey.github.io/stand-with-micron-workers/'
cc = opencc.OpenCC('tw2sp')

ZH = dict(kick='OPEN LETTER・公開信・全球聲援', h1='挺<em>美光勞工</em>', h1size=104,
          sub='從美光員工的處境出發，<br>邀請全球各行各業一起聲援美光勞工。',
          chips=['拒絕黑箱協議', '抗議濫訴打壓', '要求誠意協商'], sites='美光全球廠區',
          title='挺美光勞工｜全球聲援 Stand with Micron Workers',
          desc='從美光員工的處境出發，邀請全球各行各業一起聲援美光勞工。拒絕黑箱協議、抗議濫訴打壓、要求誠意協商。',
          locale='zh_TW', htmllang='zh-Hant')
LANGS = {
  'zh-Hant': dict(ZH, file='og-v3.png', path=''),
  'zh-Hans': dict({k: (cc.convert(v) if isinstance(v, str) else [cc.convert(x) for x in v] if isinstance(v, list) else v) for k, v in ZH.items()},
                  kick='OPEN LETTER・公开信・全球声援', locale='zh_CN', htmllang='zh-Hans', file='og-zh-hans-v3.png', path='zh-hans/'),
  'en': dict(kick='OPEN LETTER · GLOBAL SOLIDARITY', h1='Stand with<br><em>Micron workers</em>', h1size=88,
             sub='Starting from the situation of Micron employees,<br>we invite people in every line of work, worldwide,<br>to stand with Micron workers.',
             chips=['No closed-door agreements', 'Stop abusive lawsuits', 'Good-faith negotiations'], sites='Micron sites worldwide',
             title='Stand with Micron Workers | Worldwide solidarity',
             desc='Starting from the situation of Micron employees, we invite people in every line of work, around the world, to stand with Micron workers. No closed-door agreements, stop abusive lawsuits and intimidation, demand good-faith negotiations.',
             locale='en_US', htmllang='en', file='og-en-v3.png', path='en/'),
  'ja': dict(kick='OPEN LETTER・公開書簡・世界から連帯を', h1='マイクロンの<br><em>労働者を支持</em>', h1size=84,
             sub='マイクロン従業員の置かれた状況から出発し、<br>世界中のあらゆる職業の人々に連帯を呼びかけます。',
             chips=['ブラックボックス協定を拒否', '濫訴による圧力に抗議', '誠実な交渉を要求'], sites='マイクロンの世界の拠点',
             title='マイクロンの労働者を支持｜Stand with Micron Workers',
             desc='マイクロン従業員の置かれた状況から出発し、世界中のあらゆる職業の人々に、マイクロンの労働者への連帯を呼びかけます。ブラックボックスの協定を拒否し、濫訴による圧力に抗議し、誠実な交渉を求めます。',
             locale='ja_JP', htmllang='ja', file='og-ja-v3.png', path='ja/'),
  'ko': dict(kick='OPEN LETTER · 공개서한 · 세계의 연대', h1='마이크론<br><em>노동자와 함께</em>', h1size=88,
             sub='마이크론 직원들의 처지에서 출발해,<br>전 세계 모든 직업의 사람들에게 연대를 호소합니다.',
             chips=['밀실 협약 거부', '남소 압박 항의', '성실한 교섭 요구'], sites='마이크론 글로벌 사업장',
             title='마이크론 노동자와 함께｜Stand with Micron Workers',
             desc='마이크론 직원들의 처지에서 출발해, 전 세계 모든 직업의 사람들에게 마이크론 노동자와의 연대를 호소합니다. 밀실 협약 거부, 남소와 압박 항의, 성실한 교섭 요구.',
             locale='ko_KR', htmllang='ko', file='og-ko-v3.png', path='ko/'),
}
wafer = open(os.path.join(HERE, 'wafer.svg'), encoding='utf8').read()
flags = ''.join(f'<img src="file://{ROOT}/assets/flags/{c}.svg">' for c in ['tw', 'us', 'jp', 'sg', 'my', 'cn', 'in'])

def card(L):
    serif = 'Georgia,"Times New Roman",serif' if L['htmllang'] == 'en' else '"Noto Serif CJK TC","Noto Serif TC",serif'
    chips = ''.join(f'<span>{c}</span>' for c in L['chips'])
    return f'''<!doctype html><html lang="{L['htmllang']}"><head><meta charset="utf-8"><style>
body{{margin:0;width:1200px;height:630px;background:#09060f;color:#f2edfb;font-family:"Noto Sans TC","Noto Sans CJK TC","Noto Sans CJK JP","Noto Sans CJK KR",sans-serif;overflow:hidden;position:relative}}
.g{{position:absolute;inset:0;background:radial-gradient(ellipse at 18% 25%,#7c3aed70,transparent 60%),radial-gradient(ellipse at 95% 0,#d946ef45,transparent 55%),radial-gradient(ellipse at 80% 110%,#4c1d9588,transparent 60%)}}
.t{{position:absolute;left:68px;top:58px;width:730px}}
.k{{display:inline-block;font-size:19px;letter-spacing:3px;color:#ddd6fe;border:1px solid #5b4380;border-radius:99px;padding:6px 18px;background:#1c153099}}
h1{{font-family:{serif};font-size:{L['h1size']}px;line-height:1.08;margin:22px 0 14px;font-weight:900;letter-spacing:1px}}
h1 em{{font-style:normal;background:linear-gradient(90deg,#c4b5fd,#d946ef);-webkit-background-clip:text;color:transparent}}
p.s{{font-size:26px;line-height:1.5;color:#e4dcf3;margin:0 0 20px;font-weight:700}}
.chips{{display:flex;gap:12px;flex-wrap:wrap}}
.chips span{{font-size:21px;font-weight:700;color:#fff;background:linear-gradient(135deg,#7c3aedcc,#c026d3aa);border-radius:10px;padding:8px 16px}}
.u{{position:absolute;left:68px;bottom:38px;font-size:21px;color:#8e82a8}}
.a{{position:absolute;right:30px;top:58px;width:380px}}
.fl{{position:absolute;right:52px;bottom:38px;display:flex;gap:10px;align-items:center}}
.fl small{{font-size:17px;color:#b5a9cd;margin-right:6px;font-weight:700}}
.fl img{{width:36px;height:24px;border-radius:4px;box-shadow:0 0 0 1px #ffffff40}}</style></head><body><div class="g"></div>
<div class="t"><span class="k">{L['kick']}</span><h1>{L['h1']}</h1><p class="s">{L['sub']}</p><div class="chips">{chips}</div></div>
<div class="a">{wafer}</div><div class="fl"><small>{L['sites']}</small>{flags}</div>
<div class="u">micronmonkey.github.io/stand-with-micron-workers</div></body></html>'''

def esc(x): return x.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')

jobs = []
for code, L in LANGS.items():
    out = os.path.join(HERE, f'card-{code}.html')
    open(out, 'w', encoding='utf8').write(card(L))
    jobs.append([out, os.path.join(ROOT, L['file'])])
    if not L['path']:
        continue
    url, img = BASE + L['path'], BASE + L['file']
    page = f'''<!doctype html>
<html lang="{L['htmllang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(L['title'])}</title>
<meta name="description" content="{esc(L['desc'])}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Stand with Micron Workers">
<meta property="og:locale" content="{L['locale']}">
<meta property="og:title" content="{esc(L['title'])}">
<meta property="og:description" content="{esc(L['desc'])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(L['title'])}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(L['title'])}">
<meta name="twitter:description" content="{esc(L['desc'])}">
<meta name="twitter:image" content="{img}">
<meta name="theme-color" content="#09060f">
<style>body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#09060f;color:#f2edfb;font-family:system-ui,sans-serif}}a{{color:#c4b5fd}}</style>
<script>location.replace('../?lang={code}' + location.hash);</script>
</head>
<body><p><a href="../?lang={code}">{esc(L['title'])} →</a></p></body>
</html>
'''
    os.makedirs(os.path.join(ROOT, L['path']), exist_ok=True)
    open(os.path.join(ROOT, L['path'], 'index.html'), 'w', encoding='utf8').write(page)
json.dump(jobs, open(os.path.join(HERE, 'jobs.json'), 'w'))
print('built', len(jobs), 'cards')
