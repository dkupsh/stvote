import React from 'react';
import { CandidateState } from '../../../Data_Models/Candidate';
import ProgressBar from 'react-bootstrap/ProgressBar'
import '../ElectionPage.css'

function CandidatePosition(props) {
    const get_status_color = () => {
        if (props.status === CandidateState.ELECTED)
            return "#01A039";
        else if (props.status === CandidateState.RUNNING)
            return "#0095E0";
        else if (props.status === CandidateState.TRANSFERRING)
            return "#E07A00";
        else if (props.status === CandidateState.TRANSFERED)
            return "#FF0000";
    }

    const get_progress_variant = () => {
        if (props.status === CandidateState.ELECTED)
            return "success";
        else if (props.status === CandidateState.RUNNING)
            return "info";
        else if (props.status === CandidateState.TRANSFERRING)
            return "warning";
        else if (props.status === CandidateState.TRANSFERED)
            return "danger";
    }

    return (
        <tr>
            <td className="basic-row" width="1"> {props.position + 1} </td>
            <td className="basic-row" width="1"> {props.candidate.candidate_name} </td>
            <td className="basic-row" width="1" style={{ backgroundColor: props.candidate.candidate_party.party_color }}> {props.candidate.candidate_party.party_name} </td >
            <td className="basic-row" width="1" style={{ backgroundColor: get_status_color() }}> {props.status} </td >
            <td className="basic-row" width="1" style={{ backgroundColor: get_status_color() }}> {Math.floor(props.score)} </td >
            <td style={{ padding: "0", margin: "0" }}>
                <ProgressBar variant={get_progress_variant()} max={props.quota} min={0} now={props.score} style={{ height: "48px", borderRadius: 0 }} />
            </td >
        </tr >
    );
}

export default CandidatePosition;
