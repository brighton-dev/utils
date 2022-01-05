const { requireEnv } = require("./env")
const { MissingEnvironmentVariable } = require("./error")

test('Missing env var', () => {
    process.env.LOL_LOL = ""
    expect(() => requireEnv("LOL_LOL")).toThrow(MissingEnvironmentVariable)
})