import { useContext, useEffect, useState } from 'react'
import styles from './Draft.module.css'
import { useLocation, useNavigate } from 'react-router-dom'
import TitleCard from '../../components/DraftCards/TitleCard'
import SectionCard from '../../components/DraftCards/SectionCard'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import { AppStateContext } from '../../state/AppProvider'
import { CommandBarButton, Stack } from '@fluentui/react'
import { sectionGenerate, SectionGenerateRequest } from '../../api'
import { Spinner, SpinnerSize } from '@fluentui/react'


const spinnerStyles = {
  root: {
    width: '100%', // Make spinner container take full width
    display: 'flex',
    justifyContent: 'center', // Center the spinner horizontally
    alignItems: 'center', // Center the spinner vertically if needed
  },
  circle: {
    height: '45px', // Increase spinner circle size
    width: '45px',  // Increase spinner circle size
  },
  label: {
    fontSize: '18px', // Increase label font size
    marginTop: '10px', // Add spacing between spinner and label
  },
};


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

  const [draftLoading, setDraftLoading] = useState(false);

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
    try {
      // const response = await sectionGenerate(req);
      // const responseBody = await response.json();
      // What are typical sections in a promissory note?
      setDraftLoading(true);
      setTimeout(() => {
        const responseBody = {
          "section_content": [
            {
              "content": "Principal Amount and Date: The principal amount of the loan is $10,000.00, and the date of execution of this promissory note is [Insert Date].",
              "sectionTitle": "Principal Amount and Date"
            },
            {
              "content": "Borrower Information: The borrower is John Doe, residing at 123 Main Street, Anytown, USA. Contact information includes a phone number: (555) 123-4567 and an email address: john.doe@email.com.",
              "sectionTitle": "Borrower Information"
            },
            {
              "content": "Payee Information: The payee is Jane Smith, located at 456 Elm Street, Anytown, USA. Contact details include a phone number: (555) 987-6543 and an email address: jane.smith@email.com.",
              "sectionTitle": "Payee Information"
            },
            {
              "content": "Interest Rate: The borrower agrees to pay an annual interest rate of 5.00% on the outstanding principal balance, which will accrue from the date of this promissory note until the principal amount is fully repaid.",
              "sectionTitle": "Interest Rate"
            },
            {
              "content": "Payment Terms: The borrower shall make monthly payments of $500.00, starting on [Insert Start Date] and continuing on the first day of each month until the entire principal amount and accrued interest are repaid.",
              "sectionTitle": "Payment Terms"
            },
            {
              "content": "Prepayment: The borrower may prepay the outstanding principal amount, in whole or in part, at any time without incurring any penalties or additional charges.",
              "sectionTitle": "Prepayment"
            },
            {
              "content": "Default: In the event of default, which includes failure to make any payment within 15 days of the due date, the payee has the right to declare the entire outstanding principal amount, along with accrued interest, immediately due and payable.",
              "sectionTitle": "Default"
            },
            {
              "content": "Notices: All notices and communications required under this promissory note shall be in writing and delivered personally, by postal mail, or via email to the respective addresses provided above.",
              "sectionTitle": "Notices"
            },
            {
              "content": "Jurisdiction and Waivers: This promissory note shall be governed by the laws of the State of [Insert State]. Both parties agree to submit to the exclusive jurisdiction of the courts located in [Insert County, State].",
              "sectionTitle": "Jurisdiction and Waivers"
            },
            {
              "content": "Cumulative Remedies: The rights and remedies provided under this promissory note are cumulative and do not exclude any other rights or remedies available at law.",
              "sectionTitle": "Cumulative Remedies"
            },
            {
              "content": "Waivers by Borrower: The borrower waives presentment, demand for payment, notice of dishonor, and any other notices required by law.",
              "sectionTitle": "Waivers by Borrower"
            },
            {
              "content": "Amendments: Any amendment or modification of this promissory note shall be in writing and signed by both the borrower and the payee.",
              "sectionTitle": "Amendments"
            },
            {
              "content": "Assignment: The payee may assign or transfer this promissory note to a third party without the borrower's consent. The borrower may not assign or transfer any of their rights or obligations under this promissory note without the prior written consent of the payee.",
              "sectionTitle": "Assignment"
            },
            {
              "content": "Signatures: The borrower and payee shall sign below to indicate their agreement to the terms of this promissory note. ",
              "sectionTitle": "Signatures"
            }
          ]
        }
        // Map the data
        const sections = req.map(reqSection => {
          const matchedResponse = responseBody.section_content.find(
            resSection => resSection.sectionTitle === reqSection.sectionTitle
          );
          return {
            title: reqSection.sectionTitle,
            content: matchedResponse ? matchedResponse.content : "",
            description: reqSection.sectionDescription
          };
        });
        appStateContext?.dispatch({ type: 'UPDATE_SECTIONS', payload: sections })
        setDraftLoading(false)
      }, 60000);

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

  useEffect(() => {
    if (sections.length > 0) {
      const requestArray = generateAPIRequest(sections);
      fetchAllSectionContent(requestArray)
    }
  }, [])

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
    <>
      {draftLoading ?
        <Spinner styles={spinnerStyles} size={SpinnerSize.large} label="Loading....!" /> :
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
      }
    </>
  )
}

export default Draft
