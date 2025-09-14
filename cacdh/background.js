import { DEFAULT_COLORS, DARKNESS_SETTINGS, THEME_SETTINGS, SETTINGS_ACCENTUATION_KEYS, SETTINGS_DYNAMIC_KEYS } from "./defaults.js"

function hexToRgb(color) {
    let r = null, g = null, b = null;
    if (color !== null && color.startsWith("#")) {
        r = parseInt(color.substring(1, 3), 16);
        g = parseInt(color.substring(3, 5), 16);
        b = parseInt(color.substring(5, 7), 16);
    }
    return {
        r: r,
        g: g,
        b: b
    };
}

function isDarkTheme(hexColor) {
    const { r, g, b } = hexToRgb(hexColor);
    if (r === null || g === null || b === null) {
        console.warn("Theme information incomplete, assuming light theme!");
        return false;
    }
    else {
        // Color parsing and luminance calculation
        const luminance = DARKNESS_SETTINGS["luminance"]["r"] * r + DARKNESS_SETTINGS["luminance"]["g"] * g + DARKNESS_SETTINGS["luminance"]["b"] * b;
        return luminance < DARKNESS_SETTINGS["threshold"];
    }
}

async function applyDarkHighContrastTheme(accentuationColor) {

    if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(accentuationColor)) {
        accentuationColor = DEFAULT_COLORS["accentuation"];
    }

    let theme = {};

    Object.entries(THEME_SETTINGS).forEach(([category, settings]) => {
        theme[category] = {};
        Object.entries(settings).forEach(([key, value]) => {
            if (DEFAULT_COLORS[value]) {
                theme[category][key] = DEFAULT_COLORS[value];
            } else {
                theme[category][key] = value;
            }
        });
    });

    Object.entries(SETTINGS_ACCENTUATION_KEYS).forEach(([category, keys]) => {
        for (const key of keys) {
            theme[category][key] = accentuationColor;
        }
    });
    Object.entries(SETTINGS_DYNAMIC_KEYS).forEach(([category, keys]) => {
        for (const key of keys) {
            theme[category][key] = isDarkTheme(accentuationColor) ? DEFAULT_COLORS["white"] : DEFAULT_COLORS["black"];
        }
    });

    try {
        await browser.theme.update(theme);
    } catch (error) {
        console.error("Error applying theme:", error);
    }
}

function handleAccentuationColorChange(changes, area) {
    if (area === "sync") {
        if (changes.accentuationColor && changes.accentuationColor.oldValue !== changes.accentuationColor.newValue) {
            applyDarkHighContrastTheme(changes.accentuationColor.newValue);
        }
    }
}

function restoreAccentuationColor() {
    browser.storage.sync.get("accentuationColor").then(result => {
        applyDarkHighContrastTheme(result.accentuationColor);
    });
}

browser.storage.onChanged.addListener(handleAccentuationColorChange);

restoreAccentuationColor();

function injectDynamicCSS(tabId, accentuationColor) {
    const color = isDarkTheme(accentuationColor) ? DEFAULT_COLORS["white"] : DEFAULT_COLORS["black"];
    browser.scripting.insertCSS({
        target: { tabId: tabId },
        css: `
::selection {
    background-color: ${accentuationColor};
    color: ${color};
}
* {
    background-color: ${DEFAULT_COLORS["black"]}!important;
    color: ${DEFAULT_COLORS["white"]}!important;
    scrollbar-width: auto;
    scrollbar-color: ${accentuationColor} ${DEFAULT_COLORS["coal"]}!important;
}
h1,h2,h3,h4,h5,h6,h7 {
    color: ${accentuationColor}!important;
}

            `
    });
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        // Get the selection color from storage
        browser.storage.sync.get("accentuationColor")
            .then(result => {
                injectDynamicCSS(tabId, result?.accentuationColor || DEFAULT_COLORS["accentuation"]);
            })
            .catch(error => console.error("Error getting selection color:", error));
    }
});
