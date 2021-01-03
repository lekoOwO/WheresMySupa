function _isSameColor(color, target){
    return color.every((_, i, arr) => arr[i] === target[i]);
}

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

const COLORS = {
    CYAN: [0, 191, 165],
    YELLOW: [255, 179, 0],
    RED: [208, 0, 0],
    ORANGE: [230, 81, 0],
    MAGENTA: [194, 24, 91],
    BLUE: [21, 101, 192]
};
Object.freeze(COLORS)

const COLOR_TEXTS = {
    CYAN: "青",
    BLUE: "藍",
    YELLOW: "黃",
    ORANGE: "橙",
    MAGENTA: "洋紅",
    RED: "紅",
    BLUE: "藍",
    UNKNOWN: "未知"
};
Object.freeze(COLOR_TEXTS)

function getHeaderColor(headerColor){
    const color = Object.keys(COLORS).find(color => _isSameColor(COLORS[color], headerColor));
    return color || "UNKNOWN"
}

function ondata(data){
    if (!data.hasOwnProperty("header_color")) return;
    if (!data.message) return;
    const filters = {
        author: x => document.getElementById("author").value && x.author.includes(document.getElementById("author").value),
        message: x => document.getElementById("message").value && x.message.includes(document.getElementById("message").value),
        all: _ => !document.getElementById("author").value && !document.getElementById("message").value
    }
    for(const filter of Object.values(filters)){
        if (filter(data)) return addData(data);
    }
}

function getTextWidth(inputText) { 
    if (!window.calaTextWidthCanvas){
        inputText = "Geeks For Geeks"; 
        font = "16px times new roman"; 

        window.calaTextWidthCanvas = document.createElement("canvas"); 
    }
    const context = window.calaTextWidthCanvas.getContext("2d"); 
    context.font = font; 

    const width = context.measureText(inputText).width; 
    return width
} 

let maxAuthorWidth = 0

function addData(data){
    const id = uuidv4()
    const template = document.getElementById("newLine")

    const tr = template.content.querySelector("tr")
    const tds = tr.querySelectorAll("td")

    tds[0].textContent = data.author
    tds[1].textContent = COLOR_TEXTS[getHeaderColor(data.header_color.rgba)]
    tds[2].textContent = data.message

    const clone = document.importNode(template.content, true);
    const button = clone.querySelector("td button");
    button.id = id;
    clone.querySelector("td button").addEventListener("click", e => {
        e.preventDefault();

        const id = e.target.id;
        const data = window.scData[id]

        const url = new URL("https://ytsc.leko.moe")

        const param = new URLSearchParams();
        param.set("name", data.author);
        param.set("price", data.amount);
        param.set("text", data.message);
        param.set("color", getHeaderColor(data.header_color.rgba).toLowerCase())
        param.set("avartar", new URL(`/avatar/${data.author_id}`, document.baseURI).href)
        url.search = param.toString()

        window.open(url, '_blank');
    })
    if (!window.hasOwnProperty("scData")) window.scData = {}

    document.querySelector("tbody").appendChild(clone);
    window.scData[id] = data;

    const authorWidth = getTextWidth(data.author)
    if (authorWidth > maxAuthorWidth){
        maxAuthorWidth = authorWidth
        window.adjustTable()
    }
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
                ondata(data.data);
                break;
            case "finish":
                download(data.filename);
                break;
        }
    }
}

function init(){
    window.scData = {}
    for(const tr of document.querySelectorAll("tbody > tr")){
        tr.remove()
    }
}

document.addEventListener("DOMContentLoaded", () => {
    ts('.ts.sortable.table').tablesort();

    document.getElementById("start").addEventListener("click", e => {
        const videoId = document.getElementById("videoId").value
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
        const file = upload.files[0]
        new LineReader(file).readLines(line => {
            const rawText = atob(line);
            const data = JSON.parse(rawText)
            ondata(data) 
        })
        upload.value = null;
    }, false)
})