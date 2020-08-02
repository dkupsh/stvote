import React, { useState } from 'react';
import uuid from 'react-uuid'

import DropdownButton from 'react-bootstrap/DropdownButton'
import { Dropdown } from 'react-bootstrap';
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'

import useInterval from '../Hooks/useInterval';
import CandidateList from './Race/CandidateList';

import FirstChoicePie from './Models/FirstChoicePie';
import ElectedCandidatesPie from './Models/ElectedCandidatesPie';
import CandidatesRanked from './Models/CandidatesRanked';
import PartyPercentage from './Models/PartyPercentage';
import EventualWinner from './Models/EventualWinner';

import { Race } from '../../Data_Models/Race';
import { Voter } from '../../Data_Models/Voter';
import { Ballot } from '../../Data_Models/Ballot';
import { Party } from '../../Data_Models/Party';
import { Candidate } from '../../Data_Models/Candidate';

import election_configuration from '../../Data/UC_Berkeley/2015/Configuration.json';
import candidate_data from '../../Data/UC_Berkeley/2015/Candidates.json';
import ballot_data from '../../Data/UC_Berkeley/2015/Ballots.json';

import './ElectionPage.css'
import { RoundState } from '../../Data_Models/Round';

function ElectionPage(props) {

    // Helper Functions
    const find_race_by_id = (id) => {
        for (let i = 0; i < races.length; i++) {
            if (String(races[i].race_id) === id)
                return races[i];
        }
        return null;
    };

    const find_race_by_name = (name) => {
        for (let i = 0; i < races.length; i++) {
            if (races[i].race_name === name)
                return races[i];
        }
        return null;
    };

    const find_candidate_by_id = (race_id, candidate_id) => {
        let race = find_race_by_id(race_id);
        if (race !== null)
            for (let i = 0; i < race.candidates.length; i++)
                if (String(race.candidates[i].candidate_id) === candidate_id)
                    return race.candidates[i];
        return null;
    };

    const find_party_by_name = (name) => {
        for (let i = 0; i < parties.length; i++)
            if (parties[i].party_name === name)
                return parties[i];
        return null
    };

    // Load Parties
    const [parties, setParties] = useState(() => {
        return [new Party("CalSERVE", "21c46b"),
        new Party("Cooperative Movement Party (CMP)", "009933"), new Party("Student Action", "1779e3"),
        new Party("Independent", "818285"), new Party("Pirate Party", "9d00e6"),
        new Party("Defend Affirmative Action Party (DAAP)", "f00b07"), new Party("SQUELCH!", "ffd900")]
    });

    // Load Races
    const [races] = useState(() => {
        let racesToAdd = []
        for (const race of election_configuration.races) {
            for (let i = 0; i < racesToAdd.length; i++)
                if (racesToAdd.race_id === race.race_id)
                    continue;
            racesToAdd.push(new Race(race.race_id, race.race_position, race.race_max_winners));
        }
        console.log(racesToAdd);
        return racesToAdd;
    });

    // Load Voters
    const [voters] = useState(() => {
        console.log("Loading Candidates")
        // Load Candidates
        for (let key in candidate_data) {
            const race = find_race_by_name(key);
            if (race === null)
                continue;
            for (const candidate of candidate_data[key]) {
                let party = find_party_by_name(candidate.party);
                if (party === null) {
                    party = new Party(candidate.party, "FFFFFF");
                    setParties(parties.push(party));
                }
                race.add_candidate(new Candidate(candidate.number, candidate.name, party));
            }
        }

        console.log("Loading Voters")
        let voters = []
        for (const item of ballot_data.ballots) {
            let voter = new Voter(uuid())
            for (let key in item) {
                let candidateOrder = []
                for (let candidate_id of item[key]) {
                    let candidate = find_candidate_by_id(key, candidate_id);
                    candidateOrder.push(candidate);
                };

                const ballot = new Ballot(uuid(), candidateOrder);
                const race = find_race_by_id(key);
                if (race !== null) {
                    race.add_ballot(ballot);
                }
                voter.add_ballot(key, ballot);
            }
            voters.push(voter);
        }
        return voters;
    });
    const [activeRace, setActiveRace] = useState(races[0]);
    const [speed] = useState(1000);
    const [refresh, setRefresh] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [page, setPage] = useState(0);

    useInterval(() => {
        if (activeRace.state !== RoundState.COMPLETE && isRunning) {

            for (let i = 0; i < Math.floor(speed / 50); i++)
                activeRace.run_race_step();
            setRefresh(!refresh);
        } else {
            setIsRunning(false)
        }
    }, isRunning ? Math.min(1000 / speed, 20) : null)

    const switchActiveRace = (race) => {
        setIsRunning(false);
        setActiveRace(race);
    }

    const finishRaces = () => {
        for (const race of races) {
            while (race.state !== RoundState.COMPLETE) {
                race.run_race_step();
            }
        }
        setRefresh(!refresh);
    }

    // Render Everything

    if (page === 0) {
        let electionButton = null;
        if (!isRunning) {
            electionButton =
                <Button onClick={() => setIsRunning(true)} disabled={false} variant="primary" size="lg">
                    {'Run Election'}
                </Button>
        }
        else {
            electionButton =
                <Button onClick={null} disabled={true} variant="primary" size="lg">
                    {'Election is Running...'}
                </Button>
        }

        let dropdownItems = races.map((item, index) => (
            <Dropdown.Item key={index} as="button" onClick={() => switchActiveRace(item)} > {item.race_name}</Dropdown.Item >
        ));

        return (
            <div class="text-center">
                <ButtonGroup size="lg" style={{ padding: "0% 0% 5% 0%" }}>
                    <Button disabled={true} variant="primary" size="lg">
                        {'Election'}
                    </Button>
                    <Button onClick={() => setPage(1)} disabled={false} variant="primary" size="lg">
                        {'Charts'}
                    </Button>
                </ButtonGroup>
                <div className="title-text">
                    <h1> {activeRace.race_name} </h1>
                </div>
                <div className="election-table">
                    <CandidateList candidates={activeRace.candidateTable} refresh={refresh} />
                </div>
                <ButtonGroup size="lg" style={{ padding: "0% 0% 5% 0%" }}>
                    <DropdownButton id="dropdown-item-button" as={ButtonGroup} title="Change Race" variant="primary" size="lg">
                        {dropdownItems}
                    </DropdownButton>
                    {electionButton}
                    <Button onClick={finishRaces} disabled={false} variant="primary" size="lg">
                        {'Finish Races'}
                    </Button>
                </ButtonGroup>
            </div >
        );
    } else {
        return (
            <div class="text-center">
                <ButtonGroup size="lg" style={{ padding: "0% 0% 5% 0%" }}>
                    <Button onClick={() => setPage(0)} disabled={false} variant="primary" size="lg">
                        {'Election'}
                    </Button>
                    <Button disabled={true} variant="primary" size="lg">
                        {'Charts'}
                    </Button>
                </ButtonGroup>
                <div className="title-text">
                    <h1> {activeRace.race_name} </h1>
                </div>
                <div style={{ width: "50%" }}>
                    <FirstChoicePie race={activeRace} parties={parties} />
                </div>
                <div style={{ width: "50%" }}>
                    <ElectedCandidatesPie race={activeRace} parties={parties} />
                </div>
                <div style={{ width: "50%" }}>
                    <CandidatesRanked race={activeRace} parties={parties} />
                </div>
                <div style={{ width: "50%" }}>
                    <PartyPercentage race={activeRace} parties={parties} />
                </div>
                <div style={{ width: "50%" }}>
                    <EventualWinner race={activeRace} />
                </div>
            </div >
        );
    }
}

export default ElectionPage;