import React, { useState, useEffect } from 'react';
import { documentRead } from '../../api/api';
import { useParams } from 'react-router-dom';

// Define the interface for the document data
interface DocumentData {
  content: string;
  full_content: string;
}

const Document = (): JSX.Element => {
  const params = useParams();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Step 1

  useEffect(() => {
    const getDocument = async (id: string) => {
      setIsLoading(true); // Step 2
      try {
        const response = await documentRead(id);
        const data = await response.json();
        setDocument(data);
      } catch (error) {
        console.error(error);
        setDocument(null);
      } finally {
        setIsLoading(false); // Step 3
      }
    };

    if (params.id) {
      getDocument(params.id);
    }
  }, [params.id]);

  return (
    <>
      {isLoading ? ( // Step 4
        <p>Loading...</p>
      ) : document ? (
        <p>{document.full_content}</p>
      ) : (
        <h1>Document not found. Please try again.</h1>
      )}
    </>
  );
};

export default Document;