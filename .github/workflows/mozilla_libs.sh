#!/bin/bash

function _export() {
    if [ -z "$1" ]; then
        echo "Missing argument"
        exit 1
    fi
    if [ -n "$GITHUB_ENV" ]; then
        echo "$1" >>"$GITHUB_ENV"
    fi
    # shellcheck disable=SC2163
    export "$1"
}

function checkTag() {
    GIT_TAG="$1"
    if [ -z "$GIT_TAG" ]; then
        echo "Missing GIT_TAG script argument"
        exit 2
    fi
    _export EXTENSION_SHORT="${GIT_TAG/_v*/}"
    if [ -z "$EXTENSION_SHORT" ]; then
        echo "Cannot parse extension from tag $GIT_TAG"
        exit 2
    fi
    _export GIT_ROOT_PATH="$(git rev-parse --show-toplevel)"
    if ! [ -f "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.json" ]; then
        echo "File is not defined under ${GIT_ROOT_PATH}/${EXTENSION_SHORT}.json"
        exit 2
    fi
    if ! [ -f "${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json" ]; then
        echo "File is not defined under ${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json"
        exit 2
    fi
    _export EXTENSION_NAME="$(jq -r '.name // empty' "${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json")"
    if [ -z "$EXTENSION_NAME" ]; then
        echo "Cannot parse firefox extension name from file ${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json"
        exit 2
    fi
	EXTENSION_SLUG="${EXTENSION_NAME// /-}"
	_export EXTENSION_SLUG="${EXTENSION_SLUG,,}"
    _export EXTENSION_AUTHOR="$(jq -r '.author // empty' "${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json")"
    if [ -z "$EXTENSION_AUTHOR" ]; then
        echo "Cannot parse firefox extension author from file ${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json"
        exit 2
    fi
    _export EXTENSION_VERSION="${GIT_TAG/*_v/}"
    if [ -z "$EXTENSION_VERSION" ]; then
        echo "Cannot parse version from tag $GIT_TAG"
        exit 2
    fi
    echo "Tag $GIT_TAG sanity check is successful"
}

function setVersion() {
    PACKAGE_DATA=$(jq . "${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json")
    if [ -z "$PACKAGE_DATA" ]; then
        echo "Cannot parse json data from template file ${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json"
        exit 3
    fi
    PACKAGE_VERSION=$(jq -r '.version // empty' <<<"$PACKAGE_DATA")
    if [ -z "$PACKAGE_VERSION" ]; then
        echo "Cannot parse version to replace from template file ${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json"
        exit 3
    fi
    jq -r '.version = "'"$EXTENSION_VERSION"'"' <<<"$PACKAGE_DATA" >"${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json"
    echo "Version $EXTENSION_VERSION updated successfully to file ${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json"
    jq . "${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json" || cat "${GIT_ROOT_PATH}/${EXTENSION_SHORT}/manifest.json"
}

function build() {
	web-ext -s "${GIT_ROOT_PATH}/${EXTENSION_SHORT}" -a "${GIT_ROOT_PATH}/build" --no-input build -n "${EXTENSION_SLUG}-${EXTENSION_VERSION}.zip"
    _export PACKAGE_PATH="${GIT_ROOT_PATH}/build/${EXTENSION_SLUG}-${EXTENSION_VERSION}.zip"
    if ! [ -f "$PACKAGE_PATH" ]; then
        echo "Missing package $PACKAGE_PATH despite build finished successfully"
        exit 4
    fi
    PACKAGE_CHECKSUM=$(sha256sum "$PACKAGE_PATH" | awk '{print $1}')
    echo "Package built successfully to $PACKAGE_PATH with sha256sum $PACKAGE_CHECKSUM"
}

function prepare() {
	git tag
	last_tag_name="$(git tag | grep -P "^${EXTENSION_SHORT}_v*" 2>/dev/null | tail -n -2 | head -n 1)"
	if [ -n "$last_tag_name" ]; then
		echo "last_tag_name was $last_tag_name"
		_export RELEASE_NOTES="$EXTENSION_VERSION ($(date +%Y-%m-%d))\n\n$(git log --pretty=format:"%s" "${last_tag_name}..HEAD" | awk -v component="$EXTENSION_SHORT" '$0 ~ component {sub(/^[^:]+:\s*/, ""); print}' | sed -rz "s:\n:\\\n:g")"
		echo "release_notes"
		echo "$RELEASE_NOTES"
	fi

	if [ -n "$RELEASE_NOTES" ]; then
		mv "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.json" "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.tmp.json"
		jq --arg release_notes "$RELEASE_NOTES" '.version.release_notes = { "en-US": $release_notes }' "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.tmp.json" > "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.json"
		rm -f "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.tmp.json"
	fi
	if [ -f "${GIT_ROOT_PATH}/${EXTENSION_SHORT}/README.md" ]; then
		mv "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.json" "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.tmp.json"
		jq --arg escaped_markdown "$(jq -Rs @json "${GIT_ROOT_PATH}/${EXTENSION_SHORT}/README.md")" '. + { "description": { "en-US": $escaped_markdown } }' "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.tmp.json" > "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.json"
		rm -f "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.tmp.json"
	fi
	echo "The following amo metadata will be published"
	jq -r . "${GIT_ROOT_PATH}/${EXTENSION_SHORT}.json"
}

function publish() {
    if [ -z "$WEB_EXT_API_KEY" ]; then
        echo "Missing JWT issuer for web-ext. Please declare a GitHub secret named WEB_EXT_API_KEY"
        exit 5
    fi
    if [ -z "$WEB_EXT_API_SECRET" ]; then
        echo "Missing JWT secret for web-ext. Please declare a GitHub secret named WEB_EXT_API_SECRET"
        exit 5
    fi
    web-ext -s "${GIT_ROOT_PATH}/${EXTENSION_SHORT}" --no-input sign --approval-timeout=0 --channel=listed --amo-metadata="${GIT_ROOT_PATH}/${EXTENSION_SHORT}.json" --upload-source-code="$PACKAGE_PATH"
}

function checkPublication() {
    TTL=15
    INTERVAL=60
    while [ $TTL -gt 0 ]; do
        if curl -LsS "https://addons.mozilla.org/api/v5/addons/addon/${EXTENSION_SLUG}/versions/?page_size=100" | jq -r '.results[].version' | grep -q -P "^${EXTENSION_VERSION//./\\.}$"; then
            echo "Package version $EXTENSION_VERSION published successfully to $EXTENSION_SLUG"
            exit 0
        fi
        echo "Waiting ${INTERVAL}s for API to check package $EXTENSION_SLUG version $EXTENSION_VERSION publication ($TTL attempt(s) left)..."
        sleep $INTERVAL
        TTL=$((TTL - 1))
    done
    echo "An error has occurred while publishing package ${EXTENSION_SLUG}: version $EXTENSION_VERSION not found after $TTL attempts with an interval of ${INTERVAL}s"
    exit 6
}
