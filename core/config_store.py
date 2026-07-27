import json
import os
import configparser

DATA_FILE = "data.json"

DEFAULT_DATA = {
    "vpn_config": {
        "key_name": "",
        "private_key": "",
        "address": "",
        "dns": "1.1.1.1, 1.0.0.1",
        "public_key": "",
        "preshared_key": "",
        "endpoint": ""
    },
    "games": [
        {
            "id": "throne",
            "name": "Throne and Liberty",
            "executables": "TL.exe, steam.exe",
            "image": "tl_logo.png"
        },
        {
            "id": "custom",
            "name": "Adicionar Jogo",
            "executables": "",
            "image": "add_icon.png"
        }
    ]
}

class ConfigStore:
    def __init__(self, filepath=DATA_FILE):
        self.filepath = filepath
        self.data = self.load()

    def load(self):
        if not os.path.exists(self.filepath):
            self.save_raw(DEFAULT_DATA)
            return DEFAULT_DATA
        try:
            with open(self.filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return DEFAULT_DATA

    def save_raw(self, data):
        with open(self.filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)

    def save(self):
        self.save_raw(self.data)

    def get_vpn_config(self):
        return self.data.get("vpn_config", {})

    def get_games(self):
        return self.data.get("games", [])

    def update_vpn_config(self, key, value):
        self.data["vpn_config"][key] = value
        self.save()

    def import_from_conf(self, filepath):
        """Lê um arquivo .conf do WireGuard e extrai as chaves."""
        try:
            # Wireguard confs sometimes don't have global section, configparser needs one
            with open(filepath, 'r', encoding='utf-8-sig', errors='ignore') as f:
                content = f.read()
            
            # Tenta extrair o nome a partir de um comentário "# Nome:" ou "# Name:"
            key_name = os.path.basename(filepath)
            for line in content.splitlines():
                l = line.strip().lower()
                if l.startswith('# nome:') or l.startswith('# name:'):
                    key_name = line.split(':', 1)[1].strip()
                    break
            
            parser = configparser.ConfigParser()
            parser.read_string(content)
            
            self.data["vpn_config"]["key_name"] = key_name
            
            if 'Interface' in parser:
                self.data["vpn_config"]["private_key"] = parser['Interface'].get('PrivateKey', '')
                self.data["vpn_config"]["address"] = parser['Interface'].get('Address', '')
                self.data["vpn_config"]["dns"] = parser['Interface'].get('DNS', '1.1.1.1, 1.0.0.1')
                
            if 'Peer' in parser:
                self.data["vpn_config"]["public_key"] = parser['Peer'].get('PublicKey', '')
                self.data["vpn_config"]["preshared_key"] = parser['Peer'].get('PresharedKey', '')
                self.data["vpn_config"]["endpoint"] = parser['Peer'].get('Endpoint', '')
                
            self.save()
            return True, "Configuração importada com sucesso!"
        except Exception as e:
            return False, f"Erro ao importar: {str(e)}"
            
    def remove_vpn_config(self):
        """Limpa a configuração atual da VPN e salva o estado."""
        self.data["vpn_config"] = {
            "key_name": "",
            "private_key": "",
            "address": "",
            "dns": "1.1.1.1, 1.0.0.1",
            "public_key": "",
            "preshared_key": "",
            "endpoint": ""
        }
        self.save()
        return True, "Chave removida do banco de dados com sucesso!"
