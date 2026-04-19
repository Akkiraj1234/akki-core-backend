const ERROR_TYPES = Object.freeze({
    NETWORK_FAILURE: "NETWORK_FAILURE",
    SERVER_FAILURE: "SERVER_FAILURE",
    RATE_LIMITED: "RATE_LIMITED",
    TEMPORARY_UNAVAILABLE: "TEMPORARY_UNAVAILABLE",
    TIMEOUT: "TIMEOUT",

    NOT_FOUND: "NOT_FOUND",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    BAD_REQUEST: "BAD_REQUEST",
    VALIDATION_FAILED: "VALIDATION_FAILED",

    PARSE_FAILURE: "PARSE_FAILURE",
    UNKNOWN_FAILURE: "UNKNOWN_FAILURE",

    CONFIG_NOT_FOUND: "CONFIG_NOT_FOUND",
    MISSING_REQUIRED_INPUT: "MISSING_REQUIRED_INPUT",
    SERVICE_NOT_CONFIGURED: "SERVICE_NOT_CONFIGURED",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    UNEXPECTED_RESPONSE: "UNEXPECTED_RESPONSE",
    TOKEN_INVALID: "TOKEN_INVALID",
    PARTIAL_FAILURE: "PARTIAL_FAILURE",

    AUTH_HANDLER_NOT_CONFIGURED: "AUTH_HANDLER_NOT_CONFIGURED"
});

// all error should return full error object and also create responce with status code and message for backward compatibility with old code which is using response object to check for error

function createError({
    type = ERROR_TYPES.UNKNOWN_FAILURE,
    message = "An unexpected error occurred.",
    source = null,
    context = null,
    meta = null,
} = {}) {
    return {
        type,
        message,
        source: source ?? { code: null, message: null },
        context: context ?? {},
        meta: meta ?? { timestamp: new Date().toISOString() }
    };
}

function createTokenExpiredError( error = {}) {
    return createError({
        type: ERROR_TYPES.TOKEN_EXPIRED,
        message:
            error?.message ||
            "Authentication token has expired. Please re-authenticate.",
        source: error?.source ?? {},
        context: error?.context ?? {},
        meta: error?.meta ?? null,
    });
}

function createConfigNotFoundError({ service, key, message = null } = {}) {
    const serviceName = service ?? "unknown-service";
    const configKey = key ?? "unknown-key";

    return createError({
        type: ERROR_TYPES.CONFIG_NOT_FOUND,
        message:
            message ??
            `Missing required config '${serviceName}.${configKey}', cannot process request.`,
        context: {
            service: serviceName,
            key: configKey
        }
    });
}

function createMissingInputError({ field, service = null, operation = null } = {}) {
    return createError({
        type: ERROR_TYPES.MISSING_REQUIRED_INPUT,
        message: `Required input '${field ?? "unknown"}' is missing.`,
        context: {
            field: field ?? null,
            service,
            operation
        }
    });
}

function createServiceNotConfiguredError({ service, message = null } = {}) {
    const serviceName = service ?? "unknown-service";

    return createError({
        type: ERROR_TYPES.SERVICE_NOT_CONFIGURED,
        message:
            message ?? `Service '${serviceName}' is not configured correctly.`,
        context: {
            service: serviceName
        }
    });
}

function createAuthHandlerNotConfiguredError({ handler = "AuthHandler", message = null } = {}) {
    return createError({
        type: ERROR_TYPES.AUTH_HANDLER_NOT_CONFIGURED,
        message:
            message ??
            `${handler} is not configured. Please run init() before making requests.`,
        context: {
            handler
        }
    });
}

class ServiceNotFoundError extends Error {
  constructor(message = "Service not found") {
    super(message);
    this.name = "ServiceNotFoundError";
  }
}

module.exports = {
    ERROR_TYPES,
    createError,
    createTokenExpiredError,
    createConfigNotFoundError,
    createMissingInputError,
    createServiceNotConfiguredError,
    createAuthHandlerNotConfiguredError,
    ServiceNotFoundError
};
