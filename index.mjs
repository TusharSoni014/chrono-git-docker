import * as core from "node:process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as git from "isomorphic-git";
import http from "isomorphic-git/http/node/index.cjs";

function getInput(name, fallback = "") {
  const key = `INPUT_${name.toUpperCase()}`;
  return core.env[key] ?? fallback;
}

function toWhen(ymd) {
  const d = new Date(`${ymd}T12:00:00Z`);
  return { timestamp: Math.floor(d.getTime() / 1000), timezoneOffset: 0 };
}

function datesForYear(year) {
  const start = new Date(Date.UTC(Number(year), 0, 1)).getTime();
  const end = new Date(Date.UTC(Number(year), 11, 31)).getTime();
  const out = [];
  for (let t = start; t <= end; t += 86_400_000) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${y}-${m}-${dd}`);
  }
  return out;
}

(async () => {
  const year = getInput("year");
  const branch = (getInput("branch") || "main").replace(/^refs\/heads\//, "");
  const message = getInput("message") || "Backfill";
  const datesJson = getInput("dates_json");
  const authorName = core.env["INPUT_AUTHOR_NAME"] || "Heatmap Bot";
  const authorEmail =
    core.env["INPUT_AUTHOR_EMAIL"] ||
    `${core.env["GITHUB_ACTOR"]}@users.noreply.github.com`;

  const dates = datesJson ? JSON.parse(datesJson) : datesForYear(year);

  await git.setConfig({
    fs,
    dir: process.cwd(),
    path: "user.name",
    value: authorName,
  });
  await git.setConfig({
    fs,
    dir: process.cwd(),
    path: "user.email",
    value: authorEmail,
  });

  try {
    await git.checkout({ fs, dir: process.cwd(), ref: branch });
  } catch {
    await git.branch({ fs, dir: process.cwd(), ref: branch, checkout: true });
  }

  for (const ymd of dates) {
    const p = path.join(process.cwd(), "daily", `${ymd}.txt`);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, `${message} ${ymd}\n`);
    const rel = path.relative(process.cwd(), p).replace(/\\/g, "/");
    await git.add({ fs, dir: process.cwd(), filepath: rel });
    const when = toWhen(ymd);
    await git.commit({
      fs,
      dir: process.cwd(),
      ref: branch,
      message: `${message} ${ymd}`,
      author: {
        name: authorName,
        email: authorEmail,
        timestamp: when.timestamp,
        timezoneOffset: when.timezoneOffset,
      },
      committer: {
        name: authorName,
        email: authorEmail,
        timestamp: when.timestamp,
        timezoneOffset: when.timezoneOffset,
      },
    });
  }

  await git.push({
    fs,
    http,
    dir: process.cwd(),
    remote: "origin",
    ref: branch,
  });
})().catch((e) => {
  console.error(e);
  core.exit(1);
});
