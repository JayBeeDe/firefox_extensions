import { DEFAULT_EXCEPTIONS, DEFAULT_COLORS } from "./defaults.js"

const extensionName = browser.runtime.getManifest().name;
const exportFileName = "export-" + replaceAll(extensionName, " ", "-").toLowerCase() + ".json";

document.addEventListener("DOMContentLoaded", loadOptions);
document.querySelector("#add-exception").addEventListener("click", addException);
document.querySelector("#save-options").addEventListener("click", saveOptions);;
document.querySelector("#import-options").addEventListener("click", () => document.querySelector("#import-options-browse").click());
document.querySelector("#import-options-browse").addEventListener("change", () => importOptions(document.querySelector("#import-options-browse")));
document.querySelector("#export-options").addEventListener("click", exportOptions);

const exceptionsContainer = document.querySelector("#exceptions-container");
const exceptionTemplate = document.querySelector("#exception-template");

function replaceAll(str, charToReplace, replacementChar) {
    const regex = new RegExp(charToReplace, 'g'); // 'g' flag for global replacement
    return str.replace(regex, replacementChar);
}

function loadOptions() {
    exceptionsContainer.innerHTML = ""; // reset container 
    browser.storage.sync.get({
        accentuationColor: DEFAULT_COLORS["accentuation"],
        exceptions: DEFAULT_EXCEPTIONS
    }).then(result => {
        document.querySelector("#accentuationColor").value = result.accentuationColor;
        result.exceptions.forEach((exception, index) => {
            const exceptionElement = createExceptionElement(exception, index);
            exceptionsContainer.appendChild(exceptionElement);
        });
    });
}

function addException() {
    const newExceptionElement = createExceptionElement();
    exceptionsContainer.appendChild(newExceptionElement);
    reindexExceptions(); // Update indices after adding
}

function createExceptionElement(exceptionUrl = "") {
    const exceptionNode = exceptionTemplate.content.cloneNode(true);
    const exceptionDiv = exceptionNode.querySelector(".exception-row");
    exceptionNode.querySelector(".url").value = exceptionUrl;
    exceptionNode.querySelector(".remove-exception-button").addEventListener("click", () => removeException(exceptionDiv));
    return exceptionNode;
}

function removeException(exceptionDiv) {
    exceptionDiv.remove();
    reindexExceptions();
    saveOptions();
}

function reindexExceptions() {
    const exceptionDivs = document.querySelectorAll(".exception-row");
    exceptionDivs.forEach((exceptionDiv, index) => {
        exceptionDiv.dataset.index = index;
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
    const exceptions = [];
    const exceptionDivs = document.querySelectorAll(".exception-row");

    exceptionDivs.forEach(exceptionDiv => {
        const url = exceptionDiv.querySelector(".url").value;
        exceptions.push(url);
    });

    browser.storage.sync.set({
        accentuationColor: accentuationColor,
        exceptions: exceptions
    }).then(() => {
        alert("saved-ok", accentuationColor);
    });
}

async function importOptions(file) {
    if (!file) return;
    if (!file.files) return;
    if (!file.files[0]) return;
    try {
        const settings = JSON.parse(await file.files[0].text());
        browser.storage.sync.set(settings);
        alert("imported-ok");
        loadOptions();
    } catch (error) {
        alert("imported-error", error);
    }
}

function exportOptions() {
    browser.storage.sync.get({
        accentuationColor: DEFAULT_COLORS["accentuation"],
        exceptions: DEFAULT_EXCEPTIONS
    }).then(
        results => {
            try {
                const jsonString = JSON.stringify(results, null, 2);
                const blob = new Blob([jsonString], { type: "application/json" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = exportFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                alert("exported-ok", exportFileName);
            } catch (error) {
                alert("exported-error", error);
            }
        }
    );
}

