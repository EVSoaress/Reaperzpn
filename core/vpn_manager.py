import os
import subprocess
import ctypes

TEMP_CONF = "active_tunnel.conf"
WIRESOCK_PATH = r"C:\Program Files\WireSock Secure Connect\command-line\wiresock-connect-cli.exe"

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

class VPNManager:
    def __init__(self, config_store):
        self.config_store = config_store
        self.process = None
        self.active_game_id = None
        self.active_is_global = None

    def is_connected(self):
        if self.process is not None:
            if self.process.poll() is None:
                return True
            else:
                self.process = None
                self.active_game_id = None
                self.active_is_global = None
        return False
        
    def clear_cache(self):
        try:
            creationflags = 0x08000000
            subprocess.run(["taskkill", "/F", "/IM", "wiresock-connect-cli.exe"], creationflags=creationflags)
            subprocess.run([WIRESOCK_PATH, "delete", "active_tunnel"], creationflags=creationflags)
        except Exception:
            pass

    def build_conf(self, executables, full_tunnel=False):
        vpn = self.config_store.get_vpn_config()
        
        # Validação básica
        if not vpn.get("private_key") or not vpn.get("endpoint"):
            raise ValueError("Configuração da VPN incompleta. Vá em 'Configurações' e importe o arquivo .conf")

        allowed_apps_line = f"AllowedApps = {executables}" if not full_tunnel else ""
        
        # Apenas forçamos o DNS da VPN se for Full Tunnel. 
        # Se for Split Tunnel, usar o DNS da VPN globalmente quebra a internet local.
        dns_line = f"DNS = {vpn['dns']}" if full_tunnel and vpn.get("dns") else ""

        content = f'''[Interface]
PrivateKey = {vpn["private_key"]}
Address = {vpn["address"]}
{dns_line}
MTU = 1380

[Peer]
PublicKey = {vpn["public_key"]}
PresharedKey = {vpn["preshared_key"]}
Endpoint = {vpn["endpoint"]}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
{allowed_apps_line}
'''
        with open(TEMP_CONF, "w", encoding="utf-8") as f:
            f.write(content)

    def connect(self, game_id, executables, full_tunnel=False):
        if not is_admin():
            raise PermissionError("ReaperZPn precisa ser executado como Administrador!")
            
        if not os.path.exists(WIRESOCK_PATH):
            raise FileNotFoundError(f"WireSock não encontrado em {WIRESOCK_PATH}")

        if self.is_connected():
            self.disconnect()

        self.build_conf(executables, full_tunnel)
        
        creationflags = 0x08000000 # Ocultar console
        
        # O novo WireSock Secure Connect precisa importar o arquivo primeiro.
        # Deletamos o antigo caso exista para não dar erro de duplicidade.
        subprocess.run([WIRESOCK_PATH, "delete", "active_tunnel"], creationflags=creationflags)
        subprocess.run([WIRESOCK_PATH, "import", TEMP_CONF], creationflags=creationflags)
        
        # Iniciar a conexão pelo nome do perfil
        self.process = subprocess.Popen(
            [WIRESOCK_PATH, "connect", "active_tunnel", "-log-level", "error"],
            creationflags=creationflags
        )
        self.active_game_id = game_id
        self.active_is_global = full_tunnel

    def disconnect(self):
        if self.process:
            self.process.kill()
            self.process = None
            self.active_game_id = None
            self.active_is_global = None
            self.active_game_id = None
            
        creationflags = 0x08000000
        # Garante que a conexão caia
        subprocess.run([WIRESOCK_PATH, "disconnect"], creationflags=creationflags)
        
        if os.path.exists(TEMP_CONF):
            os.remove(TEMP_CONF)
