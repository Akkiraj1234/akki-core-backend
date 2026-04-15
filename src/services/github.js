const { formatHeatmap, handleServiceError } = require("../utils");
const { POST, GET, StaticAuthHandler } = require("../infrastructure");
const { createConfigNotFoundError } = require("../error");

const PROFILE_INFO_URL = `https://api.github.com/users`;
const GITHUB_AUTH_HANDLER = new StaticAuthHandler({
    onAuthConfigErrorMessage: 
        "Auth handler not initialized for GitHub service. Please run init(secrets)."
});


/**
 * Initializes GitHub auth handler using provided secrets.
 *
 * ------------------------------------------------------------
 * Input:
 * { secrets: { GITHUB_FG_ACCESS_TOKEN: string } }
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


async function getGithubProfile({ ... }) {
    
}

async function getGithubProfile({ ctx }) {
    const authHandler = ctx?.github?.getAuthConfig;
    if (!authHandler) return
    const response = await GET({
        url: PROFILE_INFO_URL,
        headers: getAuthHeaders()
    });

    return handleServiceError({
        response,
        format: (payload) => {
            return {
                username: payload?.login ?? null,
                avatar: payload?.avatar_url ?? null,
                profileUrl: payload?.html_url ?? null,
                repoUrl: payload?.repos_url ?? null,
                bio: payload?.bio ?? null,
                publicRepos: payload?.public_repos ?? 0,
                followers: payload?.followers ?? 0,
                following: payload?.following ?? 0,
            };
        }
    });
}

async function getGithubEvents() {
    const response = await GET({
        url: TIMELINE_URL,
        headers: getAuthHeaders()
    });

    return handleServiceError({
        response,
        format: (data) => ({
            events: (data ?? []).map(normalizeGithubEvent).filter(Boolean)
        })
    });
}

function normalizeGithubEvent(event) {
    if (!event || typeof event !== "object") return null;

    return {
        id: event.id ?? null,
        type: event.type ?? null,
        createdAt: event.created_at ?? null,
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

function formatGithubHeatmap(weeks) {
    const dayCountMap = new Map();

    for (const week of weeks ?? []) {
        for (const day of week?.contributionDays ?? []) {
            const dayIndex = Math.floor(new Date(day.date).getTime() / 86400000);
            const count = Number(day.contributionCount) || 0;

            if (!Number.isFinite(dayIndex)) continue;

            dayCountMap.set(dayIndex, (dayCountMap.get(dayIndex) ?? 0) + count);
        }
    }

    const heatmap = Array.from(dayCountMap.entries())
        .map(([date, count]) => ({ date, count }))
        .filter(day => day.count > 0) 
        .sort((a, b) => a.date - b.date);

    let totalActiveDays = 0;
    let streak = 0;
    let currentStreak = 0;

    for (let i = 0; i < heatmap.length; i++) {
        const day = heatmap[i];

        if (day.count > 0) {
            totalActiveDays++;
            currentStreak++;
            streak = Math.max(streak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }

    return {
        heatmap,
        totalActiveDays,
        streak
    };
}

const GITHUB_GRAPHQL_QUERY = `
query ($username: String!) {
  user(login: $username) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`;

async function fetchGithubHeatmap({ username }) {
    /**
     * Fetch GitHub contribution heatmap (last ~1 year)
     *
     * @param {Object} params
     * @param {string} params.username
     *
     * @returns {Promise<{
     *   availableYears: number[],
     *   calendar: Record<string, {
     *     totalContributions: number,
     *     heatmap: { date: number, count: number }[]
     *   }
     *   totalContributions: number
     * }>}
     */
    const selectedUsername = username ?? USERNAME;
    const currentYear = new Date().getFullYear();

    const response = await POST({
        url: "https://api.github.com/graphql",
        data: {
            query: GITHUB_GRAPHQL_QUERY,
            variables: { username: selectedUsername }
        },
        headers: getAuthHeaders()
    });

    return handleServiceError({
        response,
        format: (data) => {
            const payload = data?.data?.user?.contributionsCollection?.contributionCalendar;
            const totalContributions = payload?.totalContributions ?? 0;
            const heatmap = formatGithubHeatmap(payload?.weeks ?? []);

            return {
                availableYears: [currentYear],
                calendar: {
                    [currentYear]: {
                        totalContributions,
                        heatmap
                    }
                },
                totalContributions
            };
        }
    });
}async function fetchGithubHeatmap({ username }) {
    const selectedUsername = username ?? USERNAME;
    const currentYear = new Date().getFullYear();

    const response = await POST({
        url: "https://api.github.com/graphql",
        data: {
            query: GITHUB_GRAPHQL_QUERY,
            variables: { username: selectedUsername }
        },
        headers: getAuthHeaders()
    });

    return handleServiceError({
        response,
        format: (data) => {
            const payload = data?.data?.user?.contributionsCollection?.contributionCalendar;

            const {
                heatmap,
                totalActiveDays,
                streak
            } = formatGithubHeatmap(payload?.weeks ?? []);

            return {
                [currentYear]: {
                    streak,
                    totalActiveDays,
                    heatmap
                }
            };
        }
    });
}

const worker_map = {
    "GithubProfileData": {
        callable: getGithubProfile,
        key: "github.profile",
        priority: "high",
        next_run: 2 * 3600 * 1000
    },
    "GithubEventsData": {
        callable: getGithubEvents,
        key: "github.events",
        priority: "medium",
        next_run: 30 * 60 * 1000
    },
    "GithubHeatmapData": {
        callable: fetchGithubHeatmap,
        key: "github.heatmap",
        priority: "high",
        next_run: 30 * 60 * 1000
    }
};

module.exports = {
    worker_map
};


async function main() {
    const data = await Promise.all([
        getGithubProfile(),
        getGithubEvents(),
        fetchGithubHeatmap({ username: "octocat" })
    ])

    data.forEach((res) => {
        console.dir(
            res?.error?.error ? `No data found ${JSON.stringify(res.error)}` : res,
            { depth: null, showHidden: true, colors: true }
        )
    });
}



if (require.main === module) {
    main()                                                                                                                                                 
}
