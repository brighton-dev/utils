const AmazonS3URI = require('amazon-s3-uri')
const AWS = require("aws-sdk/global");
const stream = require("stream")

const { resolvePath } = require("./utils")

AWS.config.httpOptions.timeout = 0;
AWS.config.region = "eu-west-2";

require("aws-sdk/clients/s3")

const s3 = new AWS.S3({
    apiVersion: "2006-03-01"
});

const fixUrl = url => {
    return url.replace(/\s/g, "_")
}

const createReadStream = async url => {
    const { bucket, key } = AmazonS3URI(fixUrl(url))

    let stream = s3.getObject({
        Bucket: bucket,
        Key: key
    }).createReadStream()

    stream.on("error", e => console.log("Error in aws.createReadStream:", url, e))

    return stream
}

const createWriteStream = async url => {
    const { bucket, key } = AmazonS3URI(fixUrl(url))

    const pass = new stream.PassThrough()
    const pass2 = new stream.PassThrough()

    //Hacky solution so end is called when the upload promise returns
    const end = pass.end
    pass.end = () => {
        pass2.end()
    }

    pass.pipe(pass2)

    const params = { Bucket: bucket, Key: key, Body: pass2 };
    s3.upload(params).promise().then(res => {
        end.bind(pass)()
    }).catch(e => console.log("Error in aws.createWriteStream", e))

    return pass;
}

const ls = async (url, options = {}) => {
    let { bucket, key } = AmazonS3URI(fixUrl(url))

    if (url && url.slice(-1) !== "/")
        url += "/"

    if (key && key.slice(-1) !== "/")
        key += "/"

    let objects = await s3.listObjects({
        Bucket: bucket,
        Prefix: key
    }).promise();

    let files = objects.Contents
    files = files.map(x => ({ ...x, key: !key ? x.Key : x.Key.substring(key.length) }))

    files = files.filter(x => x.key.slice(-1) !== "/")

    const addUrl = x => ({ ...x, key: resolvePath([x.key], url) })

    if (options.fullPath) {
        files = files.map(x => addUrl(x))
    }

    if (!options.includeInfo) {
        files = files.map(x => x.key)
    }

    return files
}

const rm = (url, options) => {
    const { bucket, key } = AmazonS3URI(fixUrl(url))

    return s3.deleteObject({
        Bucket: bucket,
        Key: key
    }).promise()
}

const rmdir = async (url, options) => {
    const { bucket, key } = AmazonS3URI(fixUrl(url))

    var params = {
        Bucket: bucket,
        Prefix: key
    };

    let objects = await s3.listObjects(params).promise()
    if (objects.Contents.length == 0)
        return

    params = { Bucket: bucket };
    params.Delete = { Objects: [] };

    objects.Contents.forEach(function (content) {
        params.Delete.Objects.push({ Key: content.Key });
    });

    await s3.deleteObjects(params).promise()
    if (objects.Contents.length == 1000)
        await rmdir(url, options);
}

const getSignedUrl = async (resourceUrl, { expiryTime = 10 } = {}) => {
    const { bucket, key } = AmazonS3URI(fixUrl(resourceUrl))

    return await s3.getSignedUrlPromise('getObject', {
        Bucket: bucket,
        Key: key,
        Expires: expiryTime
    })
}

module.exports = {
    createReadStream,
    createWriteStream,
    ls,
    mkdir: () => this,
    rm,
    rmdir,
    getSignedUrl
}