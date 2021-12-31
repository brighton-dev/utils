const fs = require("fs");
const path = require("path")
const moment = require("moment")
const { Readable, pipeline } = require("stream")

const { resolvePath } = require("./utils")

const urlToPath = url => {
    return path.resolve(url.replace(process.platform === "win32" ? "file:///" : "file://", "").replace("file://", ""))
}

async function getFiles(dir, { fullPath } = {}) {
    const subdirs = await fs.promises.readdir(dir);
    let files = await Promise.all(subdirs.map(async (subdir) => {
        let key = path.resolve(dir, subdir);
        const info = await fs.promises.stat(key)

        let res = {
            key,
            size: info.size,
            createdDate: moment(info.birthtime).format("YYYY-MM-DD HH:mm:ss")
        }

        return info.isDirectory() ? getFiles(key, { fullPath }) : res;
    }));

    files = files.reduce((a, f) => a.concat(f), []);

    return files
}

const ls = async (url, options = {}) => {
    if (url.slice(-1) !== "/")
        url += "/"

    const p = urlToPath(url)

    if (!fs.existsSync(p))
        return []

    let files = await getFiles(p, options)

    const relative = x => ({ ...x, key: path.relative(p, x.key) })
    const addUrl = x => ({ ...x, key: resolvePath([x.key], url)})

    files = files.map(x => relative(x))

    if (options.fullPath) {
        files = files.map(x => addUrl(x))
    }

    if (!options.includeInfo) {
        files = files.map(x => x.key)
    }

    return files
}

const mkdir = (url, options) => fs.promises.mkdir(urlToPath(url), {...options, recursive: true })

const rm = (url, options) => {
    return fs.promises.rm(urlToPath(url), options)
}

const rmdir = (url, options = {}) => {
    return fs.promises.rmdir(urlToPath(url), {
        ...options,
        recursive: true
    })
}

module.exports = {
    urlToPath,
    createReadStream: url => fs.createReadStream(urlToPath(url)),
    createWriteStream: async url => {
        await mkdir(path.dirname(urlToPath(url)))
        return fs.createWriteStream(urlToPath(url))
    },
    ls,
    mkdir,
    rm,
    rmdir,
    getSignedUrl: (url, { baseUrl }) => `${baseUrl || ""}/files/${encodeURIComponent(url)}`
}