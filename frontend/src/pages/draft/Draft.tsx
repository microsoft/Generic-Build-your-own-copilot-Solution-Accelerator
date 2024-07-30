import React, { useState, useContext } from 'react';
import styles from './Draft.module.css'
import { useLocation } from 'react-router-dom';
import TitleCard from '../../components/DraftCards/TitleCard'
import SectionCard from '../../components/DraftCards/SectionCard'
import { DraftedDocument } from '../../api'
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { AppStateContext } from "../../state/AppProvider";


const Draft = (): JSX.Element => {
  const appStateContext = useContext(AppStateContext)
  const location = useLocation();
  const { generateContentOnLoad } = location.state as { generateContentOnLoad: Boolean };
  const [title, setTitle] = useState('');

  // get draftedDocument from context
  const draftedDocument = appStateContext?.state.draftedDocument;
  const sections = draftedDocument?.sections ?? [];

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
                  size: 24,
                }),
                new TextRun({
                  text: "\n",
                  break: 1, // Add a new line after the title
                }),              ],
            }),
            ...sections.map((section, index) => (
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Section ${index + 1}: ${section.title}`,
                    bold: true,
                    size: 20,
                  }),
                  new TextRun({
                    text: "\n",
                    break: 1, // Add a new line after the section title
                  }),
                  new TextRun({
                    text: section.content,
                    size: 16,
                  }),
                  new TextRun({
                    text: "\n",
                    break: 1, // Add a new line after the content
                  }),                ],
              })
            )),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `DraftTemplate-${title}.docx`);
    });
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
  };

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'start', alignItems: 'center' }}>
        <h4>Draft Document</h4>
        <button onClick={exportToWord} style={{ marginLeft: 'auto' }}>Export to Word</button>
      </div>

      <TitleCard onTitleChange={handleTitleChange} />
      {(sections ?? []).map((_, index) => (<SectionCard key={index} sectionIdx={index} />))}
    </div>
  )
}

export default Draft
