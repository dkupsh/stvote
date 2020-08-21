import React, { useState, useEffect } from 'react';
import firebase from 'firebase';
import uuid from 'react-uuid'

import DropdownButton from 'react-bootstrap/DropdownButton'
import { Dropdown } from 'react-bootstrap';
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import RangeSlider from 'react-bootstrap-range-slider';

import useInterval from '../Hooks/useInterval';
import CandidateList from './Race/CandidateList';

import FirstChoicePie from './Models/FirstChoicePie';
import ElectedCandidatesPie from './Models/ElectedCandidatesPie';
import CandidatesRankedPie from './Models/CandidatesRankedPie';
import CandidatesRanked from './Models/CandidatesRanked';
import PartyPercentage from './Models/PartyPercentage';
import EventualWinner from './Models/EventualWinner';
import VoteOverTime from './Models/VoteOverTime';
import VoteOverTimeBump from './Models/VoteOverTimeBump';
import RoundCandidateBump from './Models/RoundCandidateBump';

import { Race } from '../../Data_Models/Race';
import { Voter } from '../../Data_Models/Voter';
import { Ballot } from '../../Data_Models/Ballot';
import { Party } from '../../Data_Models/Party';
import { Candidate } from '../../Data_Models/Candidate';

import './ElectionPage.css'
import { RoundState } from '../../Data_Models/Round';
import NivoSankey from './Models/Sankey';
import HeatMap from './Models/HeatMap';
import ElectionBar from './Models/ElectionBar';
import Chord from './Models/Chord';

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

    const loadParties = (party_data) => {
        let partiesToAdd = []
        for (const party of party_data.parties) {
            for (let i = 0; i < partiesToAdd.length; i++)
                if (partiesToAdd.party_name === party.party_name)
                    continue;
            partiesToAdd.push(new Party(party.party_name, party.party_color));
        }
        return partiesToAdd;
    }

    const loadRaces = (election_configuration) => {
        let racesToAdd = []
        for (const race of election_configuration.races) {
            for (let i = 0; i < racesToAdd.length; i++)
                if (racesToAdd.race_id === race.race_id)
                    continue;
            racesToAdd.push(new Race(race.race_id, race.race_position, race.race_max_winners));
        }
        return racesToAdd;
    }

    const loadCandidates = (candidate_data) => {
        for (let key in candidate_data) {
            const race = find_race_by_name(key);
            if (race === null)
                continue;
            for (const candidate of candidate_data[key]) {
                let party = find_party_by_name(candidate.party);
                if (party === null) {
                    party = new Party(candidate.party, "FFFFFF");
                    console.log("Adding Party: ", party.party_name);
                    setParties([...parties, party]);
                }
                race.add_candidate(new Candidate(candidate.number, candidate.name, party));
            }
        }
        setCandidatesLoaded(true);

        return;
    }

    const loadVoters = (ballot_data) => {
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
    }


    const [election_configuration, setElectionConfiguration] = useState([]);
    const [candidate_data, setCandidateData] = useState([]);
    const [party_data, setPartyData] = useState([]);
    const [ballot_data, setBallotData] = useState([]);

    const [isLoading, setIsLoading] = useState(true);

    const [partiesLoaded, setPartiesLoaded] = useState(false);
    const [racesLoaded, setRacesLoaded] = useState(false);
    const [candidatesLoaded, setCandidatesLoaded] = useState(false);
    const [votersLoaded, setVotersLoaded] = useState(false);

    const [parties, setParties] = useState([]);
    const [races, setRaces] = useState([]);
    const [voters, setVoters] = useState([]);

    const [activeRace, setActiveRace] = useState(null);
    const [speed, setSpeed] = useState(1000);
    const [refresh, setRefresh] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [page, setPage] = useState(0);

    const [model, setModel] = useState(0);

    useEffect(() => {
        if (!isLoading)
            setPartiesLoaded(true);
    }, [parties]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isLoading) {
            if (activeRace === null)
                setActiveRace(races[0]);
            setRacesLoaded(true);
        }
    }, [races]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isLoading)
            setVotersLoaded(true);
    }, [voters]);  // eslint-disable-line react-hooks/exhaustive-deps


    useEffect(() => {
        const loadData = async () => {
            if (props.data !== undefined && props.data !== null) {
                setElectionConfiguration(props.data.election_configuration);
                setCandidateData(props.data.candidate_data);
                setPartyData(props.data.parties_data);
                setBallotData(props.data.ballot_data);
                setIsLoading(false);
                return;
            }
            let electionId = props.match.params.electionId;

            if (typeof (electionId) === "undefined") {
                electionId = "uc_berkeley";
            }

            let yearId = props.match.params.yearId;
            if (typeof (yearId) === "undefined") {
                yearId = "2015";
            }

            let databaseString = 'elections/' + electionId + "/" + yearId;

            console.log("Loading Data From DataBase");
            await firebase.database().ref(databaseString).once('value', snapshot => {
                if (!snapshot.exists()) {
                    console.log("Path Doesn't Exist, Loading Default Reference");
                    databaseString = 'elections/uc_berkeley/2015';
                }
            });

            firebase.database().ref(databaseString).once('value', snapshot => {
                setElectionConfiguration(snapshot.child('election_configuration').val());
                setCandidateData(snapshot.child('candidate_data').val());
                setPartyData(snapshot.child('parties_data').val());
                setBallotData(snapshot.child('ballot_data').val());
                setIsLoading(false);
            });
        }

        if (isLoading) {
            loadData();
            return;
        }
        if (!partiesLoaded) {
            console.log("Loading Parties")
            let parties = loadParties(party_data);
            setParties(parties);
        }

        if (partiesLoaded && !racesLoaded) {
            console.log("Loading Races");
            setRaces(loadRaces(election_configuration));
            return;
        }

        if (racesLoaded && !candidatesLoaded) {
            console.log("Loading Candidates");
            loadCandidates(candidate_data);
            return;
        }

        if (candidatesLoaded && !votersLoaded) {
            console.log("Loading Voters");
            setVoters(loadVoters(ballot_data));
        }
        if (votersLoaded) {
            console.log("Finished Loading");
        }

    }, [isLoading, partiesLoaded, racesLoaded, candidatesLoaded, votersLoaded]);  // eslint-disable-line react-hooks/exhaustive-deps

    useInterval(() => {
        if (activeRace.state !== RoundState.COMPLETE && isRunning) {
            for (let i = 0; i < Math.floor(speed / 10); i++) {
                activeRace.run_race_step();
            }
            setRefresh(!refresh);
        } else {
            setIsRunning(false)
        }
    }, isRunning ? 100 : null)

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
    if (isLoading || activeRace == null)
        return <h1> Loading... </h1>

    const pageButtonStyle = { borderRadius: 0, height: "100%", width: '50%' };
    let pageButtons = (
        <ButtonGroup size="lg" style={{ width: "100%", height: "50", padding: 0, margin: 0 }}>
            <Button onClick={() => setPage(0)} disabled={page === 0} variant="secondary" size="lg" style={pageButtonStyle}>
                {'Election'}
            </Button>
            <Button onClick={() => setPage(1)} disabled={page === 1} variant="secondary" size="lg" style={pageButtonStyle}>
                {'Charts'}
            </Button>
            <Button onClick={() => setPage(2)} disabled={page === 2} variant="secondary" size="lg" style={pageButtonStyle}>
                {'Models'}
            </Button>
        </ButtonGroup>
    );

    let raceTitle = (
        <div className="title-text" style={{ width: '100%', backgroundColor: 'grey', margin: '1% 2.5% 1% 2.5%', borderRadius: '5px' }}>
            <h1 style={{ font: '3.5rem/1 arial, sans-serif', color: 'white', textAlign: 'center', padding: '1%' }}> {activeRace.race_name} </h1>
        </div>
    );

    if (page === 0) {

        let dropdownItems = races.map((item, index) => (
            <Dropdown.Item key={index} as="button" onClick={() => switchActiveRace(item)} > {item.race_name}</Dropdown.Item >
        ));

        return (
            <div className="text-center" style={{ display: "flex", justifyContent: 'center', flexWrap: 'wrap' }}>
                {pageButtons}
                {raceTitle}
                <div className="election-table" style={{ width: '100%' }}>
                    <CandidateList candidates={activeRace.candidateTable} refresh={refresh} />
                </div>
                <ButtonGroup size="lg" style={{ borderRadius: '5px', width: '100%', margin: '0% 2.5% 0% 2.5%' }}>
                    <DropdownButton id="dropdown-item-button" as={ButtonGroup} title="Change Race" variant="primary" size="lg" style={{ boxShadow: '0 0 0 1px black', borderRadius: '5px 0px 0px 5px' }}>
                        {dropdownItems}
                    </DropdownButton>
                    <Button onClick={() => setIsRunning(true)} disabled={isRunning} variant="primary" style={{ boxShadow: '0 0 0 1px black', width: '5%' }}>
                        {'Run Election'}
                    </Button>
                    <Button onClick={finishRaces} disabled={false} variant="primary" style={{ boxShadow: '0 0 0 1px black', width: '5%' }}>
                        {'Finish Races'}
                    </Button>
                    <div style={{ boxShadow: '0 0 0 1px black', backgroundColor: '#007bff', width: '30%', borderRadius: '0px 5px 5px 0px' }}>
                        <label style={{ font: '1.3rem/1 arial, sans-serif', color: 'white', textAlign: 'center', padding: '5% 0 0 0' }}>
                            Speed
                        </label>
                        <div style={{ margin: '0% 5% 0% 5%' }}>
                            <RangeSlider
                                min={0}
                                max={10000}
                                step={10}
                                value={speed}
                                variant="secondary"
                                onChange={changeEvent => setSpeed(changeEvent.target.value)}
                            />
                        </div>
                    </div>
                </ButtonGroup>
            </div >
        );
    } else if (page === 1) {
        let chartStyle = {
            alignSelf: 'center', width: '50%', height: '30vw',
        }
        return (
            <div className="text-center" style={{ display: "flex", justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                {pageButtons}
                {raceTitle}
                <FirstChoicePie race={activeRace} parties={parties} style={chartStyle} />
                <ElectedCandidatesPie race={activeRace} parties={parties} style={chartStyle} />
                <CandidatesRanked race={activeRace} parties={parties} style={chartStyle} />
                <CandidatesRankedPie race={activeRace} style={chartStyle} />
                <PartyPercentage race={activeRace} parties={parties} style={chartStyle} />
                <VoteOverTime race={activeRace} parties={parties} style={chartStyle} />
                <VoteOverTimeBump race={activeRace} style={chartStyle} />
                <EventualWinner race={activeRace} style={chartStyle} />
                <RoundCandidateBump race={activeRace} style={chartStyle} />
            </div >
        );
    } else {
        let modelButtons = (
            <ButtonGroup size="lg" style={{ width: "100%", height: "50", padding: 0, margin: 0 }}>
                <Button onClick={() => setModel(0)} disabled={model === 0} variant="secondary" size="lg" style={pageButtonStyle}>
                    {'Bar'}
                </Button>
                <Button onClick={() => setModel(1)} disabled={model === 1} variant="secondary" size="lg" style={pageButtonStyle}>
                    {'Heat Map'}
                </Button>
                <Button onClick={() => setModel(2)} disabled={model === 2} variant="secondary" size="lg" style={pageButtonStyle}>
                    {'Sankey'}
                </Button>
            </ButtonGroup>
        );
        if (model === 0) {
            return (
                <div className="text-center" style={{
                    display: "flex",
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    {pageButtons}
                    {modelButtons}
                    {raceTitle}
                    <div style={{ display: "flex", flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        <ElectionBar race={activeRace} style={{ alignSelf: 'center', width: '40vw' }} />
                    </div>
                </div>
            );
        }
        else if (model === 1) {
            return (
                <div className="text-center" style={{
                    height: '100%',
                    minHeight: '100%',
                    display: "flex",
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    {pageButtons}
                    {modelButtons}
                    {raceTitle}
                    <HeatMap race={activeRace} />
                    <Chord race={activeRace} />
                </div >
            );
        }
        else {
            return (
                <div className="text-center" style={{
                    height: '100%',
                    minHeight: '100%',
                    display: "flex",
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    {pageButtons}
                    {modelButtons}
                    {raceTitle}
                    <NivoSankey race={activeRace} style={{
                        width: '90%',
                        height: '60vw'
                    }}
                    />
                </div >
            );
        }
    }
    // <SankeyGraph race={activeRace} width={"1000"} height={activeRace.candidates.length * 100} />
}

export default ElectionPage;