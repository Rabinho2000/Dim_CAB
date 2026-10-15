/* ---------- disjuntores ABB (tabela ABB abr. 2026) e curto-circuito (RTIEBT 434) ---------- */
const BRK=__BRK__; /* BRK[polos][calibre] = séries do menor para o maior poder de corte: {s, icu kA, ref, d, p PVP €, k2, mod, dif:{name, refs, p}, reg} */
const brkCost=b=>b?(b.p+(b.dif?b.dif.p:0))*(1-(+S.descABB||0)/100):0;
/* o disjuntor mais barato da escada com poder de corte ≥ Icc máx. no local; sem Icc, o de série base.
   Havendo modular que cumpra (até 125 A, como a Indusmelec), escolhe-se o modular */
function pickBreaker(In,poles,ikmax){
  const P=poles===2?2:4;let L=BRK[P][In];
  if(!L||!L.length){const k=INSTD.find(x=>x>=In&&BRK[P][x]&&BRK[P][x].length);L=k?BRK[P][k]:null;}
  if(!L||!L.length)return null;
  const ok=ikmax?L.filter(b=>b.icu>=ikmax-1e-9):L;
  const mods=ok.filter(x=>x.mod),pool=mods.length?mods:ok;
  const b=pool.length?pool.reduce((a,x)=>x.p<a.p?x:a):L[L.length-1];
  return {...b,icuOk:!ikmax||b.icu>=ikmax-1e-9,name:b.mod?`${b.s}-C${In}`:b.d.replace(/ Disj \d+| Di f/g,'').replace(/ F F.*| 4p.*| 4P.*/,'')+(b.reg?` (regular para ${b.reg} A)`:'')};
}
const RHO20={Cu:0.018,Al:0.029};          /* Ω·mm²/m a 20 °C: Icc máximo */
const KSC={Cu:{XLPE:143,PVC:115},Al:{XLPE:94,PVC:76}}; /* RTIEBT 434.3.2 / IEC 60364-4-43 */
const zadd=(a,b)=>({R:a.R+b.R,X:a.X+b.X}),zabs=z=>Math.hypot(z.R,z.X);
/* impedância da fonte no ponto de injeção, por fase (Ω). max: para Icc máx.; min: para o defeito fase-neutro no fim das linhas */
function srcZ(sc){
  sc=sc||S.sc||{};let z;
  if(sc.fonte==='icc'){const Ik=Math.max(+sc.icc||10,0.1)*1000;const Z=1.05*400/(Math.sqrt(3)*Ik);z={R:Z*Math.SQRT1_2,X:Z*Math.SQRT1_2};}
  else{const Sn=Math.max(+sc.sn||630,1)*1000,u=Math.max(+sc.ucc||4,0.5)/100;const Zt=u*400*400/Sn,Rt=0.26*Zt,Xt=Math.sqrt(Zt*Zt-Rt*Rt);
    const Zq=1.1*400*400/(Math.max(+sc.scc||500,1)*1e6),Xq=0.995*Zq,Rq=0.1*Xq;z={R:Rt+Rq,X:Xt+Xq};}
  let max=z,min=z;const L0=+sc.L0||0;
  if(L0>0){const n=Math.max(1,+sc.n0||1),s=+sc.s0||240,m=sc.m0==='Cu'?'Cu':'Al';
    max=zadd(z,{R:RHO20[m]*L0/(s*n),X:reactance(s,m)*L0/n});
    min=zadd(z,{R:1.5*RHO20[m]*L0*2/(s*n),X:2*reactance(s,m)*L0/n});}
  return {max,min};
}
/* troço de cabo: fase a 20 °C (máx.) e anel fase+neutro a 1,5·ρ20 (mín., convenção da folha Excel) */
function zCable(o,L,Lc,loaded){
  const sn=o.cons==='multi'?o.s:condSizes(o,loaded).sn,x=reactance(o.s,o.mat);
  return {max:{R:RHO20[o.mat]*L/(o.s*o.n),X:x*L/o.n},min:{R:1.5*RHO20[o.mat]*Lc*(1/(o.s*o.n)+1/(sn*o.n)),X:2*x*Lc/o.n}};
}
/* energia deixada passar pelo disjuntor (A²s). Modulares: limites da classe 3 de limitação (EN 60898-1), curva C;
   acima de 10 kA e de 32 A extrapolados com I². Caixa moldada e abertos: Icc²·0,01 s (meio período, sem limitação). */
function letThrough(b,In,ik){
  const I=ik*1000;if(!b||!b.mod)return I*I*0.01;
  const T=In<=16?[[3,17e3],[4.5,28e3],[6,40e3],[10,80e3]]:[[3,21e3],[4.5,37e3],[6,52e3],[10,100e3]];
  const f=In<=32?1:1.5;
  if(ik<=3)return f*T[0][1]*(ik/3)**2;if(ik>=10)return f*T[3][1]*(ik/10)**2;
  for(let i=1;i<T.length;i++)if(ik<=T[i][0]){const [a,pa]=T[i-1],[bb,pb]=T[i];return f*(pa+(pb-pa)*(ik-a)/(bb-a));}
  return f*T[3][1];
}
/* impedâncias em cada quadro, a partir dos percursos já dimensionados */
function nodeZ(pC,sc){
  const base=srcZ(sc),memo=new Map();
  const get=(node,d=0)=>{node=String(node).trim();if(memo.has(node))return memo.get(node);const p=percFrom(node);let z=base;
    if(p&&d<30){const pc=pC.find(c=>c.ref===p);const up=get(p.dest,d+1);
      if(pc&&pc.res){const zc=zCable(pc.res,pc.L,pc.Lc,pc.loaded);z={max:zadd(up.max,zc.max),min:zadd(up.min,zc.min)};}else z=up;}
    memo.set(node,z);return z;};
  return get;
}
/* verificações de curto-circuito de um circuito com a opção o (chamada a partir de calc) */
function scCheck(c,o,In){
  const poles=c.loaded===2?2:4;
  if(!c.zUp||!(S.sc&&S.sc.on!==false))return {brk:pickBreaker(In,poles,null),scOk:true};
  const ikmax=1.05*400/(Math.sqrt(3)*zabs(c.zUp.max))/1000;
  const zl=zadd(c.zUp.min,zCable(o,c.L,c.Lc,c.loaded).min);const ikmin=0.95*230/zabs(zl)/1000;
  const brk=pickBreaker(In,poles,ikmax);
  /* magnético fixo (curva C, TMD): Im = 10 × In. Relé eletrónico (Ekip): o instantâneo regula-se; basta Icc mín ≥ 1,2 × 1,5 × In e indica-se a regulação máxima */
  const elec=!!(brk&&/Ekip/.test(brk.d));const Im=elec?1.5*In:10*In;const trip=ikmin*1000>=(elec?1.2:1)*Im;const Iset=elec?Math.floor(ikmin*1000/1.2/In*10)/10:null;
  const k=KSC[o.mat][S.isol]||143;const i2t=letThrough(brk,In,ikmax);const therm=i2t/(o.n*o.n)<=k*k*o.s*o.s;
  return {brk,ikmax,ikmin,Im,elec,Iset,trip,therm,i2t,k2s2:k*k*o.s*o.s,icuOk:brk?brk.icuOk:false,scOk:trip&&therm};
}
