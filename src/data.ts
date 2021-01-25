import axios from "axios";
import * as dataForge from "data-forge";
import { fromPredicate, option } from "fp-ts/lib/Option";
import * as taskEither from "fp-ts/lib/TaskEither";
import _ from "lodash";
import Papa from "papaparse";
import * as un from "ununknown";
import { somes } from "./util";

export interface Deck {
  name: string;
}

export interface Season {
  players: Array<string>;
  games: Array<Game>;
  decks: Array<Deck>;
}

export interface MagicData {
  df: dataForge.DataFrame<number, PlayerData>;
  players: Array<string>;
  games: Array<Game>;
  decks: Array<string>;
}

export interface Game {
  players: Record<string, PlayerData>;
  decks: Record<string, PlayerData>;
}

export interface PlayerData {
  game: number;
  player: string;
  deck: string;
  placement: number;
  relativePlacement: number;
}

export const getMagicData = taskEither.tryCatch(
  () =>
    axios
      .get("https://docs.google.com/spreadsheets/d/1-4TG_nvx3o6YtySNK7nMNnz2W5UnSk2UxYi2FBqAoB0/export?format=csv")
      .then((response) => response.data as string)
      .then((bodyData) => Papa.parse(bodyData))
      .then((result) => getSeasons(result.data as any))
      .then((seasons) => {
        console.log(seasons);
        return seasons;
      })
      .then((resultData) => resultData.map((data) => parseSeason(data)))
      .then((result) => {
        console.log(result);
        return result;
      }),
  (e) => (e instanceof Error ? e : new Error("Could not fetch magic data"))
);

export const toMagicData = (data: unknown): MagicData => {
  const parser = un.array.of(un.array.of(un.thing.is.string));
  const result = un.runParserEx(parser, data);
  const deckInformation = result;
  const decks = deckInformation.map((deckRow) => deckRow[0].trim());
  const games = deckInformation.map((deckRow) => _.drop(deckRow, 1));
  const byGame = _.zip(...games).map((x) =>
    somes(
      x.map((y, i) =>
        option.map(fromPredicate<string>((from) => from.trim() !== "")(y ?? ""), (person: string) => ({
          player: _.capitalize(_.split(person, " ")[1].trim()),
          deck: decks[i],
          placement: +_.split(person, " ")[0],
        }))
      )
    )
  );
  const withRelativePlacement = byGame.map((game, i) => {
    const sorted = _.uniq(game.map((player) => player.placement).sort());
    return game.map((player) => ({
      ...player,
      game: i,
      relativePlacement: sorted.indexOf(player.placement) + 1,
    }));
  });

  const df = new dataForge.DataFrame({
    values: withRelativePlacement.flat(),
    considerAllRows: true,
  });

  return {
    df,
    players: Array.from(new Set(withRelativePlacement.flatMap((x) => x.map((x) => x.player))).values()),
    decks,
    games: withRelativePlacement.map(
      (persons: PlayerData[]): Game => ({
        decks: _.mapValues(
          _.groupBy(persons, (player) => player.deck),
          (as) => as[0]
        ),
        players: _.mapValues(
          _.groupBy(persons, (person) => person.player),
          (as) => as[0]
        ),
      })
    ),
  };
};

export function getSeasons(data: string[][]) {
  if (data.length === 0 || data[0].length === 0) {
    throw new Error("Invalid data");
  }
  const getSeasonsTail = (slice: string[][], current: string[][][] = []): string[][][] => {
    if (slice.length > 0) {
      let trimmed = _.dropWhile(slice, (d) => d[0].toLowerCase() !== "game");
      trimmed = _.drop(trimmed);
      const season = _.takeWhile(
        trimmed,
        (d) => d[0].toLowerCase().trim() !== "game" && d[0].toLowerCase().trim() !== ""
      );
      return getSeasonsTail(_.drop(trimmed, season.length), [...current, season]);
    } else {
      return current;
    }
  };
  return getSeasonsTail(data);
}

export function parseSeason(season: string[][]) {
  const placementRegex = /(\d+\.?\d*)\s+(\w+)/;
  const deckNames = season.map((deckEntry) => deckEntry[0].trim().toLowerCase());
  const entries = season.map((entries) => _.drop(entries).filter((x) => x.trim() === "" || placementRegex.test(x)));

  // const transposed = entries[0]
  //   .map((_, colIndex) => entries.map((row) => row[colIndex]))
  //   .map((game) => {
  //     return game.map((player, i) => ({ player, deck: deckNames[i] }));
  //   });

  const data = toMagicData(
    entries.map((e, i) => _.dropRightWhile([deckNames[i], ...e], (x) => x === undefined || x.trim().length === 0))
  );

  // console.log(entries);
  // console.log(deckNames);
  // console.log(transposed);
  return data;
}
