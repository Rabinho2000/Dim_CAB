/* ---------- esquema unifilar em DXF (R12 / AC1009) para o AutoCAD, convertido a partir do SVG de sldSVG ----------
   1 px do SVG = DXF_MM mm; y invertido (o DXF cresce para cima). Camadas: UNIFILAR (traços), TEXTO, TRACEJADO (quadro do cliente, bypass, ligação dos TI;
   quadro do cliente). Linhas grossas (barramentos) como POLYLINE com espessura; setas e triângulos cheios como SOLID;
   pontos cheios como POLYLINE com bulge (donut). Texto em ASCII com \U+XXXX para acentos e símbolos. */
const DXF_MM=0.2;
const DXF_COLORS={'#1a2028':7,'#000':7,'#000000':7};
function dxfColor(c){if(!c||c==='none')return 7;c=c.toLowerCase();if(DXF_COLORS[c])return DXF_COLORS[c];
  const m=c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);if(!m)return 7;const [r,g,b]=m.slice(1).map(h=>parseInt(h,16));
  if(r>150&&g<110&&b<110)return 1;               /* vermelho: circuitos a rever */
  if(g>r+30&&g>b+30)return 3;                    /* verde: cabos */
  if(b>r+30&&b>=g)return 5;                      /* azul: calibres e notas */
  if(Math.abs(r-g)<20&&Math.abs(g-b)<20&&r>90)return 8;   /* cinzento */
  return 7;}
const dxfTxt=s=>String(s).replace(/[\r\n]+/g,' ').replace(/[^\x20-\x7e]/g,ch=>'\\U+'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0'));
/* pontos de um caminho SVG (M m L l H h V v Z z A a): lista de subcaminhos {pts:[[x,y]...], closed} */
function svgPathPts(d){
  const tok=d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g)||[];let i=0,cmd='',x=0,y=0,sx=0,sy=0;const subs=[];let cur=null;
  const num=()=>+tok[i++];const start=()=>{cur={pts:[[x,y]],closed:false};subs.push(cur);};
  while(i<tok.length){if(/[a-zA-Z]/.test(tok[i]))cmd=tok[i++];const rel=cmd===cmd.toLowerCase();
    switch(cmd.toLowerCase()){
      case 'm':{const a=num(),b=num();x=rel?x+a:a;y=rel?y+b:b;sx=x;sy=y;start();cmd=rel?'l':'L';break;}
      case 'l':{const a=num(),b=num();x=rel?x+a:a;y=rel?y+b:b;cur.pts.push([x,y]);break;}
      case 'h':{const a=num();x=rel?x+a:a;cur.pts.push([x,y]);break;}
      case 'v':{const b=num();y=rel?y+b:b;cur.pts.push([x,y]);break;}
      case 'z':{cur.closed=true;x=sx;y=sy;cmd='';if(i<tok.length&&!/[a-zA-Z]/.test(tok[i]))i++;break;}
      case 'a':{let rx=Math.abs(num()),ry=Math.abs(num());const phi=num()*Math.PI/180,fa=num(),fs=num();const a=num(),b=num();
        const x2=rel?x+a:a,y2=rel?y+b:b;
        if(rx&&ry){/* SVG 1.1 F.6.5: extremos → centro */
          const c=Math.cos(phi),s=Math.sin(phi),dx=(x-x2)/2,dy=(y-y2)/2,x1p=c*dx+s*dy,y1p=-s*dx+c*dy;
          const L=x1p*x1p/(rx*rx)+y1p*y1p/(ry*ry);if(L>1){rx*=Math.sqrt(L);ry*=Math.sqrt(L);}
          let k=Math.sqrt(Math.max(0,(rx*rx*ry*ry-rx*rx*y1p*y1p-ry*ry*x1p*x1p)/(rx*rx*y1p*y1p+ry*ry*x1p*x1p)));if(fa===fs)k=-k;
          const cxp=k*rx*y1p/ry,cyp=-k*ry*x1p/rx,cx=c*cxp-s*cyp+(x+x2)/2,cy=s*cxp+c*cyp+(y+y2)/2;
          const ang=(ux,uy,vx,vy)=>Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy);
          const t1=ang(1,0,(x1p-cxp)/rx,(y1p-cyp)/ry);let dt=ang((x1p-cxp)/rx,(y1p-cyp)/ry,(-x1p-cxp)/rx,(-y1p-cyp)/ry);
          if(!fs&&dt>0)dt-=2*Math.PI;if(fs&&dt<0)dt+=2*Math.PI;const n=Math.max(4,Math.ceil(Math.abs(dt)/(Math.PI/16)));
          for(let j=1;j<=n;j++){const t=t1+dt*j/n;cur.pts.push([cx+rx*Math.cos(t)*c-ry*Math.sin(t)*s,cy+rx*Math.cos(t)*s+ry*Math.sin(t)*c]);}}
        else cur.pts.push([x2,y2]);x=x2;y=y2;break;}
      default:i++;}}
  return subs.filter(s=>s.pts.length>1);
}
function svgToDxf(svgText){
  const doc=new DOMParser().parseFromString(svgText,'image/svg+xml'),root=doc.documentElement;
  const H=+(root.getAttribute('height')||0);const P=(x,y)=>[+(x*DXF_MM).toFixed(3),+((H-y)*DXF_MM).toFixed(3)];
  const E=[];const g=(...kv)=>{for(let k=0;k<kv.length;k+=2)E.push(kv[k],kv[k+1]);};
  const layerOf=(el)=>el.getAttribute('stroke-dasharray')?'TRACEJADO':'UNIFILAR';
  const common=(el,layer,col)=>{g(8,layer);if(layer==='TRACEJADO')g(6,'DASHED');g(62,col);};
  const filled=el=>{const f=el.getAttribute('fill');return f&&f!=='none'&&!/^#fff(fff)?$|^white$/i.test(f);};
  const poly=(el,pts,closed,w,layer,col)=>{g(0,'POLYLINE');common(el,layer,col);g(66,1,70,closed?1:0);if(w)g(40,w,41,w);
    pts.forEach(([x,y])=>{const [X,Y]=P(x,y);g(0,'VERTEX',8,layer,10,X,20,Y,30,0);});g(0,'SEQEND',8,layer);};
  const solid=(el,pts,layer,col)=>{/* SOLID: 3.º e 4.º vértices trocados em relação à ordem do contorno */
    const q=pts.length===3?[pts[0],pts[1],pts[2],pts[2]]:[pts[0],pts[1],pts[3],pts[2]];g(0,'SOLID');common(el,layer,col);
    q.forEach(([x,y],k)=>{const [X,Y]=P(x,y);g(10+k,X,20+k,Y,30+k,0);});};
  let n=0;
  for(const el of root.querySelectorAll('*')){
    const t=el.tagName.toLowerCase(),stroke=el.getAttribute('stroke'),fill=el.getAttribute('fill'),layer=layerOf(el);
    const col=dxfColor(stroke&&stroke!=='none'?stroke:fill),sw=+(el.getAttribute('stroke-width')||1);
    const w=sw>=3?+(sw*DXF_MM).toFixed(3):0;
    if(t==='line'){const a=['x1','y1','x2','y2'].map(k=>+el.getAttribute(k));
      if(w)poly(el,[[a[0],a[1]],[a[2],a[3]]],false,w,layer,col);
      else{const [X1,Y1]=P(a[0],a[1]),[X2,Y2]=P(a[2],a[3]);g(0,'LINE');common(el,layer,col);g(10,X1,20,Y1,30,0,11,X2,21,Y2,31,0);}n++;}
    else if(t==='rect'){if(!stroke||stroke==='none')continue; /* fundo branco */
      const x=+el.getAttribute('x')||0,y=+el.getAttribute('y')||0,wd=+el.getAttribute('width'),ht=+el.getAttribute('height');
      poly(el,[[x,y],[x+wd,y],[x+wd,y+ht],[x,y+ht]],true,0,layer,col);n++;}
    else if(t==='circle'){const cx=+el.getAttribute('cx'),cy=+el.getAttribute('cy'),r=+el.getAttribute('r');
      if(filled(el)&&(!stroke||stroke==='none')){/* ponto cheio: donut */
        const rr=r*DXF_MM,[X,Y]=P(cx,cy);g(0,'POLYLINE');common(el,layer,col);g(66,1,70,1,40,rr,41,rr);
        g(0,'VERTEX',8,layer,10,+(X-rr/2).toFixed(3),20,Y,30,0,42,1);g(0,'VERTEX',8,layer,10,+(X+rr/2).toFixed(3),20,Y,30,0,42,1);g(0,'SEQEND',8,layer);}
      else{const [X,Y]=P(cx,cy);g(0,'CIRCLE');common(el,layer,col);g(10,X,20,Y,30,0,40,+(r*DXF_MM).toFixed(3));}n++;}
    else if(t==='ellipse'){const cx=+el.getAttribute('cx'),cy=+el.getAttribute('cy'),rx=+el.getAttribute('rx'),ry=+el.getAttribute('ry');
      poly(el,Array.from({length:36},(_,k)=>[cx+rx*Math.cos(k*Math.PI/18),cy+ry*Math.sin(k*Math.PI/18)]),true,0,layer,col);n++;}
    else if(t==='path'){
      for(const s of svgPathPts(el.getAttribute('d')||'')){let pts=s.pts;const l=pts[pts.length-1];
        if(s.closed&&l[0]===pts[0][0]&&l[1]===pts[0][1])pts=pts.slice(0,-1);
        /* triângulo ou quadrilátero cheio (setas, símbolo do DST) como SOLID; contorno só se tiver traço */
        const fillIt=s.closed&&filled(el)&&(pts.length===3||pts.length===4);
        if(fillIt)solid(el,pts,layer,col);
        if(!fillIt||(stroke&&stroke!=='none'))poly(el,pts,s.closed,w,layer,col);
        n++;}}
    else if(t==='text'){const txt=el.textContent;if(!txt.trim())continue;
      const x=+el.getAttribute('x'),y=+el.getAttribute('y'),fsz=+(el.getAttribute('font-size')||12),an=el.getAttribute('text-anchor');
      const [X,Y]=P(x,y),h=+(fsz*0.72*DXF_MM).toFixed(3),hj=an==='middle'?1:an==='end'?2:0;
      g(0,'TEXT');g(8,'TEXTO',62,dxfColor(fill));g(10,X,20,Y,30,0,40,h,1,dxfTxt(txt),7,el.getAttribute('font-weight')==='700'?'NEGRITO':'STANDARD');
      if(hj)g(72,hj,11,X,21,Y,31,0);n++;}
  }
  const Wd=+(root.getAttribute('width')||0)*DXF_MM,Hd=H*DXF_MM;
  const out=[];const w=(...kv)=>{for(let k=0;k<kv.length;k+=2)out.push(String(kv[k]).padStart(3,' '),String(kv[k+1]));};
  w(999,'Solcor - esquema unifilar (Dimensionamento de Cabos FV)');
  w(0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1009',9,'$INSBASE',10,0,20,0,30,0,9,'$EXTMIN',10,0,20,0,30,0,9,'$EXTMAX',10,+Wd.toFixed(3),20,+Hd.toFixed(3),30,0,
    9,'$LIMMIN',10,0,20,0,9,'$LIMMAX',10,+Wd.toFixed(3),20,+Hd.toFixed(3),9,'$LTSCALE',40,1,9,'$DWGCODEPAGE',3,'ANSI_1252',0,'ENDSEC');
  w(0,'SECTION',2,'TABLES');
  w(0,'TABLE',2,'LTYPE',70,2,0,'LTYPE',2,'CONTINUOUS',70,0,3,'Solid line',72,65,73,0,40,0,
    0,'LTYPE',2,'DASHED',70,0,3,'__ __ __',72,65,73,2,40,2.2,49,1.4,49,-0.8,0,'ENDTAB');
  const layers=[['UNIFILAR',7,'CONTINUOUS'],['TEXTO',7,'CONTINUOUS'],['TRACEJADO',8,'DASHED']];
  w(0,'TABLE',2,'LAYER',70,layers.length);layers.forEach(([nm,c,lt])=>w(0,'LAYER',2,nm,70,0,62,c,6,lt));w(0,'ENDTAB');
  w(0,'TABLE',2,'STYLE',70,2,0,'STYLE',2,'STANDARD',70,0,40,0,41,1,50,0,71,0,42,2.5,3,'arial.ttf',4,'',
    0,'STYLE',2,'NEGRITO',70,0,40,0,41,1,50,0,71,0,42,2.5,3,'arialbd.ttf',4,'',0,'ENDTAB');
  w(0,'ENDSEC');
  w(0,'SECTION',2,'ENTITIES');for(let k=0;k<E.length;k+=2)w(E[k],E[k+1]);w(0,'ENDSEC',0,'EOF');
  return {dxf:out.join('\r\n')+'\r\n',count:n};
}
