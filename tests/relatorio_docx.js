/* relatório Word: descarrega pelo botão (exemplo) e confere com Python: zip, todas as partes XML bem formadas,
   ordem dos elementos que o Word exige, secções e números iguais aos do motor, imagem do unifilar. Gera tests/relatorio.docx. Tem de dar "ERR []". */
const { chromium } = require('playwright');const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
(async()=>{const errs=[];const check=(ok,msg)=>{console.log(ok?'ok  ':'FALHA',msg);if(!ok)errs.push(msg);};
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900},acceptDownloads:true});p.on('pageerror',e=>errs.push(e.message));
await p.goto(require('url').pathToFileURL(path.resolve(__dirname,'..','cabos-rt.html')).href);
await p.evaluate(()=>{try{localStorage.clear();}catch(e){}});await p.reload();
const ref=await p.evaluate(()=>{const R=solveAll();return {codes:R.invC.concat(R.pC).map(c=>c.code),du5:fmt(R.pC[0].res.du,2)};});
const fx=path.join(__dirname,'relatorio.docx');const [d]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p.click('#report-docx')]);await d.saveAs(fx);
check(d.suggestedFilename().endsWith('_relatorio_calculo.docx'),'descarrega o .docx');
const py=`import zipfile,json,sys,re
from xml.dom import minidom
z=zipfile.ZipFile(sys.argv[1]);names=z.namelist();bad=[]
for n in names:
  if n.endswith('.xml') or n.endswith('.rels'):
    try:minidom.parseString(z.read(n))
    except Exception as e:bad.append(n+': '+str(e))
doc=z.read('word/document.xml').decode('utf-8');sty=z.read('word/styles.xml').decode('utf-8')
txt=re.sub(r'<[^>]+>','',re.sub(r'<w:br/>','\\n',re.sub(r'</w:p>','\\n',doc)))
order_ok=all(sty.find(a)<sty.find(b) for a,b in [('<w:pBdr>','<w:spacing w:before="280"'),('<w:color w:val="1A2028"/><w:sz w:val="26"/>','</w:styles>')])
png=z.read('word/media/unifilar.png')
print(json.dumps({'names':names,'bad':bad,'h':re.findall(r'(\\d(?:\\.\\d)?\\. [^\\n]+)',txt)[:12],'txt':txt[:200000],'order':order_ok,'png':png[:8]==b'\\x89PNG\\r\\n\\x1a\\n','pngLen':len(png),
  'stored':all(i.compress_type==0 for i in z.infolist())}))`;
const X=JSON.parse(execFileSync('python',['-c',py,fx],{encoding:'utf8',maxBuffer:64*1024*1024}));
check(['[Content_Types].xml','word/document.xml','word/styles.xml','word/footer1.xml','word/media/unifilar.png'].every(n=>X.names.includes(n)),'partes do .docx presentes');
check(X.bad.length===0,`todas as partes XML bem formadas ${X.bad.join('; ')}`);
check(X.order,'ordem dos elementos dos estilos como o Word exige');
check(['1. Identificação da obra','2. Dados gerais e critérios','3. Quadro resumo dos circuitos','4. Cálculo por circuito','5. Circuitos a rever','6. Esquema unifilar'].every(h=>X.txt.includes(h)),'todas as secções do relatório');
check(ref.codes.every(c=>X.txt.includes(c+' · ')),'todos os circuitos (C1…C6)');
check(X.txt.includes(`ΔU = `)&&X.txt.includes(`${ref.du5} %`),`números do motor (ΔU do C5 = ${ref.du5} %)`);
check(X.png&&X.pngLen>20000,'imagem PNG do unifilar');
console.log('ERR',errs);await b.close();process.exit(errs.length?1:0);})();
