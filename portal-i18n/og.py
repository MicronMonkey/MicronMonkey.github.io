"""Renders the portal's link-preview cards: python3 portal-i18n/og.py && node portal-i18n/og-render.cjs"""
import json, os, opencc
HERE = os.path.dirname(os.path.abspath(__file__))
cc = opencc.OpenCC('tw2sp')
ZH = dict(brand='光光猴守護平台', kick='MICRONMONKEY GUARDIAN · 2026', h1='以發聲拒絕失望，<br><em>以行動守住權利</em>',
          chips=['加入美光關工', '11/17 記者會與北上聲援', '志工招募', '未寄出的信'], lang='zh-Hant', file='og-zh-hant.png')
CARDS = [ZH,
  dict(ZH, brand=cc.convert(ZH['brand']), h1=cc.convert(ZH['h1']), chips=[cc.convert(c) for c in ZH['chips']], lang='zh-Hans', file='og-zh-hans.png'),
  dict(brand='MicronMonkey Guardian', kick='MICRON WORKERS IN TAIWAN · 2026', h1='Speak out against disappointment.<br><em>Take action to defend our rights.</em>',
       chips=['Join the Micron Affiliated Union', 'Nov 17 action', 'Volunteer', 'Unsent Letters'], lang='en', file='og-en.png')]
jobs = []
for c in CARDS:
    big = 66 if c['lang'] == 'en' else 82
    chips = ''.join(f'<span>{x}</span>' for x in c['chips'])
    html = f'''<!doctype html><html lang="{c['lang']}"><head><meta charset="utf-8"><style>
body{{margin:0;width:1200px;height:630px;overflow:hidden;position:relative;color:#f3f4f6;font-family:"Noto Sans CJK TC","Noto Sans TC",system-ui,sans-serif;
background:radial-gradient(ellipse at 15% 10%,rgba(227,190,128,.22),transparent 55%),radial-gradient(ellipse at 95% 100%,rgba(56,92,140,.45),transparent 60%),linear-gradient(160deg,#16202c,#0c121a)}}
.frame{{position:absolute;inset:26px;border:2px solid rgba(227,190,128,.55);border-radius:28px}}
.b{{position:absolute;left:72px;top:66px;display:flex;align-items:center;gap:16px;font-size:34px;font-weight:900}}
.b i{{font-style:normal;display:grid;place-items:center;width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#e3be80,#b88a3e);font-size:38px}}
.k{{position:absolute;left:72px;top:160px;font-size:19px;letter-spacing:5px;color:#d6b77a;font-weight:800}}
h1{{position:absolute;left:72px;top:196px;width:1060px;margin:0;font-size:{big}px;line-height:1.18;font-weight:900;letter-spacing:-.5px}}
h1 em{{font-style:normal;color:#f7cf53}}
.c{{position:absolute;left:72px;bottom:118px;display:flex;flex-wrap:wrap;gap:12px;width:1060px}}
.c span{{padding:10px 18px;border-radius:12px;background:rgba(227,190,128,.16);border:1px solid rgba(227,190,128,.55);font-size:22px;font-weight:800;color:#fbe8c4}}
.u{{position:absolute;left:72px;bottom:60px;font-size:21px;color:#9fb0c2}}</style></head><body><div class="frame"></div>
<div class="b"><i>🐵</i>{c['brand']}</div><div class="k">{c['kick']}</div><h1>{c['h1']}</h1><div class="c">{chips}</div><div class="u">micronmonkey.github.io</div></body></html>'''
    path = os.path.join(HERE, 'card-' + c['lang'] + '.html')
    open(path, 'w', encoding='utf8').write(html)
    jobs.append([path, os.path.join(HERE, c['file'])])
json.dump(jobs, open(os.path.join(HERE, 'og-jobs.json'), 'w'))
