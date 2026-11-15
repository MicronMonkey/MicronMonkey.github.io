"""Writes the per-language entry pages (each with its own link preview) and updates the
share/hreflang settings in the portal page. usage: python3 portal-i18n/pages.py"""
import json, os, re, opencc
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
PAGE = 'index-lang-v1.html'; B = 'https://micronmonkey.github.io/'
cc = opencc.OpenCC('tw2sp')
ZT = '光光猴守護平台｜美光關工最新消息與 11/17 行動'
ZD = '光光猴守護平台：台灣美光員工的最新消息——加入美光關係企業工會、11/17 行動、志工招募與匿名心聲「未寄出的信」。'
L = {
 'zh-Hant': ('', 'zh_TW', ZT, ZD, 'og-zh-hant.png'),
 'zh-Hans': ('-zh-hans', 'zh_CN', cc.convert(ZT), cc.convert(ZD), 'og-zh-hans.png'),
 'en': ('-en', 'en_US', 'MicronMonkey Guardian | Micron union updates and the Nov 17 action', 'Updates from Micron workers in Taiwan: join the Micron Affiliated Union, the Nov 17 action, volunteering, and anonymous “Unsent Letters”.', 'og-en.png'),
 'ja': ('-ja', 'ja_JP', 'マイクロンの労働者を支持｜光光猴守護プラットフォーム', '台湾マイクロン従業員の最新情報。マイクロン関係企業労組への加入、11/17の行動、ボランティア募集、匿名の「出さなかった手紙」。', 'og-ja.png'),
 'ko': ('-ko', 'ko_KR', '광광후 수호 플랫폼｜마이크론 관계기업 노조 소식과 11/17 행동', '대만 마이크론 직원들의 최신 소식. 마이크론 관계기업 노조 가입, 11/17 행동, 자원봉사 모집, 익명의 「부치지 못한 편지」.', 'og-ko.png'),
 'hi': ('-hi', 'hi_IN', 'माइक्रोनमंकी गार्डियन｜माइक्रोन यूनियन की ताज़ा जानकारी और 17 नवंबर', 'ताइवान में माइक्रोन कर्मचारियों की ताज़ा जानकारी — माइक्रोन संबद्ध यूनियन से जुड़ें, 17 नवंबर का कार्यक्रम, स्वयंसेवा, और गुमनाम "न भेजे गए पत्र"।', 'og-hi.png'),
}
def fn(code): return PAGE.replace('.html', L[code][0] + '.html')
def esc(x): return x.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')
def tags(code):
    suffix, loc, title, desc, img = L[code]; url = B + fn(code); img = B + 'portal-i18n/' + img
    return '\n'.join([f'<meta content="{esc(desc)}" name="description"/>', '<meta content="website" property="og:type"/>',
        f'<meta content="{loc}" property="og:locale"/>', '<meta content="光光猴守護平台 MicronMonkey Guardian" property="og:site_name"/>',
        f'<meta content="{esc(title)}" property="og:title"/>', f'<meta content="{esc(desc)}" property="og:description"/>',
        f'<meta content="{url}" property="og:url"/>', f'<meta content="{img}" property="og:image"/>',
        '<meta content="1200" property="og:image:width"/>', '<meta content="630" property="og:image:height"/>',
        '<meta content="image/png" property="og:image:type"/>', f'<meta content="{esc(title)}" property="og:image:alt"/>',
        '<meta content="summary_large_image" name="twitter:card"/>', f'<meta content="{esc(title)}" name="twitter:title"/>',
        f'<meta content="{esc(desc)}" name="twitter:description"/>', f'<meta content="{img}" name="twitter:image"/>'])
# entry pages
for code in L:
    if code == 'zh-Hant': continue
    title = L[code][2]
    html = f'''<!doctype html>
<html lang="{code}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
{tags(code)}
<link rel="canonical" href="{B + fn(code)}">
<meta name="theme-color" content="#0f172a">
<script>location.replace('{PAGE}?lang={code}' + location.hash);</script>
<style>body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#101820;color:#f3f4f6;font-family:system-ui,sans-serif}}a{{color:#e8d7b3}}</style>
</head><body><p><a href="{PAGE}?lang={code}">{esc(title)} →</a></p></body></html>
'''
    open(os.path.join(ROOT, fn(code)), 'w', encoding='utf8').write(html)
# portal page: hreflang + share map
p = os.path.join(ROOT, PAGE); s = open(p, encoding='utf8').read()
s = re.sub(r'(<link rel="alternate" hreflang="[^"]+" href="[^"]+"/>\n?)+', '\n'.join(f'<link rel="alternate" hreflang="{c}" href="{B + fn(c)}"/>' for c in L) + '\n', s, count=1)
s = re.sub(r'window\.PORTAL_I18N_CONFIG=\{share:\{.*?\}\};', 'window.PORTAL_I18N_CONFIG={share:' + json.dumps({c: B + fn(c) for c in L}) + '};', s, count=1)
open(p, 'w', encoding='utf8').write(s)
print('pages:', [fn(c) for c in L])
