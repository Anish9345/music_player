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
    # Check if the songs directory actually exists
    if not os.path.isdir(SONGS_DIR):
        print(f"Warning: The directory '{SONGS_DIR}' was not found.")
        return []

    for filename in os.listdir(SONGS_DIR):
        # Process only audio files
        if filename.lower().endswith(('.mp3', '.wav', '.ogg')):
            # Get the song name without the file extension
            song_name = os.path.splitext(filename)[0]

            # Generate a URL-safe path for the song file
            song_url = url_for('static', filename=f'songs/{quote(filename)}')

            # --- FIX: Look for the thumbnail in the SAME folder as the song ---
            thumb_filename = f"{song_name}.jpg"
            thumb_path = os.path.join(SONGS_DIR, thumb_filename)

            if os.path.exists(thumb_path):
                # If a matching thumbnail is found, use it
                thumb_url = url_for('static', filename=f'songs/{quote(thumb_filename)}')
            else:
                # Otherwise, fall back to a default thumbnail.
                # Please add a 'default.jpg' to your 'static/songs' folder.
                thumb_url = url_for('static', filename='songs/default.jpg')

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
    # Use the PORT environment variable for Render, default to 5000 for local testing
    port = int(os.environ.get('PORT', 5000))
    # Run on 0.0.0.0 to make it accessible for deployment
    app.run(host='0.0.0.0', port=port)

