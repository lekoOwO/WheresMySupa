from quart import Quart, websocket, send_from_directory, copy_current_websocket_context, current_app, redirect
from quart_cors import route_cors
import asyncio
from chat_replay_downloader.chat_replay_downloader import ChatReplayDownloader
import csv
import time
import os
import tempfile
import json
import requests
import re
import base64

def chat_messages_archive(chat_messages, video_id):
    filename = f"{video_id}.{time.time_ns()}.supa"

    with open(f"./data/{filename}", 'a+', newline='', encoding='utf-8') as f:
        for message in chat_messages:
            data = json.dumps(message)
            data = data.encode("utf-8")
            data = base64.b64encode(data)
            data = data.decode("utf-8") 
            f.write(f"{data}\n")
    
    return filename

app = Quart(__name__)

@app.route("/")
async def main():
    return await send_from_directory("web", "index.html")

@app.route("/js/<filename>")
async def js(filename):
    return await send_from_directory("web/js", os.path.basename(filename))

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
    path = os.path.join(current_app.root_path, "data", filename)

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
    async def _callback(sc):
        await websocket.send_json({
            "type": "data",
            "data": sc
        })
    
    def callback(sc):
        try:
            asyncio.get_event_loop().create_task(
                _callback(sc)      
            )
        except RuntimeError:
            asyncio.run(
                _callback(sc)      
            )
    
    def main(video_id):
        return ChatReplayDownloader().get_youtube_messages(video_id, 
            message_type="superchat",
            callback = callback
        )
    
    await websocket.send_json({
        "type": "init"
    })
    try:
        chat_messages = await asyncio.get_event_loop().run_in_executor(None, main, video_id)
        filename = await asyncio.get_event_loop().run_in_executor(None, chat_messages_archive, chat_messages, video_id)

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
    app.run()