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
        format: (data) => {
            return data;
            // events: (data ?? []).map(normalizeEvent).filter(Boolean)
        }
    });
}
function formatGithubHeatmap(weeks) {
    /**
     * Convert GitHub weeks → flat [timestamp, count][]
     */

    const result = [];

    for (const week of weeks) {
        for (const day of week.contributionDays) {
            result.push([
                new Date(day.date).getTime(),
                day.contributionCount
            ]);
        }
    }

    return result;
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
     *   totalContributions: number,
     *   calendar: {
     *     heatmap: [number, number][]
     *   }
     * }>}
     */

    const response = await POST({
        url: "https://api.github.com/graphql",
        data: {
            query: GITHUB_GRAPHQL_QUERY,
            variables: { username }
        },
        headers: {
            Authorization: `Bearer ${SECRET.GITHUB_FG_ACCESS_TOKEN}`
        }
    });

    return handleServiceError({
        response,
        format: (data) => {
            const payload = data?.data?.user?.contributionsCollection?.contributionCalendar;

            return {
                totalContributions: payload?.totalContributions ?? 0,
                calendar: {
                    heatmap: formatGithubHeatmap(payload?.weeks ?? [])
                }
            };
        }
    });
}


async function main() {
    const data = await Promise.all([
        getGithubProfile(),
        getGithubEvents(),
        fetchGithubHeatmap({ username: "octocat" })
    ])

    data.forEach((res) => {
        console.dir(
            res?.error?.error ? `No data found ${JSON.stringify(res.error)}` : res,
            { depth: null}
        )
    });
}



if (require.main === module) {
    main()                                                                                                                                                 
}