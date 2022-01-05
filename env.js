const { MissingEnvironmentVariable } = require("./error")

const requireEnv = name => {
    if (!process.env[name])
        throw new MissingEnvironmentVariable(name)

    return process.env[name]
}

module.exports = { requireEnv }