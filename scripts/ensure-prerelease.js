#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const mode = process.argv[2];

if (!mode || !["enter", "exit"].includes(mode)) {
  console.error("Usage: node ensure-prerelease.js <enter|exit>");
  process.exit(1);
}

const preFile = ".changeset/pre.json";
if (mode === "enter") {
  if (!fs.existsSync(preFile)) {
    console.log("Entering prerelease mode...");
    execSync("changeset pre enter beta", { stdio: "inherit" });
  } else {
    console.log("Already in prerelease mode.");
  }
} else if (mode === "exit") {
  if (fs.existsSync(preFile)) {
    console.log("Exiting prerelease mode...");
    execSync("changeset pre exit", { stdio: "inherit" });
  } else {
    console.log("Not in prerelease mode.");
  }
}
