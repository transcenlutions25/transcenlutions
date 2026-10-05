from pathlib import Path
import subprocess
HOME=Path.home()
UNITY=HOME/'.unity/bin/unity'

def status():
    return {'unity_editors':[p.name for p in Path('/Applications/Unity/Hub/Editor').glob('*') if p.is_dir()],
        'unreal_editors':[p.name for p in Path('/Users/Shared/Epic Games').glob('UE_*') if (p/'Engine/Binaries/Mac/UnrealEditor.app').exists()],
        'unity_project':str(HOME/'Crowne Legacy'),
        'target':'Xbox Series X|S',
        'note':'Engine launch controls are ready. Unity live scene control requires its Pipeline package. Unreal live scene control is not installed. Xbox deployment is not configured.'}

def launch(kind,project):
    p=Path(project).resolve()
    if kind=='unity':
        if not (p/'ProjectSettings/ProjectVersion.txt').is_file(): raise ValueError('Choose a Unity project first, such as Crowne Legacy (with spaces).')
        log=HOME/'Tay/window/unity-launch.log'
        with log.open('a') as f: subprocess.Popen([str(UNITY),'open',str(p)],stdout=f,stderr=f,start_new_session=True)
        return 'Requested Unity to open '+str(p)+'. Check Unity for any license or import prompts.'
    if kind=='unreal':
        files=list(p.glob('*.uproject'))
        if len(files)!=1: raise ValueError('Choose a folder containing exactly one Unreal .uproject file.')
        subprocess.run(['open',str(files[0])],check=True)
        return 'Requested Unreal to open '+str(files[0])+'.'
    if kind=='unity-hub': subprocess.run(['open','-a','Unity Hub'],check=True)
    elif kind=='epic': subprocess.run(['open','-a','Epic Games Launcher'],check=True)
    else: raise ValueError('Unknown engine action.')
    return 'Launcher opened.'
