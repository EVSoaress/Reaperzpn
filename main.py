import eel
import os
import sys
import ctypes

# Força o Windows a reconhecer este script como um app separado, usando o ícone da janela na barra de tarefas
if sys.platform == 'win32':
    myappid = 'reaperz.vpn.client.2.0'
    ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)

# Adiciona o diretório atual ao path para importar o core
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.config_store import ConfigStore
from core.vpn_manager import VPNManager

config_store = ConfigStore()
vpn_manager = VPNManager(config_store)

# Inicializa o servidor local na pasta web de forma absoluta (previne erros do System32)
web_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web')
eel.init(web_dir)

@eel.expose
def get_games():
    return config_store.get_games()

@eel.expose
def get_vpn_status():
    return {
        "is_connected": vpn_manager.is_connected(),
        "active_game_id": vpn_manager.active_game_id,
        "active_is_global": vpn_manager.active_is_global
    }

@eel.expose
def clear_cache():
    vpn_manager.clear_cache()
    return True

@eel.expose
def trigger_import():
    import tkinter as tk
    from tkinter import filedialog
    
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    
    file_path = filedialog.askopenfilename(title="Selecione o arquivo .conf", filetypes=[("Config Files", "*.conf")])
    if file_path:
        success, msg = config_store.import_from_conf(file_path)
        return {"success": success, "msg": msg}
    return {"success": False, "msg": "Nenhum arquivo selecionado."}

@eel.expose
def get_key_status():
    conf = config_store.get_vpn_config()
    is_registered = bool(conf.get("private_key"))
    endpoint = conf.get("endpoint", "Desconhecido")
    key_name = conf.get("key_name", "")
    return {"registered": is_registered, "endpoint": endpoint, "key_name": key_name}

@eel.expose
def remove_key():
    success, msg = config_store.remove_vpn_config()
    return {"success": success, "msg": msg}

@eel.expose
def toggle_game(game_id, full_tunnel=False):
    if game_id == "custom":
        return {"success": False, "msg": "O suporte para adicionar jogos customizados chegará numa próxima versão."}
        
    games = config_store.get_games()
    game = next((g for g in games if g["id"] == game_id), None)
    if not game:
        return {"success": False, "msg": "Jogo não encontrado."}
        
    try:
        is_currently_on = vpn_manager.is_connected() and vpn_manager.active_game_id == game_id
        
        if is_currently_on:
            vpn_manager.disconnect()
            return {"success": True, "connected": False, "game_name": game["name"]}
        else:
            vpn_manager.connect(game_id, game["executables"], full_tunnel)
            return {"success": True, "connected": True, "game_name": game["name"]}
    except Exception as e:
        return {"success": False, "msg": str(e)}

def close_callback(route, websockets):
    if not websockets:
        vpn_manager.disconnect()
        os._exit(0)

if __name__ == '__main__':
    try:
        import webview
        import socket
        
        # Encontra uma porta livre automaticamente
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(('localhost', 0))
        port = sock.getsockname()[1]
        sock.close()
        
        import threading
        
        def start_eel():
            eel.start('index.html', mode=None, port=port, block=True)
            
        eel_thread = threading.Thread(target=start_eel)
        eel_thread.daemon = True
        eel_thread.start()
        
        icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web', 'favicon.ico')
        window = webview.create_window('ReaperZPn 2.0', f'http://localhost:{port}/index.html', width=1050, height=700, resizable=False, background_color='#0a0a0a')
        
        def on_closed():
            close_callback(None, None)
            
        window.events.closed += on_closed
        webview.start(icon=icon_path)
    except Exception as e:
        import traceback
        traceback.print_exc()
        os._exit(1)
