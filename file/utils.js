const resolvePath = (pathComp, base) => {
    return decodeURI(new URL(`${pathComp.filter(p => p).join("/")}`, base || process.env.BASE_DIR).href)
}

const urlToFileName = (url, base) => {
    return url.replace("file:///", "file://").replace((base || process.env.BASE_DIR).replace("file:///", "file://"), "")
}

module.exports = {
    resolvePath,
    urlToFileName
}