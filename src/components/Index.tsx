import * as React from "react";
import { Container, Divider, Header, Loader, Segment } from "semantic-ui-react";
import { summary } from "../analysis";
import { getAllData, MagicData } from "../data";
import { Analysis, DeckSummary } from "./Analysis";
import { DataTable } from "./DataTable";

export const PerSeason = ({ season, seasonNumber }: { season: MagicData; seasonNumber: number }) => {
  const sum = summary(season);
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
