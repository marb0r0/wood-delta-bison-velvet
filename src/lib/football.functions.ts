import { createServerFn } from "@tanstack/react-start";
import { loadBoard, loadTable } from "./football";

export const getBoard = createServerFn({ method: "GET" })
  .validator((input: { offset?: number }) => {
    const offset = Number(input?.offset ?? 0);
    if (!Number.isFinite(offset) || offset < -3 || offset > 7) {
      return { offset: 0 };
    }
    return { offset: Math.trunc(offset) };
  })
  .handler(async ({ data }) => loadBoard(data.offset));

export const getTable = createServerFn({ method: "GET" })
  .validator((input: { leagueId?: string }) => {
    const leagueId = typeof input?.leagueId === "string" ? input.leagueId : "eng.1";
    return { leagueId };
  })
  .handler(async ({ data }) => loadTable(data.leagueId));
