import { useRef, useState, useEffect, useContext, useLayoutEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CommandBarButton,
  IconButton,
  Dialog,
  DialogType,
  Stack,
  Modal,
  IStackTokens,
  mergeStyleSets,
  IModalStyles,
  PrimaryButton
} from '@fluentui/react'
import { SquareRegular, ShieldLockRegular, ErrorCircleRegular } from '@fluentui/react-icons'

import uuid from 'react-uuid'
import { isEmpty } from 'lodash'
import styles from './Chat.module.css'

import {
  ChatMessage,
  ChatType,
  ConversationRequest,
  conversationApi,
  Citation,
  ToolMessageContent,
  ChatResponse,
  getUserInfo,
  Conversation,
  historyGenerate,
  historyUpdate,
  historyClear,
  ChatHistoryLoadingState,
  CosmosDBStatus,
  ErrorMessage,
  Section,
  DraftedDocument
} from '../../api'
import { QuestionInput } from '../../components/QuestionInput'
import { ChatHistoryPanel } from '../../components/ChatHistory/ChatHistoryPanel'
import { AppStateContext } from '../../state/AppProvider'
import { useBoolean } from '@fluentui/react-hooks';
import { CitationPanel } from './Components/CitationPanel'
import { AuthNotConfigure } from './Components/AuthNotConfigure'
import { ChatMessageContainer } from './Components/ChatMessageContainer';
import { parseErrorMessage, cleanJSON } from '../../helpers/helpers';

const enum messageStatus {
  NotRunning = 'Not Running',
  Processing = 'Processing',
  Done = 'Done'
}

// Define stack tokens for spacing
const stackTokens: IStackTokens = { childrenGap: 20 }

// Define custom styles for the modal
const modalStyles: IModalStyles = {
  main: {
    maxWidth: '80%',
    minHeight: '40%',
    padding: '20px',
    backgroundColor: '#f3f2f1',
    borderRadius: '8px'
  },
  root: undefined,
  scrollableContent: {
    minWidth: '800px'
  },
  layer: undefined,
  keyboardMoveIconContainer: undefined,
  keyboardMoveIcon: undefined
}

// Define custom styles for the content inside the modal
const contentStyles = mergeStyleSets({
  iframe: {
    width: '100%',
    height: '500px',
    border: 'none'
  },
  closeButton: {
    marginTop: '20px',
    alignSelf: 'flex-end'
  }
})

interface Props {
  type?: ChatType
}

const Chat = ({ type = ChatType.Browse }: Props) => {
  const location = useLocation()

  const appStateContext = useContext(AppStateContext)
  const ui = appStateContext?.state.frontendSettings?.ui
  const AUTH_ENABLED = appStateContext?.state.frontendSettings?.auth_enabled
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false)
  const [activeCitation, setActiveCitation] = useState<Citation>()
  const [isCitationPanelOpen, setIsCitationPanelOpen] = useState<boolean>(false)
  const [isIntentsPanelOpen, setIsIntentsPanelOpen] = useState<boolean>(false)
  const abortFuncs = useRef([] as AbortController[])
  const [showAuthMessage, setShowAuthMessage] = useState<boolean | undefined>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [jsonDraftDocument, setJSONDraftDocument] = useState<string>('')
  const [draftDocument, setDraftDocument] = useState<DraftedDocument>()
  const [processMessages, setProcessMessages] = useState<messageStatus>(messageStatus.NotRunning)
  const [clearingChat, setClearingChat] = useState<boolean>(false)
  const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true)
  const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalUrl, setModalUrl] = useState('');
  const [finalMessages, setFinalMessages] = useState<ChatMessage[]>([])

  const errorDialogContentProps = {
    type: DialogType.close,
    title: errorMsg?.title,
    closeButtonAriaLabel: 'Close',
    subText: errorMsg?.subtitle
  }

  const modalProps = {
    titleAriaId: 'labelId',
    subtitleAriaId: 'subTextId',
    isBlocking: true,
    styles: { main: { maxWidth: 450 } }
  }

  const [ASSISTANT, TOOL, ERROR] = ['assistant', 'tool', 'error']
  const NO_CONTENT_ERROR = 'No content in messages object.'

  useEffect(() => {
    if (type === ChatType.Browse) {
      appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: appStateContext?.state.browseChat })
    } else {
      appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: appStateContext?.state.generateChat })
    }
    processTemplateResponse()
  }, [location])

  useEffect(() => {
    appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: appStateContext?.state.isGenerating })
  }, [isLoading])

  useEffect(() => {
    if (
      appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.Working &&
      appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured &&
      appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Fail &&
      hideErrorDialog
    ) {
      let subtitle = `${appStateContext.state.isCosmosDBAvailable.status}. Please contact the site administrator.`
      setErrorMsg({
        title: 'Template history is not enabled',
        subtitle: subtitle
      })
      toggleErrorDialog()
    }
  }, [appStateContext?.state.isCosmosDBAvailable])

  const handleErrorDialogClose = () => {
    toggleErrorDialog()
    setTimeout(() => {
      setErrorMsg(null)
    }, 500)
  }

  useEffect(() => {
    setIsLoading(appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading)
  }, [appStateContext?.state.chatHistoryLoadingState])

  const getUserInfoList = async () => {
    if (!AUTH_ENABLED) {
      setShowAuthMessage(false)
      return
    }
    const userInfoList = await getUserInfo()
    if (userInfoList.length === 0 && window.location.hostname !== '127.0.0.1') {
      setShowAuthMessage(true)
    } else {
      setShowAuthMessage(false)
    }
  }

  const navigate = useNavigate()

  const navigateToDraftPage = (parameter: DraftedDocument) => {
    // update DraftedDocument in the state
    appStateContext?.dispatch({ type: 'UPDATE_DRAFTED_DOCUMENT', payload: parameter })
    navigate('/draft')
  }

  let assistantMessage = {} as ChatMessage
  let toolMessage = {} as ChatMessage
  let assistantContent = ''

  const processTemplateResponse = () => {
    if (type === ChatType.Template) {
      let jsonString = ''
      if (assistantMessage.role === ASSISTANT) {
        jsonString = cleanJSON(assistantContent)
      } else {
        let latestChat = appStateContext?.state.currentChat
        if (!latestChat) return

        const assistantMessages = latestChat.messages.filter(answer => answer.role === ASSISTANT)

        const mostRecentAssistantMessage =
          assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : undefined
        if (mostRecentAssistantMessage) {
          jsonString = cleanJSON(mostRecentAssistantMessage.content)
        } else return
      }
      if (jsonString === '') return

      setJSONDraftDocument(jsonString) // use in the Answer response
      try {
        const jsonObject = JSON.parse(jsonString)

        const sections: Section[] = jsonObject.template.map((item: any) => ({
          title: item.section_title,
          content: '', // Generated when user selects 'Generate' button
          description: item.section_description
        }))

        const draftedTemplate: DraftedDocument = {
          title: 'Enter a draft document title',
          sections: sections
        }

        setDraftDocument(draftedTemplate)
      } catch (e) {
        console.error('Failed to parse JSON:', e)
      }
    }
  }

  const processResultMessage = (resultMessage: ChatMessage, userMessage: ChatMessage, conversationId?: string) => {
    if (resultMessage.role === ASSISTANT) {
      assistantContent += resultMessage.content
      assistantMessage = resultMessage
      assistantMessage.content = assistantContent

      if (resultMessage.context) {
        toolMessage = {
          id: uuid(),
          role: TOOL,
          content: resultMessage.context,
          date: new Date().toISOString()
        }
      }
    }

    if (resultMessage.role === TOOL) toolMessage = resultMessage

    if (!conversationId) {
      isEmpty(toolMessage)
        ? setMessages([...messages, userMessage, assistantMessage])
        : setMessages([...messages, userMessage, toolMessage, assistantMessage])
    } else {
      isEmpty(toolMessage)
        ? setMessages([...messages, assistantMessage])
        : setMessages([...messages, toolMessage, assistantMessage])
    }
  }

  const makeApiRequestWithoutCosmosDB = async (question: string, conversationId?: string) => {
    setIsLoading(true)
    appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: true })
    setShowLoadingMessage(true)
    const abortController = new AbortController()
    abortFuncs.current.unshift(abortController)
    appStateContext?.dispatch({ type: 'SET_IS_REQUEST_INITIATED', payload: true })

    const userMessage: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: question,
      date: new Date().toISOString()
    }

    let conversation: Conversation | null | undefined
    if (!conversationId) {
      conversation = {
        id: conversationId ?? uuid(),
        title: question,
        messages: [userMessage],
        date: new Date().toISOString()
      }
    } else {
      conversation = appStateContext?.state?.currentChat
      if (!conversation) {
        console.error('Conversation not found.')
        setIsLoading(false)
        setShowLoadingMessage(false)
        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
        return
      } else {
        conversation.messages.push(userMessage)
      }
    }

    appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
    setMessages(conversation.messages)

    const request: ConversationRequest = {
      messages: [...conversation.messages.filter(answer => answer.role !== ERROR)]
    }

    let result = {} as ChatResponse
    try {
      const response = await conversationApi(request, abortController.signal, type)
      if (response?.body) {
        const reader = response.body.getReader()

        let runningText = ''
        while (true) {
          setProcessMessages(messageStatus.Processing)
          const { done, value } = await reader.read()
          if (done) break

          var text = new TextDecoder('utf-8').decode(value)
          const objects = text.split('\n')
          objects.forEach(obj => {
            try {
              if (obj !== '' && obj !== '{}') {
                runningText += obj
                result = JSON.parse(runningText)
                if (result.choices?.length > 0) {
                  result.choices[0].messages.forEach(msg => {
                    msg.id = result.id
                    msg.date = new Date().toISOString()
                  })
                  if (result.choices[0].messages?.some(m => m.role === ASSISTANT)) {
                    setShowLoadingMessage(false)
                  }
                  result.choices[0].messages.forEach(resultObj => {
                    processResultMessage(resultObj, userMessage, conversationId)
                  })
                } else if (result.error) {
                  throw Error(result.error)
                }
                runningText = ''
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                console.error(e)
                throw e
              } else {
                console.log('Incomplete message. Continuing...')
              }
            }
          })
        }
        conversation.messages.push(toolMessage, assistantMessage)
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
        setMessages([...messages, toolMessage, assistantMessage])
        processTemplateResponse()
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage =
          'An error occurred. Please try again. If the problem persists, please contact the site administrator.'
        if (result.error?.message) {
          errorMessage = result.error.message
        } else if (typeof result.error === 'string') {
          errorMessage = result.error
        }

        errorMessage = parseErrorMessage(errorMessage)

        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString()
        }
        conversation.messages.push(errorChatMsg)
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation })
        setMessages([...messages, errorChatMsg])
      } else {
        setMessages([...messages, userMessage])
      }
    } finally {
      setIsLoading(false)
      setShowLoadingMessage(false)
      appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: false })
      abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
      appStateContext?.dispatch({ type: 'SET_IS_REQUEST_INITIATED', payload: false })
      setProcessMessages(messageStatus.Done)
    }

    return abortController.abort()
  }

  const makeApiRequestWithCosmosDB = async (question: string, conversationId?: string) => {
    setIsLoading(true)
    appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: true })
    setShowLoadingMessage(true)
    const abortController = new AbortController()
    abortFuncs.current.unshift(abortController)
    appStateContext?.dispatch({ type: 'SET_IS_REQUEST_INITIATED', payload: true })


    const userMessage: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: question,
      date: new Date().toISOString()
    }

    //api call params set here (generate)
    let request: ConversationRequest
    let conversation
    if (conversationId) {
      conversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
      if (!conversation) {
        console.error('Conversation not found.')
        setIsLoading(false)
        appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: false })
        setShowLoadingMessage(false)
        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
        return
      } else {
        conversation.messages.push(userMessage)
        request = {
          messages: [...conversation.messages.filter(answer => answer.role !== ERROR)]
        }
      }
    } else {
      request = {
        messages: [userMessage].filter(answer => answer.role !== ERROR)
      }
      setMessages(request.messages)
    }
    let result = {} as ChatResponse
    var errorResponseMessage = 'Please try again. If the problem persists, please contact the site administrator.'
    try {
      const response = conversationId
        ? await historyGenerate(request, abortController.signal, conversationId, type)
        : await historyGenerate(request, abortController.signal, undefined, type)
      if (!response?.ok) {
        const responseJson = await response.json()
        errorResponseMessage =
          responseJson.error === undefined ? errorResponseMessage : parseErrorMessage(responseJson.error)
        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: `There was an error generating a response. Template history can't be saved at this time. ${errorResponseMessage}`,
          date: new Date().toISOString()
        }
        let resultConversation
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
          if (!resultConversation) {
            console.error('Conversation not found.')
            setIsLoading(false)
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          resultConversation.messages.push(errorChatMsg)
        } else {
          setMessages([...messages, userMessage, errorChatMsg])
          setIsLoading(false)
          appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: false })
          setShowLoadingMessage(false)
          abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
          return
        }
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation })
        setMessages([...resultConversation.messages])
        return
      }
      if (response?.body) {
        const reader = response.body.getReader()

        let runningText = ''
        while (true) {
          setProcessMessages(messageStatus.Processing)
          const { done, value } = await reader.read()
          if (done) break

          var text = new TextDecoder('utf-8').decode(value)
          const objects = text.split('\n')
          objects.forEach(obj => {
            try {
              if (obj !== '' && obj !== '{}') {
                runningText += obj
                result = JSON.parse(runningText)
                if (!result.choices?.[0]?.messages?.[0].content) {
                  errorResponseMessage = NO_CONTENT_ERROR
                  throw Error()
                }
                if (result.choices?.length > 0) {
                  result.choices[0].messages.forEach(msg => {
                    msg.id = result.id
                    msg.date = new Date().toISOString()
                  })
                  if (result.choices[0].messages?.some(m => m.role === ASSISTANT)) {
                    setShowLoadingMessage(false)
                  }
                  result.choices[0].messages.forEach(resultObj => {
                    processResultMessage(resultObj, userMessage, conversationId)
                  })
                }
                runningText = ''
              } else if (result.error) {
                throw Error(result.error)
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                console.error(e)
                throw e
              } else {
                console.log('Incomplete message. Continuing...')
              }
            }
          })
        }

        let resultConversation
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
          if (!resultConversation) {
            console.error('Conversation not found.')
            setIsLoading(false)
            appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: false })
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          isEmpty(toolMessage)
            ? resultConversation.messages.push(assistantMessage)
            : resultConversation.messages.push(toolMessage, assistantMessage)
        } else {
          resultConversation = {
            id: result.history_metadata.conversation_id,
            title: result.history_metadata.title,
            messages: [userMessage],
            date: result.history_metadata.date
          }
          isEmpty(toolMessage)
            ? resultConversation.messages.push(assistantMessage)
            : resultConversation.messages.push(toolMessage, assistantMessage)
        }
        if (!resultConversation) {
          setIsLoading(false)
          appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: false })
          setShowLoadingMessage(false)
          abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
          return
        }
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation })
        isEmpty(toolMessage)
          ? setMessages([...messages, assistantMessage])
          : setMessages([...messages, toolMessage, assistantMessage])
        processTemplateResponse()
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        let errorMessage = `An error occurred. ${errorResponseMessage}`
        if (result.error?.message) {
          errorMessage = result.error.message
        } else if (typeof result.error === 'string') {
          errorMessage = result.error
        }

        errorMessage = parseErrorMessage(errorMessage)

        let errorChatMsg: ChatMessage = {
          id: uuid(),
          role: ERROR,
          content: errorMessage,
          date: new Date().toISOString()
        }
        let resultConversation
        if (conversationId) {
          resultConversation = appStateContext?.state?.chatHistory?.find(conv => conv.id === conversationId)
          if (!resultConversation) {
            console.error('Conversation not found.')
            setIsLoading(false)
            appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: false })
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          resultConversation.messages.push(errorChatMsg)
        } else {
          if (!result.history_metadata) {
            console.error('Error retrieving data.', result)
            let errorChatMsg: ChatMessage = {
              id: uuid(),
              role: ERROR,
              content: errorMessage,
              date: new Date().toISOString()
            }
            setMessages([...messages, userMessage, errorChatMsg])
            setIsLoading(false)
            appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: false })
            setShowLoadingMessage(false)
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
            return
          }
          resultConversation = {
            id: result.history_metadata.conversation_id,
            title: result.history_metadata.title,
            messages: [userMessage],
            date: result.history_metadata.date
          }
          resultConversation.messages.push(errorChatMsg)
        }
        if (!resultConversation) {
          setIsLoading(false)
          appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: false })
          setShowLoadingMessage(false)
          abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
          return
        }
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation })
        setMessages([...messages, errorChatMsg])
      } else {
        setMessages([...messages, userMessage])
      }
    } finally {
      setIsLoading(false)
      setShowLoadingMessage(false)
      abortFuncs.current = abortFuncs.current.filter(a => a !== abortController)
      setProcessMessages(messageStatus.Done)
      appStateContext?.dispatch({ type: 'SET_IS_REQUEST_INITIATED', payload: false })
    }
    return abortController.abort()
  }

  // useEffect(() => {
  //   //console.log("messages",messages);
  //   //console.log("finalMessages", finalMessages);
  //   if (JSON.stringify(finalMessages) !== JSON.stringify(messages)) {
  //     setFinalMessages(messages)
  //   }
  // }, [messages,finalMessages])

  const clearChat = async () => {
    setClearingChat(true)
    if (appStateContext?.state.currentChat?.id && appStateContext?.state.isCosmosDBAvailable.cosmosDB) {
      let response = await historyClear(appStateContext?.state.currentChat.id)
      if (!response.ok) {
        setErrorMsg({
          title: 'Error clearing current chat',
          subtitle: 'Please try again. If the problem persists, please contact the site administrator.'
        })
        toggleErrorDialog()
      } else {
        appStateContext?.dispatch({
          type: 'DELETE_CURRENT_CHAT_MESSAGES',
          payload: appStateContext?.state.currentChat.id
        })
        if (type === ChatType.Template)
          appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext?.state.currentChat })
        setActiveCitation(undefined)
        setIsCitationPanelOpen(false)
        setIsIntentsPanelOpen(false)
        setMessages([])
      }
    }
    setClearingChat(false)
  }


  const generateDocument = async () => {
    if (draftDocument !== undefined) {
      navigateToDraftPage(draftDocument)
    }
  }

  const newChat = () => {
    setProcessMessages(messageStatus.Processing)
    setMessages([])
    setIsCitationPanelOpen(false)
    setIsIntentsPanelOpen(false)
    setActiveCitation(undefined)
    appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: null })
    setProcessMessages(messageStatus.Done)
  }

  const stopGenerating = () => {
    abortFuncs.current.forEach(a => a.abort())
    setShowLoadingMessage(false)
    setIsLoading(false)
    appStateContext?.dispatch({ type: 'GENERATE_ISLODING', payload: false })
  }

  useEffect(() => {
    if (appStateContext?.state.currentChat) {
      setMessages(appStateContext.state.currentChat.messages)
    } else {
      setMessages([])
    }

    if (type === ChatType.Browse) {
      appStateContext?.dispatch({ type: 'UPDATE_BROWSE_CHAT', payload: appStateContext?.state.currentChat })
    } else {
      appStateContext?.dispatch({ type: 'UPDATE_GENERATE_CHAT', payload: appStateContext?.state.currentChat })
    }
    processTemplateResponse()
  }, [appStateContext?.state.currentChat])

  useLayoutEffect(() => {
    const saveToDB = async (messages: ChatMessage[], id: string) => {
      const response = await historyUpdate(messages, id)
      return response
    }

    if (appStateContext && appStateContext.state.currentChat && processMessages === messageStatus.Done) {
      if (appStateContext.state.isCosmosDBAvailable.cosmosDB && type === ChatType.Template) {
        if (!appStateContext?.state.currentChat?.messages) {
          console.error('Failure fetching current chat state.')
          return
        }
        const noContentError = appStateContext.state.currentChat.messages.find(m => m.role === ERROR)

        if (!noContentError?.content.includes(NO_CONTENT_ERROR)) {
          saveToDB(appStateContext.state.currentChat.messages, appStateContext.state.currentChat.id)
            .then(res => {
              if (!res.ok) {
                let errorMessage =
                  "An error occurred. Answers can't be saved at this time. If the problem persists, please contact the site administrator."
                let errorChatMsg: ChatMessage = {
                  id: uuid(),
                  role: ERROR,
                  content: errorMessage,
                  date: new Date().toISOString()
                }
                if (!appStateContext?.state.currentChat?.messages) {
                  let err: Error = {
                    ...new Error(),
                    message: 'Failure fetching current chat state.'
                  }
                  throw err
                }
                setMessages([...appStateContext?.state.currentChat?.messages, errorChatMsg])
              }
              return res as Response
            })
            .catch(err => {
              console.error('Error: ', err)
              let errRes: Response = {
                ...new Response(),
                ok: false,
                status: 500
              }
              return errRes
            })
        }
      } else {
      }
      if (type === ChatType.Template)
        appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext.state.currentChat })
      setMessages(appStateContext.state.currentChat.messages)
      setProcessMessages(messageStatus.NotRunning)
    }
  }, [processMessages])

  useEffect(() => {
    if (AUTH_ENABLED !== undefined) getUserInfoList()
  }, [AUTH_ENABLED])

  useLayoutEffect(() => {
    chatMessageStreamEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [showLoadingMessage, processMessages])

  useEffect(() => {
    chatMessageStreamEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const onShowCitation = (citation: Citation) => {
    const path = `/#/document/${citation.filepath}`
    const url = window.location.origin + path
    setModalUrl(url)
    setIsModalOpen(true)
  }

  const onCloseModal = () => {
    setIsModalOpen(false)
    setModalUrl('')
  }

  const onViewSource = (citation: Citation) => {
    if (citation.url && !citation.url.includes('blob.core')) {
      window.open(citation.url, '_blank')
    }
  }


  const disabledButton = () => {
    return (
      isLoading ||
      (messages && messages.length === 0) ||
      clearingChat ||
      appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading
    )
  }


  return (
    <div className={styles.container} role="main">
      {showAuthMessage ? (
        <AuthNotConfigure />
      ) : (
        <Stack horizontal className={styles.chatRoot}>
          <div className={styles.chatContainer}>
            {!messages || messages.length < 1 ? (
              <Stack className={styles.chatEmptyState}>
                <h1 className={styles.chatEmptyStateTitle}>{ui?.chat_title}</h1>
              </Stack>
            ) : (
                <ChatMessageContainer
                messages={messages}
                  isLoading={isLoading}
                  type={type}
                  onShowCitation={onShowCitation}
                  showLoadingMessage={showLoadingMessage}
                  ref = {chatMessageStreamEnd}
                />
            )}

            <Stack horizontal className={styles.chatInput}>
              {isLoading && messages.length > 0 && (
                <Stack
                  horizontal
                  className={styles.stopGeneratingContainer}
                  role="button"
                  aria-label="Stop generating"
                  tabIndex={0}
                  onClick={stopGenerating}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? stopGenerating() : null)}>
                  <SquareRegular className={styles.stopGeneratingIcon} aria-hidden="true" />
                  <span className={styles.stopGeneratingText} aria-hidden="true">
                    Stop generating
                  </span>
                </Stack>
              )}
              <Stack>
                {appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured &&
                  type === ChatType.Template && (
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
                          background: '#0F6CBD'
                        },
                        rootDisabled: {
                          background: '#F0F0F0'
                        }
                      }}
                      className={styles.newChatIcon}
                      iconProps={{ iconName: 'Add' }}
                      onClick={newChat}
                      disabled={disabledButton()}
                      aria-label="start a new chat button"
                    />
                  )}
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
                      background: '#0F6CBD'
                    },
                    rootDisabled: {
                      background: '#F0F0F0'
                    }
                  }}
                  className={styles.clearChatBroom}
                  iconProps={{ iconName: 'Broom' }}
                  onClick={
                    appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured &&
                      type !== ChatType.Browse
                      ? clearChat
                      : newChat
                  }
                  disabled={disabledButton()}
                  aria-label="clear chat button"
                />
                <Dialog
                  hidden={hideErrorDialog}
                  onDismiss={handleErrorDialogClose}
                  dialogContentProps={errorDialogContentProps}
                  modalProps={modalProps}></Dialog>
              </Stack>
              <QuestionInput
                clearOnSend
                placeholder="Type a new question..."
                disabled={isLoading}
                onSend={(question, id) => {
                  appStateContext?.state.isCosmosDBAvailable?.cosmosDB && type === ChatType.Template
                    ? makeApiRequestWithCosmosDB(question, id)
                    : makeApiRequestWithoutCosmosDB(question, id)
                }}
                conversationId={
                  appStateContext?.state.currentChat?.id ? appStateContext?.state.currentChat?.id : undefined
                }
              />
              {type == ChatType.Template && (
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
                      background: '#0F6CBD'
                    },
                    rootDisabled: {
                      background: '#F0F0F0'
                    }
                  }}
                  className={styles.generateDocumentIcon}
                  iconProps={{ iconName: 'Generate' }}
                  onClick={generateDocument} //Update for Document Generation
                  disabled={draftDocument === undefined || disabledButton()}
                  aria-label="generate draft"
                  title="Generate Draft"
                />
              )}
            </Stack>
          </div>
          {/* Citation Panel */}
          {messages && messages.length > 0 && isCitationPanelOpen && activeCitation && (
            <CitationPanel
              IsCitationPanelOpen={setIsCitationPanelOpen}
              activeCitation={activeCitation}
              onViewSource={onViewSource}
            />
          )}
          {messages && messages.length > 0 && isIntentsPanelOpen && (
            <Stack.Item className={styles.citationPanel} tabIndex={0} role="tabpanel" aria-label="Intents Panel">
              <Stack
                aria-label="Intents Panel Header Container"
                horizontal
                className={styles.citationPanelHeaderContainer}
                horizontalAlign="space-between"
                verticalAlign="center">
                <span aria-label="Intents" className={styles.citationPanelHeader}>
                  Intents
                </span>
                <IconButton
                  iconProps={{ iconName: 'Cancel' }}
                  aria-label="Close intents panel"
                  onClick={() => setIsIntentsPanelOpen(false)}
                />
              </Stack>
            </Stack.Item>
          )}
          {appStateContext?.state.isChatHistoryOpen &&
            appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured &&
            type === ChatType.Template && <ChatHistoryPanel />}
        </Stack>
      )}
      <Modal isOpen={isModalOpen} onDismiss={onCloseModal} isBlocking={false} styles={modalStyles}>
        <Stack tokens={stackTokens} styles={{ root: { padding: 20 } }}>
          <iframe src={modalUrl} className={contentStyles.iframe} title="Citation"></iframe>
          <PrimaryButton onClick={onCloseModal} className={contentStyles.closeButton}>
            Close
          </PrimaryButton>
        </Stack>
      </Modal>
    </div>
  )
}

export default Chat
