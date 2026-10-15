/* testes unitários do motor de cálculo (node --test tests/). Regras: ver "Regras de dimensionamento" no CLAUDE.md */
const test=require('node:test');const assert=require('node:assert/strict');
const {engine}=require('./engine-env.js');

const INSTD=[6,10,13,16,20,25,32,40,50,63,80,100,125,160,200,250,320,400,500,630,800,1000,1250,1600];
const rows=R=>R.invC.concat(R.pC).filter(c=>c.res);
const route=(ref,cons)=>({ref,cons,disp:'trevo',trays:1,sol:false});
/* um quadro QFV com inversores, ligado a 5 m do quadro do cliente */
const scen=({modelo,L,n=1,ref='13',cons='mono'})=>({
  invs:Array.from({length:n},()=>({modelo,pman:0,q:'QFV',L,S:'auto'})),rInv:route(ref,cons),
  percs:[{orig:'QFV',dest:'Qentrada',L:5,S:'auto',...route(ref,cons)}],gws:[]});

test('exemplo de origem: cabos e disjuntores escolhidos',()=>{
  const R=engine().solve();
  const got=[...rows(R).map(c=>`${c.nome} ${c.res.n}x${c.res.s} ${c.res.mat} ${c.res.In}A`)];
  assert.deepEqual(got,[
    'Inversor 1 1x120 Al 200A','Inversor 2 1x95 Cu 200A','Inversor 3 1x240 Al 320A','Inversor 4 1x150 Cu 320A',
    'QFV → QInterligação 3x240 Al 1000A','QInterligação → Qentrada 2x240 Cu 1000A']);
});

test('queda de tensão: fórmula da folha Excel (cos φ = 1), comprimento com folga',()=>{
  const R=engine().solve();
  for(const c of rows(R)){const o=c.res;
    const Lc=c.L<30?c.L*1.2:c.L*1.1;assert.ok(Math.abs(c.Lc-Lc)<1e-9,c.nome);
    const rho=o.mat==='Cu'?0.0225:0.036,b=c.loaded===2?2:1;
    const du=b*rho*Lc/o.s*(c.Ib/o.n)/230*100;
    assert.ok(Math.abs(o.du-du)<1e-9,`${c.nome}: ${o.du} vs ${du}`);}
});

test('folga desligada: comprimento de cálculo = comprimento real',()=>{
  const E=engine({folga:false});for(const c of rows(E.solve()))assert.equal(c.Lc,c.L);
});

test('secção do neutro (524.2) e da terra (54F)',()=>{
  const E=engine();const cs=(s,mat,loaded=3)=>{const r=E.ev(`condSizes({s:${s},mat:'${mat}'},${loaded})`);return [r.sn,r.spe];};
  assert.deepEqual(cs(10,'Cu'),[10,10]);assert.deepEqual(cs(16,'Cu'),[16,16]);
  assert.deepEqual(cs(25,'Cu'),[16,16]);assert.deepEqual(cs(35,'Cu'),[25,16]);
  assert.deepEqual(cs(50,'Cu'),[25,25]);assert.deepEqual(cs(120,'Cu'),[70,70]);assert.deepEqual(cs(240,'Cu'),[120,120]);
  assert.deepEqual(cs(25,'Al'),[25,16]);assert.deepEqual(cs(95,'Al'),[50,50]);
  assert.deepEqual(cs(50,'Cu',2),[50,25],'monofásico: neutro igual à fase');
});

test('material automático: alumínio só acima de 15 m e de 30 kW, e nunca abaixo de 16 mm²',()=>{
  const E=engine();const m=(s,L,P)=>E.ev(`matFor(${s},${L},${P})`);
  assert.equal(m(16,20,50),'Al');assert.equal(m(16,15,50),'Cu');assert.equal(m(16,20,30),'Cu');assert.equal(m(10,20,50),'Cu');
  E.set({mat:'Cu'});assert.equal(m(240,200,500),'Cu');
  E.set({alThr:50,alPmin:100});assert.equal(m(16,40,200),'Cu');assert.equal(m(16,60,200),'Al');
});

test('designação do cabo',()=>{
  const E=engine();
  assert.equal(E.ev(`cableParts({n:1,s:10,mat:'Cu',cons:'multi'},3).cabo`),'1 × XV 5G10');
  assert.equal(E.ev(`cableParts({n:1,s:6,mat:'Cu',cons:'multi'},2).cabo`),'1 × XV 3G6');
  const p=E.ev(`cableParts({n:3,s:240,mat:'Al',cons:'mono'},3)`);
  assert.equal(p.fase,'3 × LXV 1×240 mm²');assert.equal(p.neutro,'3 × LXV 1×120 mm²');assert.equal(p.terra,'1 × 1×120 mm² Al');
});

test('fator de temperatura (52-D1 / 52-D2)',()=>{
  const E=engine();
  assert.equal(E.ev(`stepUp(D1.XLPE,35)`),0.96);assert.equal(E.ev(`stepUp(D1.XLPE,36)`),0.91);
  assert.equal(E.ev(`stepUp(D1.PVC,30)`),1);assert.equal(E.ev(`stepUp(D2.XLPE,18)`),1);
});

test('regras de dimensionamento em 400 cenários',()=>{
  const E=engine();let n=0,sem=0;
  /* há solução se alguma secção tabelada cumpre Ib ≤ In ≤ Iz e I2 ≤ 1,45·Iz (ex.: em tubo, 52-C13/C14, só há secções até 120 mm²) */
  const feasible=c=>{E.ctx.__c=c;return E.ev('options(__c).some(o=>passes(calc(__c,o)))');};
  for(const modelo of ['SUN2000-5KTL-L1','SUN2000-20K-MB0','SUN2000-50KTL-M3','SUN2000-100KTL-M2','SUN2000-150K-MG0'])
  for(const L of [5,15,16,40,120])for(const ref of ['13','61','11','3A'])for(const cons of ['mono','multi'])for(const k of [1,2]){
    E.set(scen({modelo,L,n:k,ref,cons}));const S=E.S();
    for(const c of rows(E.solve())){const o=c.res,id=`${modelo} ${L} m ref ${ref} ${cons} ×${k} · ${c.nome}`;
      if(!feasible(c)){sem++;assert.ok(!(o.term&&o.sob),`${id}: sem solução tem de ficar "a rever"`);
        assert.ok(c.noFit&&c.noFitMsg,`${id}: sem solução tem de ter explicação`);continue;}
      assert.ok(!c.noFit&&!c.noFitMsg,`${id}: com solução não leva a explicação`);
      n++;
      assert.ok(o.n>=1&&o.n<=3,`${id}: no máximo 3 cabos por fase`);
      if(o.mat==='Al'){assert.equal(o.cons,'mono',`${id}: alumínio só monocondutor`);assert.ok(o.s>=16,`${id}: Al ≥ 16 mm²`);
        assert.ok(c.L>S.alThr&&c.p>S.alPmin,`${id}: Al só acima de ${S.alThr} m e ${S.alPmin} kW`);}
      assert.equal(o.In,INSTD.find(x=>x>=c.Ib),`${id}: In = calibre normalizado seguinte a Ib`);
      assert.ok(c.Ib<=o.In&&o.In<=o.Iz+1e-9,`${id}: Ib ≤ In ≤ Iz (${c.Ib.toFixed(1)} / ${o.In} / ${o.Iz.toFixed(1)})`);
      assert.equal(o.I2,(o.In<=125?1.45:1.3)*o.In,`${id}: I2 = k2·In`);
      assert.ok(o.I2<=1.45*o.Iz+1e-9,`${id}: I2 ≤ 1,45·Iz`);
      assert.ok(o.du<=S.limT+1e-9,`${id}: ΔU ${o.du.toFixed(2)} % > ${S.limT} %`);}}
  assert.ok(n>=700,`só ${n} circuitos com solução (${sem} sem)`);
});

test('inversores iguais no mesmo quadro ficam com o mesmo cabo',()=>{
  const E=engine();
  E.set({...scen({modelo:'SUN2000-100KTL-M2',L:20,n:2}),invs:[20,24].map(L=>({modelo:'SUN2000-100KTL-M2',pman:0,q:'QFV',L,S:'auto'}))});
  const [a,b]=E.solve().invC.map(c=>`${c.res.n}x${c.res.s} ${c.res.mat} ${c.res.cons}`);
  assert.equal(a,b);
});

test('sem secção que cumpra (B2 só até 120 mm²): mostra a de maior Iz e explica',()=>{
  const E=engine();E.set(scen({modelo:'SUN2000-150K-MG0',L:5,n:2,ref:'3A'}));
  const c=E.solve().pC[0],o=c.res;
  assert.equal(c.noFit,true);assert.equal(o.term,false);
  E.ctx.__c=c;const maxIz=E.ev('Math.max(...__c.opts.map(o=>calc(__c,o).Iz))');
  assert.equal(o.Iz,maxIz,'escolhe a opção de maior Iz');assert.equal(`${o.n}x${o.s}`,'3x120');
  assert.match(c.noFitMsg,/Iz \d+ A < In 630 A/);assert.match(c.noFitMsg,/52-C14\) só tem valores até 120 mm²/);assert.match(c.noFitMsg,/ref\. 13/);
  /* a mesma carga em caminho de cabos (ref. 13) já tem solução */
  E.set(scen({modelo:'SUN2000-150K-MG0',L:5,n:2,ref:'13'}));const d=E.solve().pC[0];
  assert.equal(d.noFit,false);assert.equal(d.noFitMsg,null);assert.ok(d.res.term&&d.res.sob);
});

/* regra do utilizador: o que não está nos quadros da RTIEBT não se usa nesse contexto (não se extrapola) */
const invs=(k,L=20)=>Array.from({length:k},()=>({modelo:'SUN2000-100KTL-M2',pman:0,q:'QFV',L,S:'auto'}));
const ui=(over)=>({percs:[{orig:'QFV',dest:'Qentrada',L:5,S:'auto',...route('13','mono')}],gws:[],...over});

test('fora do quadro: mais de 3 circuitos monocondutores por esteira com esteiras sobrepostas',()=>{
  const E=engine();
  E.set(ui({invs:invs(6),rInv:{...route('13','mono'),trays:2}}));let c=E.solve().invC[0];
  assert.equal(c.res.perTray,3);assert.ok(c.res.fg>0&&!c.noFit,'3 por esteira: 52-E5');
  E.set(ui({invs:invs(8),rInv:{...route('13','mono'),trays:2}}));c=E.solve().invC[0];
  assert.equal(c.res.perTray,4);assert.equal(c.res.fg,null);assert.equal(c.noFit,true);
  assert.match(c.noFitMsg,/Não há fator de agrupamento.*52-E5.*até 3 circuitos por esteira/);
  E.set(ui({invs:invs(8),rInv:route('13','mono')}));c=E.solve().invC[0];
  assert.equal(c.res.fgSrc,'52-E1 (4)','numa só esteira usa o 52-E1 ref. 4, como a folha Excel');assert.equal(c.res.fg,0.72);
});

test('fora do quadro: mais de 3 esteiras sobrepostas',()=>{
  const E=engine();
  for(const cons of ['mono','multi']){E.set(ui({invs:invs(2),rInv:{...route('13',cons),trays:4}}));const c=E.solve().invC[0];
    assert.equal(c.noFit,true,cons);assert.match(c.noFitMsg,/só há valores até 3 esteiras sobrepostas/,cons);}
  E.set(ui({invs:invs(2),rInv:{...route('13','mono'),trays:3}}));assert.equal(E.solve().invC[0].noFit,false,'3 esteiras está no quadro');
});

test('fora do quadro: temperatura acima do 52-D1',()=>{
  const E=engine();E.set({tair:85});const c=E.solve().invC[0];
  assert.equal(c.ti.ft,null);assert.equal(c.noFit,true);assert.match(c.noFitMsg,/85 °C está fora do quadro 52-D1 para XLPE \(máximo 80 °C\)/);
  E.set({tair:60});assert.equal(E.solve().invC[0].noFit,false,'60 °C está no quadro');
});

test('secção escolhida à mão que não existe no quadro volta a automático (sem erro)',()=>{
  const E=engine();const st=ui({invs:invs(1),rInv:route('3A','mono')});st.invs[0].S='1x240|Cu|mono';E.set(st);
  const c=E.solve().invC[0];
  assert.equal(c.auto,true);assert.ok(c.res.s<=120,'só secções do 52-C14');assert.match(c.dropMsg,/240 mm² Cu\) não existe no quadro/);
  assert.equal(E.ev('S.invs[0].S'),'auto');
});

test('poder de corte: desligado por omissão, não muda nada',()=>{
  const R=engine().solve();assert.equal(R.icuOn,false);
  for(const c of rows(R))assert.equal(c.res.ikmax,undefined,c.nome);
});

test('poder de corte: Icc conhecida no ponto de ligação, diminui pelos cabos até cada quadro',()=>{
  const E=engine();E.set({icu:{modo:'icc',icc:10}});const R=E.solve();
  assert.equal(R.icuOn,true);assert.ok(Math.abs(R.ikSrc-10)<1e-9);
  const by=n=>rows(R).find(c=>c.nome===n);
  assert.ok(Math.abs(by('QInterligação → Qentrada').res.ikmax-10)<1e-9,'no ponto de ligação = Icc indicada');
  assert.ok(by('QFV → QInterligação').res.ikmax<10,'no quadro de interligação já é menor (7 m de cabo)');
  assert.ok(by('Inversor 1').res.ikmax<by('QFV → QInterligação').res.ikmax,'no QFV, depois de 140 m, ainda menor');
  for(const c of rows(R))assert.equal(c.res.icuOk,true,c.nome);
});

test('poder de corte insuficiente: circuito a rever, sem mudar o disjuntor, e indica o que chega',()=>{
  const E=engine();const base=E.solve();
  E.set({icu:{modo:'icc',icc:40}});const R=E.solve();
  const inv=R.invC[0].res;   /* XT3N250 36 kA no QFV: Icc mais baixa depois dos cabos */
  assert.equal(inv.icuOk,true);
  E.set({icu:{modo:'pt',sn:2500}});const P=E.solve();
  const f=P.pC.find(c=>c.nome==='QInterligação → Qentrada').res;
  assert.equal(f.icuOk,false,'E1.2 42 kA < Icc de um PT de 2500 kVA');assert.ok(f.ikmax>42);assert.equal(f.icuAlt&&f.icuAlt.s,'E1.2N 1000','indica o E1.2N (66 kA), o mais barato que chega');assert.equal(f.icuAlt.icu,66);
  E.set({icu:{modo:'icc',icc:80}});const X=E.solve().pC.find(c=>c.nome==='QInterligação → Qentrada').res;
  assert.equal(X.icuOk,false);assert.equal(X.icuAlt,null,'acima de 66 kA não há E1.2 na tabela da ferramenta');
  assert.deepEqual([...P.invC.concat(P.pC).map(c=>c.res.brk.ref)],[...base.invC.concat(base.pC).map(c=>c.res.brk.ref)],'os disjuntores escolhidos não mudam');
  /* calibre com série de maior poder de corte na tabela: indica-a */
  E.set({icu:{modo:'icc',icc:45},invs:[{modelo:'SUN2000-100KTL-M2',pman:0,q:'QFV',L:1,S:'auto'}],percs:[{orig:'QFV',dest:'Qentrada',L:1,S:'auto',...route('13','mono')}],gws:[]});
  const c=E.solve().invC[0].res;assert.equal(c.icuOk,false);assert.ok(c.icuAlt&&c.icuAlt.icu>=c.ikmax,`indica ${c.icuAlt&&c.icuAlt.name}`);
});

test('secção forçada pelo utilizador é respeitada',()=>{
  const E=engine();const st=scen({modelo:'SUN2000-50KTL-M3',L:10});st.invs[0].S='1x95|Cu|mono';E.set(st);
  const c=E.solve().invC[0];assert.equal(c.auto,false);assert.equal(`${c.res.n}x${c.res.s} ${c.res.mat}`,'1x95 Cu');
});
