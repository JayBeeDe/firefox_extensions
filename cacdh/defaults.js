const DEFAULT_EXCEPTIONS = [
    "moz-extension://.*"
];

const DEFAULT_COLORS = {
    accentuation: "#ffff00",
    black: "#000000",
    coal: "#1a1a1a",
    white: "#ffffff"
};

const DARKNESS_SETTINGS = {
    threshold: 128,
    luminance: {
        r: 0.299,
        g: 0.587,
        b: 0.114
    }
};

const THEME_SETTINGS = {
    colors: {
        bookmark_text: "white",
        frame_inactive: "black",
        frame: "black",
        icons: "white",
        ntp_background: "black",
        ntp_card_background: "black",
        ntp_text: "white",
        popup_text: "white",
        popup: "black",
        sidebar_text: "white",
        sidebar: "black",
        tab_background_text: "white",
        tab_loading: "white",
        tab_selected: "black",
        tab_text: "white",
        toolbar_field_focus: "coal",
        toolbar_field_text_focus: "white",
        toolbar_field_text: "white",
        toolbar_field: "coal",
        toolbar_text: "white",
        toolbar: "coal",
    },
    properties: {
        color_scheme: "dark",
        content_color_scheme: "dark",
    }
};

const SETTINGS_ACCENTUATION_KEYS = {
    colors: [
        "button_background_active",
        "button_background_hover",
        "icons_attention",
        "popup_border",
        "popup_highlight",
        "sidebar_border",
        "sidebar_highlight",
        "tab_background_separator",
        "tab_line",
        "toolbar_bottom_separator",
        "toolbar_field_border_focus",
        "toolbar_field_border",
        "toolbar_field_highlight",
        "toolbar_field_separator",
        "toolbar_top_separator",
        "toolbar_vertical_separator",
    ]
};

const SETTINGS_DYNAMIC_KEYS = {
    colors: [
        "popup_highlight_text",
        "sidebar_highlight_text",
        "toolbar_field_highlight_text",
    ]
};

export { DEFAULT_EXCEPTIONS, DEFAULT_COLORS, DARKNESS_SETTINGS, THEME_SETTINGS, SETTINGS_ACCENTUATION_KEYS, SETTINGS_DYNAMIC_KEYS };
