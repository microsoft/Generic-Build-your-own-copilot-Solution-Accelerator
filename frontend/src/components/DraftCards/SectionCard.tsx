import React, { useState } from 'react';
import { Stack } from "@fluentui/react"
import { sectionGenerate, SectionGenerateRequest } from '../../api';
import { Section } from '../../api/models'
import { Spinner } from "@fluentui/react";
import GenerateIcon from '../../assets/Generate.svg'
import type { PopoverProps } from '@fluentui/react-components'
import { Dismiss16Regular } from '@fluentui/react-icons';
import { Textarea, makeStyles, Text, Popover, PopoverSurface, PopoverTrigger, Button } from '@fluentui/react-components';


interface SectionCardProps {
    section: Section
}

const useStyles = makeStyles({
    generateButton: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #B3B0AD',
        width: '117px',
        height: '32px',
        padding: '0',
        borderRadius: '4px',
    },

    popoverSurface: {
        width: '50%',
        flexDirection: 'column',
        gap: '2rem',
        backgroundColor: '#EDEBE9'
    },

    popoverTextHeader: {
        fontSize: '1.25rem',
        fontWeight: 'bold',
    },

    popoverTextarea: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '4px',
        // margin top and bottom
        margin: '0.5rem 0',
        padding: '0.5rem',
    },

    popoverGenerateButton: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #B3B0AD',
        width: '117px',
        height: '32px',
        padding: '0',
        borderRadius: '4px',
    },

    dismissButton: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #B3B0AD',
        width: '18px',
        height: '18px',
        borderRadius: '4px',
    },

    sectionContentContainer: {
        height: '128px', 
        backgroundColor: '#FFFFFF', 
        borderRadius: '4px', 
        border: '1px solid #B3B0AD' 
    },

    sectionContentTextarea: {
        width: '100%', 
        height: '100%',
        padding: '0.5rem',

        // selection
        '&::selection': {
            backgroundColor: '#FFD6A5',
        }
    }
    
});

const SectionCard = ({ section }: SectionCardProps) => {
    const classes = useStyles()
    const [isLoading, setIsLoading] = React.useState(false)
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
    const [textareaValue, setTextareaValue] = useState(section.content);

    const sectionTitle = section.title
    const sectionDescription = section.description
    const sectionContent = section.content

    const handleOpenChange: PopoverProps["onOpenChange"] = (e, data) => setIsPopoverOpen(data.open || false);

    const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTextareaValue(event.target.value);
      };

    async function fetchSectionContent(sectionTitle: string, sectionDescription: string) {
        setIsLoading(true)
        const sectionGenerateRequest: SectionGenerateRequest = { sectionTitle, sectionDescription }
        const response = await sectionGenerate(sectionGenerateRequest)
        const responseBody = await response.json()
        setTextareaValue(responseBody.section_content)
        setIsLoading(false)
    }

    return (
        <Stack
            style={{ marginBottom: '1rem' }}
        >
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center" style={{ marginBottom: '1rem' }} >
                <Text>{sectionTitle}</Text>
                <Popover open={isPopoverOpen} onOpenChange={handleOpenChange} positioning="below-end" size="large">
                    <PopoverTrigger disableButtonEnhancement>
                        <Button icon={<img src={GenerateIcon} alt="Generate" />} className={classes.generateButton}>
                            Generate
                        </Button>
                    </PopoverTrigger>

                    <PopoverSurface className={classes.popoverSurface}>
                        <Stack horizontal horizontalAlign="space-between" style={{ marginBottom: '.25rem' }}>
                            <Text>Regenerate {sectionTitle}</Text>
                            <Button className={classes.dismissButton} icon={<Dismiss16Regular />} onClick={() => { setIsPopoverOpen(false) }}/>
                        </Stack>

                        <Textarea
                            id="popover-textarea"
                            appearance="outline"
                            size="large"
                            defaultValue={sectionDescription}
                            className={classes.popoverTextarea}
                        />

                        <Stack horizontal style={{ justifyContent: 'space-between' }}>
                            <div/>
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

                                className={classes.popoverGenerateButton}
                            >
                                Generate
                            </Button>
                        </Stack>
                    </PopoverSurface>
                </Popover>
            </Stack>

            <Stack verticalAlign="center" horizontalAlign="center" className={classes.sectionContentContainer}>
            {
                isLoading && (
                    <Spinner />
                ) || (
                    <Textarea
                        appearance="outline"
                        size="large"
                        defaultValue={sectionContent}
                        value={textareaValue}
                        onChange={handleTextareaChange}                        
                        textarea={{ className: classes.sectionContentTextarea }}
                        style={{ width: '100%', height: '100%' }}
                    />
                )
            }
            </Stack>
        </Stack>
    )
}

export default SectionCard
