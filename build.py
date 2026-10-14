import json,os
t=open('rt-template.html').read();js=open('rt-app.js').read()
init="bind();bindGw();load();"
assert init in js
sc=open('rt-sc.js').read().replace('__BRK__',open('brk.json').read())
pr=open('rt-price.js').read().replace('__PRICES__',open('jmm/prices.json').read())
mods=[sc,pr]+[open(f).read() for f in ('rt-sld.js','rt-board.js','rt-share.js') if os.path.exists(f)]
app=js.replace(init,'')+'\n'+'\n'.join(mods)+'\nrenderPrices();\n'+init+'\nif(typeof initShare==="function")initShare();'
out=t.replace('__PANES__',open('rt-panes.html').read()).replace('__DATA__',open('rt-data.js').read()).replace('__APP__',app).replace('__LOGO__',open('logo.b64').read().strip())
open('cabos-rt.html','w').write(out);print('size',len(out))
