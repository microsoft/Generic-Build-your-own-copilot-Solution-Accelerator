import { useContext, useEffect } from 'react'
import styles from './Draft.module.css'
import { useLocation, useNavigate } from 'react-router-dom'
import TitleCard from '../../components/DraftCards/TitleCard'
import SectionCard from '../../components/DraftCards/SectionCard'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import { AppStateContext } from '../../state/AppProvider'
import { CommandBarButton, Stack } from '@fluentui/react'
import { sectionGenerate, SectionGenerateRequest } from '../../api'

// Define the type for the section
interface Section {
  title: string;
  description: string;
}

// Define the type for the request object
interface RequestObject {
  sectionTitle: string;
  sectionDescription: string;
}

const Draft = (): JSX.Element => {
  const appStateContext = useContext(AppStateContext)
  const location = useLocation()
  const navigate = useNavigate()


  // get draftedDocument from context
  const draftedDocument = appStateContext?.state.draftedDocument
  const sections = draftedDocument?.sections ?? []
  const aiWarningLabel = 'AI-generated content may be incorrect'

  // redirect to home page if draftedDocument is empty
  if (!draftedDocument) {
    navigate('/')
  }


 // Fetch function with type annotations
async function fetchAllSectionContent(req: RequestObject[]): Promise<void> {
  console.log("req", req);
  try {
    const response = await sectionGenerate(req);
    const responseBody = await response.json();
    console.log("responseBody", responseBody);
  } catch (error) {
    console.error("Error fetching section content:", error);
  }
}
// Function to generate the API request array
const generateAPIRequest = (sections: Section[]): RequestObject[] => {
  return sections.map((section) => ({
    sectionTitle: section.title,
    sectionDescription: section.description,
  }));
};

  useEffect(()=>{
      if(sections.length>0){
        const requestArray = generateAPIRequest(sections);
        fetchAllSectionContent(requestArray)
      }
  },[])

  const exportToWord = () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: getTitle(),
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
                      text: '',
                      break: 1 // Add a new line after the section title
                    }),
                    ...section.content
                      .split('\n')
                      .map((line, lineIndex) => [
                        new TextRun({
                          text: line,
                          size: 16
                        }),
                        new TextRun({
                          text: '',
                          break: 1 // Add a new line after each line of content
                        })
                      ])
                      .flat()
                  ]
                })
            )
          ]
        }
      ]
    })

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `DraftTemplate-${sanitizeTitle(getTitle())}.docx`)
    })
  }

  function getTitle() {
    if (appStateContext === undefined) return ''
    return appStateContext.state.draftedDocumentTitle === null ? '' : appStateContext.state.draftedDocumentTitle
  }
  function sanitizeTitle(title: string): string {
    return title.replace(/[^a-zA-Z0-9]/g, '')
  }

  return (
    <Stack className={styles.container}>
      <TitleCard />
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
