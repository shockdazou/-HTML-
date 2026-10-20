(() => {'use strict';
const cdns=['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js','https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'];
let loading;
function tryScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;const tm=setTimeout(()=>{s.remove();reject(Error('PDFライブラリの取得がタイムアウト'))},7000);s.onload=()=>{clearTimeout(tm);return window.pdfjsLib?(window.pdfjsLib.GlobalWorkerOptions.workerSrc=src.replace('pdf.min.js','pdf.worker.min.js'),resolve()):reject(Error('PDF解析ライブラリが初期化できません'))};s.onerror=()=>{clearTimeout(tm);reject(Error('PDF解析ライブラリのダウンロードに失敗'))};document.head.append(s)})}
async function load(){if(window.pdfjsLib)return window.pdfjsLib;if(!loading)loading=(async()=>{for(const url of cdns){try{await tryScript(url);return window.pdfjsLib}catch(e){}}throw Error('PDF解析ライブラリを取得できませんでした。通信制限などをご確認ください。')})();return loading}
window.addEventListener('message',async event=>{
 if(event.source!==parent||!event.data||event.data.type!=='kp-pdf-convert')return;
 const id=event.data.id;
 try{
 parent.postMessage({type:'kp-pdf-progress',id,status:'PDF解析ライブラリを読み込んでいます…（通信状況を確認中）'},'*');parent.postMessage({type:'kp-pdf-progress',id,status:'PDF解析プログラムを取得しています…'},'*');const lib=await load();
 const pdf=await lib.getDocument({data:new Uint8Array(event.data.buffer),disableWorker:true}).promise;
 parent.postMessage({type:'kp-pdf-progress',id,status:`PDFを開きました（全${pdf.numPages}ページ）。文章を抽出しています…`},'*');const pages=[];
 for(let n=1;n<=pdf.numPages;n++){parent.postMessage({type:'kp-pdf-progress',id,status:`PDF解析中：${n} / ${pdf.numPages}ページ`},'*');parent.postMessage({type:'kp-pdf-progress',id,status:`PDFを解析中：${n} / ${pdf.numPages}ページ`},'*');
 const page=await pdf.getPage(n),content=await page.getTextContent();
 let lines=[],prevY=null,line=[],prevX=null;
 for(const item of content.items){
 if(!item.str)continue;const y=Math.round(item.transform[5]);
 if(prevY!==null&&Math.abs(y-prevY)>4){lines.push(line.join(''));line=[];prevX=null}
 if(line.length&&prevX!=null&&item.transform[4]-prevX>Math.max(4,(item.height||10)*0.3))line.push(' ');
 line.push(item.str);prevY=y;prevX=item.transform[4]+(item.width||0);
 if(item.hasEOL){lines.push(line.join(''));line=[];prevY=null;prevX=null}
 }
 if(line.length)lines.push(line.join(''));pages.push(lines.join('\n'));
 }
 parent.postMessage({type:'kp-pdf-result',id,text:pages.join('\n\n')},'*');
 }catch(err){parent.postMessage({type:'kp-pdf-result',id,error:err?.message||String(err)},'*')}
});})();