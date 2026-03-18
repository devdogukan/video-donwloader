import os
import platform
import subprocess


def _is_wsl():
    try:
        with open("/proc/version", "r") as f:
            return "microsoft" in f.read().lower()
    except OSError:
        return False


IS_WSL = _is_wsl()
SYSTEM = platform.system()


def open_in_default_player(file_path):
    devnull = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}

    if IS_WSL:
        win_path = subprocess.check_output(
            ["wslpath", "-w", file_path], text=True
        ).strip()
        subprocess.Popen(["cmd.exe", "/c", "start", "", win_path], **devnull)
    elif SYSTEM == "Windows":
        os.startfile(file_path)
    elif SYSTEM == "Darwin":
        subprocess.Popen(["open", file_path], **devnull)
    else:
        subprocess.Popen(["xdg-open", file_path], **devnull)
