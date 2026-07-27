import os
import sys
import subprocess
import shutil
import ctypes
import tkinter as tk
from tkinter import messagebox

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def create_shortcut_vbs(target, name):
    vbs_path = os.path.join(os.environ['TEMP'], "create_shortcut.vbs")
    desktop = os.path.join(os.environ['USERPROFILE'], 'Desktop')
    shortcut_path = os.path.join(desktop, f"{name}.lnk")
    vbs_content = f"""
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "{shortcut_path}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "{target}"
oLink.WorkingDirectory = "{os.path.dirname(target)}"
oLink.IconLocation = "{target}"
oLink.Save
"""
    with open(vbs_path, "w", encoding="utf-8") as f:
        f.write(vbs_content)
    subprocess.run(["cscript.exe", "//Nologo", vbs_path], creationflags=0x08000000)

def main():
    if not is_admin():
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " ".join(sys.argv), None, 1)
        return

    base_path = sys._MEIPASS if hasattr(sys, '_MEIPASS') else os.path.dirname(os.path.abspath(__file__))
    
    # Ocultar janela no tkinter para apenas usar MessageBoxes
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)

    try:
        # 1. Instalar o WireSock Silenciosamente
        wiresock_exe = os.path.join(base_path, "wiresock-installer.exe")
        if os.path.exists(wiresock_exe):
            # Tenta /VERYSILENT que cobre Inno Setup e WiX
            subprocess.run([wiresock_exe, "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART"], creationflags=0x08000000)
            
        # 2. Criar diretório em Program Files e mover o App
        target_dir = os.path.join(os.environ.get("PROGRAMFILES", "C:\\Program Files"), "ReaperZ")
        if not os.path.exists(target_dir):
            os.makedirs(target_dir, exist_ok=True)
        
        app_exe = os.path.join(base_path, "ReaperZ.exe")
        target_exe = os.path.join(target_dir, "ReaperZ.exe")
        
        if os.path.exists(app_exe):
            shutil.copy2(app_exe, target_exe)
        
        # 3. Criar Atalho
        create_shortcut_vbs(target_exe, "ReaperZ")

        # 4. Mensagem de Sucesso
        messagebox.showinfo("Instalação Concluída", "O ReaperZ foi instalado com sucesso e o motor de rede foi configurado!\nUm atalho foi criado na sua área de trabalho.")
        
    except Exception as e:
        messagebox.showerror("Erro de Instalação", f"Ocorreu um erro durante a instalação: {str(e)}")

if __name__ == "__main__":
    main()
