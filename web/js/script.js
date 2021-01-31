function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function getYoutubeID(url){
    const regex = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    window.youtubeId = url.match(regex)[1];

    return window.youtubeId
}

const COLORS = {
    CYAN: "00bfa5",
    YELLOW: "ffb300",
    RED: "d00000",
    ORANGE: "e65100",
    MAGENTA: "c2185b",
    BLUE: "1565c0"
};
Object.freeze(COLORS)

const COLOR_TEXTS = {
    CYAN: "青",
    BLUE: "藍",
    YELLOW: "黃",
    ORANGE: "橙",
    MAGENTA: "洋紅",
    RED: "紅",
    UNKNOWN: "未知"
};
Object.freeze(COLOR_TEXTS)

function getHeaderColor(headerColor){
    headerColor = headerColor.substring(1, 7)
    const color = Object.keys(COLORS).find(color => COLORS[color] === headerColor);
    return color || "UNKNOWN"
}

function _progress(data, isInit=false, isFinished=false){
    const progress = document.getElementById("progress")
    const sourceText = progress.dataset.text;

    if (isInit){
        progress.textContent = `${sourceText}0:00`;
    } else if (isFinished) {
        progress.textContent = `${sourceText}已完成`
    } else {
        if (!data.time_text) return;
        progress.textContent = `${sourceText}${data.time_text}`
    }
}

function ondata(data){
    _progress(data)
    if (data.message_type !== "paid_message") return;
    if (!data.message) return;
    const filters = {
        author: x => document.getElementById("author").value && x.author.name.includes(document.getElementById("author").value),
        message: x => document.getElementById("message").value && x.message.includes(document.getElementById("message").value),
        all: _ => !document.getElementById("author").value && !document.getElementById("message").value
    }
    for(const filter of Object.values(filters)){
        if (filter(data)) return addData(data);
    }
}

function addData(data){
    const id = uuidv4()
    const template = document.getElementById("newLine")

    const clone = document.importNode(template.content, true);

    const tr = clone.querySelector("tr")
    const tds = tr.querySelectorAll("td")

    tds[0].textContent = data.author.name
    tds[1].textContent = COLOR_TEXTS[getHeaderColor(data.header_background_colour)]
    tds[2].textContent = data.message
    
    const button = clone.querySelector("td button");
    button.id = id;
    clone.querySelector("td button").addEventListener("click", e => {
        e.preventDefault();

        const id = e.target.id;
        const data = window.scData[id]

        const url = new URL("https://ytsc.leko.moe")

        const param = new URLSearchParams();
        param.set("name", data.author.name);
        param.set("price", data.amount);
        param.set("text", data.message);
        param.set("color", getHeaderColor(data.header_background_colour).toLowerCase())
        param.set("avartar", data.author.images.pop().url)
        url.search = param.toString()

        window.open(url, '_blank');
    })
    if (!window.hasOwnProperty("scData")) window.scData = {}

    document.querySelector("tbody").appendChild(clone);
    window.scData[id] = data;
}

function downloadURI(uri, name) {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    link.click();
}

function download(filename){
    downloadURI(`/data/${filename}`, `${filename}`);
}

function ws(videoId){
    init()
    const url = new URL(window.location.href)
    const socket = new WebSocket(`ws://${url.host}/ws/${videoId}`)

    socket.onmessage = function(e){
        const data = JSON.parse(e.data);

        switch(data.type){
            case "init":
                break
            case "data":
                ondata(data.data, false);
                break;
            case "finish":
                _progress(null, false, true)
                download(data.filename);
                break;
            case "error":
                console.error(data.data)
                break;
        }
    }
}

function init(){
    window.scData = {}
    for(const tr of document.querySelectorAll("tbody > tr")){
        tr.remove()
    }
    maxAuthorWidth = 0;
    _progress(null, true)
}

document.addEventListener("DOMContentLoaded", () => {
    ts('.ts.sortable.table').tablesort();

    document.getElementById("start").addEventListener("click", () => {
        let videoId = document.getElementById("videoId").value
        if (videoId.includes(".")) videoId = getYoutubeID(videoId)
        ws(videoId);
    })

    for(const button of document.getElementsByClassName("inputStatus")){
        button.addEventListener("click", e => {
            for (const source of document.getElementsByClassName("inputSource")){
                source.classList.toggle("hide")
            }
            for (const b of document.getElementsByClassName("inputStatus")){
                b.classList.toggle("hide")
            }
        })
    }

    document.getElementById("upload").addEventListener('change', () => {
        init()
        const upload = document.getElementById("upload")
        const file = upload.files[0];
        new LineReader(file).readLines(async line => {
            const rawText = atob(line);
            const data = JSON.parse(rawText)
            ondata(data, true)
        }, () => {
            _progress(null, false, true)
        })
        upload.value = null;
    }, false)
})