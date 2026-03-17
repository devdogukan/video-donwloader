import subprocess


def _is_wsl():
    try:
        with open("/proc/version", "r") as f:
            return "microsoft" in f.read().lower()
    except OSError:
        return False


IS_WSL = _is_wsl()


def open_in_default_player(file_path):
    if IS_WSL:
        win_path = subprocess.check_output(
            ["wslpath", "-w", file_path], text=True
        ).strip()
        subprocess.Popen(
            ["cmd.exe", "/c", "start", "", win_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        subprocess.Popen(
            ["xdg-open", file_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
