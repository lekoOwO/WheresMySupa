function adjustTable(){
    const getTableWidth = () => window.getComputedStyle(document.querySelector("table")).getPropertyValue("width")
    function set(width){
        const style = document.getElementById("contentCellWidth");
        style.innerHTML = `.contentCell{max-width: ${width};}`
    }
    set("0")
    const targetWidth = getTableWidth()
    set("100vw")

    let nowWidth = 100;
    while(getTableWidth() != targetWidth) {
        nowWidth -= 0.1
        set(`${nowWidth}vw`)
    }
}

window.adjustTable = adjustTable;

document.addEventListener("DOMContentLoaded", () => {
    adjustTable()
    window.addEventListener('resize', adjustTable);
})
