import magicData from "../data/initial.csv";
import axios from "axios";
import * as taskEither from "fp-ts/lib/TaskEither";
import * as Papa from "papaparse";
import * as un from "ununknown";
import _ from "lodash";
import { option, fromPredicate, Option } from "fp-ts/lib/Option";
import { array } from "fp-ts/lib/Array";
import { identity } from "fp-ts/lib/function";
import * as dataForge from "data-forge";

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

const somes = <T>(as: Option<T>[]): T[] => array.filterMap(as, identity);

export const toMagicData = (data: unknown): MagicData => {
  const parser = un.array.of(un.array.of(un.thing.is.string));
  const result = un.runParserEx(parser, data);
  const deckInformation = _.drop(result, 1);
  const decks = deckInformation.map(deckRow => deckRow[0].trim());
  const games = deckInformation.map(deckRow => _.drop(deckRow, 1));
  const byGame = _.zip(...games).map(x =>
    somes(
      x.map((y, i) =>
        option.map(fromPredicate<string>(from => from !== "")(y ?? ""), (person: string) => ({
          player: _.capitalize(_.split(person, " ")[1].trim()),
          deck: decks[i],
          placement: +_.split(person, " ")[0]
        }))
      )
    )
  );
  const withRelativePlacement = byGame.map((game, i) => {
    const sorted = _.uniq(game.map(player => player.placement).sort());
    return game.map(player => ({
      ...player,
      game: i,
      relativePlacement: sorted.indexOf(player.placement) + 1
    }));
  });

  const df = new dataForge.DataFrame({
    values: withRelativePlacement.flat(),
    considerAllRows: true
  });

  return {
    df,
    players: Array.from(new Set(withRelativePlacement.flatMap(x => x.map(x => x.player))).values()),
    decks,
    games: withRelativePlacement.map(
      (persons: PlayerData[]): Game => ({
        decks: _.mapValues(
          _.groupBy(persons, player => player.deck),
          as => as[0]
        ),
        players: _.mapValues(
          _.groupBy(persons, person => person.player),
          as => as[0]
        )
      })
    )
  };
};

export const getMagicData = taskEither.tryCatch(
  () =>
    axios
      .get(magicData)
      .then(response => response.data as string)
      .then(bodyData => Papa.parse(bodyData))
      .then(result => result.data)
      .then(resultData => toMagicData(resultData)),
  e => (e instanceof Error ? e : new Error(`Could not fetch magic data at "${magicData}"`))
);

export interface PlayedBy {
  player: string;
  count: number;
}

export interface DeckSummary {
  deck: string;
  timesPlayed: number;
  playedBy: Array<PlayedBy>;
}

export type Summary = Array<DeckSummary>;

export function summary(data: MagicData): Summary {
  const df = data.df;
  const deckStats = df
    .groupBy(x => x.deck)
    .select(group => ({
      deck: group.first().deck,
      timesPlayed: group.count(),
      playedBy: group
        .groupBy(x => x.player)
        .select(player => ({
          player: player.first().player,
          count: player.count()
        }))
        .toArray()
    }))
    .toArray();
  return deckStats;
}

export function toSampleDeviation(popVariance: number, n: number) {
  return (popVariance * Math.sqrt(n)) / (n - 1 <= 1 ? 1 : Math.sqrt(n - 1));
}

export interface DeckStatistic {
  player: string;
  deck: string;
  frequency: number;
  averagePlacement: number;
  deviation: number;
}

export interface DeckStatistics {
  overallDeviation: number;
  overallMean: number;
  stats: Array<DeckStatistic>;
}

export function deckStatistics(data: MagicData, forp: Array<string>): DeckStatistics {
  const df = data.df.setIndex<string>("deck");
  const includes = df.where(row => forp.includes(row.player));
  const deckPlacementRatings = includes
    .groupBy(x => x.deck)
    .select(group => ({
      player: group.first().player,
      deck: group.getIndex().at(0)!,
      frequency: group.count(),
      averagePlacement: group.getSeries("placement").average(),
      deviation: toSampleDeviation(group.getSeries("placement").std(), group.count())
    }))
    .orderBy(deckStat => deckStat.averagePlacement)
    .toArray();
  const overall = {
    deviation: toSampleDeviation(includes.getSeries("placement").std(), includes.count()),
    mean: includes.getSeries("placement").average()
  };
  return {
    overallDeviation: overall.deviation,
    overallMean: overall.mean,
    stats: deckPlacementRatings
  };
}

export function countPlacements(
  data: MagicData,
  players: Array<string>,
  decks: Array<string>,
  placements: Array<[number, number]>
) {
  const arr = data.df
    .where(
      row =>
        players.includes(row.player) &&
        decks.includes(row.deck) &&
        placements.map(x => x[0]).includes(row.relativePlacement)
    )
    .toArray();
  return arr.reduce((acc, x) => {
    const weight = (placements.find(y => y[0] === x.relativePlacement) ?? [1, 1])[1] ?? 1;
    return acc + weight;
  }, 0);
}

export function normalizeToPoints(data: MagicData) {
  const df = data.df;
  const res = df
    .groupBy(x => x.game)
    .select(gameGroup => {
      const sum = gameGroup.getSeries("placement").sum();
      return gameGroup.select(player => ({
        ...player,
        points: player.placement / sum
      }));
    });
  return res.toArray().flatMap(x => x.toArray());
}
