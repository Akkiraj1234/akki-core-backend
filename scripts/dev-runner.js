const blessed = require("neo-blessed");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const os = require("os");

const devDir = path.join(process.cwd(), "dev");

const pythonPath = os.platform() === "win32"
  ? ".venv\\Scripts\\python.exe"
  : "./.venv/bin/python";

const files = fs.readdirSync(devDir).filter(
  (f) => f.endsWith(".py") || f.endsWith(".js")
);

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: "Script Runner",
});

// Main container
const box = blessed.box({
  top: "center",
  left: "center",
  width: "70%",
  height: "70%",
  label: " Run any scripts [Ctrl+C to exit] ",
  border: { type: "line" },
  style: {
    border: { fg: "cyan" },
  },
});

// Script list
const list = blessed.list({
  parent: box,
  width: "100%-3",
  height: "100%-3",
  top: 1,
  keys: true,
  mouse: true,
  items: files.map((f, i) => `${i + 1}. ${f}`),
  style: {
    selected: { bg: "blue" },
  },
  scrollbar: {
    ch: " ",
    track: { bg: "grey" },
    style: { bg: "cyan" },
  },
});

screen.append(box);
list.focus();


// When user selects a script
list.on("select", (item, index) => {
  const file = files[index];
  const filePath = path.join(devDir, file);

  screen.destroy(); // restore terminal

  if (file.endsWith(".py")) {
    spawn(pythonPath, [filePath], { stdio: "inherit" });
  } else if (file.endsWith(".js")) {
    spawn("node", [filePath], { stdio: "inherit" });
  }
});


// Exit keys
screen.key(["C-c", "q"], () => {
  screen.destroy();
  process.exit(0);
});

screen.render();
