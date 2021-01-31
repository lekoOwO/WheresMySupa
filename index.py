from quart import Quart, websocket, send_from_directory, copy_current_websocket_context, current_app, redirect
from quart_cors import route_cors
from chat_replay_downloader.chat_replay_downloader import ChatDownloader
import time
import os
import json
import requests
import re
import base64
import webbrowser, random, threading
import sys
from pathlib import Path

if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    base_dir = Path(sys._MEIPASS)
else:
    base_dir = Path(__file__).parent

def chat_message_archive(message, filename):
    dirname = os.path.join(base_dir, "data")

    if not os.path.exists(dirname):
        os.mkdir(dirname)

    with open(os.path.join(dirname, filename), 'a+', newline='', encoding='utf-8') as f:
        data = json.dumps(message)
        data = data.encode("utf-8")
        data = base64.b64encode(data)
        data = data.decode("utf-8") 
        f.write(f"{data}\n")

app = Quart(__name__)

@app.route("/")
async def main():
    return await send_from_directory(f"{base_dir}/web", "index.html")

@app.route("/js/<filename>")
async def js(filename):
    return await send_from_directory(f"{base_dir}/web/js", os.path.basename(filename))

@app.route("/avatar/<channel_id>")
@route_cors(allow_origin="https://ytsc.leko.moe")
async def avatar(channel_id):
    s = requests.get(f"https://www.youtube.com/channel/{channel_id}").text
    result = re.search('<link itemprop="thumbnailUrl" href="(.*?)">', s)
    url = result.group(1)
    res = requests.get(url).content
    return res

@app.route('/data/<filename>')
def download_and_remove(filename):
    filename = os.path.basename(filename)
    path = os.path.join(base_dir, "data", filename)

    def generate():
        with open(path, "rb") as f:
            yield from f

        os.remove(path)

    r = current_app.response_class(generate(), mimetype='application/octet-stream')
    r.headers.set('Content-Disposition', 'attachment', filename=filename)
    return r

@app.websocket("/ws/<video_id>")
async def ws(video_id):
    @copy_current_websocket_context
    async def callback(sc):
        await websocket.send_json({
            "type": "data",
            "data": sc
        })
    
    async def main(video_id, filename):
        chats = ChatDownloader().get_chat(url=f"https://www.youtube.com/watch?v={video_id}", message_groups=['superchat'])
        for chat in chats:
            await callback(chat)
            chat_message_archive(chat, filename)
    
    await websocket.send_json({
        "type": "init"
    })
    try:
        filename = f"{video_id}.{time.time_ns()}.supa"
        await main(video_id, filename)

        await websocket.send_json({
            "type": "finish",
            "filename": filename
        })

    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "data": {
                "type": type(e).__name__,
                "message": str(e)
            }
        })

if __name__ == "__main__":
    port = random.randint(3000, 60000)
    url = f"http://localhost:{port}"

    threading.Timer(1.5, lambda: webbrowser.open(f"{url}", 1)).start()

    app.run(port=port, debug=False)