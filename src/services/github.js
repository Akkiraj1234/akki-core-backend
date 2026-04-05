const { GET, POST } = require("../infrastructure");
const { handleServiceError } = require("../utils.js");
const { SECRET, CONFIG } = require("../config");

// config
const USERNAME = CONFIG.github.username;
const PROFILE_INFO_URL = `https://api.github.com/users/${USERNAME}`;
const TIMELINE_URL = `https://api.github.com/users/${USERNAME}/events`;



function getAuthHeaders() {
    return SECRET.GITHUB_FG_ACCESS_TOKEN
        ? { Authorization: `Bearer ${SECRET.GITHUB_FG_ACCESS_TOKEN}` }
        : {};
}

// data fetching functions

async function getGithubProfile() {
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
    /**
     * Convert GitHub weeks -> flat [{ date: dayIndex, count }]
     * (same as LeetCode format)
     */

    const dayCountMap = new Map();

    for (const week of weeks) {
        for (const day of week.contributionDays) {
            const dayIndex = Math.floor(new Date(day.date).getTime() / 86400000);
            const count = Number(day.contributionCount) || 0;

            if (!Number.isFinite(dayIndex)) continue;
            dayCountMap.set(dayIndex, (dayCountMap.get(dayIndex) ?? 0) + count);
        }
    }

    return Array.from(dayCountMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date - b.date);
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
        headers: {
            Authorization: `Bearer ${SECRET.GITHUB_FG_ACCESS_TOKEN}`
        }
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
}

const worker_map = {
    "getGithubProfile": {
        callable: getGithubProfile,
        key: "github.profile",
        priority: "high",
        next_run: 2 * 3600 * 1000
    },
    "getGithubEvents": {
        callable: getGithubEvents,
        key: "github.events",
        priority: "medium",
        next_run: 30 * 60 * 1000
    },
    "fetchGithubHeatmap": {
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
