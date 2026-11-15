"""Renders the portal's link-preview cards (original grey header style, beige logo).
usage: python3 portal-i18n/og.py && node portal-i18n/og-render.cjs"""
import json, os, opencc
HERE = os.path.dirname(os.path.abspath(__file__))
cc = opencc.OpenCC('tw2sp')
ZH = dict(brand='光光猴守護平台', kick='MICRONMONKEY GUARDIAN · 2026', h1='以發聲拒絕失望，<br><em>以行動守住權利</em>',
          chips=['加入美光關工', '11/17 記者會與北上聲援', '志工招募', '未寄出的信'], lang='zh-Hant', file='og-zh-hant.png', size=82)
CARDS = [ZH,
  dict(ZH, brand=cc.convert(ZH['brand']), h1=cc.convert(ZH['h1']), chips=[cc.convert(c) for c in ZH['chips']], lang='zh-Hans', file='og-zh-hans.png'),
  dict(brand='MicronMonkey Guardian', kick='MICRON WORKERS IN TAIWAN · 2026', h1='Speak out against disappointment.<br><em>Take action to defend our rights.</em>',
       chips=['Join the Micron Affiliated Union', 'Nov 17 action', 'Volunteer', 'Unsent Letters'], lang='en', file='og-en.png', size=58),
  dict(brand='光光猴守護プラットフォーム', kick='MICRON WORKERS IN TAIWAN · 2026', h1='声を上げて失望を拒み、<br><em>行動で権利を守る</em>',
       chips=['関係企業労組に加入', '11/17 記者会見と応援行動', 'ボランティア募集', '出さなかった手紙'], lang='ja', file='og-ja.png', size=74),
  dict(brand='광광후 수호 플랫폼', kick='MICRON WORKERS IN TAIWAN · 2026', h1='목소리로 실망을 거부하고,<br><em>행동으로 권리를 지킨다</em>',
       chips=['관계기업 노조 가입', '11/17 기자회견과 연대 행동', '자원봉사 모집', '부치지 못한 편지'], lang='ko', file='og-ko.png', size=74),
  dict(brand='माइक्रोनमंकी गार्डियन', kick='MICRON WORKERS IN TAIWAN · 2026', h1='निराशा के खिलाफ आवाज़ उठाएँ,<br><em>अधिकारों के लिए कदम उठाएँ</em>',
       chips=['संबद्ध यूनियन से जुड़ें', '17 नवंबर का कार्यक्रम', 'स्वयंसेवक बनें', 'न भेजे गए पत्र'], lang='hi', file='og-hi.png', size=62)]
FONT = os.path.join(HERE, 'fonts')
jobs = []
for c in CARDS:
    chips = ''.join(f'<span>{x}</span>' for x in c['chips'])
    html = f'''<!doctype html><html lang="{c['lang']}"><head><meta charset="utf-8"><style>
@font-face{{font-family:"Deva";src:url("file://{FONT}/noto-sans-devanagari-devanagari-700-normal.woff2");font-weight:700}}
@font-face{{font-family:"Deva";src:url("file://{FONT}/noto-sans-devanagari-devanagari-900-normal.woff2");font-weight:900}}
body{{margin:0;width:1200px;height:630px;overflow:hidden;position:relative;color:#fff;font-family:"Deva",system-ui,sans-serif;background:linear-gradient(110deg,#101820,#1e2835)}}
.frame{{position:absolute;inset:26px;border:1px solid #3d4a59;border-radius:28px}}
.b{{position:absolute;left:72px;top:66px;display:flex;align-items:center;gap:16px;font-size:34px;font-weight:900}}
.b i{{font-style:normal;display:grid;place-items:center;width:64px;height:64px;border-radius:16px;background:#e8d7b3;color:#202731;font-size:38px}}
.k{{position:absolute;left:72px;top:160px;font-size:19px;letter-spacing:5px;color:#9fb0c2;font-weight:800}}
h1{{position:absolute;left:72px;top:196px;width:1060px;margin:0;font-size:{c['size']}px;line-height:1.2;font-weight:900}}
h1 em{{font-style:normal;color:#cbd5e1}}
.c{{position:absolute;left:72px;bottom:118px;display:flex;flex-wrap:wrap;gap:12px;width:1060px}}
.c span{{padding:10px 18px;border-radius:12px;background:#1e2835;border:1px solid #4a5868;font-size:22px;font-weight:800;color:#e5e7eb}}
.u{{position:absolute;left:72px;bottom:60px;font-size:21px;color:#9fb0c2}}</style></head><body><div class="frame"></div>
<div class="b"><i>🐵</i>{c['brand']}</div><div class="k">{c['kick']}</div><h1>{c['h1']}</h1><div class="c">{chips}</div><div class="u">micronmonkey.github.io</div></body></html>'''
    path = os.path.join(HERE, 'card-' + c['lang'] + '.html')
    open(path, 'w', encoding='utf8').write(html)
    jobs.append([path, os.path.join(HERE, c['file'])])
json.dump(jobs, open(os.path.join(HERE, 'og-jobs.json'), 'w'))
