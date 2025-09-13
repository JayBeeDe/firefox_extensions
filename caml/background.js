#!/usr/bin/env node

let isDarkThemeStatus = false;
const darknessThreshold = 128;

const ICONS = {
    dark: {
        active: "icons/dark-512-ok.png",
        inactive: "icons/dark-512.png"
    },
    light: {
        active: "icons/light-512-ok.png",
        inactive: "icons/light-512.png"
    }
}

browser.contextMenus.create({
    id: "copy-jira-link-context-menu",
    title: "Copy as Jira Link",
    contexts: ["action"]
});

browser.contextMenus.create({
    id: "copy-html-link-context-menu",
    title: "Copy as HTML Link",
    contexts: ["action"]
});

function rgbToHex(color) {
    let r = null, g = null, b = null;
    if (color !== null && color.startsWith("#")) {
        r = parseInt(color.substring(1, 3), 16);
        g = parseInt(color.substring(3, 5), 16);
        b = parseInt(color.substring(5, 7), 16);
    } else if (color !== null && color.startsWith("rgb")) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/);
        if (match) {
            r = parseInt(match[1], 10);
            g = parseInt(match[2], 10);
            b = parseInt(match[3], 10);
        }
    }
    return {
        r: r,
        g: g,
        b: b
    };
}

async function isDarkTheme() {
    try {
        // Wait for a short delay to allow theme to initialize
        await new Promise(resolve => setTimeout(resolve, 50));
        const themeInfo = await browser.theme.getCurrent();
        // Check if theme information is incomplete (likely the default theme)
        if (themeInfo && themeInfo.colors === null && themeInfo.images === null && themeInfo.properties === null) {
            // User is likely using the default theme. Check OS dark mode.
            isDarkThemeStatus = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setIcon();
            return;
        }
        // If a specific theme is set, proceed with color analysis as before
        const { r, g, b } = rgbToHex(themeInfo?.colors?.toolbar);
        if (r === null || g === null || b === null) {
            console.warn("Theme information incomplete, assuming light theme!");
            isDarkThemeStatus = false;
        }
        else {
            // Color parsing and luminance calculation
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            isDarkThemeStatus = luminance < darknessThreshold;
        }
    } catch (error) {
        console.warn("Error getting theme information:", error, "Assuming light theme!");
        isDarkThemeStatus = false;
    }
    setIcon();
}

function setIcon(active = "inactive") {
    browser.action.setIcon({ path: ICONS[isDarkThemeStatus ? "dark" : "light"][active] });
}

function createLink(typeLink = "markdown") {
    browser.tabs.query({ active: true, currentWindow: true })
        .then(tabs => {
            const tab = tabs[0];
            if (!tab) {
                console.error("No active tab found!");
                return;
            }
            let title = tab.title;
            const url = tab.url;

            browser.storage.sync.get("rules").then(result => {
                const rules = result.rules || [];
                for (const rule of rules) {

                    regexUrl = new RegExp(rule.url);
                    if (!regexUrl.test(url)) continue;

                    regexSearch = new RegExp(rule.search);
                    if (!regexSearch.test(title)) continue;

                    title = title.replace(regexSearch, rule.replace);
                    break;
                }

                let formattedLink = `[${title}](${url})`;
                if (typeLink === "jira") {
                    formattedLink = `[${title}|${url}]`;
                } else if (typeLink === "html") {
                    formattedLink = `<a href="${url}" title="${title}" target="_new">${title}</a>`;
                }

                navigator.clipboard.writeText(formattedLink)
                    .then(() => {
                        console.log("Copied to clipboard:", formattedLink);
                        setIcon("active");
                        setTimeout(() => {
                            setIcon();
                        }, 2000);
                    })
                    .catch(err => {
                        console.error("Failed to copy:", err);
                    });
            });
        });
}

browser.commands.onCommand.addListener(function (command) {
    if (command === "copy-markdown-link") {
        createLink();
    }
});

browser.commands.onCommand.addListener(function (command) {
    if (command === "copy-jira-link") {
        createLink("jira");
    }
});

browser.contextMenus.onClicked.addListener(function (info) {
    if (info.menuItemId === "copy-jira-link-context-menu") {
        createLink("jira");
    }
});

browser.commands.onCommand.addListener(function (command) {
    if (command === "copy-html-link") {
        createLink("html");
    }
});

browser.contextMenus.onClicked.addListener(function (info) {
    if (info.menuItemId === "copy-html-link-context-menu") {
        createLink("html");
    }
});

browser.action.onClicked.addListener(createLink);

browser.theme.onUpdated.addListener(isDarkTheme);

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", isDarkTheme);

(async () => {
    await isDarkTheme();
})();
