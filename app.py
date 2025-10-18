from flask import Flask, render_template, jsonify, url_for
import os
from urllib.parse import quote  # ✅ for URL-safe filenames

app = Flask(__name__)

# Path to your songs and thumbnails
SONG_FOLDER = os.path.join("static", "songs")
THUMB_FOLDER = os.path.join("static", "thumbnails")

# Helper function to load songs
def get_songs():
    songs_list = []
    for filename in os.listdir(SONG_FOLDER):
        if filename.lower().endswith(('.mp3', '.wav', '.ogg')):
            song_name = os.path.splitext(filename)[0]  # Song name from filename
            
            # ✅ Encode the filename for safe URL usage (handles spaces, Hindi, etc.)
            safe_filename = quote(filename)

            # ✅ Use encoded filename for static path
            song_url = f"/static/songs/{safe_filename}"
            
            # Check for matching thumbnail (same name as song)
            thumb_filename = f"{song_name}.jpg"
            thumb_path = os.path.join(THUMB_FOLDER, thumb_filename)
            if os.path.exists(thumb_path):
                thumb_url = url_for('static', filename=f"thumbnails/{thumb_filename}")
            else:
                thumb_url = url_for('static', filename="thumbnails/default.jpg")  # default image
            
            songs_list.append({
                "name": song_name,      # Display name (can include Hindi/spaces)
                "file": song_url,       # Encoded song URL
                "thumbnail": thumb_url  # Thumbnail or default
            })
    return songs_list

# Home page
@app.route("/")
def index():
    songs = get_songs()
    return render_template("index.html", songs=songs)

# API endpoint to get songs (for JS)
@app.route("/songs")
def songs_api():
    return jsonify(get_songs())

if __name__ == "__main__":
    # ✅ Use 0.0.0.0 for Render deployment
    app.run(host='0.0.0.0', port=5000, debug=True)
