import os
import subprocess
import requests
import yt_dlp
import uuid

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
THUMB_DIR = os.path.join(BASE_DIR, "downloads", "thumbnails")
os.makedirs(THUMB_DIR, exist_ok=True)

def generate_thumbnail_with_ffmpeg(video_path: str, output_path: str) -> bool:
    cmd = [
        "ffmpeg",
        "-y",
        "-ss", "00:00:05",
        "-i", video_path,
        "-frames:v", "1",
        "-q:v", "2",
        output_path
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return os.path.exists(output_path)
    except Exception as e:
        print(f"[ERROR]: {video_path} -> {e}")
        return False

def download_thumbnail(url: str, output_path: str) -> bool:
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            with open(output_path, "wb") as f:
                f.write(r.content)
            return True
    except Exception as e:
        print(f"[ERROR]: {output_path} -> {e}")
        return False

def get_or_create_thumbnail(video_url: str = None, video_path: str = None, filename: str = None) -> str:
    output_filename = f"{filename if filename else uuid.uuid4()}.jpg"
    output_path = os.path.join(THUMB_DIR, output_filename)
    if os.path.exists(output_path):
        print(f"[INFO]: Thumbnail is exists -> {output_path}")
        return output_path

    if video_url:
        try:
            with yt_dlp.YoutubeDL({"quit": True}) as ydl:
                info = ydl.extract_info(video_url, download=False)

                thumb_url = info.get("thumbnail")
                if thumb_url:
                    if download_thumbnail(thumb_url, output_path):
                        print(f"[INFO]: Thumbnail downloaded -> {output_path}")
                        return output_filename
        except Exception as e:
            print(f"[ERROR]: yt-dlp error -> {e}")

    if video_path:
        if generate_thumbnail_with_ffmpeg(video_path, output_path):
            print(f"[INFO]: Thumbnail created -> {output_path}")
            return output_filename
        
    print("[ERROR]: Thumbnail is not created")
    return None