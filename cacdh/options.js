import { DEFAULT_COLORS } from "./defaults.js"

document.addEventListener("DOMContentLoaded", loadOptions);
document.querySelector("#save-options").addEventListener("click", saveOptions);

function loadOptions() {
    browser.storage.sync.get({
        accentuationColor: DEFAULT_COLORS["accentuation"]
    }).then(result => {
        document.querySelector("#accentuationColor").value = result.accentuationColor;
    });
}

function alert(id, color) {
    document.querySelector("#" + id).style.border = `1px solid ${color}`;
    document.querySelector("#" + id).style.display = "block";
    setTimeout(() => {
        document.querySelector("#" + id).style.display = "none";
    }, 2000);
}

function saveOptions() {
    const accentuationColor = document.querySelector("#accentuationColor").value;

    browser.storage.sync.set({
        accentuationColor: accentuationColor
    }).then(() => {
        alert("saved-ok", accentuationColor);
    });
}
