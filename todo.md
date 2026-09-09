# Tasks

All the tasks that need to be completed.

## v1.1

* [x] Create the `pinned project` feature in `service/github.js`
* [x] Create a heatmap data getter for one year of GitHub, LeetCode, and Roadmap data
* [x] Create and send the list of currently active repositories
* [x] Remove unnecessary caching
* [x] Remove unnecessary queries from all routes
* [x] Add yaml in stable branch for each new push to release source
* [x] create simple routes for heatmap for all 3

## v1.2

* [ ] Add an on-demand pull feature
* [ ] Add a better caching system
* [ ] Implement on-demand full GitHub heatmap data collection
* [ ] Add a better query system
* [ ] Refactor GitHub service architecture
  * [ ] Create canonical repository/domain objects with a single stable shape
  * [ ] Remove duplicated repository data normalization across services
  * [ ] Standardize repository and activity data models
  * [ ] Improve shared service response and query handling
  * [ ] Add reusable pagination/history helpers where needed
  * [ ] Review and remove unnecessary abstractions and duplicated logic
  * [ ] Evaluate GraphQL as a future learning/architecture experiment
