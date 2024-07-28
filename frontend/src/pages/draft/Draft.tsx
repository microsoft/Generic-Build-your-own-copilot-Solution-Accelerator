import React, { useState } from 'react';
import styles from './Draft.module.css'
import { useLocation } from 'react-router-dom';
import TitleCard from '../../components/DraftCards/TitleCard'
import SectionCard from '../../components/DraftCards/SectionCard'
import { DraftedDocument } from '../../api'
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

const Draft = (): JSX.Element => {

  const location = useLocation();
  const { parameter } = location.state as { parameter: DraftedDocument };
  const [sections, setSections] = useState(parameter.sections);
  const [title, setTitle] = useState('');

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

  const handleValueChange = (key: number, value: string) => {
    const updatedSections = sections.map((section, index) =>
      index === key ? { ...section, content: value } : section
    );
    setSections(updatedSections);
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
      
      {sections.map((section, index) => (
        <SectionCard key={index} section={section} onValueChange={handleValueChange} index={index} />
      ))}
    </div>
  )
}

export default Draft
