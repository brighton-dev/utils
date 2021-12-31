class GeneralError extends Error {
  constructor(message) {
    super()
    this.message = message
  }

  getCode() {
    if (this instanceof BadRequest) {
      return 400
    } else if (this instanceof NotFound) {
      return 404
    } else if (this instanceof Unauthorized) {
      return 401
    }
    return 500
  }
}

class Unauthorized extends GeneralError { }
class BadRequest extends GeneralError { }
class NotFound extends GeneralError { }
class InvalidParameter extends GeneralError { }
class Timeout extends GeneralError { }

module.exports = {
  Unauthorized,
  GeneralError,
  BadRequest,
  NotFound,
  InvalidParameter,
  Timeout
}