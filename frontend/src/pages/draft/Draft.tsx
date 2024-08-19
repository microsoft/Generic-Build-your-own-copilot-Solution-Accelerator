import { useState, useContext } from 'react'
import styles from './Draft.module.css'
import { useLocation } from 'react-router-dom'
import TitleCard from '../../components/DraftCards/TitleCard'
import SectionCard from '../../components/DraftCards/SectionCard'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import { AppStateContext } from '../../state/AppProvider'
import { CommandBarButton, Stack } from '@fluentui/react'

const Draft = (): JSX.Element => {
  const appStateContext = useContext(AppStateContext)
  const location = useLocation()
  const [title, setTitle] = useState('')

  // get draftedDocument from context
  const draftedDocument = appStateContext?.state.draftedDocument
  const sections = draftedDocument?.sections ?? []
  const aiWarningLabel = 'AI-generated content may be incorrect'

  const exportToWord = () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: title,
                  bold: true,
                  size: 24
                }),
                new TextRun({
                  text: '\n',
                  break: 1 // Add a new line after the title
                }),
                new TextRun({
                  text: aiWarningLabel,
                  size: 12
                }),
                new TextRun({
                  text: '\n',
                  break: 1 // Add a new line after the AI statement
                })
              ]
            }),
            ...sections.map(
              (section, index) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Section ${index + 1}: ${section.title}`,
                      bold: true,
                      size: 20
                    }),
                    new TextRun({
                      text: '\n',
                      break: 1 // Add a new line after the section title
                    }),
                    new TextRun({
                      text: section.content,
                      size: 16
                    }),
                    new TextRun({
                      text: '\n',
                      break: 1 // Add a new line after the content
                    })
                  ]
                })
            )
          ]
        }
      ]
    })

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `DraftTemplate-${sanitizeTitle(title)}.docx`)
    })
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
  }

  function sanitizeTitle(title: string): string {
    return title.replace(/[^a-zA-Z0-9]/g, '')
  }

  return (
    <Stack className={styles.container}>
      <TitleCard onTitleChange={handleTitleChange} />
      {(sections ?? []).map((_, index) => (
        <SectionCard key={index} sectionIdx={index} />
      ))}
      <Stack className={styles.buttonContainer}>
        <CommandBarButton
          role="button"
          styles={{
            icon: {
              color: '#FFFFFF'
            },
            iconDisabled: {
              color: '#BDBDBD !important'
            },
            root: {
              color: '#FFFFFF',
              background: '#1367CF'
            },
            rootDisabled: {
              background: '#F0F0F0'
            }
          }}
          className={styles.exportDocumentIcon}
          iconProps={{ iconName: 'WordDocument' }}
          onClick={exportToWord}
          aria-label="export document"
          text="Export Document"
        />
      </Stack>
    </Stack>
  )
}

export default Draft
