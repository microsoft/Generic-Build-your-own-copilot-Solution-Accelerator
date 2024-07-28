import { TextField, Stack } from "@fluentui/react"
import React from "react"

interface TitleCardProps {
    onTitleChange: (value: string) => void;
}

const TitleCard: React.FC<TitleCardProps> = ({ onTitleChange }) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onTitleChange(event.target.value);
    };

    return (
        <Stack style={{ marginBottom: '1rem' }} >
            <input type="text" onChange={handleChange} placeholder="Enter title here" />
        </Stack>
    )
}

export default TitleCard
