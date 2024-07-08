import { TextField, Stack } from "@fluentui/react"
import React from "react"
import { AppStateContext } from "../../state/AppProvider"


const TitleCard = () => {
    const appStateContext = React.useContext(AppStateContext)

    if (!appStateContext) { throw new Error('useAppState must be used within a AppStateProvider') }
    const title = appStateContext?.state.draftedDocument.title

    return (
        <Stack style={{ marginBottom: '1rem' }} >
            <TextField label="Title" value={title} />
        </Stack>
    )
}

export default TitleCard
