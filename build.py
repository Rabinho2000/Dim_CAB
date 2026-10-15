import json,os
rd=lambda f:open(f,encoding='utf-8').read()
t=rd('rt-template.html');js=rd('rt-app.js')
init="bind();bindGw();load();"
assert init in js
sc=rd('rt-sc.js').replace('__BRK__',rd('brk.json'))
pr=rd('rt-price.js').replace('__PRICES__',rd('jmm/prices.json'))
# o motor (rt-engine.js) e os módulos de que ele depende vêm antes da interface
mods=[rd(f) for f in ('rt-sld.js','rt-dxf.js','rt-board.js','rt-bom.js','rt-api.js','rt-share.js','rt-pimport.js','rt-report.js') if os.path.exists(f)]
app='\n'.join([rd('rt-engine.js'),sc,pr,js.replace(init,'')]+mods)+'\nrenderPrices();\n'+init+'\nif(typeof initShare==="function")initShare();'
out=t.replace('__PANES__',rd('rt-panes.html')).replace('__DATA__',rd('rt-data.js')).replace('__APP__',app).replace('__LOGO__',rd('logo.b64').strip())
open('cabos-rt.html','w',encoding='utf-8',newline='\n').write(out);print('size',len(out))
