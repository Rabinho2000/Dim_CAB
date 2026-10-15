/* esquema unifilar em DXF (R12): estrutura do ficheiro, contagens iguais às do SVG, só ASCII, e o DXF redesenhado lado a lado
   com o SVG original em tests/dxf_A.png (exemplo) e tests/dxf_B.png (com gateway). Tem de dar "ERR []". */
const { chromium } = require('playwright');const fs=require('fs');
const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
/* lê o DXF em pares (código, valor) e redesenha-o em SVG (LINE, POLYLINE com largura e bulge, CIRCLE, SOLID, TEXT) */
function parseDxf(txt){const L=txt.split(/\r\n/);if(L[L.length-1]==='')L.pop();const pairs=[];
  for(let i=0;i<L.length;i+=2){const c=L[i].trim();if(!/^-?\d+$/.test(c))throw new Error(`código inválido na linha ${i+1}: "${L[i]}"`);pairs.push([+c,L[i+1]]);}return pairs;}
function entities(pairs){const s=pairs.findIndex(([c,v],i)=>c===2&&v==='ENTITIES');const out=[];let cur=null;
  for(let i=s+1;i<pairs.length;i++){const [c,v]=pairs[i];if(c===0){if(v==='ENDSEC')break;cur={type:v,g:[]};out.push(cur);}else cur.g.push([c,v]);}return out;}
function dxfToSvg(ents,W,H){const k=4;const X=x=>(+x*k).toFixed(1),Y=y=>((H-+y)*k).toFixed(1);const col={7:'#1a2028',1:'#c62828',3:'#2e7d32',5:'#1c4fa0',8:'#888'};const o=[];
  const get=(e,c)=>{const p=e.g.find(q=>q[0]===c);return p?p[1]:null;};let poly=null;
  for(const e of ents){const cl=col[get(e,62)]||'#000',dash=get(e,8)==='TRACEJADO'?' stroke-dasharray="6 4"':'';
    if(e.type==='LINE')o.push(`<line x1="${X(get(e,10))}" y1="${Y(get(e,20))}" x2="${X(get(e,11))}" y2="${Y(get(e,21))}" stroke="${cl}"${dash}/>`);
    else if(e.type==='CIRCLE')o.push(`<circle cx="${X(get(e,10))}" cy="${Y(get(e,20))}" r="${(get(e,40)*k).toFixed(1)}" fill="none" stroke="${cl}"/>`);
    else if(e.type==='POLYLINE')poly={cl,dash,w:+get(e,40)||0,closed:+get(e,70)===1,v:[]};
    else if(e.type==='VERTEX')poly.v.push([+get(e,10),+get(e,20),+get(e,42)||0]);
    else if(e.type==='SEQEND'){const p=poly;if(p.v.length===2&&p.v[0][2]===1){const r=Math.abs(p.v[1][0]-p.v[0][0])/2;o.push(`<circle cx="${X((p.v[0][0]+p.v[1][0])/2)}" cy="${Y(p.v[0][1])}" r="${((r+p.w/2)*k).toFixed(1)}" fill="${p.cl}"/>`);}
      else o.push(`<polyline points="${p.v.map(q=>X(q[0])+','+Y(q[1])).join(' ')}${p.closed?' '+X(p.v[0][0])+','+Y(p.v[0][1]):''}" fill="none" stroke="${p.cl}" stroke-width="${Math.max(1,p.w*k)}"${p.dash}/>`);poly=null;}
    else if(e.type==='SOLID'){const q=[10,11,13,12].map(c=>[get(e,c),get(e,c+10)]);o.push(`<polygon points="${q.map(([a,b])=>X(a)+','+Y(b)).join(' ')}" fill="${cl}"/>`);}
    else if(e.type==='TEXT'){const hj=+get(e,72)||0,x=hj?get(e,11):get(e,10),y=hj?get(e,21):get(e,20);
      const t=get(e,1).replace(/\\U\+([0-9A-F]{4})/g,(m,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      o.push(`<text x="${X(x)}" y="${Y(y)}" font-size="${(get(e,40)/0.72*k).toFixed(1)}" fill="${cl}" font-family="Arial"${hj===1?' text-anchor="middle"':hj===2?' text-anchor="end"':''}${get(e,7)==='NEGRITO'?' font-weight="700"':''}>${t}</text>`);}}
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${(W*k).toFixed(0)}" height="${(H*k).toFixed(0)}" style="background:#fff">${o.join('')}</svg>`;}

(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900}});
p.on('pageerror',e=>errs.push(e.message));
const html=fs.readFileSync(__dirname+'/../cabos-rt.html','utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
await p.setContent('<!doctype html><meta charset=utf-8><body>'+html);
await p.evaluate(()=>{S.obra={cliente:'Câmara do Porto',morada:'Rua de Teste 1',desenho:'SOL-001',estado:'aprovado'};render();});
const run=async name=>{
  const r=await p.evaluate(()=>{const svg=sldSVG(last);const d=svgToDxf(svg);const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
    const cnt=t=>[...doc.querySelectorAll(t)].length;
    return {svg,dxf:d.dxf,W:+doc.documentElement.getAttribute('width'),H:+doc.documentElement.getAttribute('height'),
      nText:[...doc.querySelectorAll('text')].filter(t=>t.textContent.trim()).length,nCirc:cnt('circle'),nEll:cnt('ellipse'),nArc:[...doc.querySelectorAll('path')].filter(x=>/a/.test(x.getAttribute('d'))).length};});
  fs.writeFileSync(`${__dirname}/unifilar_${name}.dxf`,r.dxf);
  let pairs;try{pairs=parseDxf(r.dxf);check(true,`${name}: DXF lido em pares código/valor (${pairs.length} pares)`);}catch(e){check(false,`${name}: ${e.message}`);return;}
  check(/^[\x09\x0a\x0d\x20-\x7e]*$/.test(r.dxf),`${name}: só ASCII (acentos como \\U+XXXX)`);
  const secs=pairs.filter(([c,v],i)=>c===2&&pairs[i-1][1]==='SECTION').map(x=>x[1]);
  check(JSON.stringify(secs)==='["HEADER","TABLES","ENTITIES"]'&&pairs[pairs.length-1][1]==='EOF',`${name}: secções HEADER, TABLES, ENTITIES e EOF`);
  check(pairs.some(([c,v])=>c===1&&v==='AC1009'),`${name}: versão R12 (AC1009)`);
  const E=entities(pairs),ty=t=>E.filter(e=>e.type===t).length;
  check(ty('POLYLINE')===ty('SEQEND')&&E.every((e,i)=>e.type!=='VERTEX'||['POLYLINE','VERTEX'].includes(E[i-1].type)),`${name}: cada POLYLINE fecha com SEQEND`);
  check(ty('TEXT')===r.nText,`${name}: ${ty('TEXT')} textos = ${r.nText} no SVG`);
  const txt=E.filter(e=>e.type==='TEXT').map(e=>e.g.find(q=>q[0]===1)[1]).join('\n');
  check(/Dono de obra: C\\U\+00E2mara do Porto/.test(txt)&&/Desenho n\\U\+00BA SOL-001/.test(txt),`${name}: legenda com o dono de obra e o nº do desenho`);
  check(E.every(e=>e.g.some(q=>q[0]===8)),`${name}: todas as entidades têm camada`);
  console.log(`   ${name}:`,Object.entries(E.reduce((a,e)=>(a[e.type]=(a[e.type]||0)+1,a),{})).map(([k,v])=>k+' '+v).join(' · '),`· arcos no SVG: ${r.nArc}`);
  /* lado a lado: SVG original | DXF redesenhado */
  const re=dxfToSvg(E,r.W*0.2,r.H*0.2);const q=await b.newPage({viewport:{width:1600,height:900}});
  await q.setContent(`<body style="margin:0;display:flex;gap:12px;background:#ddd;align-items:flex-start"><div style="width:${r.W}px;background:#fff">${r.svg}</div><div style="background:#fff">${re.replace('<svg ',`<svg style="width:${r.W}px;height:auto" viewBox="0 0 ${(r.W*0.8).toFixed(0)} ${(r.H*0.8).toFixed(0)}" `)}</div></body>`);
  await q.screenshot({path:`${__dirname}/dxf_${name}.png`,fullPage:true});await q.close();};
await run('A');
/* B: 2 × EC 30 → QFV → gateway → Qentrada (contactores com arco) */
for(const i of [4,3])await p.click(`#inv-body tr:nth-child(${i}) [data-del]`);
for(const i of [1,2])await p.selectOption(`#inv-body tr:nth-child(${i}) select[data-k=modelo]`,'SigenStor EC 30.0 TP');
await p.evaluate(()=>{S.percs=[{id:uid++,orig:'QFV',dest:'Qentrada',L:40,S:'auto',...route('13','mono')}];renderPercTable();render();});
await p.click('#addp');await p.click('[data-bt2=GW]');await p.click('#bp-add');await p.waitForTimeout(150);
await run('B');
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
