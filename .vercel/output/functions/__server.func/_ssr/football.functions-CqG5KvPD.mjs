import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/football.functions-CqG5KvPD.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var LEAGUES = [
	{
		id: "eng.1",
		name: "Premier League"
	},
	{
		id: "esp.1",
		name: "La Liga"
	},
	{
		id: "ger.1",
		name: "Bundesliga"
	},
	{
		id: "ita.1",
		name: "Serie A"
	},
	{
		id: "fra.1",
		name: "Ligue 1"
	},
	{
		id: "por.1",
		name: "Liga Portugal"
	},
	{
		id: "ned.1",
		name: "Eredivisie"
	},
	{
		id: "uefa.champions",
		name: "Champions League"
	},
	{
		id: "uefa.europa",
		name: "Europa League"
	},
	{
		id: "eng.2",
		name: "Championship"
	}
];
function poisson(k, lam) {
	let p = Math.exp(-lam);
	for (let i = 1; i <= k; i++) p *= lam / i;
	return p;
}
function scoreMatrix(homeXg, awayXg, rho = -.1, max = 8) {
	const grid = [];
	let total = 0;
	for (let h = 0; h <= max; h++) {
		const row = [];
		for (let a = 0; a <= max; a++) {
			let tau = 1;
			if (h === 0 && a === 0) tau = 1 - homeXg * awayXg * rho;
			else if (h === 0 && a === 1) tau = 1 + homeXg * rho;
			else if (h === 1 && a === 0) tau = 1 + awayXg * rho;
			else if (h === 1 && a === 1) tau = 1 - rho;
			const v = Math.max(0, poisson(h, homeXg) * poisson(a, awayXg) * tau);
			row.push(v);
			total += v;
		}
		grid.push(row);
	}
	return grid.map((row) => row.map((v) => total > 0 ? v / total : 0));
}
function summarize(matrix) {
	let home = 0;
	let draw = 0;
	let away = 0;
	let over = 0;
	let btts = 0;
	let best = 0;
	let score = "1-1";
	const n = matrix.length;
	for (let h = 0; h < n; h++) for (let a = 0; a < n; a++) {
		const p = matrix[h][a];
		if (h > a) home += p;
		else if (h === a) draw += p;
		else away += p;
		if (h + a >= 3) over += p;
		if (h > 0 && a > 0) btts += p;
		if (p > best) {
			best = p;
			score = `${h}-${a}`;
		}
	}
	return {
		home,
		draw,
		away,
		over25: over,
		btts,
		scoreline: score
	};
}
function americanToDecimal(ml) {
	if (ml > 0) return 1 + ml / 100;
	return 1 + 100 / Math.abs(ml);
}
function americanToProb(ml) {
	if (!Number.isFinite(ml) || ml === 0) return 0;
	if (ml > 0) return 100 / (ml + 100);
	return -ml / (-ml + 100);
}
function closeOdds(side) {
	const raw = side?.close?.odds ?? side?.open?.odds;
	if (!raw) return null;
	const n = Number(String(raw).replace("+", ""));
	return Number.isFinite(n) ? n : null;
}
function formPoints(form) {
	let pts = 0;
	let n = 0;
	for (const ch of form.toUpperCase()) {
		if (ch === "W") pts += 3;
		else if (ch === "D") pts += 1;
		else if (ch === "L") pts += 0;
		else continue;
		n += 1;
	}
	if (!n) return null;
	return pts / n;
}
function modelFromInputs(opts) {
	const fh = formPoints(opts.formHome);
	const fa = formPoints(opts.formAway);
	let homeShare = .55;
	if (opts.market) {
		const edge = opts.market.home + opts.market.away;
		homeShare = edge > 0 ? opts.market.home / edge : .5;
	} else if (fh != null && fa != null) homeShare = (fh + .35) / (fh + fa + .7);
	homeShare = Math.min(.82, Math.max(.18, homeShare));
	const total = opts.totalLine && opts.totalLine > .5 ? opts.totalLine : 2.55;
	const homeXg = Math.max(.35, +(total * homeShare).toFixed(2));
	const awayXg = Math.max(.35, +(total * (1 - homeShare)).toFixed(2));
	const sum = summarize(scoreMatrix(homeXg, awayXg));
	let blended = {
		home: sum.home,
		draw: sum.draw,
		away: sum.away
	};
	if (opts.market) {
		blended = {
			home: .45 * sum.home + .55 * opts.market.home,
			draw: .45 * sum.draw + .55 * opts.market.draw,
			away: .45 * sum.away + .55 * opts.market.away
		};
		const t = blended.home + blended.draw + blended.away;
		blended = {
			home: blended.home / t,
			draw: blended.draw / t,
			away: blended.away / t
		};
	}
	return {
		...sum,
		...blended,
		homeXg,
		awayXg
	};
}
function mapEvent(ev, league) {
	const comp = ev.competitions?.[0];
	if (!comp) return null;
	const sides = comp.competitors ?? [];
	const home = sides.find((s) => s.homeAway === "home") ?? sides[0];
	const away = sides.find((s) => s.homeAway === "away") ?? sides[1];
	if (!home || !away) return null;
	const status = ev.status?.type ?? comp.status?.type;
	const state = status?.state;
	const phase = state === "in" ? "in" : state === "post" ? "post" : "pre";
	const hs = home.score != null && home.score !== "" ? Number(home.score) : null;
	const as = away.score != null && away.score !== "" ? Number(away.score) : null;
	const ml = comp.odds?.[0];
	const hMl = closeOdds(ml?.moneyline?.home);
	const dMl = closeOdds(ml?.moneyline?.draw);
	const aMl = closeOdds(ml?.moneyline?.away);
	let market = null;
	if (hMl != null && dMl != null && aMl != null) {
		const ph = americanToProb(hMl);
		const pd = americanToProb(dMl);
		const pa = americanToProb(aMl);
		const t = ph + pd + pa;
		if (t > 0) market = {
			home: ph / t,
			draw: pd / t,
			away: pa / t
		};
	}
	const modeled = modelFromInputs({
		market,
		formHome: home.form ?? "",
		formAway: away.form ?? "",
		totalLine: typeof ml?.overUnder === "number" ? ml.overUnder : null
	});
	return {
		id: String(ev.id ?? `${league.id}-${home.team?.abbreviation}-${away.team?.abbreviation}`),
		league: league.name,
		leagueId: league.id,
		name: ev.name ?? "",
		home: home.team?.displayName ?? "Home",
		away: away.team?.displayName ?? "Away",
		homeAbbr: home.team?.abbreviation ?? "H",
		awayAbbr: away.team?.abbreviation ?? "A",
		kickoff: ev.date ?? "",
		phase,
		detail: status?.shortDetail || status?.detail || "",
		homeScore: Number.isFinite(hs) ? hs : null,
		awayScore: Number.isFinite(as) ? as : null,
		formHome: home.form ?? "",
		formAway: away.form ?? "",
		market,
		model: {
			home: modeled.home,
			draw: modeled.draw,
			away: modeled.away,
			over25: modeled.over25,
			btts: modeled.btts
		},
		scoreline: modeled.scoreline,
		homeXg: modeled.homeXg,
		awayXg: modeled.awayXg,
		book: ml?.provider?.name ?? null,
		odds: hMl != null && dMl != null && aMl != null ? {
			home: americanToDecimal(hMl),
			draw: americanToDecimal(dMl),
			away: americanToDecimal(aMl)
		} : null
	};
}
function yyyymmdd(offset) {
	const d = /* @__PURE__ */ new Date();
	d.setUTCDate(d.getUTCDate() + offset);
	return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}
async function loadBoard(offset) {
	const date = yyyymmdd(offset);
	const matches = (await Promise.all(LEAGUES.map(async (league) => {
		const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard?dates=${date}`;
		try {
			const res = await fetch(url, { headers: { accept: "application/json" } });
			if (!res.ok) return [];
			return ((await res.json()).events ?? []).map((ev) => mapEvent(ev, league)).filter((m) => Boolean(m));
		} catch {
			return [];
		}
	}))).flat().sort((a, b) => {
		const rank = (p) => p === "in" ? 0 : p === "pre" ? 1 : 2;
		const d = rank(a.phase) - rank(b.phase);
		if (d) return d;
		return a.kickoff.localeCompare(b.kickoff);
	});
	return {
		generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		matches,
		source: "ESPN public scoreboard · Dixon-Coles + de-vigged moneylines"
	};
}
function statValue(stats, name) {
	const hit = stats?.find((s) => s.name === name);
	return typeof hit?.value === "number" ? hit.value : 0;
}
async function loadTable(leagueId) {
	const league = LEAGUES.find((l) => l.id === leagueId) ?? LEAGUES[0];
	const url = `https://site.api.espn.com/apis/v2/sports/soccer/${league.id}/standings`;
	const res = await fetch(url, { headers: { accept: "application/json" } });
	if (!res.ok) return {
		leagueId: league.id,
		league: league.name,
		rows: []
	};
	const rows = ((await res.json()).children?.[0]?.standings?.entries ?? []).map((entry) => ({
		rank: statValue(entry.stats, "rank"),
		team: entry.team?.displayName ?? "—",
		abbr: entry.team?.abbreviation ?? "",
		played: statValue(entry.stats, "gamesPlayed"),
		goalDiff: statValue(entry.stats, "pointDifferential"),
		points: statValue(entry.stats, "points"),
		note: entry.note?.description ?? null
	})).sort((a, b) => a.rank - b.rank);
	return {
		leagueId: league.id,
		league: league.name,
		rows
	};
}
var getBoard_createServerFn_handler = createServerRpc({
	id: "19d1b2c4c6a02035dc2c8908d4638d54248a2d14d0997345e7f25f104371c899",
	name: "getBoard",
	filename: "src/lib/football.functions.ts"
}, (opts) => getBoard.__executeServer(opts));
var getBoard = createServerFn({ method: "GET" }).validator((input) => {
	const offset = Number(input?.offset ?? 0);
	if (!Number.isFinite(offset) || offset < -3 || offset > 7) return { offset: 0 };
	return { offset: Math.trunc(offset) };
}).handler(getBoard_createServerFn_handler, async ({ data }) => loadBoard(data.offset));
var getTable_createServerFn_handler = createServerRpc({
	id: "b3ce374dd63a2594bef0eea62771759a4a6207131ab50ba30ee21a1fca516722",
	name: "getTable",
	filename: "src/lib/football.functions.ts"
}, (opts) => getTable.__executeServer(opts));
var getTable = createServerFn({ method: "GET" }).validator((input) => {
	return { leagueId: typeof input?.leagueId === "string" ? input.leagueId : "eng.1" };
}).handler(getTable_createServerFn_handler, async ({ data }) => loadTable(data.leagueId));
//#endregion
export { getBoard_createServerFn_handler, getTable_createServerFn_handler };
