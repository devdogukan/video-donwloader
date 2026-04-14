import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
THUMB_DIR = os.path.join(DOWNLOADS_DIR, "thumbnails")

os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.makedirs(THUMB_DIR, exist_ok=True)
