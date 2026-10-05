from pathlib import Path
import subprocess, urllib.request, json, time, sys
root=Path(__file__).resolve().parent
url='http://127.0.0.1:18743'
def ready():
    try:
        with urllib.request.urlopen(url+'/health',timeout=1) as r:return json.load(r).get('app')=='tay-window'
    except Exception:return False
if not ready():
    with (root/'server.log').open('a') as log:
        subprocess.Popen([sys.executable,str(root/'server.py')],stdin=subprocess.DEVNULL,stdout=log,stderr=log,start_new_session=True)
    for _ in range(40):
        if ready():break
        time.sleep(.25)
if ready():
    subprocess.Popen(['open','-na','Google Chrome','--args','--user-data-dir='+str(root/'browser'),'--app='+url,'--window-size=1280,850'])
else: raise SystemExit('Tay could not start. See '+str(root/'server.log'))
