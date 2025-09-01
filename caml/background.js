#!/usr/bin/env node

const DEFAULT_ICON = "icons/icon48.png";
const SUCCESS_ICON = "icons/icon48-on.png";

function createLink(typeLink = "markdown") {
    browser.tabs.query({ active: true, currentWindow: true })
        .then(tabs => {
            const tab = tabs[0];
            if (tab) {
                let title = tab.title;
                const url = tab.url;

                browser.storage.sync.get("rules").then(result => {
                    const rules = result.rules;
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
                            browser.action.setIcon({ path: SUCCESS_ICON });
                            setTimeout(() => {
                                browser.action.setIcon({ path: DEFAULT_ICON });
                            }, 2000);
                        })
                        .catch(err => {
                            console.error("Failed to copy:", err);
                        });
                });
            } else {
                console.error("No active tab found!");
            }
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

browser.commands.onCommand.addListener(function (command) {
    if (command === "copy-html-link") {
        createLink("html");
    }
});

browser.action.onClicked.addListener(createLink);
