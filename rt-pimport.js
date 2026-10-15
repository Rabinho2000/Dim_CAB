/* ---------- preços de cabo a partir do Excel de compras (as mesmas regras de mkprice.py), lido no navegador ---------- */
/* .xlsx = zip: lê o diretório central e descomprime com DecompressionStream('deflate-raw'), sem bibliotecas */
async function unzipEntries(buf){
  const u8=new Uint8Array(buf),dv=new DataView(buf),td=new TextDecoder();
  let e=u8.length-22;while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;
  if(e<0)throw new Error('Não é um ficheiro .xlsx válido');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const out={};
  for(let i=0;i<n;i++){
    const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
    const name=td.decode(u8.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;
    out[name]=async()=>{const lnl=dv.getUint16(off+26,true),lxl=dv.getUint16(off+28,true);const data=u8.subarray(off+30+lnl+lxl,off+30+lnl+lxl+csize);
      if(method===0)return td.decode(data);
      if(method!==8)throw new Error('Compressão não suportada no .xlsx');
      return await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();};}
  return out;
}
/* folhas do livro como matrizes de valores; células com formato de data passam a Date (como o openpyxl) */
async function readXlsx(buf){
  const z=await unzipEntries(buf),P=new DOMParser(),xml=async f=>z[f]?P.parseFromString(await z[f](),'application/xml'):null;
  const tags=(d,t)=>d?[...d.getElementsByTagName(t)]:[];
  const ss=tags(await xml('xl/sharedStrings.xml'),'si').map(si=>tags(si,'t').map(t=>t.textContent).join(''));
  const st=await xml('xl/styles.xml');const custom={};tags(st,'numFmt').forEach(f=>custom[f.getAttribute('numFmtId')]=f.getAttribute('formatCode'));
  const xfs=tags(st?st.getElementsByTagName('cellXfs')[0]:null,'xf').map(x=>{const id=+x.getAttribute('numFmtId');
    return (id>=14&&id<=22)||(id>=45&&id<=47)||(custom[id]!=null&&/[dmy]/i.test(custom[id].replace(/"[^"]*"|\[[^\]]*\]/g,'')));});
  const rels={};tags(await xml('xl/_rels/workbook.xml.rels'),'Relationship').forEach(r=>rels[r.getAttribute('Id')]=r.getAttribute('Target'));
  const sheets={};
  for(const s of tags(await xml('xl/workbook.xml'),'sheet')){
    const t=rels[s.getAttribute('r:id')]||'';const path=t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,'');const d=await xml(path);const rows=[];
    tags(d,'row').forEach(r=>{const ri=+r.getAttribute('r')-1;const row=rows[ri]=[];
      tags(r,'c').forEach(c=>{const ref=c.getAttribute('r')||'';let ci=0;for(const ch of ref.replace(/\d+/g,''))ci=ci*26+ch.charCodeAt(0)-64;ci--;
        const ty=c.getAttribute('t'),v=c.getElementsByTagName('v')[0],vt=v?v.textContent:null;let val=null;
        if(ty==='s')val=ss[+vt];else if(ty==='inlineStr')val=tags(c,'t').map(x=>x.textContent).join('');else if(ty==='str'||ty==='e')val=vt;
        else if(ty==='b')val=vt==='1';else if(vt!=null){val=+vt;if(xfs[+c.getAttribute('s')||0])val=new Date(Math.round((val-25569)*864e5));}
        row[ci]=val;});});
    sheets[s.getAttribute('name')]=Array.from(rows,r=>r||[]);}
  return sheets;
}
/* mkprice.py: folhas "JMM" (ref B, designação C, €/m D, data E) e "Indusmelec Total" (ref B, designação C, €/m H, data J) */
function pricesFromSheets(sh){
  const miss=['JMM','Indusmelec Total'].filter(n=>!sh[n]);
  if(miss.length===2)throw new Error('O livro tem de ter as folhas "JMM" e/ou "Indusmelec Total", como jmm/base.xlsx');
  const isD=v=>v instanceof Date&&!isNaN(v),str=v=>v==null?'':String(v);const rows=[];
  (sh['JMM']||[]).slice(1).forEach(r=>{if(isD(r[4]))rows.push(['JMM',str(r[1]),str(r[2]),+r[3],r[4]]);});
  (sh['Indusmelec Total']||[]).slice(1).forEach(r=>{if(isD(r[9])&&r[7]!=null)rows.push(['Indusmelec',str(r[1]),str(r[2]),+r[7],r[9]]);});
  const R=rows.filter(x=>x[4].getUTCFullYear()>=2026),desc={};
  R.forEach(([f,ref,d])=>{if(d.toUpperCase().includes('CABO')&&d.trim().length>6)desc[ref]=d;});
  const parse=(ref,d)=>{d=(d.trim().length<=6?(desc[ref]??d):d).toUpperCase().replace(/,/g,'.');let m;
    /* terminais (como mkprice.py): bimetálicos Cu/Al e de cravar em cobre; fora mangas, ponteiras isoladas e ferramentas */
    if(/TERM|BIMET/.test(d)&&!/TERMOR|AISL|PONTEIR|MATRIZ/.test(d)){
      if((m=d.match(/\bC\dAU(\d+)\b|BIMET\w*\s+(\d+)|\bTBF\s*(\d+)|CAUBT(\d+)/)))return ['Al','term',+m.slice(1).find(g=>g)];
      if((m=d.match(/\b(\d{2,3})[-\/]\d{1,2}(?:MS)?\b/))&&d.includes('TERM'))return ['Cu','term',+m[1]];
      return null;}
    if(/H07V-K.*\bV\/A|FV 6 .*VD\/AM/.test(d)){m=d.match(/(\d+(?:\.\d+)?) (?:V\/A|LIVRE)/);return m?['Cu','pe',+m[1]]:null;}
    if((m=d.match(/\bLXV(?:\/XZ1)? 1X(\d+)/)))return ['Al','mono',+m[1]];
    if((m=d.match(/\b(?:RZ1-K|XV|RV-?K|XZ1)\s+1X(\d+(?:\.\d+)?)/)))return ['Cu','mono',+m[1]];
    m=d.match(/\b(?:RZ1-?K|XV|RV-?K|RVK)\s+([345])G(\d+(?:\.\d+)?)/);if(m&&m[1]!=='4')return ['Cu','multi'+m[1],+m[2]];
    return null;};
  const best=new Map();
  R.forEach(([f,ref,d,p,dt])=>{const k=parse(ref,d);if(!k)return;const key=k.join('|'),o=best.get(key);
    let des=(desc[ref]??d).trim();
    if(k[1]==='term')des=des.split(/\r?\n/).map(l=>l.trim()).find(l=>/TERM|BIMET/i.test(l))??des;   /* guias de transporte com várias linhas */
    if(!o||dt>o.dt)best.set(key,{k,p,dt,ref,des,f});});
  const cmp=(a,b)=>a<b?-1:a>b?1:0;
  return [...best.values()].sort((a,b)=>cmp(a.k[0],b.k[0])||cmp(a.k[1],b.k[1])||a.k[2]-b.k[2])
    .map(v=>[v.k[0],v.k[1],v.k[2],Math.round(v.p*1e4)/1e4,v.dt.toISOString().slice(0,10),v.ref,v.des,v.f]);
}
/* comparação com os preços em uso: novo / mais recente / igual / mais antigo (este fica de fora, como no resto da app) */
function priceStatus(r){const o=PRICES.find(x=>x[0]===r[0]&&x[1]===r[1]&&+x[2]===+r[2]);
  if(!o)return 'novo';if(String(r[4])>String(o[4]))return 'recente';if(String(r[4])===String(o[4])&&+o[3]===+r[3])return 'igual';return 'antigo';}
const PST={novo:['Novo','ok'],recente:['Mais recente','ok'],igual:['Já está','neu'],antigo:['Mais antigo: ignorado','warn']};
let PIMP=null;
function renderPriceImport(){
  const box=$('#eq-import');if(!box)return;box.hidden=EQ!=='pr';if(EQ!=='pr')return;
  const pv=$('#eq-preview');if(!PIMP){pv.innerHTML='';return;}
  const rows=PIMP.rows.map(r=>({r,st:priceStatus(r)})),use=rows.filter(x=>x.st==='novo'||x.st==='recente');
  const can=!!DBX&&!RO;
  pv.innerHTML=`<p class="hint">${esc(PIMP.file)}: ${rows.length} preço${rows.length===1?'':'s'} de 2026 · ${use.length} para atualizar.${can?'':' A base partilhada não está disponível nesta vista: só podes descarregar o prices.json.'}</p>
    <div class="tablewrap"><table><thead><tr><th>Família</th><th class="r">Secção</th><th class="r">€/m</th><th>Compra</th><th>Fornecedor</th><th>Referência</th><th></th></tr></thead><tbody>${rows.map(({r,st})=>`<tr><td>${esc(FAMN[r[0]+'|'+r[1]]||r[0]+' '+r[1])}</td><td class="n r">${fs(r[2])}</td><td class="n r">${(+r[3]).toFixed(4).replace('.',',')}</td><td class="n">${esc(r[4])}</td><td>${esc(r[7])}</td><td class="n">${esc(r[5])}</td><td><span class="pill ${PST[st][1]}">${PST[st][0]}</span></td></tr>`).join('')}</tbody></table></div>
    <div class="actions"><button class="pri" id="pi-save"${can&&use.length?'':' disabled'}>Guardar ${use.length} preço${use.length===1?'':'s'} na base da equipa</button><button id="pi-json">Descarregar prices.json</button><button class="ghost" id="pi-cancel">Cancelar</button></div>`;
}
async function priceImportSave(){
  const use=PIMP.rows.filter(r=>['novo','recente'].includes(priceStatus(r)));let ok=0;
  for(const [mat,form,s,p,data,ref,des,forn] of use){
    try{await DBX.collection('precos').doc(docId(`${mat}_${form}_${s}_${data}`)).set({mat,form,s,p,data,ref,des,forn,autor:ME,upd:isoNow()});ok++;}
    catch(e){eqErr(e);break;}}
  if(ok){toast(`${ok} preço${ok===1?'':'s'} guardado${ok===1?'':'s'} na base da equipa`);PIMP=null;renderPriceImport();}
}
function bindPriceImport(){
  const box=$('#eq-import');if(!box)return;
  $('#eq-xlsx').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
    try{PIMP={file:f.name,rows:pricesFromSheets(await readXlsx(await f.arrayBuffer()))};renderPriceImport();}
    catch(err){PIMP=null;renderPriceImport();toast(err.message||'Não foi possível ler o Excel');}});
  $('#eq-preview').addEventListener('click',e=>{
    if(e.target.id==='pi-save')priceImportSave();
    if(e.target.id==='pi-json')saveFile('prices.json',JSON.stringify(PIMP.rows));
    if(e.target.id==='pi-cancel'){PIMP=null;renderPriceImport();}});
  document.querySelector('.eqtabs').addEventListener('click',()=>setTimeout(renderPriceImport));
  HOOKS.push(()=>{if(PIMP)renderPriceImport();});renderPriceImport();
}
