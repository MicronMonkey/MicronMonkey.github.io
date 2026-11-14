/**
 * Shared signatures backend. Deploy as a Google Apps Script web app.
 * Script properties: TURNSTILE_SECRET, ALLOWED_HOSTNAME=micronmonkey.github.io.
 * Never publish the spreadsheet or place the secret in frontend source.
 */
var SHEET = 'signatures';
var ROLES = ['current','overseas','former','family','semi','worker','student','public','shareholder'];
var SITES = ['','tc','ty','other','us','jp','sg','my','cn','in','abroad'];
var HEADERS = ['time','name','role','site','message','public','lang','hidden','title','email','publicRole','publicMessage','consent','tokenHash'];
function sheet_() {
  var ss=SpreadsheetApp.getActive(), sh=ss.getSheetByName(SHEET);
  if(!sh) sh=ss.insertSheet(SHEET);
  sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
  return sh;
}
function clean_(v,max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g,' ').trim().replace(/^[=+\-@]+/,'').trim().slice(0,max);
}
function hash_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s));
}
function doPost(e) {
  var lock=LockService.getScriptLock(), locked=false;
  try {
    if(!e || !e.postData || e.postData.contents.length>12000) return json_({ok:false,error:'invalid'});
    var d=JSON.parse(e.postData.contents);
    var name=clean_(d.name,40), email=String(d.email||'').trim().toLowerCase();
    if(!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || ROLES.indexOf(d.role)<0 || d.agree!==true) return json_({ok:false,error:'invalid'});
    var props=PropertiesService.getScriptProperties(), secret=props.getProperty('TURNSTILE_SECRET'), host=props.getProperty('ALLOWED_HOSTNAME');
    if(!secret || !host || typeof d.token!=='string' || !d.token || d.token.length>2048) return json_({ok:false,error:'verification'});
    var check=JSON.parse(UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'post',payload:{secret:secret,response:d.token},muteHttpExceptions:true
    }).getContentText());
    if(check.success!==true || check.hostname!==host || check.action!=='sign') return json_({ok:false,error:'verification'});
    lock.waitLock(10000); locked=true;
    var sh=sheet_(), rows=sh.getDataRange().getValues().slice(1), tokenHash=hash_(d.token);
    if(rows.some(function(r){return r[13]===tokenHash;})) return json_({ok:false,error:'verification'});
    if(rows.some(function(r){return String(r[9]||'').replace(/^'/,'').toLowerCase()===email;})) return json_({ok:false,error:'duplicate'});
    var pub=d.pub===true;
    sh.appendRow([new Date(),name,d.role,SITES.indexOf(d.site)>=0?d.site:'',clean_(d.msg,200),pub,clean_(d.lang,8),false,clean_(d.title,80),"'"+email,pub && d.pubRole===true,pub && d.pubMsg===true,true,tokenHash]);
    return json_({ok:true});
  } catch(err) {return json_({ok:false,error:'unavailable'});}
  finally {if(locked) lock.releaseLock();}
}
function publicRow_(r) {
  var pub=r[5]===true, role=pub && r[10]===true, msg=pub && r[11]===true;
  return {t:new Date(r[0]).getTime(),name:pub?r[1]:'',title:pub?(r[8]||''):'',pub:pub,pubRole:role,role:role?r[2]:'',site:role?r[3]:'',pubMsg:msg,msg:msg?r[4]:''};
}
function doGet() {
  var rows=sheet_().getDataRange().getValues().slice(1).filter(function(r){return r[7]!==true && String(r[7]).toUpperCase()!=='TRUE';});
  return json_({count:rows.length,signatures:rows.slice(-300).reverse().map(publicRow_)});
}
function json_(o) {return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
