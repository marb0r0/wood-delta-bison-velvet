import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/lab-CLdC7YN-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SESSIONS = "pitchline-sessions";
var RESULTS = "pitchline-results";
function readSessions() {
	if (typeof localStorage === "undefined") return [];
	try {
		return JSON.parse(localStorage.getItem(SESSIONS) || "[]");
	} catch {
		return [];
	}
}
function readResults() {
	if (typeof localStorage === "undefined") return [];
	try {
		return JSON.parse(localStorage.getItem(RESULTS) || "[]");
	} catch {
		return [];
	}
}
function writeSessions(rows) {
	localStorage.setItem(SESSIONS, JSON.stringify(rows));
}
function writeResults(rows) {
	localStorage.setItem(RESULTS, JSON.stringify(rows));
}
function computeAcwr(sessions, asOf = /* @__PURE__ */ new Date()) {
	const day = (iso) => iso.slice(0, 10);
	const asOfIso = asOf.toISOString().slice(0, 10);
	const acuteStart = shift(asOfIso, -7);
	const chronicStart = shift(asOfIso, -28);
	const load = (s) => s.minutes * (s.intensity || 5);
	const inWindow = sessions.filter((s) => day(s.date) >= chronicStart && day(s.date) <= asOfIso);
	const acute = inWindow.filter((s) => day(s.date) >= acuteStart).reduce((sum, s) => sum + load(s), 0) / 7;
	const chronic = inWindow.reduce((sum, s) => sum + load(s), 0) / 28;
	const acwr = chronic === 0 ? 0 : Math.round(acute / chronic * 100) / 100;
	let flag = "safe";
	let message = "Training load is inside the sustainable band.";
	if (chronic === 0) {
		flag = "insufficient_data";
		message = "Log a few weeks of sessions to unlock the workload score.";
	} else if (acwr < .8) {
		flag = "undertrained";
		message = "Load has dropped under your recent baseline.";
	} else if (acwr > 1.3) {
		flag = "high_risk";
		message = "Load has spiked versus the last four weeks. Injury risk is up.";
	}
	return {
		acute: Math.round(acute * 10) / 10,
		chronic: Math.round(chronic * 10) / 10,
		acwr,
		flag,
		message
	};
}
function shift(iso, days) {
	const d = /* @__PURE__ */ new Date(`${iso}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}
function vec(marks) {
	return marks.map((m) => m.result === "W" ? 1 : m.result === "D" ? .4 : 0);
}
function cosine(a, b) {
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	if (!na || !nb) return 0;
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
/** Compare the latest 5 results with earlier windows of 5. */
function formFingerprint(results) {
	const ordered = [...results].sort((a, b) => a.date.localeCompare(b.date));
	if (ordered.length < 10) return null;
	const current = vec(ordered.slice(-5));
	let best = 0;
	let bestStart = "";
	for (let i = 0; i <= ordered.length - 10; i++) {
		const score = cosine(current, vec(ordered.slice(i, i + 5)));
		if (score > best) {
			best = score;
			bestStart = ordered[i].date;
		}
	}
	return {
		similarity: Math.round(best * 100),
		since: bestStart
	};
}
function sampleMonth() {
	const rows = [];
	const today = /* @__PURE__ */ new Date();
	for (let i = 27; i >= 0; i--) {
		if (i % 3 === 0) continue;
		const d = new Date(today);
		d.setUTCDate(d.getUTCDate() - i);
		const spike = i < 4;
		rows.push({
			id: `sample-${i}`,
			date: d.toISOString().slice(0, 10),
			minutes: spike ? 90 : 55,
			intensity: spike ? 9 : 6
		});
	}
	return rows;
}
function Lab() {
	const [sessions, setSessions] = (0, import_react.useState)(() => readSessions());
	const [results, setResults] = (0, import_react.useState)(() => readResults());
	const [minutes, setMinutes] = (0, import_react.useState)(60);
	const [intensity, setIntensity] = (0, import_react.useState)(6);
	const [opponent, setOpponent] = (0, import_react.useState)("");
	const [mark, setMark] = (0, import_react.useState)("W");
	const acwr = (0, import_react.useMemo)(() => computeAcwr(sessions), [sessions]);
	const print = (0, import_react.useMemo)(() => formFingerprint(results), [results]);
	function addSession() {
		const next = [{
			id: crypto.randomUUID(),
			date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
			minutes,
			intensity
		}, ...sessions];
		writeSessions(next);
		setSessions(next);
	}
	function addResult() {
		if (!opponent.trim()) return;
		const next = [...results, {
			id: crypto.randomUUID(),
			date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
			result: mark,
			opponent: opponent.trim()
		}];
		writeResults(next);
		setResults(next);
		setOpponent("");
	}
	function loadSample() {
		const next = sampleMonth();
		writeSessions(next);
		setSessions(next);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "border-b border-line pb-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "font-display text-sm font-semibold tracking-[0.22em] text-primary uppercase",
						children: "Pitchline"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display mt-2 text-4xl font-bold text-fg",
						children: "Foot lab"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-muted",
						children: "Workload and form tools from the FootStats idea, kept on this device. No account, no external model key."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-6 rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-wide text-muted uppercase",
						children: "Acute / chronic load"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display mt-1 text-5xl font-bold text-fg",
						children: acwr.acwr.toFixed(2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-primary",
						children: acwr.flag.replace("_", " ")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: acwr.message
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-xs text-muted",
						children: [
							"Acute ",
							acwr.acute,
							" · chronic ",
							acwr.chronic,
							" · band 0.8–1.3"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap items-end gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs text-muted",
								children: ["Minutes", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									min: 10,
									max: 180,
									value: minutes,
									onChange: (e) => setMinutes(Number(e.target.value)),
									className: "mt-1 block min-h-11 w-24 rounded-xl border border-line bg-bg px-3 text-fg"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs text-muted",
								children: ["Intensity 1–10", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									min: 1,
									max: 10,
									value: intensity,
									onChange: (e) => setIntensity(Number(e.target.value)),
									className: "mt-1 block min-h-11 w-24 rounded-xl border border-line bg-bg px-3 text-fg"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: addSession,
								className: "min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-ink",
								children: "Log session"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: loadSample,
								className: "min-h-11 rounded-full border border-line px-4 text-sm text-fg",
								children: "Load sample month"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-wide text-muted uppercase",
						children: "Form fingerprint"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: print ? `Latest five results match a run starting ${print.since} at ${print.similarity}% similarity.` : "Log 10 results to compare the current run with earlier form."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap items-end gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs text-muted",
								children: ["Opponent", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: opponent,
									onChange: (e) => setOpponent(e.target.value),
									className: "mt-1 block min-h-11 w-44 rounded-xl border border-line bg-bg px-3 text-fg"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs text-muted",
								children: ["Result", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: mark,
									onChange: (e) => setMark(e.target.value),
									className: "mt-1 block min-h-11 rounded-xl border border-line bg-bg px-3 text-fg",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "W",
											children: "Win"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "D",
											children: "Draw"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "L",
											children: "Loss"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: addResult,
								className: "min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-ink",
								children: "Log result"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 space-y-1 text-sm text-muted",
						children: results.slice().reverse().slice(0, 8).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
							r.date,
							" · ",
							r.result,
							" vs ",
							r.opponent
						] }, r.id))
					})
				]
			})
		]
	});
}
//#endregion
export { Lab as component };
