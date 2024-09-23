import { Stack, TextField } from '@fluentui/react'
import { makeStyles, Text } from '@fluentui/react-components'
import React, { useContext } from 'react'
import { AppStateContext } from '../../state/AppProvider'

interface TitleCardProps {}

const useStyles = makeStyles({
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px'
  }
})

const TitleCard: React.FC<TitleCardProps> = () => {
  const appStateContext = useContext(AppStateContext)
  const classes = useStyles()
  const handleChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    appStateContext?.dispatch({ type: 'UPDATE_DRAFTED_DOCUMENT_TITLE', payload: event.currentTarget.value })
  }

  if (!appStateContext) {
    throw new Error('useAppState must be used within a AppStateProvider')
  }

  const title = appStateContext.state.draftedDocumentTitle === null ? '' : appStateContext.state.draftedDocumentTitle

  return (
    <Stack style={{ marginBottom: '1rem' }}>
      <Text className={classes.sectionTitle}>Draft Document</Text>
      <TextField
        label="Title"
        onChange={handleChange}
        placeholder="Enter title here"
        styles={{ root: { width: '100%' } }} // Adjust styles as needed
        value={title}
      />
    </Stack>
  )
}

export default TitleCard
