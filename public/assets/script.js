function _path_api() {
    return `${window.location.origin}/api${window.location.pathname.substr(0, window.location.pathname.length-1)}`;
}