import React, { useContext, useState } from 'react'
import { Stack } from '@fluentui/react'
import { AppStateContext } from '../../state/AppProvider'
import { sectionGenerate, SectionGenerateRequest } from '../../api'
import { Section } from '../../api/models'
import { Spinner } from '@fluentui/react'
import GenerateIcon from '../../assets/Generate.svg'
import type { PopoverProps } from '@fluentui/react-components'
import { Dismiss16Regular } from '@fluentui/react-icons'
import { Textarea, makeStyles, Text, Popover, PopoverSurface, PopoverTrigger, Button } from '@fluentui/react-components'

interface SectionCardProps {
  sectionIdx: number
}

const useStyles = makeStyles({
  sectionCard: {
    padding: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px'
  },
  generateButton: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #B3B0AD',
    width: '117px',
    height: '32px',
    padding: '0',
    borderRadius: '4px'
  },

  popoverSurface: {
    width: '50%',
    flexDirection: 'column',
    gap: '2rem',
    backgroundColor: '#EDEBE9'
  },

  popoverTextHeader: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },

  popoverTextarea: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: '4px',
    // margin top and bottom
    margin: '0.5rem 0',
    padding: '0.5rem',
    '&::selection': {
      backgroundColor: '#FFD6A5',
    }
  },

  popoverGenerateButton: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #B3B0AD',
    width: '117px',
    height: '32px',
    padding: '0',
    borderRadius: '4px'
  },

  dismissButton: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #B3B0AD',
    width: '18px',
    height: '18px',
    borderRadius: '4px'
  },

  sectionContentContainer: {
    height: '200px',
    backgroundColor: '#FFFFFF',
    borderRadius: '4px',
    border: '1px solid #B3B0AD',
    alignItems: 'normal'
  },

  sectionContentTextarea: {
    width: '100%',
    height: '100%',
    padding: '0.5rem',
    minHeight: '150px',
    '&::selection': {
      backgroundColor: '#FFD6A5'
    }
  },
  disclaimerText: {
    marginLeft: '5px',
    marginTop: '8px',
    textAlign: 'left',
    fontSize: '12px',
    color: '#888'
  },

  characterCounter: {
    marginRight: '5px',
    fontSize: '12px',
    color: '#888',
    alignSelf: 'end'
  }
})

const SectionCard = ({ sectionIdx }: SectionCardProps) => {
  const classes = useStyles()
  const [isLoading, setIsLoading] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const appStateContext = useContext(AppStateContext)
  const [charCount, setCharCount] = useState(0)
  const [wasInitialized, setWasInitialized] = useState(false)

  if (!appStateContext) {
    throw new Error('useAppState must be used within a AppStateProvider')
  }

  const section = appStateContext.state.draftedDocument?.sections[sectionIdx]
  if (!section) {
    throw new Error('Section not found')
  }

  const sectionTitle = section.title
  const sectionDescription = section.description
  const sectionContent = section.content
  const sectionCharacterLimit = 2000

  const handleOpenChange: PopoverProps['onOpenChange'] = (e, data) => setIsPopoverOpen(data.open || false)

  async function fetchSectionContent(sectionTitle: string, sectionDescription: string) {
    setIsLoading(true)
    const sectionGenerateRequest: SectionGenerateRequest = { sectionTitle, sectionDescription }

    const response = await sectionGenerate(sectionGenerateRequest)
    const responseBody = await response.json()

    const updatedSection: Section = {
      title: sectionTitle,
      description: sectionDescription,
      content: responseBody.section_content
    }
    appStateContext?.dispatch({ type: 'UPDATE_SECTION', payload: { sectionIdx: sectionIdx, section: updatedSection } })
    const content = updatedSection.content || ''
    
    // limit the character count to 2000
    if (content.length > sectionCharacterLimit) {
      updatedSection.content = content.slice(0, sectionCharacterLimit)
    }

    setCharCount(content.length)
    setIsLoading(false)
  }

  if (sectionContent === '' && !isLoading && !wasInitialized) {
    fetchSectionContent(sectionTitle, sectionDescription)
    setWasInitialized(true)
  }

  return (
    <Stack className={classes.sectionCard}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center" style={{ marginBottom: '1rem' }}>
        <Text className={classes.sectionTitle}>{sectionTitle}</Text>
        <Popover open={isPopoverOpen} onOpenChange={handleOpenChange} positioning="below-end" size="large">
          <PopoverTrigger disableButtonEnhancement>
            <Button icon={<img src={GenerateIcon} alt="Generate" />} className={classes.generateButton}>
              Generate
            </Button>
          </PopoverTrigger>

          <PopoverSurface className={classes.popoverSurface}>
            <Stack horizontal horizontalAlign="space-between" style={{ marginBottom: '.25rem' }}>
              <Text>Regenerate {sectionTitle}</Text>
              <Button
                className={classes.dismissButton}
                icon={<Dismiss16Regular />}
                onClick={() => {
                  setIsPopoverOpen(false)
                }}
              />
            </Stack>

            <Textarea
              id="popover-textarea"
              appearance="outline"
              size="large"
              defaultValue={sectionDescription}
              className={ classes.popoverTextarea }
              textarea={{ className: classes.popoverTextarea }}
            />

            <Stack horizontal style={{ justifyContent: 'space-between' }}>
              <div />
              <Button
                appearance="outline"
                onClick={() => {
                  // get section description from textarea
                  const updatedSectionDescription = document.getElementById('popover-textarea')?.textContent || ''

                  if (!updatedSectionDescription) {
                    console.error('Section description is empty')
                    return
                  }

                  setIsPopoverOpen(false)
                  fetchSectionContent(sectionTitle, updatedSectionDescription)
                }}
                className={classes.popoverGenerateButton}>
                Generate
              </Button>
            </Stack>
          </PopoverSurface>
        </Popover>
      </Stack>

      <Stack verticalAlign="center" horizontalAlign="center" className={classes.sectionContentContainer}>
        {(isLoading && <Spinner />) || (
          <>
            <Textarea
              appearance="outline"
              size="large"
              defaultValue={sectionContent}
              maxLength={sectionCharacterLimit}
              onChange={(e, data) => {
                const content = data.value || ''
                setCharCount(content.length)
                const updatedSection: Section = {
                  title: sectionTitle,
                  description: sectionDescription,
                  content: content
                }
                appStateContext?.dispatch({
                  type: 'UPDATE_SECTION',
                  payload: { sectionIdx: sectionIdx, section: updatedSection }
                })
              }}
              textarea={{ className: classes.sectionContentTextarea }}
            />
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Text className={classes.disclaimerText}>AI-generated content may be incorrect</Text>
              <Text className={classes.characterCounter}>{sectionCharacterLimit - charCount} characters remaining</Text>
            </Stack>
          </>
        )}
      </Stack>
    </Stack>
  )
}

export default SectionCard
