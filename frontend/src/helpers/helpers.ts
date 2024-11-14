import { Conversation, ChatMessage, ToolMessageContent } from '../api/models'


// -------------Chat.tsx-------------

const enum contentTemplateSections {
    NewLine = '\n\n',
    Intro = 'The proposal will include the following sections:',
    Closing = 'Does this look good? If so, you can **generate the document** now. You can also ask me to **add an item** or **change the order of the sections**.',
    JSONParseError = 'I was unable to find content related to your query and could not generate a template. Please try again.',
    JSONStructureError = 'Unable to render the sections within the template. Please try again.'
}


export const parseCitationFromMessage = (message: ChatMessage) => {
    if (message?.role && message?.role === 'tool') {
        try {
            const toolMessage = JSON.parse(message.content) as ToolMessageContent
            return toolMessage.citations
        } catch {
            return []
        }
    }
    return []
}

export const cleanJSON = (jsonString: string) => {
    try {
        let lines: string[]
        let cleanString = ''
        lines = jsonString.split('\n')
        lines?.forEach((line: string) => {
            if (!line.includes('json') && !line.includes('```')) {
                cleanString += line.trim()
            }
        })
        return cleanString
    } catch (e) {
        return ''
    }
}

export const generateTemplateSections = (jsonString: string) => {
    let jsonResponse
    try {
        let cleanString = cleanJSON(jsonString)
        jsonResponse = JSON.parse(cleanString)
    } catch (e) {
        return contentTemplateSections.JSONParseError
    }

    if (!Array.isArray(jsonResponse.template)) {
        return contentTemplateSections.JSONStructureError
    }

    let sections = `${contentTemplateSections.Intro}${contentTemplateSections.NewLine}`
    jsonResponse.template.forEach((row: { section_title: string }) => {
        sections += `${row.section_title}${contentTemplateSections.NewLine}`
    })
    sections += `${contentTemplateSections.Closing}`
    return sections.trim() // Remove any trailing newline
}


export const tryGetRaiPrettyError = (errorMessage: string) => {
    try {
      // Using a regex to extract the JSON part that contains "innererror"
      const match = errorMessage.match(/'innererror': ({.*})\}\}/)
      if (match) {
        // Replacing single quotes with double quotes and converting Python-like booleans to JSON booleans
        const fixedJson = match[1]
          .replace(/'/g, '"')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false')
        const innerErrorJson = JSON.parse(fixedJson)
        let reason = ''
        // Check if jailbreak content filter is the reason of the error
        const jailbreak = innerErrorJson.content_filter_result.jailbreak
        if (jailbreak.filtered === true) {
          reason = 'Jailbreak'
        }

        // Returning the prettified error message
        if (reason !== '') {
          return (
            'The prompt was filtered due to triggering Azure OpenAI’s content filtering system.\n' +
            'Reason: This prompt contains content flagged as ' +
            reason +
            '\n\n' +
            'Please modify your prompt and retry. Learn more: https://go.microsoft.com/fwlink/?linkid=2198766'
          )
        }
      }
    } catch (e) {
      console.error('Failed to parse the error:', e)
    }
    return errorMessage
  }


export const parseErrorMessage = (errorMessage: string) => {
    let errorCodeMessage = errorMessage.substring(0, errorMessage.indexOf('-') + 1)
    const innerErrorCue = "{\\'error\\': {\\'message\\': "
    if (errorMessage.includes(innerErrorCue)) {
      try {
        let innerErrorString = errorMessage.substring(errorMessage.indexOf(innerErrorCue))
        if (innerErrorString.endsWith("'}}")) {
          innerErrorString = innerErrorString.substring(0, innerErrorString.length - 3)
        }
        innerErrorString = innerErrorString.replaceAll("\\'", "'")
        let newErrorMessage = errorCodeMessage + ' ' + innerErrorString
        errorMessage = newErrorMessage
      } catch (e) {
        console.error('Error parsing inner error message: ', e)
      }
    }

    return tryGetRaiPrettyError(errorMessage)
  }