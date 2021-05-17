import * as React from "react";
import { Container, Divider, Header, Loader, Segment, Table } from "semantic-ui-react";
import { playersWinRates, summary } from "../analysis";
import { getAllData, MagicData } from "../data";
import { Analysis, DeckSummary, Overflow, trunc } from "./Analysis";
import { DataTable } from "./DataTable";

export const PerSeason = ({ season, seasonNumber }: { season: MagicData; seasonNumber: number }) => {
  const sum = summary(season);

  const deckWinrates = playersWinRates(season);
  const decks = season.decks;
  return (
    <>
      {season.games.length > 0 ? (
        <>
          <Container>
            <Divider hidden />
            <h1>{`Season ${seasonNumber}`}</h1>
            <Header size="large">Compiled Data</Header>
            <DataTable magicData={season} />
            <Header size="large">Deck Usage</Header>
            <DeckSummary magicData={season} deckSummary={sum} />
            <Analysis magicData={season} />
            <Header size="large">Deck Winrates</Header>
            <Overflow>
              <Table celled compact inverted striped unstackable textAlign="center">
                <Table.Header>
                  <Table.Row>
                    {decks.map((deck, i) => (
                      <Table.HeaderCell key={i}>{deck}</Table.HeaderCell>
                    ))}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <Table.Row>
                    {deckWinrates.map(([deck, winrate], i) => (
                      <Table.Cell key={i}>{trunc(winrate, 2)}</Table.Cell>
                    ))}
                  </Table.Row>
                </Table.Body>
              </Table>
            </Overflow>
          </Container>
          <Divider hidden />
        </>
      ) : (
        <></>
      )}
    </>
  );
};

export const Index = () => {
  const [tableData, setTableData] = React.useState<MagicData[]>([]);

  React.useEffect(() => {
    (async () => {
      const allData = await getAllData();
      setTableData(allData);
    })();
  }, []);

  return (
    <>
      <Container fluid>
        <Segment inverted basic>
          <Container>
            <Header inverted>Guild Deck Statistics</Header>
          </Container>
        </Segment>
      </Container>
      <Loader active={tableData.length === 0} />
      {tableData.length === 0 ? (
        <></>
      ) : (
        tableData.map((data, i) => {
          return (
            <>
              <PerSeason season={data} seasonNumber={i + 1} key={i} />
            </>
          );
        })
      )}
    </>
  );
};
