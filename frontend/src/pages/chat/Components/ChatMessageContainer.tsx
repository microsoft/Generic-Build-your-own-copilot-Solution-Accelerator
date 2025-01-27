import { useRef, useState, useEffect, useContext, useLayoutEffect, forwardRef } from 'react';
import styles from '../Chat.module.css';
import { Answer } from '../../../components/Answer';
import { parseCitationFromMessage, generateTemplateSections } from '../../../helpers/helpers';
import { Stack } from '@fluentui/react';
import { ErrorCircleRegular } from '@fluentui/react-icons';
import { Citation, ChatMessage, ChatType } from '../../../api/models';

interface ChatMessageContainerProps {
    messages: ChatMessage[];
    isLoading: boolean;
    showLoadingMessage: boolean;
    type: ChatType;  
    onShowCitation: (citation: Citation) => void;
}

const chatTypeResponse = {
    Browse: 'Generating answer...',
    Generate: 'Generating template...this may take up to 30 seconds.'
};

export const ChatMessageContainer = forwardRef<HTMLDivElement, ChatMessageContainerProps>((props, ref) => {
    const { isLoading, messages, showLoadingMessage, type, onShowCitation } = props;
    
    return (
        <div className={styles.chatMessageStream} style={{ marginBottom: isLoading ? '40px' : '0px' }} role="log">
            {messages.map((answer, index) => (
                <div key={answer.id || index}> {/* Ensure each element has a unique key */}
                    {answer.role === 'user' ? (
                        <div className={styles.chatMessageUser} tabIndex={0}>
                            <div className={styles.chatMessageUserMessage}>{answer.content}</div>
                        </div>
                    ) : answer.role === 'assistant' ? (
                        <div className={styles.chatMessageGpt}>
                            <Answer
                                answer={{
                                    answer: type === ChatType.Browse ? answer.content : generateTemplateSections(answer.content),
                                    citations: parseCitationFromMessage(messages[index - 1]),  // Ensure previous message exists before parsing
                                    message_id: answer.id,
                                    feedback: answer.feedback
                                }}
                                onCitationClicked={c => onShowCitation(c)}
                            />
                        </div>
                    ) : answer.role === 'error' ? (  // Correct string 'error' usage instead of constant ERROR
                        <div className={styles.chatMessageError}>
                            <Stack horizontal className={styles.chatMessageErrorContent}>
                                <ErrorCircleRegular className={styles.errorIcon} style={{ color: 'rgba(182, 52, 67, 1)' }} />
                                <span>Error</span>
                            </Stack>
                            <span className={styles.chatMessageErrorContent}>{answer.content}</span>
                        </div>
                    ) : null}
                </div>
            ))}
            
            {showLoadingMessage && (
                <div className={styles.chatMessageGpt}>
                    <Answer
                        answer={{
                            answer: type === ChatType.Browse ? chatTypeResponse.Browse : chatTypeResponse.Generate,
                            citations: []
                        }}
                        onCitationClicked={() => null}  // No-op for loading message
                    />
                </div>
            )}
            
            {/* Ref passed here */}
            <div ref={ref} />
        </div>
    );
});
