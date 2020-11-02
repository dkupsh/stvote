import React from 'react';

import { Button, Form } from 'react-bootstrap';

function ElectionSettings(props) {
    let candidates = [...props.race.candidates, ...props.race.inactive_candidates]

    let excused_boxes = candidates.map((candidate, index) => {
        const check = props.race.candidates.includes(candidate);
        return <Form.Check label={candidate.candidate_name} key={index} checked={check} onChange={() => (props.excused(candidate))} />
    });

    return (
        <div>
            {excused_boxes}
            <Button onClick={() => props.race.reset_race()} variant="primary" style={{ boxShadow: '0 0 0 1px black', borderRadius: '5px 5px 5px 5px' }}>
                {'Reset Race'}
            </Button>
        </div>
    )
}

export default ElectionSettings;