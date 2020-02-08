import { Analysis, DeckSummary } from "./Analysis";
import * as React from "react";
import { MagicData, getMagicData, summary } from "../analysis";
import { taskEither } from "fp-ts/lib/TaskEither";
import { DataTable } from "./DataTable";
import { Divider, Container, Segment, Header, Loader } from "semantic-ui-react";
import { DataFrame } from "data-forge";

export const Index = () => {
  const [tableData, setTableData] = React.useState<MagicData>({
    df: new DataFrame(),
    players: [],
    decks: [],
    games: []
  });

  React.useEffect(() => {
    console.log("get");
    taskEither.map(getMagicData, data => setTableData(data))();
  }, []);

  const deckSummary = summary(tableData);

  return (
    <>
      <Loader active={tableData.games.length === 0} />
      {tableData.games.length > 0 ? (
        <>
          <Container fluid>
            <Segment inverted basic>
              <Container>
                <Header inverted>Guild Deck Statistics</Header>
              </Container>
            </Segment>
          </Container>
          <Container>
            <Divider hidden />
            <Header size="large">Compiled Data</Header>
            <DataTable magicData={tableData} />
            <Header size="large">Deck Usage</Header>
            <DeckSummary magicData={tableData} deckSummary={deckSummary} />
            <Analysis magicData={tableData} />
          </Container>
          <Divider hidden />
        </>
      ) : (
        <></>
      )}
    </>
  );
};
