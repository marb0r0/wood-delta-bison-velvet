import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, W as isRedirect, b as useRouter, x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as RefreshCw, r as Radio } from "../_libs/lucide-react.mjs";
import { i as getTable, n as Route$1, r as getBoard } from "./router-D8bvq3Av.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DrWcOgzf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
/** Positive expected value: model probability × decimal odds − 1. Quarter-Kelly stake on a paper bankroll. */
function valuePicks(matches, bankroll = 100) {
	const picks = [];
	for (const match of matches) {
		if (match.phase === "post" || !match.odds) continue;
		const sides = [
			{
				market: "Home",
				model: match.model.home,
				decimal: match.odds.home
			},
			{
				market: "Draw",
				model: match.model.draw,
				decimal: match.odds.draw
			},
			{
				market: "Away",
				model: match.model.away,
				decimal: match.odds.away
			}
		];
		for (const side of sides) {
			const edge = side.model * side.decimal - 1;
			if (edge <= .02) continue;
			const b = side.decimal - 1;
			const kelly = b > 0 ? (b * side.model - (1 - side.model)) / b : 0;
			const stake = Math.max(0, Math.min(bankroll * .05, bankroll * .25 * kelly));
			picks.push({
				id: `${match.id}-${side.market}`,
				match: `${match.home} vs ${match.away}`,
				league: match.league,
				market: side.market,
				model: side.model,
				decimal: side.decimal,
				edge,
				stake: Math.round(stake * 100) / 100
			});
		}
	}
	return picks.sort((a, b) => b.edge - a.edge);
}
/** SportFlow-style blend: market disagreement, xG gap, recent form. */
function sportFlow(match) {
	const marketHome = match.market?.home ?? match.model.home;
	const disagree = match.model.home - marketHome;
	const xgGap = (match.homeXg - match.awayXg) / 3;
	const form = (formScore(match.formHome) - formScore(match.formAway)) / 3;
	const raw = .5 * disagree + .3 * xgGap + .2 * form;
	const score = Math.round(50 + raw * 80);
	return Math.max(0, Math.min(100, score));
}
function formScore(form) {
	let pts = 0;
	let n = 0;
	for (const ch of form.toUpperCase()) {
		if (ch === "W") pts += 1;
		else if (ch === "D") pts += .4;
		else if (ch === "L") pts += 0;
		else continue;
		n += 1;
	}
	return n ? pts / n : .4;
}
var DAYS = [
	{
		offset: -1,
		label: "Yesterday"
	},
	{
		offset: 0,
		label: "Today"
	},
	{
		offset: 1,
		label: "Tomorrow"
	},
	{
		offset: 2,
		label: "+2"
	},
	{
		offset: 3,
		label: "+3"
	}
];
var TABLE_LEAGUES = [
	["eng.1", "Premier League"],
	["esp.1", "La Liga"],
	["ger.1", "Bundesliga"],
	["ita.1", "Serie A"],
	["fra.1", "Ligue 1"],
	["por.1", "Liga Portugal"],
	["ned.1", "Eredivisie"],
	["eng.2", "Championship"]
];
function pct(n) {
	return `${Math.round(n * 100)}%`;
}
function kickLabel(iso) {
	if (!iso) return "TBD";
	return new Date(iso).toLocaleString(void 0, {
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit"
	});
}
function Home() {
	const initial = Route$1.useLoaderData();
	const fetchBoard = useServerFn(getBoard);
	const fetchTable = useServerFn(getTable);
	const [offset, setOffset] = (0, import_react.useState)(0);
	const [board, setBoard] = (0, import_react.useState)(initial);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [league, setLeague] = (0, import_react.useState)("all");
	const [phase, setPhase] = (0, import_react.useState)("all");
	const [selected, setSelected] = (0, import_react.useState)(initial.matches[0]?.id ?? null);
	const [view, setView] = (0, import_react.useState)("matches");
	const [tableLeague, setTableLeague] = (0, import_react.useState)("eng.1");
	const [table, setTable] = (0, import_react.useState)(null);
	async function load(next = offset) {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchBoard({ data: { offset: next } });
			setBoard(data);
			setSelected((cur) => data.matches.some((m) => m.id === cur) ? cur : data.matches[0]?.id ?? null);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not refresh fixtures");
		} finally {
			setLoading(false);
		}
	}
	(0, import_react.useEffect)(() => {
		if (view !== "table") return;
		let cancelled = false;
		fetchTable({ data: { leagueId: tableLeague } }).then((data) => {
			if (!cancelled) setTable(data);
		}).catch((e) => {
			if (!cancelled) setError(e instanceof Error ? e.message : "Could not load table");
		});
		return () => {
			cancelled = true;
		};
	}, [
		view,
		tableLeague,
		fetchTable
	]);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => {
			load(offset);
		}, 9e4);
		return () => window.clearInterval(id);
	}, [offset]);
	const leagues = (0, import_react.useMemo)(() => {
		return ["all", ...new Set(board.matches.map((m) => m.league))];
	}, [board.matches]);
	const shown = board.matches.filter((m) => {
		if (league !== "all" && m.league !== league) return false;
		if (phase !== "all" && m.phase !== phase) return false;
		return true;
	});
	const picks = (0, import_react.useMemo)(() => valuePicks(board.matches), [board.matches]);
	const liveCount = board.matches.filter((m) => m.phase === "in").length;
	const pick = shown.find((m) => m.id === selected) ?? shown[0] ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-6 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-sm font-semibold tracking-[0.22em] text-primary uppercase",
						children: "Pitchline"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl",
						children: "Match desk"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-xl text-sm leading-relaxed text-muted",
						children: "Live scores, league tables, and paper value bets. Prices come from public ESPN boards. Nothing here places a real wager."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-sm text-fg",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, {
									className: liveCount ? "text-live" : "text-muted",
									size: 16
								}),
								liveCount,
								" live"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/lab",
							className: "inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-fg",
							children: "Foot lab"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void load(),
							className: "inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-ink",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
								size: 16,
								className: loading ? "animate-spin" : ""
							}), "Refresh"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 flex flex-wrap gap-2",
				children: [
					[
						["matches", "Fixtures"],
						["table", "Tables"],
						["value", "Value"]
					].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setView(id),
						className: `min-h-11 rounded-full border px-4 text-sm font-medium ${view === id ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface text-fg"}`,
						children: label
					}, id)),
					view === "matches" && DAYS.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setOffset(d.offset);
							load(d.offset);
						},
						className: `min-h-11 rounded-full border px-4 text-sm font-medium ${offset === d.offset ? "border-gold text-gold" : "border-line bg-transparent text-muted"}`,
						children: d.label
					}, d.offset)),
					view === "matches" && [
						"all",
						"in",
						"pre",
						"post"
					].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setPhase(p),
						className: `min-h-11 rounded-full border px-4 text-sm font-medium ${phase === p ? "border-gold text-gold" : "border-line bg-transparent text-muted"}`,
						children: p === "all" ? "All" : p === "in" ? "Live" : p === "pre" ? "Pre-match" : "Final"
					}, p))
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex gap-2 overflow-x-auto pb-1",
				children: view === "table" ? TABLE_LEAGUES.map(([id, name]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setTableLeague(id),
					className: `shrink-0 rounded-full px-3 py-2 text-xs font-medium ${tableLeague === id ? "bg-surface-2 text-fg" : "text-muted"}`,
					children: name
				}, id)) : view === "matches" ? leagues.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setLeague(name),
					className: `shrink-0 rounded-full px-3 py-2 text-xs font-medium ${league === name ? "bg-surface-2 text-fg" : "text-muted"}`,
					children: name === "all" ? "Every league" : name
				}, name)) : null
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]",
				children: [view === "table" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "overflow-x-auto rounded-2xl border border-line bg-surface",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full min-w-[28rem] text-left text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "text-xs tracking-wide text-muted uppercase",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3 font-medium",
									children: "#"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3 font-medium",
									children: "Club"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3 font-medium",
									children: "P"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3 font-medium",
									children: "GD"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-3 font-medium",
									children: "Pts"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: (table?.rows ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-line",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 tabular-nums text-muted",
									children: row.rank
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2 font-medium text-fg",
									children: [row.team, row.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 text-xs text-primary",
										children: row.note
									}) : null]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 tabular-nums text-muted",
									children: row.played
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 tabular-nums text-muted",
									children: row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-display font-semibold tabular-nums text-fg",
									children: row.points
								})
							]
						}, row.abbr + row.rank)) })]
					}), !table?.rows.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-4 py-8 text-center text-sm text-muted",
						children: "Loading table…"
					})]
				}) : view === "value" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "A pick is listed when the model price beats the book by more than 2%. Stake is quarter-Kelly on a paper bankroll of 100, capped at 5%."
						}),
						picks.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-2xl border border-line bg-surface px-4 py-10 text-center text-sm text-muted",
							children: "No value on this slate."
						}),
						picks.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "rounded-2xl border border-line bg-surface px-4 py-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs tracking-wide text-muted uppercase",
									children: row.league
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-lg font-semibold text-fg",
									children: row.match
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-sm text-gold",
									children: [
										row.market,
										" @ ",
										row.decimal.toFixed(2),
										" · edge ",
										pct(row.edge),
										" · paper stake ",
										row.stake.toFixed(2)
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-muted",
									children: ["Model ", pct(row.model)]
								})
							]
						}, row.id))
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [shown.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-2xl border border-line bg-surface px-4 py-10 text-center text-sm text-muted",
						children: "No fixtures in this window. Try another day."
					}), shown.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setSelected(m.id),
						className: `grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border px-4 py-3 text-left ${pick?.id === m.id ? "border-primary bg-surface-2" : "border-line bg-surface"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs tracking-wide text-muted uppercase",
									children: [m.league, m.phase === "in" ? " · live" : ""]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "truncate font-display text-lg font-semibold text-fg",
									children: [
										m.home,
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted",
											children: "vs"
										}),
										" ",
										m.away
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted",
									children: m.detail || kickLabel(m.kickoff)
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-right",
							children: [m.phase === "pre" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-display text-sm text-gold",
								children: [
									pct(m.model.home),
									" · ",
									pct(m.model.draw),
									" · ",
									pct(m.model.away)
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-display text-2xl font-bold tabular-nums text-fg",
								children: [
									m.homeScore ?? 0,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mx-1 text-muted",
										children: "–"
									}),
									m.awayScore ?? 0
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted",
								children: ["flow ", sportFlow(m)]
							})]
						})]
					}, m.id))]
				}), view === "matches" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "lg:sticky lg:top-4 lg:self-start",
					children: [pick ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Detail, { match: pick }) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-xs leading-relaxed text-muted",
						children: board.source
					})]
				})]
			})
		]
	});
}
function Bar({ label, value, tone }) {
	const color = tone === "home" ? "bg-primary" : tone === "away" ? "bg-gold" : "bg-muted";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-1 flex justify-between text-xs text-muted",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "tabular-nums text-fg",
			children: pct(value)
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-2 overflow-hidden rounded-full bg-bg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `h-full ${color}`,
			style: { width: `${Math.max(2, value * 100)}%` }
		})
	})] });
}
function Detail({ match }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs tracking-wide text-muted uppercase",
				children: match.league
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "font-display mt-1 text-2xl font-bold text-fg",
				children: [
					match.homeAbbr,
					" vs ",
					match.awayAbbr
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: kickLabel(match.kickoff)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-gold",
				children: ["SportFlow ", sportFlow(match)]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-4 grid grid-cols-3 gap-2 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-bg px-2 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "xG home"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-display text-xl font-semibold text-fg",
							children: match.homeXg.toFixed(2)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-bg px-2 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "Score"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-display text-xl font-semibold text-primary",
							children: match.scoreline
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-bg px-2 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "xG away"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-display text-xl font-semibold text-fg",
							children: match.awayXg.toFixed(2)
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
						label: `${match.home} win`,
						value: match.model.home,
						tone: "home"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
						label: "Draw",
						value: match.model.draw,
						tone: "draw"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
						label: `${match.away} win`,
						value: match.model.away,
						tone: "away"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex justify-between text-sm text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Over 2.5 ", pct(match.model.over25)] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["BTTS ", pct(match.model.btts)] })]
			}),
			match.market && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-xs text-muted",
				children: [
					"Market (",
					match.book ?? "book",
					"): ",
					pct(match.market.home),
					" / ",
					pct(match.market.draw),
					" /",
					" ",
					pct(match.market.away)
				]
			}),
			(match.formHome || match.formAway) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs tracking-widest text-muted uppercase",
				children: [
					"Form ",
					match.formHome || "—",
					" · ",
					match.formAway || "—"
				]
			})
		]
	});
}
//#endregion
export { Home as component };
