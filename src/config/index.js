const { SECRET, CONFIG } = require("./config");

module.exports = {
  SECRET,
  CONFIG,

  github: require("./github"),
  spotify: require("./spotify"),
};