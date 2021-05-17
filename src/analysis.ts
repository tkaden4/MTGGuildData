import { MagicData } from "./data";

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
    .groupBy((x) => x.deck)
    .select((group) => ({
      deck: group.first().deck,
      timesPlayed: group.count(),
      playedBy: group
        .groupBy((x) => x.player)
        .select((player) => ({
          player: player.first().player,
          count: player.count(),
        }))
        .toArray(),
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
  const includes = df.where((row) => forp.includes(row.player));
  const deckPlacementRatings = includes
    .groupBy((x) => x.deck)
    .select((group) => ({
      player: group.first().player,
      deck: group.getIndex().at(0)!,
      frequency: group.count(),
      averagePlacement: group.getSeries("placement").average(),
      deviation: toSampleDeviation(group.getSeries("placement").std(), group.count()),
    }))
    .orderBy((deckStat) => deckStat.averagePlacement)
    .toArray();
  const overall = {
    deviation: toSampleDeviation(includes.getSeries("placement").std(), includes.count()),
    mean: includes.getSeries("placement").average(),
  };
  return {
    overallDeviation: overall.deviation,
    overallMean: overall.mean,
    stats: deckPlacementRatings,
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
      (row) =>
        players.includes(row.player) &&
        decks.includes(row.deck) &&
        placements.map((x) => x[0]).includes(row.relativePlacement)
    )
    .toArray();
  return arr.reduce((acc, x) => {
    const weight = (placements.find((y) => y[0] === x.relativePlacement) ?? [0, 0])[1] ?? 0;
    return acc + weight;
  }, 0);
}

export function countDeckWins(data: MagicData, deck: string): number {
  return data.games
    .map((game) => {
      return Object.values(game.decks)
        .filter((playerData) => playerData.deck === deck)
        .filter((x) => x.placement === 1).length;
    })
    .reduce((acc, x) => acc + x, 0);
}

export function countDeckGames(data: MagicData, deck: string): number {
  return data.games
    .map((game) => {
      return Object.values(game.decks).filter((playerData) => playerData.deck === deck).length;
    })
    .reduce((acc, x) => acc + x, 0);
}

export function playersWinRates(data: MagicData) {
  return data.decks.map((deck) => [deck, countDeckWins(data, deck) / countDeckGames(data, deck)] as const);
}
