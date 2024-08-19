import { Stack, TextField } from '@fluentui/react'
import { makeStyles, Text } from '@fluentui/react-components'
import React from 'react'

interface TitleCardProps {
  onTitleChange: (value: string) => void
}

const useStyles = makeStyles({
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px'
  }
})

const TitleCard: React.FC<TitleCardProps> = ({ onTitleChange }) => {
  const classes = useStyles()
  const handleChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onTitleChange(event.currentTarget.value)
  }

  return (
    <Stack style={{ marginBottom: '1rem' }}>
      <Text className={classes.sectionTitle}>Draft Document</Text>
      <TextField
        label="Title"
        onChange={handleChange}
        placeholder="Enter title here"
        styles={{ root: { width: '100%' } }} // Adjust styles as needed
      />
    </Stack>
  )
}

export default TitleCard
