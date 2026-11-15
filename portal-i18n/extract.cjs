const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:900}});await p.goto(process.argv[3] || 'http://localhost:8000/index-lang-v1.html');await p.waitForTimeout(3500);
const r=await p.evaluate(()=>{
 const CJK=/[一-鿿]/, SPLIT=/^(.*[一-鿿].*?)\s+\/\s+([^一-鿿]+)$/;
 const en=new Set(), all=new Set();
 const w=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
 while(w.nextNode()){const n=w.currentNode,e=n.parentElement;if(!e||e.closest('script,style,noscript'))continue;const t=n.textContent.replace(/\s+/g,' ').trim();if(!CJK.test(t))continue;
  if(e.closest('.u-en,[lang="en"],.float-label-en'))continue; all.add(t);
  if(e.closest('.u-zh,.float-label-zh'))continue; if(SPLIT.test(t))continue; en.add(t);}
 document.querySelectorAll('[title],[aria-label],[alt],[placeholder]').forEach(e=>['title','aria-label','alt','placeholder'].forEach(a=>{const v=(e.getAttribute(a)||'').trim();if(v&&CJK.test(v)){all.add(v);if(!SPLIT.test(v))en.add(v)}}));
 return {en:[...en],all:[...all]}});
require('fs').writeFileSync(process.argv[2]+'/portal-strings.json',JSON.stringify(r,null,1));console.log('en',r.en.length,'all',r.all.length);await b.close()})();
