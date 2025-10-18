from flask import Flask, render_template, jsonify, url_for
import os
from urllib.parse import quote

# Initialize the Flask App.
# Flask will automatically look for the 'static' and 'templates' folders.
app = Flask(__name__)

# Define the path to your songs directory within the 'static' folder
SONGS_DIR = os.path.join(app.static_folder, "songs")

def get_songs():
    """Scans the songs directory and creates a list of songs with their details."""
    songs_list = []
    if not os.path.isdir(SONGS_DIR):
        print(f"Warning: The directory '{SONGS_DIR}' was not found.")
        return []

    for filename in os.listdir(SONGS_DIR):
        if filename.lower().endswith(('.mp3', '.wav', '.ogg')):
            song_name = os.path.splitext(filename)[0]

            # ✅ This is the correct way to build a safe URL in Flask.
            # url_for handles the quoting for special characters automatically.
            song_url = url_for('static', filename=f'songs/{quote(filename)}')

            thumb_filename = f"{song_name}.jpg"
            thumb_path = os.path.join(SONGS_DIR, thumb_filename)

            if os.path.exists(thumb_path):
                # ✅ url_for also makes the thumbnail URL safe.
                thumb_url = url_for('static', filename=f'songs/{quote(thumb_filename)}')
            else:
                # Fallback to a known existing image if a specific one isn't found.
                thumb_url = url_for('static', filename='songs/Aadiman.jpg')

            songs_list.append({
                "name": song_name,
                "file": song_url,
                "thumbnail": thumb_url
            })
    return songs_list

@app.route("/")
def index():
    """Renders the main page from 'templates/index.html'."""
    songs = get_songs()
    return render_template("index.html", songs=songs)

@app.route("/songs")
def songs_api():
    """Provides the list of songs as JSON for your JavaScript file."""
    return jsonify(get_songs())

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

