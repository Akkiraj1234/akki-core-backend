const { POST, GET, StaticAuthHandler } = require("../infrastructure");
const { formatHeatmap, handleServiceError } = require("../utils");
const { createMissingInputError } = require("../error");

const GITHUB_AUTH_HANDLER = new StaticAuthHandler({
    onAuthConfigErrorMessage: 
    "Auth handler not initialized for GitHub service. Please run init(secrets)."
});
const PROFILE_INFO_URL = `https://api.github.com/users`;


/**
 * Initializes GitHub auth handler using provided secrets.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * { secrets: { GITHUB_FG_ACCESS_TOKEN: string } }
 * ```
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Extracts access token from secrets
 * - Builds auth config for StaticAuthHandler
 * - Injects config into module-level auth handler
 *
 * ------------------------------------------------------------
 * Rules:
 * - Must be called before any service function
 * - Relies on global GITHUB_AUTH_HANDLER instance
 * - Does not perform any API calls
 */
function init( secrets ) {
    const config = {
        accessToken : secrets.GITHUB_FG_ACCESS_TOKEN,
        
        getAuthRequestHeader: (authHandler) => ({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization':`Bearer ${authHandler.accessToken}`,
            'Referer': 'https://github.com'
        })
    }
    GITHUB_AUTH_HANDLER.fromConfig(config);
}


/**
 * Flattens GitHub weekly contribution data into daily format.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * weeks: Array<{
 *   contributionDays: Array<{
 *     date: string,
 *     contributionCount: number
 *   }>
 * }>
 * ```
 *
 * ------------------------------------------------------------
 * Output:
 * ```js
 * Array<{ date: number, count: number }>
 * ```
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Converts ISO date → timestamp (ms)
 * - Filters invalid dates and zero/negative counts
 * - Flattens nested weeks → single array
 * - Sorts result in ascending date order
 *
 * ------------------------------------------------------------
 * Rules:
 * - Ignores malformed entries
 * - No duplicate handling (assumes input responsibility)
 */
function flattenGithubHeatmap(weeks = []) {
    const result = [];

    for (const week of weeks) {
        for (const day of week?.contributionDays ?? []) {
            const date = new Date(day.date).getTime();
            const count = Number(day.contributionCount) || 0;

            if (!Number.isFinite(date) || count <= 0) continue;

            result.push({ date, count });
        }
    }

    return result.sort((a, b) => a.date - b.date);
}



/**
 * Normalizes raw GitHub event into a stable structure.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * event: object
 * ```
 *
 * ------------------------------------------------------------
 * Output:
 * ```js
 * {
 *   id: string,
 *   type: string,
 *   createdAt: string,
 *   public: boolean,
 *   repo: {
 *     name: string,
 *     url: string
 *   },
 *   actor: {
 *     username: string,
 *     avatar: string
 *   }
 * } | null
 * ```
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Extracts key fields from raw GitHub event
 * - Normalizes nested repo and actor data
 * - Returns null for invalid input
 *
 * ------------------------------------------------------------
 * Rules:
 * - Ignores non-object or null input
 * - Defaults missing fields to null
 * - No side effects
 */
function normalizeGithubEvent(event) {
    if (!event || typeof event !== "object") return null;

    return {
        id: event.id ?? null,
        type: event.type ?? null,
        createdAt: event.created_at ?? null,
        public: event.public ?? null,
        repo: {
            name: event.repo?.name ?? null,
            url: event.repo?.url ?? null
        },
        actor: {
            username: event.actor?.login ?? null,
            avatar: event.actor?.avatar_url ?? null
        }
    };
}


/**
 * Fetches GitHub user profile data.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * { username: string }
 * ```
 *
 * ------------------------------------------------------------
 * Output (ServiceResponse):
 * ```js
 * {
 *   data: {
 *     username: string,
 *     avatar: string,
 *     profileUrl: string,
 *     repoUrl: string,
 *     bio: string,
 *     publicRepos: number,
 *     followers: number,
 *     following: number
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * ------------------------------------------------------------
 * Errors:
 * - SERVICE_NOT_CONFIGURED → init(secrets) not called / token missing
 * - UNAUTHORIZED / FORBIDDEN → invalid or expired token
 * - SERVICE_UNAVAILABLE → network/API failure
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Uses StaticAuthHandler for authenticated request
 * - Calls GitHub user API endpoint
 * - Normalizes response into stable structure
 *
 * ------------------------------------------------------------
 * Rules:
 * - username is required
 * - init(secrets) must be called before usage
 * - relies on global GITHUB_AUTH_HANDLER
 */
async function getGithubProfile({ username }) {

    if (!username) return createMissingInputError({ 
        field: "username", service: "getGithubProfile" 
    });

    const response = await GITHUB_AUTH_HANDLER.handlePost(
        async ( header ) => GET({
            url: `${PROFILE_INFO_URL}/${username}`,
            headers: header
        })
    );
    return handleServiceError({
        response,
        format: (payload) => ({
            username: payload?.login ?? null,
            avatar: payload?.avatar_url ?? null,
            profileUrl: payload?.html_url ?? null,
            repoUrl: payload?.repos_url ?? null,
            bio: payload?.bio ?? null,
            publicRepos: payload?.public_repos ?? 0,
            followers: payload?.followers ?? 0,
            following: payload?.following ?? 0,
        })
    });
}


/**
 * Fetches GitHub contribution heatmap and normalizes it.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * { username: string }
 * ```
 *
 * ------------------------------------------------------------
 * Output (ServiceResponse):
 * ```js
 * {
 *   data: {
 *     years: {
 *       [year]: {
 *         heatmap: Array<{ date: number, count: number }>,
 *         currentStreak: number,
 *         longestStreak: number,
 *         totalActiveDays: number,
 *         totalContributions: number
 *       }
 *     },
 *     global: {
 *       currentStreak: number,
 *       longestStreak: number,
 *       totalActiveDays: number,
 *       totalContributions: number
 *     }
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * ------------------------------------------------------------
 * Errors:
 * - SERVICE_NOT_CONFIGURED → init(secrets) not called / token missing
 * - UNAUTHORIZED / FORBIDDEN → invalid or expired token
 * - SERVICE_UNAVAILABLE → API/network failure
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Fetches contribution calendar via GitHub GraphQL API
 * - Flattens weekly data into daily format
 * - Normalizes output using formatHeatmap
 *
 * ------------------------------------------------------------
 * Rules:
 * - username is required
 * - init(secrets) must be called before usage
 * - relies on global GITHUB_AUTH_HANDLER
 */
async function fetchGithubHeatmap({ username }) {

   const query = `
    query ($username: String!) {
        user(login: $username) {
            contributionsCollection {
                contributionCalendar {
                    weeks {
                        contributionDays { date contributionCount }
                    }
                }
            }
        }
    }`;

    if (!username) return createMissingInputError({ 
        field: "username", service: "fetchGithubHeatmap" 
    });

    const response = await GITHUB_AUTH_HANDLER.handlePost(
        (header) => POST({
            url: "https://api.github.com/graphql",
            data: { query, variables: { username } },
            headers: { ...header, "Content-Type": "application/json" }
        })
    );

    return handleServiceError({
        response,
        format: (data) => {
            const weeks =
                data?.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
                
            return formatHeatmap( flattenGithubHeatmap(weeks) );
        }
    });
}


/**
 * Fetches recent GitHub events for a user.
 *
 * ------------------------------------------------------------
 * Input:
 * ```js
 * { username: string }
 * ```
 *
 * ------------------------------------------------------------
 * Output (ServiceResponse):
 * ```js
 * {
 *   data: {
 *     event: Array<{
 *       id: string,
 *       type: string,
 *       createdAt: string,
 *       repo: {
 *         name: string,
 *         url: string
 *       },
 *       actor: {
 *         username: string,
 *         avatar: string
 *       }
 *     }>
 *   },
 *   error,
 *   code
 * }
 * ```
 *
 * ------------------------------------------------------------
 * Errors:
 * - SERVICE_NOT_CONFIGURED → init(secrets) not called / token missing
 * - UNAUTHORIZED / FORBIDDEN → invalid or expired token
 * - NOT_FOUND → invalid username or no events available
 * - SERVICE_UNAVAILABLE → API/network failure
 *
 * ------------------------------------------------------------
 * Behavior:
 * - Fetches public user events via GitHub REST API
 * - Normalizes each event using normalizeGithubEvent
 * - Filters out invalid entries
 *
 * ------------------------------------------------------------
 * Rules:
 * - username is required
 * - init(secrets) must be called before usage
 * - relies on global GITHUB_AUTH_HANDLER
 */
async function getGithubEvents({ username }) {

    if (!username) return createMissingInputError({ 
        field: "username", service: "getGithubEvents" 
    });

    const response = await GITHUB_AUTH_HANDLER.handlePost(
        async ( header ) => GET({
            url: `${PROFILE_INFO_URL}/${username}/events`,
            headers: header
        })
    );

    return handleServiceError({
        response,
        format: (data) => (
            (data ?? []).map(normalizeGithubEvent).filter(Boolean)
        )
    })
}


const worker_map = {
    initFunc: init,
    configKey: "services.github.config",
    services: {
        "GithubProfileData": {
            callable: getGithubProfile,
            key: "github.profile",
            priority: "high",
            next_run: 2 * 3600 * 1000
        },
        "GithubHeatmapData": {
            callable: fetchGithubHeatmap,
            key: "github.heatmap",
            priority: "high",
            next_run: 30 * 60 * 1000
        },
        "GithubEventsData": {
            callable: getGithubEvents,
            key: "github.events",
            priority: "medium",
            next_run: 12 * 3600 * 1000
        }
    }
}


                                                                                                                                                                                                                                                                                                                                                                                                   