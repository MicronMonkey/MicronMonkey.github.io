"""Builds portal-i18n/data.js for the portal's language switcher.
- English: the EN table below (strings that had no English yet). Text already written as
  "中文 / English", and the existing .u-zh/.u-en pairs, are handled by the runtime.
- Simplified Chinese: every Chinese string on the page converted with OpenCC, plus a
  character map as a fallback for text that scripts generate (counts, dates).
usage: node portal-i18n/extract.cjs <url> > /tmp/strings.json && python3 portal-i18n/build.py /tmp/strings.json
Needs: pip install opencc"""
import json, os, re, sys, opencc

HERE = os.path.dirname(os.path.abspath(__file__))
cc = opencc.OpenCC('tw2sp')

EN = {
 '光光猴守護平台｜V3 關工重要公告與11/17行動': 'MicronMonkey Guardian | Union updates and the Nov 17 action',
 '光光猴守護平台': 'MicronMonkey Guardian',
 '我們不生產錢，我們只是香蕉農。': 'We don’t make the money — we just grow the bananas.',
 '本期時段已結束': 'This period has ended',
 '📣 重要活動｜11/17': '📣 Key event · Nov 17',
 '美光關工・11/17 記者會與北上聲援': 'Micron Affiliated Union · Nov 17 press conference and rally in Taipei',
 '拒絕黑箱協議、要求資訊透明，聲援桃園工會，呼籲儘速核發「美光關工」登記證書。': 'No closed-door agreements, full transparency, solidarity with the Taoyuan union — and a call to certify the Micron Affiliated Union without delay.',
 '11/17（二）｜記者會與北上聲援': 'Tue, Nov 17 · Press conference and rally in Taipei',
 '10:00 · 記者會與北上聲援；海報列示民進黨中央黨部及桃園市政府，確切集合與交通資訊以報名通知為準。': '10:00 · Press conference and rally. The poster lists DPP headquarters and Taoyuan City Hall; exact meeting point and transport are in the sign-up notice.',
 '報名表請依主辦方最新通知確認集合、交通與搭車資訊。': 'Please check the organizers’ latest notice for the meeting point, transport and bus details.',
 '🚍 立即報名 11/17 北上聲援・爭取關工牌 ↗': '🚍 Sign up for the Nov 17 rally · Win union certification ↗',
 '01 · MEMBERSHIP DUES / 會費繳納': '01 · MEMBERSHIP DUES',
 '11/9（一）– 11/12（四）': 'Mon, Nov 9 – Thu, Nov 12',
 '421 臺中市后里區三豐路四段 115 號': 'No. 115, Sec. 4, Sanfeng Rd., Houli Dist., Taichung 421',
 '先確認所有同仁已填入會申請，並收齊每人 NT$100。': 'First make sure everyone has submitted the membership form, and collect NT$100 from each person.',
 '備妥': 'Prepare ',
 '工號＋姓名名冊兩份': 'two copies of the roster (employee ID + name)',
 '（工會存根與代繳代表各一份）。': ' (one for the union, one for the person paying on everyone’s behalf).',
 '前往廠外繳費點，核對名單、交付現金並領回收據。': 'Go to the payment point outside the fab, check the roster, hand over the cash and collect the receipt.',
 '銅鑼、台南夥伴亦可委託台中同事代繳；後續場次以工會公告為準。': 'Colleagues in Tongluo and Tainan can ask Taichung colleagues to pay for them; later sessions follow union announcements.',
 '僅交由可信任代表處理名冊，勿在公開群組傳送完整工號與姓名。本網站不蒐集名冊。': 'Only give the roster to a trusted representative, and never post full IDs and names in public groups. This website does not collect rosters.',
 '人': '',
 '（桃園經會員大會決議，會費由桃園工會直接撥出，全體一同成為關工會員:': '(By resolution of its general meeting, the Taoyuan union pays the dues and all its members join the Affiliated Union:',
 '人）': ')',
 'HELP MAKE IT HAPPEN · 我願意幫忙': 'HELP MAKE IT HAPPEN',
 '希望承擔幹部／代表工作，和願意提供專長或時間協助的志工，請依不同管道登記。': 'If you want to serve as an organizer or representative, or volunteer your skills or time, please register through the matching channel.',
 '幹部／代表': 'Organizers / Representatives',
 '願意擔任臨時幹部？': 'Willing to serve as an interim organizer?',
 '請寄信到桃園工會信箱': 'Email the Taoyuan union',
 '；由桃園工會秘書協助轉交台中臨時幹部群。': '; the union secretary will forward it to the Taichung interim organizers.',
 '寄信申請幹部 ↗': 'Apply by email ↗',
 '志工／專長支援': 'Volunteers / Skills',
 '我想協助，但不擔任幹部': 'I want to help, but not as an organizer',
 '可選擇匿名或具名，勾選設計、活動、資料、翻譯、溝通等能幫忙的項目。': 'Sign up anonymously or with your name, and tick what you can help with: design, events, data, translation, communication and more.',
 '填寫志工意願表 ↗': 'Fill in the volunteer form ↗',
 '🔒 管理員查看志工資料（需密碼） ↗': '🔒 Admin: volunteer data (password required) ↗',
 '10/28（三）': 'Wed, Oct 28', '11/3（二）': 'Tue, Nov 3', '✓ 已完成': '✓ Done', '截止 11/6（五）': 'Until Fri, Nov 6',
 '每日雙時段': 'Two sessions daily', '11/10（二）': 'Tue, Nov 10', '11/11（三）': 'Wed, Nov 11',
 '現在－11/13（五）': 'Now – Fri, Nov 13', '11/13（五）': 'Fri, Nov 13', '11/17（二）': 'Tue, Nov 17',
 '✓ COMPLETED MILESTONES · 已達成任務': '✓ COMPLETED MILESTONES',
 '台中場｜11/10（二）': 'Taichung · Tue, Nov 10', '開放報名': 'Open for sign-up', '台中場報名 ↗': 'Sign up (Taichung) ↗',
 '台南場｜11/11（三）': 'Tainan · Wed, Nov 11', '報名中': 'Sign-up open', '台南場報名 ↗': 'Sign up (Tainan) ↗',
 '約 5,798+': 'About 5,798+',
 '📍 下午記者會｜11/3（二）13:00': '📍 Afternoon press conference · Tue, Nov 3, 13:00',
 '台中科管局門口（科雅路旗桿處）；地址：臺中市西屯區林厝里中科路 2 號。請於 13:00 前報到領取物資。可停中科管理局地下停車場。': 'Front gate of the Central Taiwan Science Park Bureau (by the flagpoles on Keya Rd.), No. 2, Zhongke Rd., Xitun Dist., Taichung. Check in before 13:00 to collect supplies. Parking is available in the bureau’s basement garage.',
 '🌙 晚上關工說明會｜11/3（二）・后里': '🌙 Evening union briefing · Tue, Nov 3 · Houli',
 '11/3 晚間后里說明會已辦理完成，保留活動資訊供參考。': 'The Nov 3 evening briefing in Houli has taken place; details are kept here for reference.',
 '志工意願登記｜匿名／具名': 'Volunteer sign-up · anonymous or named',
 '✕ 關閉': '✕ Close',
 '表單無法顯示？另開報名頁 ↗': 'Form not showing? Open it in a new page ↗',
 '表單介面已建置，後台尚未連接': 'The form is ready, but its backend is not connected yet',
 '為避免志工資料誤送或公開，正式申請前必須由管理員將附檔中的 Google Apps Script 部署至指定試算表，並在本檔設定': 'To avoid volunteer data being misdirected or exposed, an admin must deploy the attached Google Apps Script to the designated sheet and set',
 '以下為表單欄位預覽，': 'Below is a preview of the form fields; ',
 '未串接期間不開放資料提交': 'submissions are closed until it is connected',
 '匿名志工': 'Anonymous volunteer', '具名志工': 'Named volunteer',
 '姓名（具名必填）': 'Name (required if named)', '工號（選填）': 'Employee ID (optional)', '部門（選填）': 'Department (optional)', '廠區（選填）': 'Site (optional)',
 '不提供': 'Prefer not to say', '台中': 'Taichung', '桃園': 'Taoyuan', '銅鑼': 'Tongluo', '台南': 'Tainan',
 '聯絡方式（匿名選填／具名必填）': 'Contact (optional if anonymous, required if named)',
 '我能協助的工作（可複選）': 'What I can help with (choose any)',
 '海報與視覺設計': 'Posters and visual design', '群組資訊與同仁溝通': 'Group updates and talking with colleagues',
 '活動支援與現場工作': 'Event support and on-site work', '資料整理／分析／AI': 'Data organizing / analysis / AI',
 '外語翻譯': 'Translation', '媒體／影音協助': 'Media / video', '議題整理與研究': 'Issue research', '其他': 'Other',
 '可協助時段': 'When I can help', '平日白天': 'Weekday daytime', '平日晚上': 'Weekday evenings', '週末／假日': 'Weekends / holidays',
 '遠端線上': 'Remote / online', '不固定': 'Varies',
 '匿名志工不必提供姓名或工號；若留下聯絡方式則可能被識別。具名志工需填姓名及聯絡方式。': 'Anonymous volunteers don’t need to give a name or employee ID; leaving contact details may make you identifiable. Named volunteers must give a name and contact.',
 '後台尚未串接，暫無法送出': 'Backend not connected yet — cannot submit',
 '期限已過': 'Deadline passed', '截至 11/13（五）': 'Until Fri, Nov 13',
 '🐵 一起壯大美光關工': '🐵 Help the Micron Affiliated Union grow',
 '🤝 美光關係企業工會｜加入我們': '🤝 Micron Affiliated Enterprises Union · Join us',
 '關工追蹤合計': 'Union total (tracked)', '台中＋其他廠區申請': '',  # an English line already follows it
 '（桃園經會員大會決議，會費由桃園工會直接撥出，全體一同成為關工會員: 2,400 人）': '(By resolution of its general meeting, the Taoyuan union pays the dues and all 2,400 of its members join the Affiliated Union.)',
 '目標 11,000 人': 'Goal: 11,000', '立即申請加入關工 ↗': 'Apply to join the union ↗',
 '🌱 一起當志工': '🌱 Volunteer with us', '目前': 'Currently', '人報名': 'signed up', '志工報名 ↗': 'Volunteer sign-up ↗', '進入網站': 'Enter the site',
 '台中與桃園聯合作戰：原工會內部改革及成立台灣美光關係企業工會，雙線並進、兩路突破': 'Taichung and Taoyuan working together: reforming the existing unions and founding the Taiwan Micron Affiliated Enterprises Union — two tracks, one push',
 '查看美光關係企業工會常見問題 Q&A，另開新分頁': 'Open the Micron Affiliated Union FAQ in a new tab',
 '美光關工 11/17 記者會與北上聲援：拒絕黑箱協議、抗議濫訴打壓': 'Micron Affiliated Union, Nov 17 press conference and rally: no closed-door agreements, stop abusive lawsuits',
 '個人繳費流程及聯絡方式': 'How to pay dues individually and who to contact',
 '后里星巴克實際室內照片，紅色箭頭指向靠內側的會議空間': 'Photo inside the Houli Starbucks; the red arrow points to the meeting room at the back',
 '全台美光申請入會目標 11000 人': 'Taiwan-wide Micron membership goal: 11,000',
 '志工意願申請': 'Volunteer sign-up', '關閉': 'Close', '志工登記表': 'Volunteer form',
 '姓名': 'Name', '工號': 'Employee ID', '部門': 'Department', 'Email、LINE ID 或手機號碼': 'Email, LINE ID or phone number',
 '幹部/志工': 'Organizers / Volunteers', '自救時間線': 'Action timeline', '回到頂端': 'Back to top',
 '全台美光入會申請目標進度': 'Progress toward the Taiwan-wide membership goal',
 # text that scripts write at runtime
 '11/9–11/12 · 繳費期間': 'Nov 9–12 · Payment period', '· 上次同步：': '· Last sync:', '上次成功同步（台灣時間）：': 'Last successful sync (Taiwan time):',
 '今天到期': 'Due today', '台中 Google 表單': 'Taichung Google Form', '同步中…': 'Syncing…', '尚未取得': 'Not available yet',
 '展開': 'Expand', '展開已達成任務': 'Show completed milestones', '已結束': 'Ended', '收摺': 'Collapse', '收摺已達成任務': 'Hide completed milestones',
 '最近同步（台灣時間）：': 'Last sync (Taiwan time):', '統計暫時無法載入': 'Counts unavailable right now',
 '光光猴守護平台｜美光關工最新消息與 11/17 行動': 'MicronMonkey Guardian | Micron union updates and the Nov 17 action',
 # new chrome
 'ui.title': 'MicronMonkey Guardian', 'ui.lang': 'Language', 'ui.share': 'Share', 'ui.copied': 'Link copied',
 'meta.desc': 'MicronMonkey Guardian: updates from Micron workers in Taiwan — joining the Micron Affiliated Union, the Nov 17 action, volunteering, and anonymous “Unsent Letters”.',
}
ZH_UI = {'ui.title': '光光猴守護平台', 'ui.lang': '語言', 'ui.share': '分享', 'ui.copied': '連結已複製',
         'meta.desc': '光光猴守護平台：台灣美光員工的最新消息——加入美光關係企業工會、11/17 行動、志工招募與匿名心聲「未寄出的信」。'}

src = json.load(open(sys.argv[1], encoding='utf8'))
missing = [t for t in src['en'] if t not in EN]
if missing:
    print('/* untranslated (shown in Chinese): ' + json.dumps(missing, ensure_ascii=False) + ' */')
zh_all = set(src['all']) | {k for k in EN if not k.startswith(('ui.', 'meta.'))}
hans = {t: cc.convert(t) for t in zh_all}
hans.update({k: cc.convert(v) for k, v in ZH_UI.items()})
chars = sorted({c for t in zh_all for c in t if '一' <= c <= '鿿'} | {c for v in ZH_UI.values() for c in v if '一' <= c <= '鿿'})
charmap = {c: cc.convert(c) for c in chars if cc.convert(c) != c}
out = {'en': EN, 'zhHant': ZH_UI, 'zhHans': {k: v for k, v in hans.items() if v != k}, 'charmap': charmap}
open(os.path.join(HERE, 'data.js'), 'w', encoding='utf8').write(
    '/* Generated by portal-i18n/build.py. */\nwindow.PORTAL_I18N=' + json.dumps(out, ensure_ascii=False) + ';\n')
print('en', len(EN), 'hans', len(out['zhHans']), 'charmap', len(charmap), 'missing', len(missing))
