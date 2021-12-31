const { GeneralError } = require("./error")

const passError = func => async (req, res, next) => {
    try {
        await func(req, res, next)
    } catch (e) {
        next(e)
    }
}

const response = async (code, data) => {
    try {
        if (typeof data === "function")
            data = await data()
        return { code, data: (await data) || true }
    } catch (e) {
        console.error(e)
        if (e instanceof GeneralError)
            return { code: e.getCode(), data: e.message }
        return { code: 500, data: e.message }
    }
}

const expressify = func => async (req, res) => {
    const out = await func(req)
    res.status(out.code).json(out.data).end()
}

module.exports = { passError, response, expressify }