const path = require("path")
const { Readable, pipeline } = require("stream")
const { InvalidParameter, NotFound } = require("../error")
const { resolvePath, urlToFileName } = require("./utils")

module.exports = ({ gcs = null } = {}) => {
    const getHandler = url => {
        if (url.startsWith("s3://")) {
            return require("./aws.js")
        } else if (url.startsWith("gs://")) {
            return require("./gcp.js")(gcs)
        } else {
            return require("./local.js")
        }
    }

    const createReadStream = url => {
        return getHandler(url).createReadStream(url)
    }

    const createWriteStream = url => {
        return getHandler(url).createWriteStream(url)
    }

    const ls = (url, options) => {
        return getHandler(url).ls(url, options)
    }

    const compose = async (sources, dest, { removeSources = false } = {}) => {
        if (!sources?.length)
            throw new InvalidParameter(`Must be at least 1 source`)

        if (!dest)
            throw new InvalidParameter(`dest must be set`)

        const ws = await createWriteStream(dest)
    
        for (const file of sources) {
            await new Promise(async (resolve, reject) => {
                const rs = await createReadStream(file)
        
                rs.on("data", d => ws.write(d))
                rs.on("error", reject)
                rs.on("close", resolve)
            })

            if (removeSources) {
                await rm(file)
            }
        }
    
        ws.end()
    }

    const composeExtra = async (dest, { partRegex = new RegExp(/\.\d/g), removeSources = false } = {}) => {
        const dir = path.dirname(dest)
        const f = path.basename(dest)
        const files = await ls(dir, { fullPath: true })
    
        const toBuild = files.filter(x => {
            const base = path.basename(x)
            if (base.startsWith(f) && base.replace(f, "").match(partRegex)) {
                return true
            }
        })

        if (!toBuild?.length)
            throw new NotFound(`No sources found`)

        return compose(toBuild, dest, { removeSources })
    }

    const streamToData = stream => {
        return new Promise((resolve, reject) => {
            let data = "";

            stream.on("data", chunk => {
                data += chunk
            });
            stream.on("end", () => resolve(data));
            stream.on("error", error => reject(error));
        });
    }

    const streamToFile = async (stream, dest) => {
        return new Promise(async (resolve, reject) => {
            const out = await createWriteStream(dest)

            pipeline(
                stream,
                out,
                (err) => {
                    if (err) reject(err)
                    resolve()
                }
            )
        });
    }

    const streamToBuffer = async stream => {
        return new Promise(async (resolve, reject) => {
            let buffers = [];
            stream.on('data', buffer => {
                buffers.push(buffer)
            })

            stream.on("end", () => {
                resolve(Buffer.concat(buffers))
            })

            stream.on("error", () => {
                reject()
            })
        });
    }

    const copy = async (src, dest) => {
        return streamToFile(await createReadStream(src), dest)
    }

    const copyDir = async (src, dest) => {
        const files = await ls(src, {
            fullPath: true
        })

        return Promise.all(
            files.map(file => copy(file, file.replace(src, dest)))
        )
    }

    const read = async url => {
        return streamToData(await createReadStream(url))
    }

    const mkdir = (url, options) => getHandler(url).mkdir(url, options)

    const rm = async (url, options) => {
        return getHandler(url).rm(url, options)
    }

    const rmdir = async (url, options) => {
        return getHandler(url).rmdir(url, options)
    }

    const getSignedUrl = (resourceUrl, options) => {
        return getHandler(resourceUrl).getSignedUrl(resourceUrl, options)
    }

    const extract = (zip, { base, outputFolder = "", onEntry = () => { } } = {}) => {
        return new Promise((resolve, reject) => {
            let promises = []
            zip.on('entry', function (entry) {
                if (entry.isDirectory)
                    return;

                const filePath = entry.path;
                const newName = filePath.substring(filePath.indexOf("/") + 1, filePath.length)

                if (newName) {
                    promises.push((async () => {
                        console.log(resolvePath([newName], base))
                        let p = await createWriteStream(resolvePath([newName], base))

                        entry.pipe(p)
                        await onEntry(newName, entry)
                    })())
                }
            })
            zip.on("end", async () => {
                await Promise.all(promises)
                resolve()
            })
            zip.on("error", reject)
        })
    }

    const write = (content, path) => {
        return streamToFile(Readable.from(content), path)
    }

    return {
        resolvePath,
        urlToFileName,
        createReadStream,
        createWriteStream,
        streamToData,
        streamToFile,
        streamToBuffer,
        copy,
        copyDir,
        read,
        mkdir,
        rm,
        rmdir,
        ls,
        getSignedUrl,
        extract,
        write,
        compose,
        composeExtra
    }
}