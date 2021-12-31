const { Storage } = require('@google-cloud/storage');
const { resolvePath } = require("./utils")

module.exports = ({ credentials }) => {
    const storage = new Storage({
        credentials
    });

    const fixUrl = url => {
        return url.replace(/\s/g, "_")
    }

    const decodeUrl = url => {
        const urlParts = url.replace("gs://", "").split("/")

        const bucket = urlParts.shift()
        const key = urlParts.join("/")

        return { bucket, key }
    }

    const createReadStream = url => {
        const { bucket, key } = decodeUrl(url)

        return storage.bucket(bucket).file(key).createReadStream()
    }

    const createWriteStream = url => {
        const { bucket, key } = decodeUrl(url)

        return storage.bucket(bucket).file(key).createWriteStream()
    }

    const ls = async (url, { fullPath = false, includeInfo = false } = {}) => {
        let { bucket, key } = decodeUrl(url)

        if (key && key.slice(-1) !== "/")
            key += "/"

        const objects = await storage.bucket(bucket).getFiles({
            prefix: key
        })

        let files = objects[0]

        files = files.map(x => ({ ...x, key: `gs://${bucket}/${x.name}` }))
        files = files.filter(x => x.key.slice(-1) !== "/")

        if (!fullPath) {
            files = files.map(x => ({
                ...x,
                key: x.key.split("/").pop()
            }))
        }

        if (!includeInfo) {
            files = files.map(x => x.key)
        }

        return files
    }

    const rm = (url, options) => {
        const { bucket, key } = decodeUrl(url)

        return storage.bucket(bucket).file(key).delete(options)
    }

    const rmdir = (url, options) => {
        const { bucket, key } = decodeUrl(url)

        return storage.bucket(bucket).deleteFiles({
            prefix: key,
            ...options
        })
    }

    const getSignedUrl = (url, { expiryTime = 10 } = {}) => {
        const { bucket, key } = decodeUrl(url)

        return storage.bucket(bucket).file(key).getSignedUrl({
            expires: Date.now() + (expiryTime * 1000)
        })
    }

    return {
        createReadStream,
        createWriteStream,
        ls,
        mkdir: () => this,
        rm,
        rmdir,
        getSignedUrl
    }
}