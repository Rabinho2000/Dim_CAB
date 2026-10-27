/* ---------- esquema unifilar (SVG gerado da topologia) ---------- */
function wrapTxt(t,n){const w=String(t).split(' ');const L=[];let cur='';w.forEach(x=>{if((cur+' '+x).trim().length>n&&cur){L.push(cur);cur=x;}else cur=(cur+' '+x).trim();});if(cur)L.push(cur);return L;}
const xe=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function cableShort(c){const o=c.res;if(!o)return [];const P=cableParts(o,c.loaded);
  if(P.multi)return [P.cabo+' mm²'];
  return [`F: ${P.fase}`,`N: ${P.neutro}`,`PE: ${P.terra}`];}
const icuTxt=b=>!b?'':/^S20\dM/.test(b.s)?'10/15 kA':/^S20/.test(b.s)?'6/10 kA':b.icu+' kA';
const frameA=b=>{const m=/(160|250|400|630|1000|1250)/.exec(b.s);return m?+m[1]:null;};
function cableDwg(c){const o=c.res;if(!o)return '';const P=cableParts(o,c.loaded);const t=(o.mat==='Cu'?'':'L')+(S.isol==='XLPE'?'XV':'VV');
  if(P.multi)return `Cabo (${t}) ${o.n>1?o.n+'×':''}${c.loaded===2?'3G':'5G'}${fs(o.s)} mm²`;
  const ph=c.loaded===2?1:3,g=x=>o.n>1?`${o.n}x${fs(x)}`:`1x${fs(x)}`;
  return `Cabo (${t}) ${ph}x(${g(o.s)})+1x(${g(P.sn)})+1G${fs(P.spe)} mm²`;}
function sldSVG(R){
  const SW=170,FS=10.5,ink='#1A2028',mut='#5A6672',acc='#1E8A19',red='#BF3328',blue='#1F4E9E';
  const out=[];const T=(x,y,t,o={})=>out.push(`<text x="${x}" y="${y}" font-size="${o.fs||FS}" fill="${o.c||ink}"${o.b?' font-weight="700"':''}${o.a?` text-anchor="${o.a}"`:''}>${xe(t)}</text>`);
  const Lh=(x1,y1,x2,y2,o={})=>out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.c||ink}" stroke-width="${o.w||1.4}"${o.d?` stroke-dasharray="${o.d}"`:''}/>`);
  const brkS=(x,y,c=ink)=>out.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y+6}" stroke="${c}" stroke-width="1.4"/><path d="M${x-3.5} ${y+2.5}l7 7m0 -7l-7 7" stroke="${c}" stroke-width="1.2"/><line x1="${x}" y1="${y+28}" x2="${x-10}" y2="${y+8}" stroke="${c}" stroke-width="1.4"/><line x1="${x}" y1="${y+28}" x2="${x}" y2="${y+34}" stroke="${c}" stroke-width="1.4"/><path d="M${x-8} ${y+16}l6 -3m-5 6l6 -3m-5 6l6 -3" stroke="${c}" stroke-width="1"/>`);
  const isoS=(x,y)=>out.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y+6}" stroke="${ink}" stroke-width="1.4"/><circle cx="${x}" cy="${y+9}" r="3" fill="#fff" stroke="${ink}"/><line x1="${x}" y1="${y+32}" x2="${x-11}" y2="${y+12}" stroke="${ink}" stroke-width="1.4"/><line x1="${x}" y1="${y+32}" x2="${x}" y2="${y+38}" stroke="${ink}" stroke-width="1.4"/><line x1="${x-6}" y1="${y+22}" x2="${x+12}" y2="${y+22}" stroke="${ink}" stroke-dasharray="3 2"/><line x1="${x+12}" y1="${y+18}" x2="${x+16}" y2="${y+26}" stroke="${ink}"/>`);
  const fuseS=(x,y)=>out.push(`<rect x="${x-5}" y="${y}" width="10" height="24" fill="#fff" stroke="${ink}" stroke-width="1.2"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y+24}" stroke="${ink}"/>`);
  const dstS=(x,y)=>out.push(`<rect x="${x-12}" y="${y}" width="24" height="52" fill="#fff" stroke="${ink}" stroke-width="1.4"/><path d="M${x-6} ${y+19}h12l-6 11z" fill="${ink}"/>`);
  const dot=(x,y)=>out.push(`<circle cx="${x}" cy="${y}" r="2.6" fill="${ink}"/>`);
  const arrow=(x,y,dir)=>out.push(dir==='l'?`<path d="M${x} ${y}l12 -6v12z" fill="${ink}"/>`:dir==='r'?`<path d="M${x} ${y}l-12 -6v12z" fill="${ink}"/>`:`<path d="M${x} ${y}l-6 -12h12z" fill="${ink}"/>`);
  const earth=(x,y)=>out.push(`<line x1="${x}" y1="${y-10}" x2="${x}" y2="${y+10}" stroke="${ink}" stroke-width="1.4"/><line x1="${x+4}" y1="${y-7}" x2="${x+4}" y2="${y+7}" stroke="${ink}"/><line x1="${x+8}" y1="${y-4}" x2="${x+8}" y2="${y+4}" stroke="${ink}"/>`);
  const P=new Map();const parts=n=>{n=String(n).trim();if(!P.has(n))P.set(n,qfvParts(n,R));return P.get(n);};
  const roots=quadros().filter(n=>{const q=parts(n);return q&&!q.out;});
  if(!roots.length)return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80"><text x="10" y="40" font-family="Arial" font-size="13">Sem circuitos para desenhar.</text></svg>';
  let maxX=0,maxY=0;const ext=(x,y)=>{maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);};
  /* proteção de uma saída, do barramento para baixo, como nos esquemas tipo: disjuntor + bloco diferencial, ou disjuntor + relé diferencial com toroide */
  const feederDev=(x,yb,f,port)=>{const b=f.b,bad=b&&b.icuOk===false;let y=yb;Lh(x,y,x,y+10);
    if(port){Lh(x,y,x,y+20);brkS(x,y+20);T(x-14,y+38,`${f.In}A`,{fs:10,c:blue,b:1,a:'end'});T(x-14,y+50,'entrada INV',{fs:9,c:blue,a:'end'});return y+54;}
    if(f.rele){/* toroide e relé por cima do disjuntor, como no desenho do relé */
      out.push(`<circle cx="${x}" cy="${y+20}" r="8" fill="none" stroke="${ink}" stroke-width="1.3"/>`);Lh(x,y+28,x,y+36);
      out.push(`<rect x="${x+20}" y="${y+40}" width="34" height="24" fill="#fff" stroke="${ink}" stroke-width="1.2"/>`);const cen=b&&b.dif&&b.dif.central;T(x+37,y+56,cen?'CBS-4':'RGU',{fs:8.5,a:'middle'});
      Lh(x+8,y+20,x+37,y+20,{w:1});Lh(x+37,y+20,x+37,y+40,{w:1});Lh(x+20,y+56,x+4,y+56,{w:1,d:'3 2'});
      T(x+60,y+14,cen?'Unid. central 4 E/S':'Relé diferencial',{fs:9,c:blue});T(x+60,y+25,'tipo A · 300 mA',{fs:9,c:blue});T(x+60,y+36,'sens. regulável',{fs:9,c:blue});T(x+60,y+47,'bobine de emissão',{fs:9,c:blue});
      y+=36;brkS(x,y,bad?red:ink);const fa=frameA(b);T(x+14,y+56,`${fa&&fa!==f.In?fa+'A/'+f.In+'A*':f.In+'A'}`,{fs:10,c:blue,b:1});T(x+14,y+68,`Icc ${icuTxt(b)} · ${f.poles}P`,{fs:9,c:blue});y+=34;}
    else{/* bloco diferencial (oval) por cima do disjuntor modular, como no desenho do bloco diferencial */
      if(b&&b.dif){const m=/-(\d+)\/([\d,]+)/.exec(b.dif.name);const mA=m?(m[2]==='0,3'||m[2]==='03'?'300':m[2]==='0,5'?'500':m[2]):'300';
        brkS(x,y,bad?red:ink);out.push(`<ellipse cx="${x}" cy="${y+40}" rx="9" ry="5" fill="none" stroke="${ink}" stroke-width="1.2"/>`);
        T(x-14,y+18,`${m?m[1]:f.In}A`,{fs:10,c:blue,b:1,a:'end'});T(x-14,y+30,`${mA}mA`,{fs:9,c:blue,a:'end'});Lh(x,y+34,x,y+70);y+=70;}
      else{Lh(x,y,x,y+30);y+=30;}
      brkS(x,y,bad?red:ink);T(x-14,y+18,`${f.In}A`,{fs:10,c:blue,b:1,a:'end'});T(x-14,y+30,`Icc ${icuTxt(b)}`,{fs:9,c:blue,a:'end'});y+=34;}
    return y;};
  const ROLE={QFV:'Quadro fotovoltaico',INT:'Quadro de interligação',CONT:'Quadro de contagem',CLI:'Quadro do cliente (existente)',GW:'Gateway Sigenergy'};
  const contS=(x,y)=>out.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y+6}" stroke="${ink}" stroke-width="1.4"/><path d="M${x-4} ${y+6}a4 4 0 0 0 8 0" fill="none" stroke="${ink}" stroke-width="1.2"/><line x1="${x}" y1="${y+28}" x2="${x-10}" y2="${y+8}" stroke="${ink}" stroke-width="1.4"/><line x1="${x}" y1="${y+28}" x2="${x}" y2="${y+34}" stroke="${ink}" stroke-width="1.4"/>`);
  const meterBox=(mx,my,m,title)=>{out.push(`<rect x="${mx}" y="${my}" width="96" height="68" fill="#fff" stroke="${ink}" stroke-width="1.4"/><rect x="${mx+9}" y="${my+20}" width="78" height="38" fill="none" stroke="${ink}"/>`);
    T(mx+48,my+13,title||'Quadro de contagem',{fs:8.3,a:'middle',c:blue});T(mx+48,my+44,'kWh',{fs:11,a:'middle',b:1});T(mx,my+82,m.name.replace(/ \(.*\)/,'')+(m.type==='direta'?' · direta':' · indireta'),{fs:9,c:blue});ext(mx+110,my+90);};
  const tiS=(x,y,lbl,left)=>{out.push(`<circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="${ink}" stroke-width="1.3"/><circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${ink}"/>`);T(left?x-12:x+14,left?y-8:y+4,lbl,{fs:9.5,c:blue,b:1,a:left?'end':'start'});};
  const cableTxt=(x,y,c)=>{const cd=cableDwg(c),k2=cd.indexOf(') ');T(x,y,(c.code?c.code+' · ':'')+cd.slice(0,k2+1),{fs:9.2,c:acc,b:1});T(x,y+12,cd.slice(k2+2),{fs:9.2,c:acc,b:1});T(x,y+25,`${fs(c.L)} m · ΔU ${fmt(c.res.du,2)} %`,{fs:8.8,c:mut});};
  const inverterAt=(cx,yi,c)=>{const k=R.invC.indexOf(c);out.push(`<rect x="${cx-34}" y="${yi}" width="68" height="40" rx="3" fill="#fff" stroke="${ink}" stroke-width="1.4"/><line x1="${cx-34}" y1="${yi+40}" x2="${cx+34}" y2="${yi}" stroke="${ink}"/>`);
    T(cx-28,yi+14,'=',{fs:12});T(cx+28,yi+34,'~',{fs:14,a:'end'});T(cx,yi+56,`Inversor ${k+1}`,{b:1,a:'middle'});T(cx,yi+69,c.modelo,{c:mut,fs:9.3,a:'middle'});T(cx,yi+81,`${fmt(c.p,1)} kW · ${c.fases===1?'1F':'3F'}`,{c:mut,fs:9.3,a:'middle'});ext(cx+90,yi+90);};
  /* espaço à esquerda que um quadro precisa para o quadro de contagem com TI */
  const leftNeed=n=>{const q=parts(n);return q&&q.meter&&!q.meterIn&&q.meter.type==='indireta'?140:0;};
  /* ligação de um quadro a jusante (filho) a uma saída: desce, segue à direita com seta e entra por cima */
  const routeTo=(cx,ye,tx,ty,ry,c,lblX)=>{Lh(cx,ye,cx,ry);Lh(cx,ry,tx,ry);arrow(cx+14,ry,'l');Lh(tx,ry,tx,ty);cableTxt(lblX??cx+30,ry-30,c);};
  const drawChild=(child,bx,cy)=>{const r=drawBoard(child,bx,cy);return r;};
  /* gateway Sigenergy: rede (QF1 + KM1), backup / Q. Entrada, gerador (QF2 + KM2), DST, bypass QS1 e uma proteção por entrada de inversor */
  const drawGateway=(n,x0,y0,o={})=>{const q=parts(n);const sp=q.spec,mainA=gwMainA(sp),portA=gwPortA(sp),hasKM=!sp||!/^Home/.test(sp.modelo);
    const fl=q.feeders;const W=Math.max(4*SW+60,40+(fl.length+1)*SW+20),BH=290,yb=y0+150;const xs=new Map();const drawn=new Map();
    const gx=x0+60,bkx=x0+60+SW,gnx=x0+60+2*SW;
    out.push(`<rect x="${x0}" y="${y0}" width="${W}" height="${BH}" fill="none" stroke="${ink}" stroke-width="1.6"/>`);
    T(x0+W-10,y0+18,`${sp?sp.modelo:(q.gw.modelo||'Gateway')}`,{b:1,fs:13,a:'end'});T(x0+W-10,y0+32,`${n} · ${sp?sp.gama:'Sigenergy'} · ${q.gw.In} A ${+q.gw.fases===1?'230/1+1':'230/3+1'}`,{c:mut,fs:9.5,a:'end'});T(x0+W-10,y0+45,'equipamento do fabricante',{c:mut,fs:9,a:'end'});
    /* rede */
    Lh(gx,y0,gx,y0+22);brkS(gx,y0+22);T(gx+14,y0+40,`QF1 · ${mainA||'—'}A`,{fs:9.5,c:blue,b:1});T(gx+14,y0+52,'rede',{fs:9,c:blue});
    if(hasKM){Lh(gx,y0+56,gx,y0+70);contS(gx,y0+70);T(gx+14,y0+92,'KM1',{fs:9,c:blue});Lh(gx,y0+104,gx,yb);}else Lh(gx,y0+56,gx,yb);
    /* backup / cargas */
    Lh(bkx,y0,bkx,y0+22);brkS(bkx,y0+22);T(bkx+14,y0+40,`QF${hasKM?3:5} · ${mainA||'—'}A`,{fs:9.5,c:blue,b:1});T(bkx+14,y0+52,'backup / cargas',{fs:9,c:blue});Lh(bkx,y0+56,bkx,yb);
    /* gerador */
    Lh(gnx,y0-34,gnx,y0+22);brkS(gnx,y0+22);T(gnx+14,y0+40,`QF2 · ${mainA||'—'}A`,{fs:9.5,c:blue,b:1});T(gnx+14,y0+52,'gerador',{fs:9,c:blue});
    if(hasKM){Lh(gnx,y0+56,gnx,y0+70);contS(gnx,y0+70);T(gnx+14,y0+92,'KM2',{fs:9,c:blue});Lh(gnx,y0+104,gnx,yb);}else Lh(gnx,y0+56,gnx,yb);
    out.push(`<circle cx="${gnx}" cy="${y0-48}" r="13" fill="#fff" stroke="${ink}" stroke-width="1.3"/>`);T(gnx,y0-44,'G',{fs:11,a:'middle',b:1});T(gnx+18,y0-44,'Gerador (opcional)',{fs:9,c:mut});
    /* bypass */
    Lh(gx,y0+12,bkx,y0+12,{d:'4 3',w:1});T(gx+20,y0+9,'QS1 bypass',{fs:8.5,c:mut});
    out.push(`<line x1="${x0+20}" y1="${yb}" x2="${x0+W-20}" y2="${yb}" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`);T(x0+24,yb+16,'3F + N',{fs:9,c:blue});
    let sx=x0+40,cy=y0+BH+90;
    fl.forEach((f,i)=>{const cx=sx+SW/2;sx+=SW;Lh(cx,yb,cx,yb+20);brkS(cx,yb+20);T(cx-14,yb+38,`${portA||f.In}A`,{fs:10,c:blue,b:1,a:'end'});T(cx-14,yb+50,`INV${i+1}`,{fs:9,c:blue,a:'end'});const ye=yb+54;
      if(f.c.kind==='inv'){Lh(cx,ye,cx,y0+BH+150);cableTxt(cx+8,y0+BH+22,f.c);inverterAt(cx,y0+BH+150,f.c);return;}
      const child=f.c.ref.orig.trim();
      if(f.c.split){const grp=fl.filter(g=>g.c.split&&g.c.ref.orig.trim()===child),k=grp.indexOf(f);
        if(!drawn.has(child)){const top=cy+grp.length*14;const r=drawBoard(child,x0+W+70+leftNeed(child),top);drawn.set(child,{top,xs:r.xs,ent:r.entryY});cy=r.bot+110+grp.length*14;}
        const D=drawn.get(child),tx=D.xs.get(f.c.sub)||x0+W+130,ry=D.top-40-k*14;Lh(cx,ye,cx,ry);Lh(cx,ry,tx,ry);arrow(cx+14,ry,'l');Lh(tx,ry,tx,D.top);cableTxt(tx+6,D.top-32,f.c);}
      else{const bx=x0+W+70+leftNeed(child),ry=cy-40;routeTo(cx,ye,bx+60,cy,ry,f.c);const r=drawBoard(child,bx,cy);cy=r.bot+110;}});
    /* DST do gateway */
    {const dx=sx+SW/2;Lh(dx,yb,dx,yb+30);dstS(dx,yb+30);T(dx+18,yb+48,'DST',{b:1,fs:10,c:blue});T(dx+18,yb+60,'Tipo 2',{fs:9,c:blue});Lh(dx,yb+82,dx,yb+96);out.push(`<path d="M${dx-10} ${yb+96}h20M${dx-7} ${yb+100}h14M${dx-4} ${yb+104}h8" stroke="${ink}" stroke-width="1.2"/>`);}
    if(!o.root&&!o.flip){T(bkx+8,y0-10,'cargas de backup (se existirem)',{fs:8.5,c:mut});}
    ext(x0+W,y0+BH);
    return {bot:Math.max(y0+BH,cy-110,...(fl.some(f=>f.c.kind==='inv')?[y0+BH+240]:[])),xs,entryX:gx,backupX:bkx,right:x0+W,W};
  };
  /* desenha um quadro com o canto superior esquerdo em (x0,y0); a entrada chega por cima em ex */
  const drawBoard=(n,x0,y0)=>{const q=parts(n);n=String(n).trim();if(q.role==='GW')return drawGateway(n,x0,y0);
    const isNew=q.role==='QFV'||q.role==='INT'||q.role==='CONT',spl=!!q.split,cont=q.role==='CONT';const xs=new Map(),drawn=new Map();
    const invF=q.feeders.filter(f=>f.c.kind==='inv'),subF=q.feeders.filter(f=>f.c.kind!=='inv');const fl=invF.concat(subF);
    const m=q.meter&&!q.meterIn?q.meter:null;const ex=x0+60;
    /* contagem direta: quadro de contagem em série no cabo de chegada, por cima do quadro */
    let Y0=y0;if(m&&m.type==='direta'&&!spl){Lh(ex,y0,ex,y0+16);meterBox(ex-48,y0+16,m);Lh(ex,y0+84,ex,y0+120);Y0=y0+120;}
    const ES=spl?20:cont?(q.meter.type==='indireta'?300:220):isNew?180:110;const nS=fl.length+(isNew&&!spl&&!cont?1:0)+(q.aux&&!spl?1:0);
    const W=Math.max(ES+nS*SW+(spl?150:10),isNew?0:280),BH=cont?250:isNew?320:250;
    const yb=Y0+(spl?(m?150:130):cont?130:isNew?(m?120:100):50),ype=Y0+BH-22;
    out.push(`<rect x="${x0}" y="${Y0}" width="${W}" height="${BH}" fill="none" stroke="${isNew?ink:mut}" stroke-width="${isNew?1.6:1.2}"${isNew?'':' stroke-dasharray="7 4"'}/>`);
    T(x0+W-10,Y0+18,n,{b:1,fs:13,a:'end'});T(x0+W-10,Y0+32,ROLE[q.role],{c:mut,fs:9.5,a:'end'});
    if(isNew)T(x0+W-10,Y0+45,'IP65 · Classe II · IK10',{c:mut,fs:9.5,a:'end'});
    if(isNew&&typeof pintNode==='function'&&pintNode(R)===n)T(x0+W-10,Y0+58,'Proteção de interface (a especificar)',{c:blue,fs:9.5,b:1,a:'end'});
    if(cont){/* quadro de contagem: contador no próprio quadro */const mm=q.meter;
      if(mm.type==='direta'){Lh(ex,Y0,ex,Y0+20);out.push(`<rect x="${ex-40}" y="${Y0+20}" width="80" height="44" fill="#fff" stroke="${ink}" stroke-width="1.3"/>`);T(ex,Y0+47,'kWh',{fs:11,a:'middle',b:1});T(ex+48,Y0+40,mm.name.replace(/ \(.*\)/,''),{fs:9,c:blue});T(ex+48,Y0+52,'contagem direta',{fs:9,c:blue});Lh(ex,Y0+64,ex,yb);}
      else{Lh(ex,Y0,ex,yb);tiS(ex,Y0+50,`${mm.ti}/5 A`,true);out.push(`<rect x="${ex+70}" y="${Y0+24}" width="80" height="44" fill="#fff" stroke="${ink}" stroke-width="1.3"/>`);T(ex+110,Y0+51,'kWh',{fs:11,a:'middle',b:1});Lh(ex+9,Y0+50,ex+70,Y0+50,{w:1});T(ex+70,Y0+82,mm.name.replace(/ \(.*\)/,'')+' · indireta',{fs:9,c:blue});}
      out.push(`<line x1="${x0+20}" y1="${yb}" x2="${x0+W-20}" y2="${yb}" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`);}
    else if(isNew&&!spl){isoS(ex,Y0+18);T(ex+20,Y0+30,'Interruptor Corte',{fs:9,c:blue});T(ex+20,Y0+42,`4P · ${q.corte.In} A`,{fs:10,c:blue,b:1});Lh(ex,Y0,ex,Y0+18);Lh(ex,Y0+56,ex,yb);
      if(m&&m.type==='indireta'){const ty=Y0+84;tiS(ex,ty,`${m.ti}/5 A`);const mx=x0-126;Lh(ex-9,ty,x0-30,ty,{w:1});out.push(`<path d="M${x0-30} ${ty}l-9 -5v10z" fill="#fff" stroke="${ink}"/>`);meterBox(mx,ty-34,m);}
      out.push(`<line x1="${x0+20}" y1="${yb}" x2="${x0+W-20}" y2="${yb}" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`);T(ex-8,yb+16,'3F + N',{fs:9,c:blue,a:'end'});}
    else if(!spl){Lh(ex,Y0,ex,yb);out.push(`<line x1="${x0+20}" y1="${yb}" x2="${x0+W-20}" y2="${yb}" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`);}
    if(spl&&m){/* sem barramento comum: um trio de TI no QFV por onde passam todos os circuitos, para o quadro de contagem */const mx=x0-126,my=Y0+40;meterBox(mx,my,m);T(mx,my+96,'TI no QFV',{fs:9,c:blue});}
    const tiX=[];
    ext(x0+W,Y0+BH);
    const peX=[];let sx=x0+ES;let cy=Y0+BH+90;
    fl.forEach(f=>{const cx=sx+SW/2;
      if(spl&&f.c.kind==='inv'){/* entrada vinda do gateway pelo topo; sem DST no QFV: o gateway já tem DST */
        Lh(cx,Y0,cx,yb);
        if(m)tiX.push(cx);}
      if(f.c.kind==='inv')xs.set(f.c,cx);
      const ye=feederDev(cx,yb,f);sx+=SW;
      if(f.c.kind==='inv'){const c=f.c,yi=Y0+BH+150;Lh(cx,ye,cx,yi);if(isNew)peX.push(cx);cableTxt(cx+8,Y0+BH+22,c);inverterAt(cx,yi,c);}
      else{const child=f.c.ref.orig.trim(),bx=x0+W+70+leftNeed(child),ry=cy-40;if(isNew)peX.push(cx);
        routeTo(cx,ye,bx+60,cy,ry,f.c);const r=drawBoard(child,bx,cy);cy=r.bot+110;}});
    /* o mesmo trio de TI abraça todos os circuitos que vão para o gateway */
    if(tiX.length){const ty=Y0+130,xa=Math.min(...tiX)-16,xb=Math.max(...tiX)+16;
      out.push(`<rect x="${xa}" y="${ty-9}" width="${xb-xa}" height="18" rx="9" fill="none" stroke="${ink}" stroke-width="1.3"/><rect x="${xa+4}" y="${ty-5}" width="${xb-xa-8}" height="10" rx="5" fill="none" stroke="${ink}"/>`);
      T(xa-12,ty-8,`${m.ti}/5 A`,{fs:9.5,c:blue,b:1,a:'end'});Lh(xa,ty,x0-30,ty,{w:1,d:'3 2'});}
    if(isNew&&!cont){if(!spl&&q.dst){const dx=sx+SW/2;Lh(dx,yb,dx,yb+16);let y=yb+16;
      if(q.dst.brk){brkS(dx,y);T(dx+12,y+16,`${q.dst.brk}A`,{fs:9.5,c:blue,b:1});T(dx+12,y+28,'3P · S800P',{fs:9,c:blue});y+=34;Lh(dx,y,dx,y+6);y+=6;}else{Lh(dx,y,dx,y+40);y+=40;}
      dstS(dx,y);T(dx+18,y+16,'DST',{b:1,fs:10,c:blue});T(dx+18,y+28,'Tipo 2',{fs:9.5,c:blue});T(dx+18,y+40,'230/3+1',{fs:9.5,c:blue});Lh(dx,y+52,dx,ype);peX.push(dx);sx+=SW;}
      if(q.aux&&!spl){const ax=sx+40;Lh(ax,yb,ax,yb+12);brkS(ax,yb+12);out.push(`<ellipse cx="${ax}" cy="${yb+52}" rx="9" ry="5" fill="none" stroke="${ink}" stroke-width="1.2"/>`);T(ax+14,yb+30,'25A',{fs:10,c:blue,b:1});T(ax+14,yb+42,'300mA',{fs:9,c:blue});
        Lh(ax,yb+46,ax,yb+80);Lh(ax,yb+80,ax+60,yb+80);[[ax,'16A'],[ax+60,'10A']].forEach(([x,l])=>{Lh(x,yb+80,x,yb+92);brkS(x,yb+92);Lh(x,yb+126,x,ype+14);T(x+6,yb+144,l,{fs:10,c:blue,b:1});});
        T(ax-10,ype-30,'Serviços auxiliares',{fs:9,c:mut});sx+=SW;}
      Lh(x0+20,ype,x0+W-40,ype,{w:1.2});peX.forEach(x=>dot(x,ype));earth(x0+W-30,ype);T(x0+22,ype-6,'PE',{fs:9.5,b:1,c:blue});}
    return {bot:Math.max(Y0+BH,cy-110,...(invF.length?[Y0+BH+240]:[])),xs,entryX:ex,right:x0+W,W};
  };
  let y=90;
  roots.forEach(r=>{const q=parts(r);
    /* gateway ligado diretamente ao quadro do cliente: rede no gateway e o quadro do cliente na saída de backup, como nos esquemas tipo */
    const gwF=q.feeders.length&&q.feeders.every(f=>f.c.kind!=='inv'&&gwOf(f.c.ref.orig))?q.feeders:null;
    if(gwF&&gwF.length===1){y+=60;const f=gwF[0],g=f.c.ref.orig.trim();T(80,30,'Rede',{b:1,fs:12});Lh(80,40,80,y);arrow(80,y-2,'d');
      const gr=drawGateway(g,20,y,{flip:true});const cxr=gr.right+90;
      out.push(`<rect x="${cxr}" y="${y-30}" width="260" height="130" fill="none" stroke="${mut}" stroke-width="1.2" stroke-dasharray="7 4"/>`);T(cxr+250,y-12,r,{b:1,fs:13,a:'end'});T(cxr+250,y+2,'Quadro do cliente · cargas de backup',{c:mut,fs:9.5,a:'end'});
      out.push(`<line x1="${cxr+20}" y1="${y+60}" x2="${cxr+240}" y2="${y+60}" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`);
      const ry=y-100;Lh(gr.backupX,y,gr.backupX,ry);Lh(gr.backupX,ry,cxr+60,ry);Lh(cxr+60,ry,cxr+60,y+60);arrow(cxr+46,ry,'r');cableTxt(gr.backupX+20,ry-30,f.c);ext(cxr+270,y+110);
      y=gr.bot+120;return;}
    T(80,30,'Rede',{b:1,fs:12});Lh(80,40,80,y);arrow(80,y-2,'d');const bot=drawBoard(r,20,y).bot;y=bot+120;});
  const Wt=Math.max(maxX+40,820),yT=maxY+40,Ht=yT+70;
  const dt=new Date().toLocaleDateString('pt-PT',{month:'long',year:'numeric'});
  out.push(`<rect x="20" y="${yT}" width="${Wt-40}" height="54" fill="none" stroke="${ink}" stroke-width="1.2"/><line x1="${Wt*0.45}" y1="${yT}" x2="${Wt*0.45}" y2="${yT+54}" stroke="${ink}"/><line x1="${Wt*0.78}" y1="${yT}" x2="${Wt*0.78}" y2="${yT+54}" stroke="${ink}"/>`);
  T(32,yT+22,'Esquema unifilar - Instalação fotovoltaica',{b:1,fs:13});T(32,yT+40,'Projeto Elétrico · Solcor',{c:mut,fs:9.5});
  T(Wt*0.45+12,yT+22,`Dono de obra: ${(S.obra&&S.obra.cliente)||'—'}`,{fs:10.5});T(Wt*0.45+12,yT+40,`Local: ${(S.obra&&S.obra.morada)||S.loc||'—'}`,{fs:10.5});
  T(Wt*0.78+12,yT+22,`Data: ${dt}`,{fs:10.5});T(Wt*0.78+12,yT+40,`Desenho nº ${(S.obra&&S.obra.desenho)||''}${S.obra?` · Rev. ${S.obra.rev||'A'}`:''}`,{fs:10.5,c:S.obra&&S.obra.desenho?undefined:mut});
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Wt}" height="${Ht}" viewBox="0 0 ${Wt} ${Ht}" font-family="Arial, Helvetica, sans-serif"><rect width="${Wt}" height="${Ht}" fill="#fff"/>${out.join('')}</svg>`;
}
let sldLast='';
HOOKS.push(R=>{if(TAB!=='sld')return;sldLast=sldSVG(R);$('#sld').innerHTML=sldLast;});
async function svgToPng(svg,scale=2){
  const img=new Image();const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  await new Promise((ok,ko)=>{img.onload=ok;img.onerror=ko;img.src=url;});
  const cv=document.createElement('canvas');cv.width=img.width*scale;cv.height=img.height*scale;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(img,0,0,cv.width,cv.height);
  return cv;
}
function loadScript(src){return new Promise((ok,ko)=>{if([...document.scripts].some(s=>s.src===src))return ok();const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>ko(new Error('script'));document.head.appendChild(s);});}
const fileBase=()=>(S.proj||'projeto').replace(/[^\p{L}\p{N} _-]+/gu,'').trim().replace(/\s+/g,'_')||'projeto';
document.addEventListener('click',async e=>{const b=e.target.closest('[data-sld]');if(!b)return;
  const svg=sldLast||sldSVG(last);const k=b.dataset.sld;
  try{
    if(k==='svg')return saveFile(`${fileBase()}_unifilar.svg`,svg);
    if(k==='dxf')return saveFile(`${fileBase()}_unifilar.dxf`,svgToDxf(svg).dxf);
    const cv=await svgToPng(svg,2);
    if(k==='png'){const blob=await new Promise(r=>cv.toBlob(r,'image/png'));return saveFile(`${fileBase()}_unifilar.png`,blob);}
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const {jsPDF}=window.jspdf;const land=cv.width>=cv.height;const pdf=new jsPDF({orientation:land?'landscape':'portrait',unit:'mm',format:'a3',compress:true});
    const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),m=10;const r=Math.min((pw-2*m)/cv.width,(ph-2*m)/cv.height);
    pdf.addImage(cv.toDataURL('image/jpeg',0.92),'JPEG',m,m,cv.width*r,cv.height*r);
    saveFile(`${fileBase()}_unifilar.pdf`,pdf.output('blob'));
  }catch(err){toast('Não foi possível gerar o ficheiro');}
});
